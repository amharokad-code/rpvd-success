'use strict';
// POST /.netlify/functions/analyze-homework
// Ordre strict : auth → empreinte → rate-limit → validation → consume_credit → Gemini
// (remboursement si échec) → insert submission → 200.
// L'image n'est jamais stockée ni journalisée : seule l'analyse est conservée.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { analyzeImage } = require('./_lib/gemini');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
// Quadri-langue (contrat §3) : qc/fr = français, us/uk = anglais (ton distinct chacun).
const REGIONS = ['qc', 'fr', 'us', 'uk'];
const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const GEMINI_RATE_LIMIT = 5;
const GEMINI_RATE_WINDOW_SECONDS = 3600;

// Taille décodée d'une chaîne base64 sans la décoder.
function decodedSize(base64) {
  const length = base64.length;
  if (length === 0) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.floor((length * 3) / 4) - padding;
}

// Valide le body : base64 propre (sans préfixe data:), MIME autorisé, région optionnelle.
function validateBody(body) {
  let base64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  const commaIndex = base64.startsWith('data:') ? base64.indexOf(',') : -1;
  if (commaIndex !== -1) base64 = base64.slice(commaIndex + 1);
  base64 = base64.replace(/\s+/g, '');
  if (!base64) throw new HttpError(400, 'BAD_REQUEST', 'Image manquante.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpError(400, 'BAD_REQUEST', 'Image mal encodée.');
  if (decodedSize(base64) > MAX_DECODED_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');

  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Format non supporté (JPEG, PNG, WebP ou PDF).');
  }

  const region = REGIONS.includes(body.region) ? body.region : null;

  // Image de référence optionnelle (exemple de notation) — mêmes règles que l'image principale,
  // simplement pas obligatoire.
  let notationImage = null;
  if (typeof body.notationImageBase64 === 'string' && body.notationImageBase64) {
    let notationBase64 = body.notationImageBase64;
    const nCommaIndex = notationBase64.startsWith('data:') ? notationBase64.indexOf(',') : -1;
    if (nCommaIndex !== -1) notationBase64 = notationBase64.slice(nCommaIndex + 1);
    notationBase64 = notationBase64.replace(/\s+/g, '');
    const notationMimeType = typeof body.notationMimeType === 'string' ? body.notationMimeType.trim().toLowerCase() : '';
    if (
      notationBase64 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(notationBase64) &&
      decodedSize(notationBase64) <= MAX_DECODED_BYTES &&
      ALLOWED_MIME_TYPES.includes(notationMimeType)
    ) {
      notationImage = { base64: notationBase64, mimeType: notationMimeType };
    }
  }

  return { base64, mimeType, region, notationImage };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    // 1. Authentification (session Supabase anonyme).
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    // 2. Empreinte d'appareil obligatoire.
    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    // 3. Rate-limit Gemini par utilisateur.
    await assertRateLimit(`gemini:user:${user.id}`, GEMINI_RATE_LIMIT, GEMINI_RATE_WINDOW_SECONDS);

    // 4. Validation du body.
    const parsedBody = parseBody(event);
    const { base64, mimeType, region: bodyRegion, notationImage } = validateBody(parsedBody);
    // Notation saisie pour CETTE analyse (nouveau bloc au-dessus de la zone d'upload) — prioritaire
    // sur la préférence enregistrée au profil, sans l'écraser silencieusement.
    const bodyNotation = typeof parsedBody.notationText === 'string' ? parsedBody.notationText.trim().slice(0, 300) : '';

    // Préférences utilisateur (notation + région par défaut).
    const { data: profile, error: profileError } = await getServiceClient()
      .from('users')
      .select('preferred_notation, region')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const region = bodyRegion || (profile && REGIONS.includes(profile.region) ? profile.region : 'qc');
    const preferredNotation = bodyNotation || (profile && profile.preferred_notation) || '';

    // 5. Consommation atomique d'un crédit (NO_CREDITS → 402, FINGERPRINT_MISMATCH → 403).
    // Le RAISE EXCEPTION de consume_credit annule sa transaction (donc son propre insert
    // security_events) : c'est au backend de journaliser l'incident (contrat §0/§2).
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
            details: { ip_hash: sha256(getIp(event)), fingerprint: fingerprint.slice(0, 12), fn: 'analyze-homework' },
          })
          .then(() => {}, (e) => console.error('[security_events]', e.message));
      }
      throw err;
    }
    const creditsRemaining = Number(consumed && consumed.credits_remaining) || 0;

    // 6. Analyse Gemini ; remboursement du crédit en cas d'échec.
    let analysis;
    let geminiMetrics = null;
    try {
      const result = await analyzeImage({ base64, mimeType, region, preferredNotation, notationImage, taskType: 'full_analysis' });
      analysis = result.analysis;
      geminiMetrics = result.metrics;
    } catch (err) {
      try {
        await rpc('refund_credit', { p_user_id: user.id });
      } catch (refundError) {
        console.error('[analyze-homework] Remboursement impossible :', refundError && refundError.message);
      }
      throw err instanceof HttpError ? err : new HttpError(502, 'AI_ERROR');
    }

    // 7. Enregistrement de la soumission (sans l'image).
    const { data: submission, error: insertError } = await getServiceClient()
      .from('submissions')
      .insert({
        user_id: user.id,
        problem_type: analysis.problem_type,
        level_1_response: analysis.level_1,
        level_2_response: analysis.level_2,
        level_3_response: analysis.level_3_steps,
        analysis,
        region,
        gemini_metrics: geminiMetrics,
      })
      .select('id')
      .single();

    let submissionId = null;
    if (insertError) {
      // L'analyse est valide et le crédit consommé : on la renvoie quand même, sans id.
      console.error('[analyze-homework] Insert submission échoué :', insertError.message);
    } else {
      submissionId = submission.id;
    }

    // 7bis. Gamification (contrat §6) : une analyse RÉUSSIE compte pour la flamme du jour.
    // Best-effort — un souci ici n'invalide jamais une analyse déjà payée et livrée.
    let streakDays = null;
    try {
      const streak = await rpc('bump_streak', { p_user_id: user.id });
      streakDays = Number(streak && streak.streak_days) || null;
    } catch (streakError) {
      console.error('[analyze-homework] bump_streak échoué :', streakError && streakError.message);
    }

    // 8. Succès.
    return json(200, { submission_id: submissionId, credits_remaining: creditsRemaining, streak_days: streakDays, analysis });
  } catch (err) {
    return handleError(err, 'analyze-homework');
  }
};
