'use strict';
// Logique centrale de l'Académie RPVD (Bootcamp du dimanche), partagée par les fonctions
// publiques, l'admin, le webhook Stripe et la tâche planifiée.
//
// Cycle hebdomadaire (heure du Québec, America/Toronto) :
//   lun-mer  votes (week_key = lundi de la semaine)          → votes jeu-dim = semaine suivante
//   jeu 17 h sélection des 4 sujets les plus votés + courriels « SÉLECTIONNÉ »
//   → sam 23 h 59  ventes ouvertes (20 $ tout inclus) et remboursement libre
//   dim 8 h  réouverture des SEULES places libérées par de vrais désistements
//   T-60 min lien Zoom personnel envoyé à chaque billet payé
//   lun 9 h  courriel de suivi (passerelle vers l'outil d'analyse)

const crypto = require('crypto');
const { sendBatch, bootcampSelectedEmail, bootcampNotSelectedEmail } = require('./email');
const { unsubscribeLinks } = require('./legal');
const zoom = require('./zoom');

const TZ = 'America/Toronto';
const PRICE_CENTS = 2000;
const CURRENCY = 'cad';
const STRIPE_PRICE_ID = 'price_1UNbSpAJoPaz3Yer60F2dJua'; // Bootcamp RPVD 20 $ CAD (produit prod_VOOF2XODl3mMGu)
const DEFAULT_CAPACITY = 90; // salle Zoom Pro = 100, marge de 10 pour l'équipe et les imprévus
const DURATION_MIN = 90;
const SLOTS = ['13:00', '15:00', '17:00', '19:00'];
const LINK_LEAD_MIN = 60; // le lien part au plus tôt 60 min avant (tâche toutes les 10 min → 50-60 min)
const SALES_CLOSE_BEFORE_MIN = 30;
const PENDING_HOLD_MIN = 35; // une session Stripe Checkout expire après 31 min
const OTHER_TOPIC = 'Autre sujet';

const LEVELS = ['Sec 1', 'Sec 2', 'Sec 3', 'Sec 4', 'Sec 5'];
const SUBJECTS = ['Mathématiques', 'Maths CST', 'Maths TS', 'Maths SN', 'Science (ST / STE)', 'Chimie', 'Physique', 'Français'];

function siteUrl() {
  return (process.env.URL || 'https://rpvdsuccess.com').replace(/\/+$/, '');
}

function newToken() {
  return crypto.randomBytes(18).toString('hex');
}

// --- Heure du Québec -------------------------------------------------------------------------

const PARTS_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function localParts(date = new Date()) {
  const p = {};
  for (const { type, value } of PARTS_FMT.formatToParts(date)) p[type] = value;
  const y = Number(p.year);
  const m = Number(p.month);
  const d = Number(p.day);
  const h = Number(p.hour) % 24;
  return {
    y, m, d, h,
    mi: Number(p.minute),
    s: Number(p.second),
    ymd: `${p.year}-${p.month}-${p.day}`,
    weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), // 0 = dimanche
  };
}

function offsetMin(date) {
  const p = localParts(date);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - date.getTime()) / 60000);
}

// "2026-10-11" + "13:00" (heure du Québec) → instant UTC, heure d'été comprise.
function zonedToUtc(ymd, hm) {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - offsetMin(new Date(guess)) * 60000;
  return new Date(guess - offsetMin(new Date(first)) * 60000);
}

function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Lundi de la semaine en cours (heure du Québec).
function currentWeekKey(now = new Date()) {
  const p = localParts(now);
  return addDays(p.ymd, -((p.weekday + 6) % 7));
}

// Semaine pour laquelle un vote compte : lun-mer → cette semaine, jeu-dim → la suivante.
function voteWeekKey(now = new Date()) {
  const p = localParts(now);
  const key = currentWeekKey(now);
  return p.weekday >= 1 && p.weekday <= 3 ? key : addDays(key, 7);
}

