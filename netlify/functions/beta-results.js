'use strict';
// POST /.netlify/functions/beta-results   (fondateur seulement)
// Auth : JWT Supabase (Authorization: Bearer) dont le courriel figure dans ADMIN_EMAILS (liste séparée
// par des virgules). Renvoie UNIQUEMENT des agrégats (jamais de réponse nominative) + le verdict.
const { HttpError, preflight, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { summarize, verdict } = require('./_lib/beta-report');

function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Vérifie le JWT et renvoie le courriel (null si invalide). Séparé pour être testable.
async function emailFromToken(db, authHeader) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(authHeader || '').trim());
  if (!m) return null;
  try {
    const { data, error } = await db.auth.getUser(m[1]);
    if (error || !data || !data.user) return null;
    return String(data.user.email || '').toLowerCase() || null;
  } catch (_) {
    return null;
  }
}

async function loadAll(db, userIds) {
  const [subs, feedback, votes, logs, fpEvents, securityEvents] = await Promise.all([
    db.from('submissions').select('user_id, created_at').in('user_id', userIds).limit(20000),
    db.from('beta_feedback').select('user_id, niveau_debloquant, refaire_seul, commentaire').in('user_id', userIds).limit(20000),
    db.from('beta_votes').select('user_id, poll_key, choices, autre').in('user_id', userIds).limit(20000),
    db.from('engine_logs').select('user_id, latency_ms, statut, model, created_at').in('user_id', userIds).limit(20000),
    db.from('fingerprint_events').select('user_id, fp_hash').in('user_id', userIds).limit(20000),
    db.from('security_events').select('user_id, kind').in('user_id', userIds).limit(20000),
  ]);
  for (const r of [subs, feedback, votes, logs, fpEvents, securityEvents]) if (r.error) throw r.error;
  return { subs: subs.data, feedback: feedback.data, votes: votes.data, logs: logs.data, fpEvents: fpEvents.data, securityEvents: securityEvents.data };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const allowed = adminEmails();
    if (!allowed.length) throw new HttpError(500, 'SERVER_ERROR', 'ADMIN_EMAILS non défini côté serveur.');
    const db = getServiceClient();
    const email = await emailFromToken(db, header(event, 'authorization'));
    if (!email) throw new HttpError(401, 'UNAUTHORIZED');
    if (!allowed.includes(email)) throw new HttpError(403, 'FORBIDDEN');

    const { data: users, error } = await db.from('users').select('id, plan, beta_started_at').eq('is_beta', true);
    if (error) throw error;
    const list = users || [];
    const data = list.length ? await loadAll(db, list.map((u) => u.id)) : { subs: [], feedback: [], votes: [], logs: [], fpEvents: [], securityEvents: [] };
    const summary = summarize({ users: list, ...data });
    return json(200, { summary, verdict: verdict(summary), generated_at: new Date().toISOString() });
  } catch (err) {
    return handleError(err, 'beta-results');
  }
};

exports.emailFromToken = emailFromToken;
