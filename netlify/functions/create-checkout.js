'use strict';
// POST /.netlify/functions/create-checkout
// Crée une session Stripe Checkout (paiement unique) pour un plan Solo ou Trio.

const Stripe = require('stripe');
const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { PLANS } = require('./_lib/codes');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// URL publique du site (Netlify) ou serveur de dev local.
function siteUrl() {
  const url = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
  return url.replace(/\/+$/, '');
}

// Ligne de commande : Price ID Stripe si configuré, sinon price_data à la volée.
function lineItemFor(plan) {
  const priceId = plan === 'solo' ? process.env.STRIPE_PRICE_SOLO : process.env.STRIPE_PRICE_TRIO;
  if (priceId) return { price: priceId, quantity: 1 };
  const { amount, label, credits } = PLANS[plan];
  return {
    price_data: {
      currency: 'cad',
      unit_amount: amount,
      product_data: { name: `RPVD Success ${label} — ${credits} analyses, 3 mois` },
    },
    quantity: 1,
  };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const plan = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
    if (!PLANS[plan]) throw new HttpError(400, 'BAD_REQUEST', 'Plan inconnu.');

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const base = siteUrl();

    const params = {
      mode: 'payment',
      line_items: [lineItemFor(plan)],
      metadata: { plan },
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      // Managed Payments (activé par défaut sur certains comptes Stripe) exige un
      // tax_code sur chaque produit ; comme le prix est généré à la volée
      // (price_data, pas de Product persistant), on le désactive pour cette
      // session plutôt que de maintenir un catalogue de produits juste pour ça.
      managed_payments: { enabled: false },
    };
    if (email && EMAIL_PATTERN.test(email)) params.customer_email = email;

    const session = await getStripe().checkout.sessions.create(params);
    if (!session || !session.url) throw new Error('Session Stripe sans URL');

    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'create-checkout');
  }
};
