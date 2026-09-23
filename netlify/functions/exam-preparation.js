'use strict';
// POST /.netlify/functions/exam-preparation
// Phase 6 (RPVD_FEATURES_PROMPT.md) : liste les patterns critiques d'un examen à venir.
// Consomme 1 crédit (appel Gemini), remboursé si échec — même contrat que le reste.

const { HttpError, preflight, parseBody, json, getIp, sha256, handleError } = require('./_lib/http');
const { getServiceClient, getUserFromRequest, getFingerprint, rpc } = require('./_lib/supabase');
const { assertRateLimit } = require('./_lib/ratelimit');
const { generateExamPrep } = require('./_lib/gemini');

const REGIONS = ['qc', 'fr', 'us', 'uk'];
const MAX_TITLE_LENGTH = 200;
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 3600;

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED');

    const fingerprint = getFingerprint(event);
    if (!fingerprint) throw new HttpError(400, 'BAD_REQUEST', "Empreinte d'appareil manquante.");

    await assertRateLimit(`examprep:user:${user.id}`, RATE_LIMIT, RATE_WINDOW_SECONDS);

    const body = parseBody(event);
    const examTitle = typeof body.examTitle === 'string' ? body.examTitle.trim().slice(0, MAX_TITLE_LENGTH) : '';
    if (!examTitle) throw new HttpError(400, 'BAD_REQUEST', 'examTitle manquant.');

    const { data: profile } = await getServiceClient()
      .from('users')
      .select('region')
      .eq('id', user.id)
      .maybeSingle();
    const region = REGIONS.includes(body.region) ? body.region : (profile && REGIONS.includes(profile.region) ? profile.region : 'qc');

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
            details: { ip_hash: sha256(getIp(event)), fingerprint: fingerprint.slice(0, 12), fn: 'exam-preparation' },
          })
          .then(() => {}, (e) => console.error('[security_events]', e.message));
      }
      throw err;
    }
    const creditsRemaining = Number(consumed && consumed.credits_remaining) || 0;

    let patterns;
    try {
      const result = await generateExamPrep({ examTitle, region });
      patterns = result.patterns;
    } catch (err) {
      try {
        await rpc('refund_credit', { p_user_id: user.id });
      } catch (refundError) {
        console.error('[exam-preparation] Remboursement impossible :', refundError && refundError.message);
      }
      throw err instanceof HttpError ? err : new HttpError(502, 'AI_ERROR');
    }

    return json(200, { patterns, credits_remaining: creditsRemaining });
  } catch (err) {
    return handleError(err, 'exam-preparation');
  }
};
