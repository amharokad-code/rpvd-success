'use strict';
// POST /.netlify/functions/create-checkout
// Crée une session Stripe Checkout (paiement unique) pour un plan Solo ou Trio.

const Stripe = require('stripe');
const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { PLANS, currencyForRegion } = require('./_lib/codes');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGIONS = ['qc', 'fr', 'us', 'uk'];

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

// Ligne de commande : price_data à la volée, montant selon la devise de la région (contrat
// quadri-langue) — un seul plan tarifaire avec des conversions fournies, pas de Price ID Stripe
// persistant (qui serait figé sur une seule devise et désynchroniserait le prix affiché).
function lineItemFor(plan, currency) {
  const { amounts, label, credits } = PLANS[plan];
  const unitAmount = amounts[currency] ?? amounts.cad;
  return {
    price_data: {
      currency,
      unit_amount: unitAmount,
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

    const region = REGIONS.includes(body.region) ? body.region : null;
    const currency = currencyForRegion(region);

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const base = siteUrl();

    const params = {
      mode: 'payment',
      line_items: [lineItemFor(plan, currency)],
      metadata: { plan, currency },
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
