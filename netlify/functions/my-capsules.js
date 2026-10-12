'use strict';
// POST (session Supabase + x-device-fingerprint requis)
//   { action: 'list' }          → capsules achetées (commandes actives)
//   { action: 'watch', slug }   → jeton de lecture neuf (aucune limite de visionnements)
// L'accès est à vie. Seuls 2 appareils par courriel sont autorisés.

const { HttpError, preflight, parseBody, json, header, handleError } = require('./_lib/http');
const { getServiceClient, getFingerprint } = require('./_lib/supabase');
const { authorizeDevice } = require('./_lib/devices');
const { playbackFor } = require('./_lib/playback');
const { publicCapsule, clean } = require('./_lib/capsules');

async function sessionEmail(db, event) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(header(event, 'authorization') || '').trim());
  if (!m) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');
  const { data, error } = await db.auth.getUser(m[1]);
  const email = data && data.user && String(data.user.email || '').toLowerCase();
  if (error || !email) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');
  return email;
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const db = getServiceClient();
    const email = await sessionEmail(db, event);
    await authorizeDevice(db, email, getFingerprint(event));
    const body = parseBody(event);

    const { data: orders, error } = await db
      .from('orders')
      .select('capsule_id, created_at, capsules(id,slug,title,type,subject_area,topic,level,price_cad,duration_min,cover_url,video_url,subtitles_url,published)')
      .eq('email', email)
      .eq('status', 'active')
      .not('capsule_id', 'is', null);
    if (error) throw error;
    const owned = (orders || []).filter((o) => o.capsules);

    if (body.action === 'watch') {
      const order = owned.find((o) => o.capsules.slug === clean(body.slug, 80));
      if (!order) throw new HttpError(403, 'UNAUTHORIZED', "Tu n'as pas accès à cette capsule.");
      return json(200, { ok: true, capsule: publicCapsule(order.capsules), ...(await playbackFor(db, order.capsules, email)) });
    }
    return json(200, { ok: true, email, capsules: owned.map((o) => ({ ...publicCapsule(o.capsules), cover_url: o.capsules.cover_url, purchased_at: o.created_at })) });
  } catch (err) {
    return handleError(err, 'my-capsules');
  }
};
