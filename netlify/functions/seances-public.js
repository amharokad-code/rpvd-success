'use strict';
// GET/POST /.netlify/functions/seances-public → séances en cours ou à venir (aucune donnée secrète).

const { preflight, json, handleError } = require('./_lib/http');
const { publicSeances, PRICE_CENTS } = require('./_lib/seances');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    return json(200, { ok: true, price_cents: PRICE_CENTS, currency: 'CAD', seances: publicSeances(new Date()) });
  } catch (err) {
    return handleError(err, 'seances-public');
  }
};
