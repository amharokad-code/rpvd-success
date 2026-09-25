'use strict';
// POST /.netlify/functions/reverify-device
// Recours pour un payeur légitime bloqué par la friction progressive d'empreinte
// (FINGERPRINT_REVERIFY_REQUIRED, 3e écart sur 24h — voir consume_credit dans
// supabase_schema.sql). La preuve d'identité est le token Bearer lui-même : puisque
// l'auth se fait exclusivement par lien magique (pas de mot de passe, contrat §3),
// un Authorization valide signifie que l'élève vient de recliquer son lien magique
// (ou a une session déjà active) — aucun second facteur à construire ici.
// Réattache l'appareil COURANT comme appareil légitime et remet le compteur à zéro.

const { HttpError, preflight, json, handleError } = require('./_lib/http');
const { getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');

exports.handler = async (event) => {
  const early = preflight(event, ['POST']);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    await rpc('reverify_device_fingerprint', { p_user_id: user.id, p_fingerprint: fingerprint });

    return json(200, { ok: true });
  } catch (err) {
    return handleError(err, 'reverify-device');
  }
};
