'use strict';
// POST /.netlify/functions/analyze-tentative
// Phase 7 (RPVD_FEATURES_PROMPT.md) : compare la photo de l'exercice original à la photo de la
// tentative de l'élève, localise l'erreur. Consomme 1 crédit (2 images envoyées à Gemini).
//
// ⚠️ Cette route est câblée et testable, mais N'A PAS ENCORE ÉTÉ VALIDÉE selon le contrat
// (20 vraies copies d'élèves, diagnostic vérifié manuellement, seuil 80% avant lancement public
// — voir PROJECT_HANDOFF.md). Ne pas exposer de bouton public vers cette route avant cette
// validation manuelle, qui nécessite de vraies copies d'élèves qu'un agent ne peut pas fabriquer.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { analyzeTentative } = require('./_lib/gemini');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const REGIONS = ['qc', 'fr', 'us', 'uk'];
const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 3600;

function decodedSize(base64) {
  const length = base64.length;
  if (length === 0) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.floor((length * 3) / 4) - padding;
}

function parseImage(rawBase64, rawMimeType, label) {
  let base64 = typeof rawBase64 === 'string' ? rawBase64 : '';
  const commaIndex = base64.startsWith('data:') ? base64.indexOf(',') : -1;
  if (commaIndex !== -1) base64 = base64.slice(commaIndex + 1);
  base64 = base64.replace(/\s+/g, '');
  if (!base64) throw new HttpError(400, 'BAD_REQUEST', `${label} manquante.`);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpError(400, 'BAD_REQUEST', `${label} mal encodée.`);
  if (decodedSize(base64) > MAX_DECODED_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');

  const mimeType = typeof rawMimeType === 'string' ? rawMimeType.trim().toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new HttpError(400, 'BAD_REQUEST', `${label} : format non supporté (JPEG, PNG ou WebP).`);
  }
  return { base64, mimeType };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    await assertRateLimit(`tentative:user:${user.id}`, RATE_LIMIT, RATE_WINDOW_SECONDS);

    const body = parseBody(event);
    const exerciseImage = parseImage(body.exerciseImageBase64, body.exerciseMimeType, 'Photo de l’exercice');
    const attemptImage = parseImage(body.attemptImageBase64, body.attemptMimeType, 'Photo de la tentative');
    const region = REGIONS.includes(body.region) ? body.region : 'qc';

    let consumed;
    try {
      consumed = await rpc('consume_credit', { p_user_id: user.id, p_fingerprint: fingerprint });
    } catch (err) {
      if (err instanceof HttpError && err.code === 'FINGERPRINT_MISMATCH') {
        await getServiceClient()
          .from('security_events')
          .insert({
            user_id: user.id,
            kind: 'fingerprint_mismatch',
            details: { ip_hash: sha256(getIp(event)), fingerprint: fingerprint.slice(0, 12), fn: 'analyze-tentative' },
          })
          .then(() => {}, (e) => console.error('[security_events]', e.message));
      }
      throw err;
    }
    const creditsRemaining = Number(consumed && consumed.credits_remaining) || 0;

    let result;
    try {
      const response = await analyzeTentative({ exerciseImage, attemptImage, region });
      result = response.result;
    } catch (err) {
      try {
        await rpc('refund_credit', { p_user_id: user.id });
      } catch (refundError) {
        console.error('[analyze-tentative] Remboursement impossible :', refundError && refundError.message);
      }
      throw err instanceof HttpError ? err : new HttpError(502, 'AI_ERROR');
    }

    return json(200, { result, credits_remaining: creditsRemaining });
  } catch (err) {
    return handleError(err, 'analyze-tentative');
  }
};
