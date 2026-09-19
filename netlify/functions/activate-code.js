'use strict';
// POST /.netlify/functions/activate-code
// Ajoute les crédits d'un code au compte anonyme et verrouille l'empreinte (RPC activate_code).

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { sendEmail, activationConfirmedEmail } = require('./_lib/email');
const { normalizeCode, isValidCodeFormat } = require('./_lib/codes');

const ACTIVATE_LIMIT = 3;
const ACTIVATE_WINDOW_SECONDS = 60;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    // Authentification + empreinte obligatoires.
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');
    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    // Rate-limit par IP puis par utilisateur (3 / 60 s chacun).
    await assertRateLimit(`activate:ip:${sha256(getIp(event))}`, ACTIVATE_LIMIT, ACTIVATE_WINDOW_SECONDS);
    await assertRateLimit(`activate:user:${user.id}`, ACTIVATE_LIMIT, ACTIVATE_WINDOW_SECONDS);

    // Normalisation + contrôle de format avant d'interroger la base.
    const body = parseBody(event);
    const code = normalizeCode(body.code);
    if (!code) throw new HttpError(400, 'BAD_REQUEST', 'Code manquant.');
    if (!isValidCodeFormat(code)) throw new HttpError(404, 'INVALID_CODE');

    // Activation atomique (INVALID_CODE / CODE_USED / CODE_EXPIRED / FINGERPRINT_MISMATCH mappés par rpc()).
    // Comme pour consume_credit, le RAISE EXCEPTION annule la transaction de activate_code :
    // c'est au backend de journaliser le FINGERPRINT_MISMATCH dans security_events.
    let result;
    try {
      result = await rpc('activate_code', { p_user_id: user.id, p_code: code, p_fingerprint: fingerprint });
    } catch (err) {
      if (err instanceof HttpError && err.code === 'FINGERPRINT_MISMATCH') {
        await getServiceClient()
          .from('security_events')
          .insert({
            user_id: user.id,
            kind: 'fingerprint_mismatch',
            details: { ip_hash: sha256(getIp(event)), fingerprint: fingerprint.slice(0, 12), fn: 'activate-code' },
          })
          .then(() => {}, (e) => console.error('[security_events]', e.message));
      }
      throw err;
    }
    const credits = Number(result && result.credits) || 0;
    const plan = (result && result.plan) || 'trial';
    const email = (result && result.email) || null;

    // Courriel de confirmation si le code était rattaché à un courriel (jamais bloquant).
    if (email) {
      await sendEmail({ to: email, ...activationConfirmedEmail({ plan, credits }) });
    }

    return json(200, { credits, plan, email });
  } catch (err) {
    return handleError(err, 'activate-code');
  }
};
