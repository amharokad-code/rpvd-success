'use strict';
// POST /.netlify/functions/create-checkout
// Crée une session Stripe Checkout (paiement unique) pour un plan Solo ou Trio.

const Stripe = require('stripe');
const { HttpError, preflight, parseBody, json, handleError } = require('./_lib/http');
const { PLANS, UPGRADE_TARGET, upgradeAmount, currencyForRegion } = require('./_lib/codes');
const { getServiceClient, getUserFromRequest } = require('./_lib/supabase');

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
  const { amounts, label, credits, codesPerPurchase } = PLANS[plan];
  const unitAmount = amounts[currency] ?? amounts.cad;
  // `credits` est PAR CODE (contrat) — le nom affiché sur la page Stripe doit refléter le
  // vrai contenu du pack (3 codes séparés pour Trio), sinon l'acheteur croit payer pour
  // 50 analyses au total plutôt que 3 codes de 50 (un par personne/appareil).
  const name =
    codesPerPurchase > 1
      ? `RPVD Success ${label} — ${codesPerPurchase} codes de ${credits} analyses, 3 mois chacun`
      : `RPVD Success ${label} — ${credits} analyses, 3 mois`;
  return {
    price_data: {
      currency,
      unit_amount: unitAmount,
      product_data: { name },
    },
    quantity: 1,
  };
}

// Ligne de commande pour une mise à niveau Base → Premium : seule la différence de prix est
// facturée (contrat pricing v2), pas le plein tarif Premium.
function upgradeLineItemFor(basePlan, targetPlan, currency) {
  const unitAmount = upgradeAmount(basePlan, currency);
  const addedCredits = PLANS[targetPlan].credits - PLANS[basePlan].credits;
  return {
    price_data: {
      currency,
      unit_amount: unitAmount,
      product_data: {
        name: `RPVD Success — Mise à niveau Premium (+${addedCredits} analyses, 3 mois)`,
      },
    },
    quantity: 1,
  };
}

exports.handler = async (event) => {
  const early = preflight(event);
  if (early) return early;

  try {
    const body = parseBody(event);
    const region = REGIONS.includes(body.region) ? body.region : null;
    const currency = currencyForRegion(region);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const base = siteUrl();

    let lineItem;
    let metadata;
    let clientReferenceId;

    if (body.upgrade === true) {
      // Éligibilité vérifiée côté serveur (jamais sur la seule parole du client) : compte
      // authentifié, forfait de base (solo/trio) et crédits épuisés — sinon on facturerait
      // le tarif réduit à qui n'y a pas droit.
      const user = await getUserFromRequest(event);
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Connexion requise.');

      const { data: profile, error } = await getServiceClient()
        .from('users')
        .select('plan, credits')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Profil introuvable.');

      const targetPlan = UPGRADE_TARGET[profile.plan];
      if (!targetPlan) throw new HttpError(400, 'BAD_REQUEST', 'Aucune mise à niveau pour ce forfait.');
      if (profile.credits > 0) throw new HttpError(400, 'BAD_REQUEST', 'Crédits pas encore épuisés.');

      lineItem = upgradeLineItemFor(profile.plan, targetPlan, currency);
      metadata = { plan: targetPlan, currency, upgrade: 'true', base_plan: profile.plan };
      clientReferenceId = user.id;
    } else {
      const plan = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
      if (!PLANS[plan]) throw new HttpError(400, 'BAD_REQUEST', 'Plan inconnu.');
      lineItem = lineItemFor(plan, currency);
      metadata = { plan, currency };
    }

    const params = {
      mode: 'payment',
      line_items: [lineItem],
      metadata,
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      // Managed Payments (activé par défaut sur certains comptes Stripe) exige un
      // tax_code sur chaque produit ; comme le prix est généré à la volée
      // (price_data, pas de Product persistant), on le désactive pour cette
      // session plutôt que de maintenir un catalogue de produits juste pour ça.
      managed_payments: { enabled: false },
    };
    if (email && EMAIL_PATTERN.test(email)) params.customer_email = email;
    if (clientReferenceId) params.client_reference_id = clientReferenceId;

    const session = await getStripe().checkout.sessions.create(params);
    if (!session || !session.url) throw new Error('Session Stripe sans URL');

    return json(200, { url: session.url });
  } catch (err) {
    return handleError(err, 'create-checkout');
  }
};
