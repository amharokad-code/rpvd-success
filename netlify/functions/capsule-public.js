'use strict';
// POST { action: 'catalog' } → capsules publiées + bootcamps à venir (sans liens privés).
// POST { action: 'capsule', slug } → une capsule publiée (page d'achat).
// POST { action: 'access', slug, token } → vidéo + sous-titres en URL signée, SEULEMENT avec le jeton d'achat.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { publicCapsule, clean, pricing, priceFor } = require('./_lib/capsules');

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
      const capsules = (caps || []).map(({ topic_key: key, ...c }) => ({ ...c, price_cad: priceFor(c.type), launch_notice: pricing.launchNotice(c.type), requests: counts[key] || 0 }));
      return json(200, { ok: true, capsules, bootcamps: (boots || []).map((b) => ({ ...b, price_cad: priceFor('bootcamp') })), prices: { concept: priceFor('concept'), exam: priceFor('exam'), bootcamp: priceFor('bootcamp') }, tax_note: pricing.TAX_NOTE });
    }

    const slug = clean(body.slug, 80);
    if (!slug) throw new HttpError(400, 'BAD_REQUEST', 'Capsule inconnue.');
    const { data: cap, error } = await db.from('capsules').select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (error) throw error;
    if (!cap) throw new HttpError(404, 'BAD_REQUEST', 'Capsule introuvable.');

    if (body.action === 'capsule') return json(200, { ok: true, capsule: publicCapsule(cap) });

    throw new HttpError(400, 'BAD_REQUEST', 'Action inconnue.');
  } catch (err) {
    return handleError(err, 'capsule-public');
  }
};
