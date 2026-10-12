'use strict';
// POST ?c=<id de demande> (ou JSON { c }) : désabonne ce courriel de toutes les séquences capsules (LCAP).
const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { UUID } = require('./_lib/capsules');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    let id = (event.queryStringParameters || {}).c;
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
      if (raw.trim().startsWith('{')) id = JSON.parse(raw).c || id;
    } catch (_) {
      /* corps ignoré */
    }
    if (!UUID.test(String(id || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Lien de désabonnement invalide.');

    const db = getServiceClient();
    const { data } = await db.from('capsule_requests').select('email').eq('id', id).maybeSingle();
    if (data && data.email) {
      const { error } = await db.from('capsule_requests').update({ unsubscribed_at: new Date().toISOString() }).eq('email', data.email).is('unsubscribed_at', null);
      if (error) throw error;
    }
    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'capsule-unsubscribe');
  }
};
