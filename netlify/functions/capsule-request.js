'use strict';
// POST /.netlify/functions/capsule-request : demande de capsule d'un parent.
// LCAP : consent_email === true obligatoire (case non pré-cochée côté page). Aucun courriel sans cela.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { EMAIL_PATTERN, topicKey, clean } = require('./_lib/capsules');

const PRODUCTS = ['concept', 'exam', 'bootcamp'];

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const b = parseBody(event);
    if (clean(b.bot_field, 50)) return json(200, { ok: true }); // anti-bot

    const email = clean(b.email, 254).toLowerCase();
    const parent = clean(b.parent_first_name, 80);
    const child = clean(b.child_first_name, 80);
    const level = clean(b.level, 40);
    const subject = clean(b.subject_area, 60);
    const topic = clean(b.topic, 160);
    const product = clean(b.product_wanted, 20) || 'exam';
    const examDate = clean(b.exam_date, 10);

    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');
    if (b.consent_email !== true) throw new HttpError(400, 'BAD_REQUEST', 'Coche la case de consentement pour envoyer ta demande.');
    if (!parent || !level || !subject || topic.length < 2) throw new HttpError(400, 'BAD_REQUEST', 'Remplis les champs obligatoires.');
    if (!PRODUCTS.includes(product)) throw new HttpError(400, 'BAD_REQUEST', 'Produit invalide.');
    if (examDate && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw new HttpError(400, 'BAD_REQUEST', "Date d'examen invalide.");

    await assertRateLimit(`capsule-request:ip:${sha256(getIp(event))}`, 10, 3600);

    // Cloudflare Turnstile : obligatoire dès que TURNSTILE_SECRET_KEY est configurée.
    if (process.env.TURNSTILE_SECRET_KEY) {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: clean(b.turnstile_token, 2048), remoteip: getIp(event) }),
      });
      const verdict = await res.json().catch(() => ({}));
      if (!verdict.success) throw new HttpError(400, 'BAD_REQUEST', 'Vérification anti-robot échouée. Réessaie.');
    }

    const { error } = await getServiceClient().from('capsule_requests').insert({
      parent_first_name: parent,
      email,
      child_first_name: child || null,
      level,
      subject_area: subject,
      topic,
      topic_key: topicKey(topic),
      exam_date: examDate || null,
      product_wanted: product,
      consent_email: true,
    });
    if (error) throw error;
    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'capsule-request');
  }
};
