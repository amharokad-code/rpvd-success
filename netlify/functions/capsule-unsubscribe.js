'use strict';
// POST ?c=<id de demande> (ou JSON { c }) : désabonne ce courriel de toutes les séquences capsules (LCAP).
const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { UUID } = require('./_lib/capsules');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const q = event.queryStringParameters || {};
    let id = q.c;
    let orderId = q.o;
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
      if (raw.trim().startsWith('{')) {
        const parsed = JSON.parse(raw);
        id = parsed.c || id;
        orderId = parsed.o || orderId;
      }
    } catch (_) {
      /* corps ignoré */
    }
    if (!UUID.test(String(id || orderId || ''))) throw new HttpError(400, 'BAD_REQUEST', 'Lien de désabonnement invalide.');

    const db = getServiceClient();
    if (orderId && UUID.test(String(orderId))) {
      const { data: order } = await db.from('orders').select('email').eq('id', orderId).maybeSingle();
      if (order && order.email) await db.from('email_optouts').upsert({ email: order.email }, { onConflict: 'email', ignoreDuplicates: true });
      return json(200, { ok: true });
    }
    const { data } = await db.from('capsule_requests').select('email').eq('id', id).maybeSingle();
    if (data && data.email) {
      await db.from('email_optouts').upsert({ email: data.email }, { onConflict: 'email', ignoreDuplicates: true });
      const { error } = await db.from('capsule_requests').update({ unsubscribed_at: new Date().toISOString() }).eq('email', data.email).is('unsubscribed_at', null);
      if (error) throw error;
    }
    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'capsule-unsubscribe');
  }
};
