'use strict';
// POST /.netlify/functions/start-simulation
// Phase 5 (RPVD_FEATURES_PROMPT.md) : démarre une session chronométrée sur les clones déjà
// générés d'une soumission (ne génère rien — generate-clone le fait en amont). Gratuit : ne
// consomme pas de crédit, c'est de la pratique sur du contenu déjà payé.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, rpc } = require('./_lib/supabase');

const SECONDS_PER_CLONE = 120;
const MIN_EXERCISES = 1;
const MAX_EXERCISES = 10;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const body = parseBody(event);
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId.trim() : '';
    if (!submissionId) throw new HttpError(400, 'BAD_REQUEST', 'submissionId manquant.');

    const requestedCount = Number.isInteger(body.exerciseCount) ? body.exerciseCount : MAX_EXERCISES;
    const exerciseCount = Math.max(MIN_EXERCISES, Math.min(requestedCount, MAX_EXERCISES));

    const { data: submission, error: fetchError } = await getServiceClient()
      .from('submissions')
      .select('id, clones')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!submission) throw new HttpError(404, 'NOT_FOUND');

    const clones = Array.isArray(submission.clones) ? submission.clones : [];
    if (clones.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'Aucun clone disponible pour cet exercice.');

    const clonesToUse = clones.slice(0, exerciseCount);
    const cloneNumbers = clonesToUse.map((c) => c.cloneNumber);

    const result = await rpc('start_simulation', {
      p_user_id: user.id,
      p_submission_id: submissionId,
      p_clone_numbers: cloneNumbers,
      p_seconds_per_clone: SECONDS_PER_CLONE,
    });

    return json(200, {
      simulation_id: result.id,
      time_limit_seconds: result.time_limit_seconds,
      exercises: clonesToUse.map((c) => ({
        cloneNumber: c.cloneNumber,
        exercise: c.exercise,
        correctAnswer: c.correctAnswer,
        timePerExercise: SECONDS_PER_CLONE,
      })),
    });
  } catch (err) {
    return handleError(err, 'start-simulation');
  }
};
