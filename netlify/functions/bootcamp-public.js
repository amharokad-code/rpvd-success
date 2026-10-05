'use strict';
// POST /.netlify/functions/bootcamp-public
//   { "action": "sessions" }            → sessions à venir (dimanche en cours/prochain) + places réelles
//   { "action": "session", "id": "…" }  → une session (page /reserver, /merci)
// Lecture seule, aucune donnée personnelle.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { ticketStats, publicSession, currentWeekKey, voteWeekKey, formatDeadline, selectionAt, DURATION_MIN } = require('./_lib/bootcamp');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const db = getServiceClient();
    const now = new Date();

    if (body.action === 'session') {
      if (!UUID.test(String(body.id || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Session inconnue.');
      const { data: session, error } = await db.from('bootcamp_sessions').select('*').eq('id', body.id).maybeSingle();
      if (error) throw error;
      if (!session) throw new HttpError(404, 'BAD_REQUEST', 'Session introuvable.');
      const stats = await ticketStats(db, [session], now);
      return json(200, { ok: true, session: publicSession(session, stats[session.id], now) });
    }

    if (body.action === 'sessions') {
      // Sessions encore à venir (ou commencées depuis moins de la durée du cours).
      const since = new Date(now.getTime() - DURATION_MIN * 60000).toISOString();
      const { data: sessions, error } = await db
        .from('bootcamp_sessions')
        .select('*')
        .neq('status', 'cancelled')
        .gte('starts_at', since)
        .order('starts_at', { ascending: true })
        .limit(12);
      if (error) throw error;
      const stats = await ticketStats(db, sessions || [], now);
      const week = currentWeekKey(now);
      return json(200, {
        ok: true,
        sessions: (sessions || []).map((s) => publicSession(s, stats[s.id], now)),
        cycle: {
          vote_week: voteWeekKey(now),
          next_selection_at: selectionAt(voteWeekKey(now)).toISOString(),
          sales_deadline: formatDeadline(week),
        },
      });
    }

    throw new HttpError(400, 'BAD_REQUEST', 'action inconnue.');
  } catch (err) {
    return handleError(err, 'bootcamp-public');
  }
};
