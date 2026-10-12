'use strict';
// POST { action: 'catalog' } → capsules publiées + bootcamps à venir (sans liens privés).
// POST { action: 'capsule', slug } → une capsule publiée (page d'achat).
// POST { action: 'access', slug, token } → vidéo + sous-titres en URL signée, SEULEMENT avec le jeton d'achat.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { publicCapsule, clean, PRICES } = require('./_lib/capsules');

const SIGNED_SECONDS = 2 * 3600;
const OTP_TTL_SECONDS = 300; // le jeton sert à démarrer la lecture : expiration courte

async function vdoOtp(videoId, email) {
  const secret = process.env.VDOCIPHER_API_SECRET;
  if (!secret) throw new Error('VDOCIPHER_API_SECRET manquante');
  const date = new Date().toISOString().slice(0, 10);
  const annotate = JSON.stringify([
    // Filigrane dynamique : courriel de l'acheteur + date, en mouvement.
    { type: 'rtext', text: `${email} · ${date}`, alpha: '0.55', color: '0xFFFFFF', size: '14', interval: '4000' },
    // Filigrane fixe de marque.
    { type: 'text', text: 'RPVD', alpha: '0.35', color: '0xFFFFFF', size: '18', x: '3%', y: '5%' },
  ]);
  const res = await fetch(`https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`, {
    method: 'POST',
    headers: { Authorization: `Apisecret ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ttl: OTP_TTL_SECONDS, annotate }),
  });
  if (!res.ok) throw new Error(`VdoCipher HTTP ${res.status}`);
  const { otp, playbackInfo } = await res.json();
  return { otp, playbackInfo };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const body = parseBody(event);
    const db = getServiceClient();

    if (body.action === 'catalog') {
      const [{ data: caps, error: e1 }, { data: boots, error: e2 }] = await Promise.all([
        db.from('capsules').select('slug,title,type,subject_area,topic,topic_key,level,price_cad,duration_min,cover_url').eq('published', true).order('published_at', { ascending: false }),
        db.from('bootcamps').select('id,title,topic,starts_at,capacity,price_cad').gte('starts_at', new Date().toISOString()).order('starts_at').limit(10),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      // Preuve sociale honnête : le vrai nombre de demandes pour le sujet de chaque capsule.
      const keys = [...new Set((caps || []).map((c) => c.topic_key))];
      const counts = {};
      if (keys.length) {
        const { data: reqs, error: e3 } = await db.from('capsule_requests').select('topic_key').in('topic_key', keys);
        if (e3) throw e3;
        for (const r of reqs || []) counts[r.topic_key] = (counts[r.topic_key] || 0) + 1;
      }
      const capsules = (caps || []).map(({ topic_key: key, ...c }) => ({ ...c, requests: counts[key] || 0 }));
      return json(200, { ok: true, capsules, bootcamps: boots || [], prices: PRICES });
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
      const { data: order, error: oe } = await db.from('orders').select('id,email').eq('access_token', token).eq('capsule_id', cap.id).maybeSingle();
      if (oe) throw oe;
      if (!order) throw new HttpError(401, 'UNAUTHORIZED', "Lien d'accès invalide.");
      // VdoCipher (DRM + filigrane dynamique) : video_url = « vdo:<id de la vidéo> ». Jeton OTP court, généré
      // seulement ici, pour un acheteur vérifié. Aucune URL vidéo brute n'est jamais renvoyée.
      if (String(cap.video_url).startsWith('vdo:')) {
        return json(200, { ok: true, capsule: publicCapsule(cap), vdo: await vdoOtp(cap.video_url.slice(4), order.email) });
      }
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
