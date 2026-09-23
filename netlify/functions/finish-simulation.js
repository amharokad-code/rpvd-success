'use strict';
// POST /.netlify/functions/finish-simulation
// Phase 5 (RPVD_FEATURES_PROMPT.md) : enregistre le score final d'une simulation chronométrée.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getUserFromRequest, rpc } = require('./_lib/supabase');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const body = parseBody(event);
    const simulationId = typeof body.simulationId === 'string' ? body.simulationId.trim() : '';
    if (!simulationId) throw new HttpError(400, 'BAD_REQUEST', 'simulationId manquant.');

    const correctCount = Number.isInteger(body.correctCount) ? body.correctCount : 0;
    const timeSpentSeconds = Number.isInteger(body.timeSpentSeconds) ? body.timeSpentSeconds : 0;

    const result = await rpc('finish_simulation', {
      p_user_id: user.id,
      p_simulation_id: simulationId,
      p_correct_count: correctCount,
      p_time_spent_seconds: timeSpentSeconds,
    });

    return json(200, {
      correct_count: result.correct_count,
      total_count: result.total_count,
      score_percent: result.score_percent,
      time_spent_seconds: result.time_spent_seconds,
    });
  } catch (err) {
    return handleError(err, 'finish-simulation');
  }
};
