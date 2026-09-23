'use strict';
// POST /.netlify/functions/generate-clone
// Phase 1 (RPVD_FEATURES_PROMPT.md) : génère un exercice « clone » du pattern d'une analyse
// déjà stockée, pour que l'élève s'entraîne sans repayer une analyse complète. Consomme 1
// crédit comme une analyse normale (sinon appel Gemini illimité et gratuit) — remboursé si
// Gemini échoue, comme analyze-homework.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { generateClone } = require('./_lib/gemini');

const REGIONS = ['qc', 'fr', 'us', 'uk'];
const CLONE_RATE_LIMIT = 10;
const CLONE_RATE_WINDOW_SECONDS = 3600;
const MAX_CLONES_PER_SUBMISSION = 10;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    await assertRateLimit(`clone:user:${user.id}`, CLONE_RATE_LIMIT, CLONE_RATE_WINDOW_SECONDS);

    const body = parseBody(event);
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
    if (!submissionId) throw new HttpError(400, 'BAD_REQUEST', 'submissionId manquant.');

    // 1. Récupère l'analyse originale — appartient bien à cet utilisateur, sinon NOT_FOUND
    // (jamais un 403 qui confirmerait l'existence d'une soumission d'un autre compte).
    const { data: submission, error: fetchError } = await getServiceClient()
      .from('submissions')
      .select('id, analysis, clones, region')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!submission || !submission.analysis) throw new HttpError(404, 'NOT_FOUND');

    const existingClones = Array.isArray(submission.clones) ? submission.clones : [];
    if (existingClones.length >= MAX_CLONES_PER_SUBMISSION) {
      throw new HttpError(400, 'BAD_REQUEST', 'Nombre maximum de clones atteint pour cet exercice.');
    }
    const cloneNumber = existingClones.length + 1;
    const region = REGIONS.includes(body.region) ? body.region : submission.region || 'qc';

    // 2. Consomme 1 crédit (même garde-fou que l'analyse principale).
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
            details: { ip_hash: sha256(getIp(event)), fingerprint: fingerprint.slice(0, 12), fn: 'generate-clone' },
          })
          .then(() => {}, (e) => console.error('[security_events]', e.message));
      }
      throw err;
    }
    const creditsRemaining = Number(consumed && consumed.credits_remaining) || 0;

    // 3. Génération Gemini ; remboursement si échec (même contrat que analyze-homework).
    let clone;
    let metrics;
    try {
      const result = await generateClone({
        problemType: submission.analysis.problem_type,
        level1: submission.analysis.level_1,
        region,
      });
      clone = result.clone;
      metrics = result.metrics;
    } catch (err) {
      try {
        await rpc('refund_credit', { p_user_id: user.id });
      } catch (refundError) {
        console.error('[generate-clone] Remboursement impossible :', refundError && refundError.message);
      }
      throw err instanceof HttpError ? err : new HttpError(502, 'AI_ERROR');
    }

    // 4. Stocke le clone dans submissions.clones (jsonb) — pas de nouvel appel Gemini si
    // l'élève revient sur le même exercice plus tard, contrat "zéro appel inutile".
    const clones = existingClones.concat([
      {
        cloneNumber,
        exercise: clone.exercise,
        correctAnswer: clone.correctAnswer,
        steps: clone.steps,
        generatedAt: new Date().toISOString(),
        metrics,
      },
    ]);

    const { error: updateError } = await getServiceClient()
      .from('submissions')
      .update({ clones })
      .eq('id', submissionId);
    if (updateError) console.error('[generate-clone] Update clones échoué :', updateError.message);

    return json(200, {
      clone: { number: cloneNumber, exercise: clone.exercise, steps: clone.steps, correctAnswer: clone.correctAnswer },
      credits_remaining: creditsRemaining,
    });
  } catch (err) {
    return handleError(err, 'generate-clone');
  }
};
