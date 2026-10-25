'use strict';
// POST { id, attest } → { url } Stripe Checkout (CAD, paiement unique) pour payer une séance E.M.A.
// Le prix vient du serveur ; le prix affiché est le prix facturé.

const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { getStripe } = require('./_lib/stripe-client');
const { siteUrl } = require('./_lib/legal');
const { findSeance, originFor, PRICE_CENTS, CURRENCY } = require('./_lib/seances');

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;
  try {
    const body = parseBody(event);
    const seance = findSeance(String(body.id || ''));
    if (!seance) throw new HttpError(404, 'BAD_REQUEST', 'Séance introuvable.');
    if (body.attest !== true) throw new HttpError(400, 'BAD_REQUEST', 'Coche la case : 14 ans ou plus, ou accord d’un parent.');

    const metadata = { kind: 'ema_seance', seance_id: seance.id, attest: '1' };
    const base = originFor(event, siteUrl());
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: { name: `E.M.A. Tutorat : ${seance.matiere} ${seance.niveau}, ${seance.sujet}` },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${base}/?paiement=ok`,
      cancel_url: `${base}/`,
    });
    if (!session || !session.url) throw new Error('Session Stripe sans URL');
    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'seances-paiement');
  }
};
