'use strict';
// POST /.netlify/functions/bootcamp-admin   (équipe seulement : header x-admin-token = BOOTCAMP_ADMIN_TOKEN)
//
//   status          { week_key? }                       → réglages, santé de la config, votes, sessions + ventes
//   auto_select     { week_key, notify? }               → crée les sessions du top 4 (+ courriels si notify)
//   create_sessions { week_key, picks:[{level,subject,topic,slot}] }
//   notify          { week_key, dry_run? }              → « SÉLECTIONNÉ » / « pas ce dimanche »
//   update_session  { id, manual_join_url?, capacity? }
//   cancel_session  { id }                              → annule + rembourse tous les billets
//   send_links      { id }                              → envoie les liens Zoom maintenant
//   attendees       { id }                              → liste des billets d'une session
//   zoom_retry      { id }                              → recrée la réunion Zoom
//   settings        { auto_select?, capacity? }

const crypto = require('crypto');
const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { zoomConfigured } = require('./_lib/zoom');
const { BUSINESS } = require('./_lib/legal');
const B = require('./_lib/bootcamp');
const ops = require('./_lib/bootcamp-ops');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function weekParam(body) {
  return typeof body.week_key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.week_key) ? body.week_key : B.currentWeekKey();
}

async function loadSession(db, id) {
  if (!UUID.test(String(id || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Session inconnue.');
  const { data, error } = await db.from('bootcamp_sessions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'BAD_REQUEST', 'Session introuvable.');
  return data;
}

function health() {
  const from = process.env.EMAIL_FROM || '';
  return {
    resend: Boolean(process.env.RESEND_API_KEY),
    email_from: Boolean(from) && !/resend\.dev/.test(from),
    reply_to: Boolean(process.env.EMAIL_REPLY_TO),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    zoom: zoomConfigured(),
    postal_address: Boolean(BUSINESS.postalAddress),
  };
}

async function status(db, week) {
  const now = new Date();
  const [settings, sessions, { votes, tally }] = await Promise.all([B.getSettings(db), B.weekSessions(db, week), B.tallyWeek(db, week)]);
  const stats = await B.ticketStats(db, sessions, now);
  return {
    now: now.toISOString(),
    week_key: week,
    weeks: { current: B.currentWeekKey(now), vote: B.voteWeekKey(now), next: B.addDays(B.currentWeekKey(now), 7), previous: B.addDays(B.currentWeekKey(now), -7) },
    schedule: {
      selection: B.formatWhen(B.selectionAt(week)),
      deadline: B.formatDeadline(week),
      reopen: B.formatWhen(B.sundayReopenAt(week)),
      sunday: B.sundayOf(week),
    },
    settings,
    health: health(),
    slots: B.SLOTS,
    votes: { total: votes.length, notified: votes.filter((v) => v.notified_at).length },
    tally: tally.map(({ level, subject, topic, votes: n, others }) => ({ level, subject, topic, votes: n, others: others.slice(0, 10) })),
    sessions: sessions.map((s) => ({
      ...s,
      when: B.formatWhen(s.starts_at),
      stats: stats[s.id],
      availability: B.availability(s, stats[s.id], now),
    })),
  };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const expected = process.env.BOOTCAMP_ADMIN_TOKEN;
    const given = header(event, 'x-admin-token');
    if (!expected || !given || !safeEqual(expected, given)) throw new HttpError(401, 'UNAUTHORIZED', 'Accès refusé.');

    const body = parseBody(event);
    const db = getServiceClient();
    const week = weekParam(body);

    switch (body.action) {
      case 'status':
      case 'tally':
        return json(200, { ok: true, ...(await status(db, week)) });

      case 'auto_select': {
        const created = await B.autoSelect(db, week);
        const notify = body.notify === true && created.length ? await B.notifyVoters(db, week) : null;
        return json(200, { ok: true, created: created.length, notify, ...(await status(db, week)) });
      }

      case 'create_sessions': {
        const picks = Array.isArray(body.picks) ? body.picks : [];
        if (picks.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'Aucun sujet choisi.');
        for (const p of picks) {
          if (!p || !p.level || !p.subject || !p.topic || !B.SLOTS.includes(p.slot)) {
            throw new HttpError(400, 'BAD_REQUEST', 'Chaque sujet doit avoir niveau, matière, sujet et créneau.');
          }
        }
        const slots = picks.map((p) => p.slot);
        if (new Set(slots).size !== slots.length) throw new HttpError(400, 'BAD_REQUEST', 'Deux sujets sur le même créneau.');
        await B.createSessions(
          db,
          week,
          picks.map((p) => ({ level: String(p.level).slice(0, 20), subject: String(p.subject).slice(0, 40), topic: String(p.topic).slice(0, 160), slot: p.slot, votes: Number(p.votes) || 0 })),
        );
        return json(200, { ok: true, ...(await status(db, week)) });
      }

      case 'notify':
        return json(200, { ok: true, result: await B.notifyVoters(db, week, { dryRun: body.dry_run !== false }) });

      case 'update_session': {
        const s = await loadSession(db, body.id);
        const patch = {};
        if (typeof body.manual_join_url === 'string') {
          const url = body.manual_join_url.trim();
          if (url && !/^https:\/\/([a-z0-9-]+\.)*zoom\.(us|com)\//i.test(url)) throw new HttpError(400, 'BAD_REQUEST', 'Lien Zoom invalide (https://…zoom.us/…).');
          patch.manual_join_url = url || null;
        }
        if (body.capacity != null) {
          const c = Number(body.capacity);
          if (!Number.isInteger(c) || c < 1 || c > 100) throw new HttpError(400, 'BAD_REQUEST', 'Capacité entre 1 et 100.');
          patch.capacity = c;
        }
        await db.from('bootcamp_sessions').update(patch).eq('id', s.id);
        return json(200, { ok: true, ...(await status(db, s.week_key)) });
      }

      case 'cancel_session': {
        const s = await loadSession(db, body.id);
        if (s.status === 'cancelled') throw new HttpError(409, 'BAD_REQUEST', 'Déjà annulée.');
        const result = await ops.cancelSession(db, s);
        return json(200, { ok: true, result, ...(await status(db, s.week_key)) });
      }

      case 'send_links': {
        const s = await loadSession(db, body.id);
        return json(200, { ok: true, result: await ops.sendLinks(db, s) });
      }

      case 'attendees': {
        const s = await loadSession(db, body.id);
        const { data, error } = await db
          .from('bootcamp_tickets')
          .select('id, status, email, amount_cents, paid_at, refunded_at, link_sent_at, zoom_join_url, source, created_at')
          .eq('session_id', s.id)
          .neq('status', 'expired')
          .order('created_at', { ascending: true });
        if (error) throw error;
        return json(200, {
          ok: true,
          attendees: (data || [])
            .filter((t) => t.status !== 'pending' || Date.now() - new Date(t.created_at).getTime() < 35 * 60000)
            .map(({ zoom_join_url, ...t }) => ({ ...t, zoom_personal: Boolean(zoom_join_url) })),
        });
      }

      case 'zoom_retry': {
        const s = await loadSession(db, body.id);
        if (!zoomConfigured()) throw new HttpError(400, 'BAD_REQUEST', "L'API Zoom n'est pas configurée.");
        await db.from('bootcamp_sessions').update({ zoom_meeting_id: null, zoom_join_url: null }).eq('id', s.id);
        await B.ensureZoomMeeting(db, { ...s, zoom_meeting_id: null });
        return json(200, { ok: true, ...(await status(db, s.week_key)) });
      }

      case 'settings': {
        const patch = { updated_at: new Date().toISOString() };
        if (typeof body.auto_select === 'boolean') patch.auto_select = body.auto_select;
        if (body.capacity != null) {
          const c = Number(body.capacity);
          if (!Number.isInteger(c) || c < 1 || c > 100) throw new HttpError(400, 'BAD_REQUEST', 'Capacité entre 1 et 100.');
          patch.capacity = c;
        }
        await db.from('bootcamp_settings').upsert({ id: 1, ...patch });
        return json(200, { ok: true, ...(await status(db, week)) });
      }

      default:
        throw new HttpError(400, 'BAD_REQUEST', 'action inconnue.');
    }
  } catch (err) {
    return handleError(err, 'bootcamp-admin');
  }
};
