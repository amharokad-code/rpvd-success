'use strict';
// POST { email } → envoie un lien magique à usage unique vers /mes-capsules, par NOTRE courriel (Resend).
// Limites : 3 demandes/heure/courriel, 10/heure/IP. Le courriel n'est envoyé que s'il y a une commande
// active et si l'appareil est déjà autorisé ou s'il reste une place (max 2). Réponse identique sinon
// (aucune fuite sur l'existence d'un compte, aucune boîte inondée).

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getFingerprint } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { deviceState, DEVICE_MESSAGE } = require('./_lib/devices');
const { sendEmail, loginLinkEmail } = require('./_lib/email');
const { siteUrl } = require('./_lib/legal');
const { EMAIL_PATTERN, clean } = require('./_lib/capsules');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const email = clean(parseBody(event).email, 254).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'BAD_REQUEST', 'Courriel invalide.');
    await assertRateLimit(`login:email:${sha256(email)}`, 3, 3600);
    await assertRateLimit(`login:ip:${sha256(getIp(event))}`, 10, 3600);

    const db = getServiceClient();
    const { count, error } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('email', email).eq('status', 'active');
    if (error) throw error;
    if (!count) return json(200, { ok: true });

    const fingerprint = getFingerprint(event);
    if (fingerprint && !(await deviceState(db, email, fingerprint)).allowed) {
      throw new HttpError(403, 'FINGERPRINT_MISMATCH', DEVICE_MESSAGE);
    }

    const { data, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${siteUrl()}/mes-capsules` } });
    if (linkError) throw linkError;
    await sendEmail({ to: email, ...loginLinkEmail({ url: data.properties.action_link }) });
    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'request-login-link');
  }
};
