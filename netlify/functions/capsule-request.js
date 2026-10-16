'use strict';
// POST /.netlify/functions/capsule-request : demande de capsule d'un parent (sondage ultra court).
// Requis : courriel, consentement (LCAP, case non pré-cochée), matière, niveau, sujet. Tout le reste est facultatif.
// Récompense : la démo gratuite (page /demo + courriel avec le lien, seulement si la démo est configurée).
// Deuxième appel possible : { update_id, exam_date?, product_wanted? } pour compléter la demande après coup.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { sendEmail, capsuleDemoEmail } = require('./_lib/email');
const { unsubscribeHeaders, siteUrl } = require('./_lib/legal');
const { EMAIL_PATTERN, UUID, clean, unsubscribeLinksFor } = require('./_lib/capsules');
const { resolveTopicKey } = require('./_lib/topic-cluster');

const PRODUCTS = ['concept', 'exam', 'bootcamp'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function verifyTurnstile(token, ip) {
  const turnstileSecret = String(process.env.TURNSTILE_SECRET_KEY || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (!turnstileSecret) return;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: turnstileSecret, response: clean(token, 2048), remoteip: ip }),
  });
  const verdict = await res.json().catch(() => ({}));
  if (!verdict.success) throw new HttpError(400, 'BAD_REQUEST', 'Vérification anti-robot échouée. Réessaie.');
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const b = parseBody(event);
    if (clean(b.bot_field, 50)) return json(200, { ok: true }); // anti-bot
    const db = getServiceClient();
    const ip = getIp(event);
    const demoReady = Boolean(process.env.VITE_DEMO_VIDEO_URL);

    // Compléter une demande existante (date d'examen / produit), dans les 24 h suivant sa création.
    if (b.update_id) {
      if (!UUID.test(String(b.update_id))) throw new HttpError(400, 'BAD_REQUEST', 'Demande inconnue.');
      await assertRateLimit(`capsule-update:ip:${sha256(ip)}`, 20, 3600);
      const patch = {};
      const examDate = clean(b.exam_date, 10);
      if (examDate) {
        if (!DATE.test(examDate)) throw new HttpError(400, 'BAD_REQUEST', "Date d'examen invalide.");
        patch.exam_date = examDate;
      }
      if (b.product_wanted) {
        if (!PRODUCTS.includes(b.product_wanted)) throw new HttpError(400, 'BAD_REQUEST', 'Produit invalide.');
        patch.product_wanted = b.product_wanted;
      }
      if (Object.keys(patch).length) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { error } = await db.from('capsule_requests').update(patch).eq('id', b.update_id).gte('created_at', since);
        if (error) throw error;
      }
      return json(200, { ok: true });
    }

    const email = clean(b.email, 254).toLowerCase();
    const level = clean(b.level, 40);
    const subject = clean(b.subject_area, 60);
    const topic = clean(b.topic, 160);
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');
    if (b.consent_email !== true) throw new HttpError(400, 'BAD_REQUEST', 'Coche la case pour recevoir ta démo.');
    if (!level || !subject || topic.length < 2) throw new HttpError(400, 'BAD_REQUEST', 'Choisis la matière, le niveau et le sujet.');

    await assertRateLimit(`capsule-request:ip:${sha256(ip)}`, 10, 3600);
    await verifyTurnstile(b.turnstile_token, ip);

    // Le sujet est écrit librement : on le rattache à un sujet déjà connu de la même matière et du même niveau
    // (demandes + capsules publiées) quand c'est le même contenu d'examen. Sinon, nouvelle clé.
    const [{ data: known }, { data: published }] = await Promise.all([
      db.from('capsule_requests').select('topic,topic_key').eq('subject_area', subject).eq('level', level).order('created_at', { ascending: false }).limit(200),
      db.from('capsules').select('topic,topic_key').eq('subject_area', subject).eq('level', level).eq('published', true).limit(40),
    ]);
    const key = await resolveTopicKey({ subject, level, topic, candidates: [...(published || []), ...(known || [])] });
    // Une famille ne compte qu'une fois par sujet (la règle « 3 demandes » reste honnête).
    const { data: existing, error: lookupError } = await db.from('capsule_requests').select('id').eq('email', email).eq('topic_key', key).limit(1);
    if (lookupError) throw lookupError;
    let id = existing && existing[0] ? existing[0].id : null;

    if (!id) {
      const { data: row, error } = await db
        .from('capsule_requests')
        .insert({
          parent_first_name: clean(b.parent_first_name, 80) || null,
          email,
          level,
          subject_area: subject,
          topic,
          topic_key: key,
          exam_date: DATE.test(clean(b.exam_date, 10)) ? clean(b.exam_date, 10) : null,
          product_wanted: PRODUCTS.includes(b.product_wanted) ? b.product_wanted : 'exam', // choisi par le parent à l'écran 3 du sondage
          consent_email: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      id = row.id;

      // Démo gratuite par courriel (best-effort, jamais bloquant). Seulement si la démo existe.
      if (demoReady) {
        const links = unsubscribeLinksFor(id);
        await sendEmail({ to: email, ...capsuleDemoEmail({ topic, url: `${siteUrl()}/demo`, unsubscribe: links }), headers: unsubscribeHeaders(links) });
      }
    }
    // Où en est ce sujet ? (honnête : « en préparation » seulement quand 3 familles l'ont demandé, ou déjà disponible)
    const { count } = await db.from('capsule_requests').select('id', { count: 'exact', head: true }).eq('topic_key', key);
    const { data: ready } = await db.from('capsules').select('slug').eq('topic_key', key).eq('published', true).limit(1);
    return json(200, { ok: true, id, demo: demoReady, count: count || 1, needed: 3, ready_slug: ready && ready[0] ? ready[0].slug : null });
  } catch (err) {
    return handleError(err, 'capsule-request');
  }
};
