'use strict';
// POST { action: 'catalog' } → capsules publiées + bootcamps à venir (sans liens privés).
// POST { action: 'capsule', slug } → une capsule publiée (page d'achat).
// POST { action: 'access', slug, token } → vidéo + sous-titres en URL signée, SEULEMENT avec le jeton d'achat.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { publicCapsule, clean, PRICES } = require('./_lib/capsules');

const SIGNED_SECONDS = 2 * 3600;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const body = parseBody(event);
    const db = getServiceClient();

    if (body.action === 'catalog') {
      const [{ data: caps, error: e1 }, { data: boots, error: e2 }] = await Promise.all([
        db.from('capsules').select('slug,title,type,subject_area,topic,level,price_cad,duration_min').eq('published', true).order('published_at', { ascending: false }),
        db.from('bootcamps').select('id,title,topic,starts_at,capacity,price_cad').gte('starts_at', new Date().toISOString()).order('starts_at').limit(10),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return json(200, { ok: true, capsules: caps || [], bootcamps: boots || [], prices: PRICES });
    }

    const slug = clean(body.slug, 80);
    if (!slug) throw new HttpError(400, 'BAD_REQUEST', 'Capsule inconnue.');
    const { data: cap, error } = await db.from('capsules').select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (error) throw error;
    if (!cap) throw new HttpError(404, 'BAD_REQUEST', 'Capsule introuvable.');

    if (body.action === 'capsule') return json(200, { ok: true, capsule: publicCapsule(cap) });

    if (body.action === 'access') {
      const token = clean(body.token, 100);
      if (!token) throw new HttpError(401, 'UNAUTHORIZED', "Lien d'accès invalide.");
      const { data: order, error: oe } = await db.from('orders').select('id').eq('access_token', token).eq('capsule_id', cap.id).maybeSingle();
      if (oe) throw oe;
      if (!order) throw new HttpError(401, 'UNAUTHORIZED', "Lien d'accès invalide.");
      const sign = async (path) => {
        const { data, error: se } = await db.storage.from('capsules').createSignedUrl(path, SIGNED_SECONDS);
        if (se) throw se;
        return data.signedUrl;
      };
      return json(200, { ok: true, capsule: publicCapsule(cap), video_url: await sign(cap.video_url), subtitles_url: await sign(cap.subtitles_url) });
    }
    throw new HttpError(400, 'BAD_REQUEST', 'Action inconnue.');
  } catch (err) {
    return handleError(err, 'capsule-public');
  }
};