const sundayOf = (weekKey) => addDays(weekKey, 6);
const selectionAt = (weekKey) => zonedToUtc(addDays(weekKey, 3), '17:00');
const salesDeadline = (weekKey) => new Date(zonedToUtc(addDays(weekKey, 6), '00:00').getTime() - 1); // samedi 23:59:59.999
const sundayReopenAt = (weekKey) => zonedToUtc(sundayOf(weekKey), '08:00');
const slotStart = (weekKey, slot) => zonedToUtc(sundayOf(weekKey), slot);
const followupAt = (weekKey) => zonedToUtc(addDays(weekKey, 7), '09:00');

const DAY_FMT = new Intl.DateTimeFormat('fr-CA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

function hourLabel(date) {
  const p = localParts(new Date(date));
  return `${p.h} h${p.mi ? String(p.mi).padStart(2, '0') : ''}`;
}

// « dimanche 11 octobre à 13 h »
function formatWhen(date) {
  return `${DAY_FMT.format(new Date(date))} à ${hourLabel(date)}`;
}

function formatDeadline(weekKey) {
  return `${DAY_FMT.format(salesDeadline(weekKey))} à 23 h 59`;
}

function formatPrice(cents = PRICE_CENTS) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} $`;
}

// --- Places disponibles ----------------------------------------------------------------------

function emptyStats() {
  return { paid: 0, refunded: 0, pending: 0, paidSunday: 0, pendingSunday: 0, revenueCents: 0 };
}

async function ticketStats(db, sessions, now = new Date()) {
  const out = {};
  for (const s of sessions) out[s.id] = emptyStats();
  if (sessions.length === 0) return out;
  const { data, error } = await db
    .from('bootcamp_tickets')
    .select('session_id, status, created_at, paid_at, amount_cents')
    .in('session_id', sessions.map((s) => s.id));
  if (error) throw error;
  const holdFrom = now.getTime() - PENDING_HOLD_MIN * 60000;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  for (const t of data || []) {
    const st = out[t.session_id];
    const reopen = sundayReopenAt(byId[t.session_id].week_key).getTime();
    if (t.status === 'paid') {
      st.paid += 1;
      st.revenueCents += t.amount_cents || 0;
      if (t.paid_at && new Date(t.paid_at).getTime() >= reopen) st.paidSunday += 1;
    } else if (t.status === 'refunded') {
      st.refunded += 1;
    } else if (t.status === 'pending' && new Date(t.created_at).getTime() >= holdFrom) {
      st.pending += 1;
      if (new Date(t.created_at).getTime() >= reopen) st.pendingSunday += 1;
    }
  }
  return out;
}

// État de vente réel d'une session. Le dimanche, seules les places libérées par des
// remboursements (désistements avant samedi 23 h 59) sont remises en vente.
function availability(session, stats, now = new Date()) {
  if (session.status !== 'open') return { state: session.status === 'cancelled' ? 'cancelled' : 'closed', seats_left: 0 };
  const start = new Date(session.starts_at);
  const deadline = salesDeadline(session.week_key);
  const reopen = sundayReopenAt(session.week_key);
  const closeAt = new Date(start.getTime() - SALES_CLOSE_BEFORE_MIN * 60000);
  const room = Math.max(0, session.capacity - stats.paid - stats.pending);
  if (now <= deadline) {
    return { state: room > 0 ? 'open' : 'full', seats_left: room, closes_at: deadline.toISOString() };
  }
  if (now < reopen) return { state: 'paused', seats_left: 0, reopens_at: reopen.toISOString() };
  if (now < closeAt) {
    const freed = Math.max(0, stats.refunded - stats.paidSunday - stats.pendingSunday);
    const left = Math.min(room, freed);
    return { state: left > 0 ? 'last_call' : 'full', seats_left: left, closes_at: closeAt.toISOString() };
  }
  return { state: 'closed', seats_left: 0 };
}

// Un billet n'est remboursable que s'il a été payé avant la date limite (samedi 23 h 59).
function refundable(ticket, session, now = new Date()) {
  return ticket.status === 'paid' && session.status !== 'cancelled' && now <= salesDeadline(session.week_key);
}

// Vue publique d'une session (aucune donnée personnelle, aucun chiffre de vente brut).
function publicSession(session, stats, now = new Date()) {
  return {
    id: session.id,
    level: session.level,
    subject: session.subject,
    topic: session.topic,
    slot: session.slot,
    starts_at: session.starts_at,
    when: formatWhen(session.starts_at),
    duration_min: DURATION_MIN,
    price_cents: session.price_cents,
    capacity: session.capacity,
    refund_deadline: formatDeadline(session.week_key),
    ...availability(session, stats, now),
  };
}

async function getSettings(db) {
  const { data } = await db.from('bootcamp_settings').select('auto_select, capacity').eq('id', 1).maybeSingle();
  return { auto_select: data ? data.auto_select : true, capacity: data ? data.capacity : DEFAULT_CAPACITY };
}

// --- Votes et sélection ----------------------------------------------------------------------

async function tallyWeek(db, weekKey) {
  const { data: votes, error } = await db
    .from('bootcamp_votes')
    .select('id, email, level, subject, topic, topic_other, notified_at, created_at')
    .eq('week_key', weekKey);
  if (error) throw error;
  const groups = new Map();
  for (const v of votes || []) {
    const key = `${v.level}|${v.subject}|${v.topic}`;
    const g = groups.get(key) || { level: v.level, subject: v.subject, topic: v.topic, votes: 0, first: v.created_at, others: [] };
    g.votes += 1;
    if (v.topic === OTHER_TOPIC && v.topic_other) g.others.push(v.topic_other);
    if (v.created_at < g.first) g.first = v.created_at;
    groups.set(key, g);
  }
  const tally = [...groups.values()].sort((a, b) => b.votes - a.votes || (a.first < b.first ? -1 : 1));
  return { votes: votes || [], tally };
}

// Crée une réunion Zoom pour la session si l'API est configurée (sinon : lien manuel admin).
async function ensureZoomMeeting(db, session) {
  if (session.zoom_meeting_id || !zoom.zoomConfigured()) return session;
  try {
    const { meetingId, joinUrl } = await zoom.createMeeting({
      topic: `Bootcamp RPVD — ${session.topic} (${session.level})`,
      startsAt: session.starts_at,
      durationMin: DURATION_MIN,
    });
    const { data } = await db
      .from('bootcamp_sessions')
      .update({ zoom_meeting_id: meetingId, zoom_join_url: joinUrl })
      .eq('id', session.id)
      .select('*')
      .single();
    return data || session;
  } catch (err) {
    console.error('[bootcamp] Création Zoom impossible :', err.message);
    return session;
  }
}

// picks : [{ level, subject, topic, slot, votes? }]
async function createSessions(db, weekKey, picks) {
  const { capacity } = await getSettings(db);
  const rows = picks.map((p) => ({
    week_key: weekKey,
    slot: p.slot,
    starts_at: slotStart(weekKey, p.slot).toISOString(),
    level: p.level,
    subject: p.subject,
    topic: p.topic,
    capacity: p.capacity || capacity,
    price_cents: PRICE_CENTS,
    votes_count: p.votes || 0,
  }));
  const { data, error } = await db.from('bootcamp_sessions').insert(rows).select('*');
  if (error) throw error;
  const created = [];
  for (const s of data) created.push(await ensureZoomMeeting(db, s));
  return created;
}

// Les 4 sujets les plus votés (hors « Autre sujet »), du plus voté au moins voté, sur les
// créneaux libres de la semaine dans l'ordre chronologique.
async function autoSelect(db, weekKey) {
  const { data: existing } = await db.from('bootcamp_sessions').select('slot').eq('week_key', weekKey).neq('status', 'cancelled');
  const used = new Set((existing || []).map((s) => s.slot));
  const free = SLOTS.filter((s) => !used.has(s));
  if (free.length === 0) return [];
  const { tally } = await tallyWeek(db, weekKey);
  const picks = tally
    .filter((g) => g.topic !== OTHER_TOPIC)
    .slice(0, free.length)
    .map((g, i) => ({ ...g, slot: free[i] }));
  if (picks.length === 0) return [];
  return createSessions(db, weekKey, picks);
}

async function weekSessions(db, weekKey) {
  const { data, error } = await db
    .from('bootcamp_sessions')
    .select('*')
    .eq('week_key', weekKey)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Courriels désabonnés des annonces (LCAP) : exclus de tout courriel non transactionnel.
async function unsubscribedSet(db, emails) {
  const list = [...new Set(emails.filter(Boolean))];
  if (list.length === 0) return new Set();
  const { data } = await db.from('bootcamp_unsubscribes').select('email').in('email', list);
  return new Set((data || []).map((r) => r.email));
}

// Courriels « SÉLECTIONNÉ » / « pas ce dimanche » à tous les votants pas encore notifiés.
async function notifyVoters(db, weekKey, { dryRun = false } = {}) {
  const sessions = (await weekSessions(db, weekKey)).filter((s) => s.status === 'open');
  const { votes } = await tallyWeek(db, weekKey);
  const unsub = await unsubscribedSet(db, votes.map((v) => v.email));
  const pending = votes.filter((v) => !v.notified_at && !unsub.has(v.email));
  const match = (v) => sessions.find((s) => s.level === v.level && s.subject === v.subject && s.topic === v.topic);
  const plan = pending.map((v) => ({ vote: v, session: match(v) }));
  const summary = {
    sessions: sessions.length,
    pending: pending.length,
    selected: plan.filter((p) => p.session).length,
    not_selected: plan.filter((p) => !p.session).length,
  };
  if (dryRun || pending.length === 0 || sessions.length === 0) return { ...summary, sent: 0, failed: 0, dry_run: dryRun };

  const deadline = formatDeadline(weekKey);
  const list = sessions.map((s) => ({ when: formatWhen(s.starts_at), topic: s.topic, level: s.level }));
  const messages = plan.map(({ vote, session }) => {
    const shown = vote.topic_other ? `${vote.topic} : ${vote.topic_other}` : vote.topic;
    const body = session
      ? bootcampSelectedEmail({
          topic: session.topic,
          level: session.level,
          subject: session.subject,
          when: formatWhen(session.starts_at),
          price: formatPrice(session.price_cents),
          deadline,
          url: `${siteUrl()}/reserver?s=${session.id}`,
          unsubscribe: unsubscribeLinks('v', vote.id),
        })
      : bootcampNotSelectedEmail({ topic: shown, level: vote.level, sessions: list, url: `${siteUrl()}/#sessions`, appUrl: `${siteUrl()}/app?src=vote-pas-retenu`, unsubscribe: unsubscribeLinks('v', vote.id) });
    return { to: vote.email, ...body };
  });
  const results = await sendBatch(messages);
  const nowIso = new Date().toISOString();
  let sent = 0;
  for (let i = 0; i < plan.length; i += 1) {
    if (!results[i]) continue;
    sent += 1;
    const { vote, session } = plan[i];
    await db
      .from('bootcamp_votes')
      .update({ notified_at: nowIso, notified_kind: session ? 'selected' : 'not_selected', session_id: session ? session.id : null })
      .eq('id', vote.id);
  }
  return { ...summary, sent, failed: plan.length - sent, dry_run: false };
}

module.exports = {
  TZ,
  PRICE_CENTS,
  CURRENCY,
  STRIPE_PRICE_ID,
  DEFAULT_CAPACITY,
  DURATION_MIN,
  SLOTS,
  LINK_LEAD_MIN,
  OTHER_TOPIC,
  LEVELS,
  SUBJECTS,
  siteUrl,
  newToken,
  localParts,
  zonedToUtc,
  addDays,
  currentWeekKey,
  voteWeekKey,
  sundayOf,
  selectionAt,
  salesDeadline,
  sundayReopenAt,
  slotStart,
  followupAt,
  formatWhen,
  formatDeadline,
  formatPrice,
  hourLabel,
  ticketStats,
  emptyStats,
  availability,
  refundable,
  publicSession,
  getSettings,
  tallyWeek,
  ensureZoomMeeting,
  createSessions,
  autoSelect,
  weekSessions,
  notifyVoters,
  unsubscribedSet,
};
