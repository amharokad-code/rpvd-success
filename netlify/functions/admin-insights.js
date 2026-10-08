'use strict';
// POST /.netlify/functions/admin-insights   (équipe seulement : header x-admin-token = BOOTCAMP_ADMIN_TOKEN)
// body : { days?: 7 | 14 | 30 | 90 }
// Renvoie un rapport ANONYME (entonnoir, points de sortie, erreurs, santé du moteur, activation / rétention / churn,
// diagnostics en clair). Aucun courriel, aucune IP, aucun identifiant de compte dans la réponse.

const crypto = require('crypto');
const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { analyze } = require('./_lib/insights');

const PAGE = 1000;
const MAX_ROWS = 60000;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Lecture paginée (PostgREST plafonne à 1000 lignes par requête).
async function fetchAll(build) {
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// Tolère l'absence des colonnes / tables pas encore migrées : l'analyse reste utilisable avec ce qui existe.
async function safe(label, fn, warnings, fallback) {
  try {
    return await fn();
  } catch (e) {
    warnings.push(`${label} : ${String(e && e.message).slice(0, 120)}`);
    return fallback;
  }
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const expected = process.env.BOOTCAMP_ADMIN_TOKEN;
    if (!expected) throw new HttpError(500, 'SERVER_ERROR', 'BOOTCAMP_ADMIN_TOKEN manquant côté serveur.');
    const given = header(event, 'x-admin-token');
    if (!given || !safeEqual(given, expected)) throw new HttpError(401, 'UNAUTHORIZED');

    const body = parseBody(event);
    const days = [7, 14, 30, 90].includes(Number(body.days)) ? Number(body.days) : 30;
    const now = Date.now();
    const since = new Date(now - days * 86400000).toISOString();
    const since60 = new Date(now - Math.max(days, 60) * 86400000).toISOString();
    const db = getServiceClient();
    const warnings = [];

    const events = await safe(
      'analytics_events',
      async () => {
        const rows = await fetchAll(() =>
          db.from('analytics_events').select('event_type, path, region, plan, sid, device, source, props, created_at').gte('created_at', since).order('created_at', { ascending: true }),
        );
        return rows;
      },
      warnings,
      [],
    );
    // Repli si les colonnes riches n'existent pas encore (migration SQL non exécutée).
    const eventsRows = events.length
      ? events
      : await safe(
          'analytics_events (ancien format)',
          () => fetchAll(() => db.from('analytics_events').select('event_type, path, region, plan, created_at').gte('created_at', since).order('created_at', { ascending: true })),
          warnings,
          [],
        );

    const engine = await safe(
      'engine_logs',
      () => fetchAll(() => db.from('engine_logs').select('mode, region, model, latency_ms, finish_reason, statut, confiance, pattern_key, error_code, created_at').gte('created_at', since).order('created_at', { ascending: true })),
      warnings,
      [],
    );
    const users = await safe(
      'users',
      () => fetchAll(() => db.from('users').select('id, plan, credits, plan_expires_at, created_at').order('created_at', { ascending: true })),
      warnings,
      [],
    );
    const submissions = await safe(
      'submissions',
      () => fetchAll(() => db.from('submissions').select('user_id, created_at').gte('created_at', since60).order('created_at', { ascending: true })),
      warnings,
      [],
    );

    const report = analyze({ events: eventsRows, engine, users, submissions, now, days });
    report.warnings = warnings;
    if (eventsRows.length && !eventsRows.some((e) => e.sid)) {
      report.warnings.push("Aucun identifiant de session (sid) reçu : exécute la migration SQL « analytics v2 » pour activer l'entonnoir par étape.");
    }
    return json(200, report);
  } catch (err) {
    return handleError(err, 'admin-insights');
  }
};
