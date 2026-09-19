'use strict';
// POST /.netlify/functions/request-trial
// Génère 3 codes d'essai pour un courriel parent et les envoie. Toujours 200 (anti-énumération),
// sauf validation ou rate-limit.

const crypto = require('crypto');
const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { sendEmail, trialCodesEmail } = require('./_lib/email');
const { TRIAL_CREDITS, TRIAL_CODES_PER_EMAIL, TRIAL_VALIDITY_DAYS } = require('./_lib/codes');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const TRIAL_LIMIT = 3;
const TRIAL_WINDOW_SECONDS = 3600;
const REGIONS = ['qc', 'fr', 'us', 'uk'];

// En dev local (pas de clé Resend et hors production), les codes sont renvoyés au client.
function isDevWithoutEmail() {
  return !process.env.RESEND_API_KEY && process.env.CONTEXT !== 'production';
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');
    }
    const region = REGIONS.includes(body.region) ? body.region : 'qc';

    const ipHash = sha256(getIp(event));
    await assertRateLimit(`trial:ip:${ipHash}`, TRIAL_LIMIT, TRIAL_WINDOW_SECONDS);

    // Un seul lot par courriel : insertion « on conflict do nothing ».
    const batchId = crypto.randomUUID();
    const db = getServiceClient();
    const { data: inserted, error: insertError } = await db
      .from('trial_requests')
      .upsert({ email, ip_hash: ipHash, batch_id: batchId }, { onConflict: 'email', ignoreDuplicates: true })
      .select('email');
    if (insertError) throw insertError;
    if (!inserted || inserted.length === 0) {
      // Déjà demandé : même réponse qu'un succès, rien n'est envoyé.
      return json(200, { ok: true });
    }

    // Génération des codes ; si elle échoue, on libère le courriel pour permettre une nouvelle tentative.
    let codes;
    try {
      const expiresAt = new Date(Date.now() + TRIAL_VALIDITY_DAYS * 24 * 3600 * 1000).toISOString();
      codes = await rpc('create_activation_codes', {
        p_type: 'trial',
        p_plan: 'trial',
        p_credits: TRIAL_CREDITS,
        p_count: TRIAL_CODES_PER_EMAIL,
        p_email: email,
        p_batch_id: batchId,
        p_stripe_session_id: null,
        p_expires_at: expiresAt,
      });
    } catch (err) {
      await db.from('trial_requests').delete().eq('email', email).eq('batch_id', batchId);
      throw err;
    }
    if (!Array.isArray(codes) || codes.length === 0) throw new Error('create_activation_codes a renvoyé un tableau vide');

    const { sent } = await sendEmail({ to: email, ...trialCodesEmail({ codes, region }) });

    if (!sent && isDevWithoutEmail()) {
      console.log(`[request-trial] DEV — codes d'essai : ${codes.join(', ')}`);
      return json(200, { ok: true, dev_codes: codes });
    }
    if (!sent) console.error('[request-trial] Courriel non envoyé (codes créés en base).');

    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'request-trial');
  }
};
