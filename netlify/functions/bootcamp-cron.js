'use strict';
// Tâche planifiée du Bootcamp (toutes les 10 min, voir netlify.toml). Fait tourner toute la
// semaine sans intervention humaine :
//   1. jeudi ≥ 17 h  sélection auto des 4 sujets les plus votés (si réglage actif et si
//      l'admin n'a rien créé) + courriels « SÉLECTIONNÉ » / « pas ce dimanche »
//   2. réunions Zoom manquantes + inscriptions Zoom manquantes (si l'API Zoom est configurée)
//   3. T-60 min      lien Zoom (personnel) à chaque billet payé
//   4. dim ≥ 8 h     courriel « places libérées » si de vrais désistements ont eu lieu
//   5. lun ≥ 9 h     courriel de suivi aux participants
//   6. sessions terminées → status 'done'
//   7. conservation : votes et courriels des billets effacés après 6 mois (Loi 25)
// Chaque étape est idempotente (horodatages en base) : une exécution ratée est rattrapée à la suivante.

const { getServiceClient } = require('./_lib/supabase');
const B = require('./_lib/bootcamp');
const ops = require('./_lib/bootcamp-ops');

const RETENTION_DAYS = 183;

// `retention: false` pour les tests : la purge ne doit jamais tourner avec une date simulée.
async function run(now = new Date(), { retention = true } = {}) {
  const db = getServiceClient();
  const log = {};
  const week = B.currentWeekKey(now);

  // 1. Sélection du jeudi.
  if (now >= B.selectionAt(week) && now <= B.salesDeadline(week)) {
    const settings = await B.getSettings(db);
    let sessions = (await B.weekSessions(db, week)).filter((s) => s.status !== 'cancelled');
    if (sessions.length === 0 && settings.auto_select) {
      const created = await B.autoSelect(db, week);
      log.auto_selected = created.length;
      sessions = created;
    }
    if (sessions.length > 0) log.notify = await B.notifyVoters(db, week);
  }

  // Sessions à venir ou récentes (fenêtre de 3 jours).
  const { data: recent, error } = await db
    .from('bootcamp_sessions')
    .select('*')
    .gte('starts_at', new Date(now.getTime() - 3 * 86400000).toISOString())
    .lte('starts_at', new Date(now.getTime() + 8 * 86400000).toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;

  const stats = await B.ticketStats(db, recent || [], now);
  log.links = [];
  for (let s of recent || []) {
    const start = new Date(s.starts_at).getTime();
    const end = start + B.DURATION_MIN * 60000;

    if (s.status === 'open') {
      // 2. Zoom.
      if (start > now.getTime()) s = await B.ensureZoomMeeting(db, s);

      // 3. Liens : de T-60 min jusqu'à 15 min après le début (retardataires).
      if (now.getTime() >= start - B.LINK_LEAD_MIN * 60000 && now.getTime() <= start + 15 * 60000) {
        log.links.push({ session: s.id, ...(await ops.sendLinks(db, s)) });
      }

      // 4. Places libérées (dimanche ≥ 8 h, une seule fois, seulement si > 0).
      if (!s.freed_notice_sent_at && now >= B.sundayReopenAt(s.week_key) && now.getTime() < start - 30 * 60000) {
        const avail = B.availability(s, stats[s.id], now);
        if (avail.state === 'last_call' && avail.seats_left > 0) {
          log.freed = log.freed || [];
          log.freed.push({ session: s.id, seats: avail.seats_left, ...(await ops.notifyFreedSeats(db, s, avail.seats_left)) });
        }
      }

      // 6. Terminée.
      if (now.getTime() > end) {
        await db.from('bootcamp_sessions').update({ status: 'done' }).eq('id', s.id);
        s = { ...s, status: 'done' };
      }
    }

    // 5. Suivi du lendemain 9 h (sur 48 h).
    if (s.status === 'done') {
      const at = B.followupAt(s.week_key).getTime();
      if (now.getTime() >= at && now.getTime() <= at + 2 * 86400000) {
        log.followups = (log.followups || 0) + (await ops.sendFollowups(db, s)).sent;
      }
    }
  }
  // 7. Conservation limitée (Loi 25 : détruire quand la finalité est accomplie) — 6 mois.
  //    Votes : supprimés. Billets : courriel et lien Zoom effacés ; montant, date et référence
  //    Stripe gardés (pièces comptables). La liste de désabonnement est conservée (pour la respecter).
  if (!retention) return log;
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000); // toujours l'heure réelle
  const { count: purgedVotes } = await db
    .from('bootcamp_votes')
    .delete({ count: 'exact' })
    .lt('week_key', cutoff.toISOString().slice(0, 10));
  const { count: anonymized } = await db
    .from('bootcamp_tickets')
    .update({ email: null, zoom_join_url: null, zoom_registrant_id: null }, { count: 'exact' })
    .lt('created_at', cutoff.toISOString())
    .not('email', 'is', null);
  if (purgedVotes || anonymized) log.retention = { purgedVotes, anonymized };

  return log;
}

exports.handler = async () => {
  try {
    const log = await run();
    console.log('[bootcamp-cron]', JSON.stringify(log));
    return { statusCode: 200, body: JSON.stringify(log) };
  } catch (err) {
    console.error('[bootcamp-cron]', err && err.message ? err.message : err);
    return { statusCode: 500, body: 'error' };
  }
};

exports.run = run;
