'use strict';
// POST /.netlify/functions/analyze-guest
// Essai SANS COMPTE : une analyse complète (3 niveaux) pour que la valeur soit vue AVANT de demander un courriel.
// Rien n'est enregistré : ni photo, ni analyse, ni identité (pas de submissions, pas de crédit, pas de compte).
// Garde-fous anti-abus (chaque analyse coûte un appel Gemini) :
//   - porte d'âge confirmée côté client (ageConfirmed) ;
//   - empreinte d'appareil obligatoire : 2 essais par appareil / 30 jours (le 2e = reprise si l'IA échoue) ;
//   - 4 essais / 24 h par IP (hachée, jamais stockée en clair) ;
//   - plafond global GUEST_DAILY_CAP (400 par défaut) / 24 h ; coupe-circuit : GUEST_TRIAL_DISABLED=1.
// Les champs réservés aux forfaits payants (indice, piège, consigne) sont retirés.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getFingerprint } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { analyzeImage } = require('./_lib/gemini');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const REGIONS = ['qc', 'fr', 'us', 'uk'];
const MODES = ['calcul', 'raisonnement'];
const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const DAY = 86400;

function decodedSize(base64) {
  const length = base64.length;
  if (length === 0) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.floor((length * 3) / 4) - padding;
}

function validateBody(body) {
  let base64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  const comma = base64.startsWith('data:') ? base64.indexOf(',') : -1;
  if (comma !== -1) base64 = base64.slice(comma + 1);
  base64 = base64.replace(/\s+/g, '');
  if (!base64) throw new HttpError(400, 'BAD_REQUEST', 'Image manquante.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpError(400, 'BAD_REQUEST', 'Image mal encodée.');
  if (decodedSize(base64) > MAX_DECODED_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new HttpError(400, 'BAD_REQUEST', 'Format non supporté (JPEG, PNG, WebP ou PDF).');
  return {
    base64,
    mimeType,
    region: REGIONS.includes(body.region) ? body.region : 'qc',
    mode: MODES.includes(body.mode) ? body.mode : 'calcul',
  };
}

// Journal du moteur : jamais bloquant, aucune donnée d'élève ni image (user_id vide = essai sans compte).
function logEngine(row) {
  try {
    getServiceClient()
      .from('engine_logs')
      .insert({ ...row, user_id: null })
      .then(() => {}, (e) => console.error('[engine_logs]', e && e.message));
  } catch (e) {
    console.error('[engine_logs]', e && e.message);
  }
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  const started = Date.now();
  let mode = 'calcul';
  let region = 'qc';
  try {
    if (process.env.GUEST_TRIAL_DISABLED === '1') {
      throw new HttpError(503, 'SERVER_ERROR', "L'essai sans compte est momentanément fermé. Crée ton compte gratuit pour essayer.");
    }

    const body = parseBody(event);
    if (body.ageConfirmed !== true) throw new HttpError(400, 'BAD_REQUEST', "Confirme ton âge avant d'essayer.");

    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    const validated = validateBody(body);
    mode = validated.mode;
    region = validated.region;

    const cap = Math.max(1, Number(process.env.GUEST_DAILY_CAP) || 400);
    await assertRateLimit('guest:all', cap, DAY);
    await assertRateLimit(`guest:ip:${sha256(getIp(event))}`, 4, DAY);
    await assertRateLimit(`guest:fp:${fingerprint}`, 2, 30 * DAY);

    let result;
    try {
      result = await analyzeImage({ base64: validated.base64, mimeType: validated.mimeType, region, mode, taskType: 'guest' });
    } catch (err) {
      logEngine({ mode, region, latency_ms: Date.now() - started, statut: err && err.code === 'OCR_FAIL' ? 'incomplet' : 'erreur', error_code: (err && err.code) || 'AI_ERROR' });
      throw err instanceof HttpError ? err : new HttpError(502, 'AI_ERROR');
    }

    const { analysis, metrics } = result;
    logEngine({
      mode,
      region,
      model: metrics && metrics.modelUsed,
      latency_ms: Date.now() - started,
      finish_reason: metrics && metrics.finishReason,
      statut: 'ok',
      confiance: analysis.confiance,
      pattern_key: analysis.pattern_key,
      error_code: null,
    });

    // Essai gratuit = comme un compte gratuit : sans indice, piège ni consigne reformulée.
    const { hint, pitfall, piege, consigne_translation, ...clientAnalysis } = analysis;
    return json(200, { analysis: clientAnalysis });
  } catch (err) {
    return handleError(err, 'analyze-guest');
  }
};
