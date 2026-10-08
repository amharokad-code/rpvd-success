'use strict';
// Bêta fermée (48 h de test + 24 h de grâce pour voter) : constantes, garde d'accès et observation
// de l'empreinte d'appareil. Nommée « beta » pour ne pas se mêler au Bootcamp Zoom.
//
// Règles :
//   - un code kind = 'beta' donne BETA_CREDITS crédits et marque le compte (is_beta, beta_started_at) ;
//   - l'accès gratuit se termine à beta_started_at + BETA_WINDOW_HOURS ; un compte qui a un forfait
//     payant (Basic/Pro) n'est jamais coupé ;
//   - empreinte en MODE OBSERVATION : on ne bloque rien, on journalise (fingerprint_events) et on
//     présente à consume_credit l'empreinte déjà enregistrée pour éviter tout écart.

const { HttpError } = require('./http');
const { getServiceClient } = require('./supabase');

const BETA_CREDITS = 20;
const BETA_WINDOW_HOURS = 72;
const PAID_PLANS = ['basic', 'pro', 'premium_solo', 'premium_trio'];

function betaEndsAt(startedAt) {
  return new Date(new Date(startedAt).getTime() + BETA_WINDOW_HOURS * 3600 * 1000);
}

// Pure (testable) : l'accès gratuit de bêta est-il terminé pour ce profil ?
function isBetaExpired(profile, now = Date.now()) {
  if (!profile || !profile.is_beta || !profile.beta_started_at) return false;
  if (PAID_PLANS.includes(profile.plan)) return false;
  return now >= betaEndsAt(profile.beta_started_at).getTime();
}

// À appeler juste avant consume_credit. Renvoie l'empreinte à présenter à consume_credit.
// Ne bloque jamais pour une raison d'empreinte ; ne lève que BETA_ENDED (fenêtre dépassée).
async function betaGate(userId, fingerprint, { now = Date.now(), db } = {}) {
  const client = db || getServiceClient();
  const { data: u, error } = await client
    .from('users')
    .select('is_beta, beta_started_at, plan, device_fingerprint')
    .eq('id', userId)
    .maybeSingle();
  if (error || !u || !u.is_beta) return { isBeta: false, fingerprint };
  if (isBetaExpired(u, now)) throw new HttpError(403, 'BETA_ENDED', "La bêta est terminée. Merci d'avoir testé !");
  // Observation : une ligne par empreinte distincte vue pour ce compte (best-effort, jamais bloquant).
  try {
    const { data: seen } = await client.from('fingerprint_events').select('id').eq('user_id', userId).eq('fp_hash', fingerprint).limit(1);
    if (!seen || seen.length === 0) await client.from('fingerprint_events').insert({ user_id: userId, fp_hash: fingerprint });
  } catch (e) {
    console.error('[fingerprint_events]', e && e.message);
  }
  return { isBeta: true, fingerprint: u.device_fingerprint || fingerprint };
}

module.exports = { BETA_CREDITS, BETA_WINDOW_HOURS, PAID_PLANS, betaEndsAt, isBetaExpired, betaGate };
