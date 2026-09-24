'use strict';
// POST /.netlify/functions/create-checkout
// Crée une session Stripe Checkout en mode ABONNEMENT (contrat pricing v3) pour Basic ou Pro —
// facturation récurrente automatique tous les 3 mois via de vrais Price ID Stripe. Contrairement
// à l'ancien modèle à paiement unique, l'abonnement s'attache directement au compte connecté
// (client_reference_id), pas à un code d'activation par courriel : la connexion est obligatoire.

const Stripe = require('stripe');
const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { SUBSCRIPTION_PLANS, priceIdFor, currencyForRegion } = require('./_lib/codes');
const { getUserFromRequest } = require('./_lib/supabase');

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

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    // Un abonnement s'attache à un compte précis : jamais d'achat anonyme (contrairement à
    // l'ancien flux code-par-courriel).
    const user = await getUserFromRequest(event);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');

    const body = parseBody(event);
    const plan = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
    if (!SUBSCRIPTION_PLANS[plan]) throw new HttpError(400, 'BAD_REQUEST', 'Plan inconnu.');

    const region = REGIONS.includes(body.region) ? body.region : null;
    const currency = currencyForRegion(region);
    const priceId = priceIdFor(plan, currency);
    if (!priceId) throw new HttpError(400, 'BAD_REQUEST', 'Aucun tarif configuré pour ce forfait.');

    const base = siteUrl();
    const params = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { plan },
      subscription_data: { metadata: { plan, user_id: user.id } },
      client_reference_id: user.id,
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      // Le catalogue Stripe indique « Informations requises » sur le code de taxe des 2 Products
      // (comme pour l'ancien price_data) — Managed Payments désactivé pour cette session pour ne
      // pas dépendre de ce champ tant qu'il n'est pas rempli côté dashboard Stripe.
      managed_payments: { enabled: false },
    };

    const session = await getStripe().checkout.sessions.create(params);
    if (!session || !session.url) throw new Error('Session Stripe sans URL');

    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'create-checkout');
  }
};
