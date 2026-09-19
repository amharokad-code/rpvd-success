'use strict';
// Rate limiting côté serveur via la RPC `check_rate_limit` (table `rate_limits`).

const { HttpError } = require('./http');
const { rpc } = require('./supabase');

// Lance HttpError(429, 'RATE_LIMITED') si la limite est dépassée pour cette clé.
async function assertRateLimit(key, limit, windowSeconds) {
  const allowed = await rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (allowed !== true) throw new HttpError(429, 'RATE_LIMITED');
}

module.exports = { assertRateLimit, HttpError };
