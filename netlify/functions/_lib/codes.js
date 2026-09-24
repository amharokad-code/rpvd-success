'use strict';
// Constantes métier des codes d'activation et des plans (contrat §0).

const TRIAL_CREDITS = 3;
const TRIAL_CODES_PER_EMAIL = 3;
const TRIAL_VALIDITY_DAYS = 30;
// Délai pour ACTIVER un code après achat (pas la durée d'usage du forfait, qui est de 90 jours
// APRÈS activation — voir activate_code() dans supabase_schema.sql).
const PREMIUM_CODE_REDEMPTION_WINDOW_DAYS = 365;

// Devise selon la région (contrat §3 quadri-langue) — un seul plan tarifaire, converti.
const REGION_CURRENCY = { qc: 'cad', fr: 'eur', us: 'usd', uk: 'gbp' };
const DEFAULT_CURRENCY = 'cad';

// Montants en plus petite unité (cents), un jeu de valeurs par devise (conversions fournies,
// pas calculées à la volée à partir d'un taux de change qui bougerait).
// « credits » = crédits PAR CODE (chaque code s'active sur un compte/appareil distinct — un
// compte reste verrouillé à 1 seul appareil pour toujours, contrat). Trio = 3 codes séparés
// (une personne ou un appareil chacun), pas 1 compte partagé à 150 crédits.
const PLANS = {
  solo: {
    credits: 50,
    codesPerPurchase: 1,
    label: 'Solo',
    amounts: { cad: 1754, usd: 1299, eur: 1182, gbp: 1013 },
  },
  trio: {
    credits: 50,
    codesPerPurchase: 3,
    label: 'Trio',
    amounts: { cad: 3374, usd: 2499, eur: 2274, gbp: 1949 },
  },
  // Premium (contrat pricing v2, remplace l'idée initiale de "crédits illimités à 5$") :
  // même structure que Solo/Trio (credits = PAR CODE), juste plus de crédits par code.
  premium_solo: {
    credits: 120,
    codesPerPurchase: 1,
    label: 'Premium',
    amounts: { cad: 3499, usd: 2599, eur: 2358, gbp: 2021 },
  },
  premium_trio: {
    credits: 120,
    codesPerPurchase: 3,
    label: 'Premium Trio',
    amounts: { cad: 5999, usd: 4499, eur: 4043, gbp: 3466 },
  },
};

// Contrat pricing v3 : Solo/Trio/Premium (paiement unique, ci-dessus) ne sont plus vendus —
// PLANS reste pour les codes déjà émis (activate-code.js) et l'historique. Les nouveaux achats
// passent par un vrai abonnement Stripe récurrent (Basic/Pro), facturé automatiquement tous les
// 3 mois (mode: 'subscription', Price ID Stripe réels — pas de price_data ad-hoc comme avant).
//
// « priceIds » : un vrai Price Stripe par devise. Seul `usd` existe pour l'instant (créés
// manuellement dans le dashboard Stripe) — les 3 autres devises sont à ajouter au fur et à
// mesure (currencyForRegion retombe sur `usd` tant qu'elles manquent, jamais une erreur).
const SUBSCRIPTION_DURATION_DAYS = 90;
const SUBSCRIPTION_PLANS = {
  basic: {
    credits: 50,
    label: 'Basic',
    priceIds: { usd: 'price_1UFYW1AJoPaz3Yer47V9GO6K', cad: null, eur: null, gbp: null },
  },
  pro: {
    credits: 120,
    label: 'Pro',
    priceIds: { usd: 'price_1UGfk9AJoPaz3Yerzr29Wzh4', cad: null, eur: null, gbp: null },
  },
};

// Price ID réel pour (plan, devise) — retombe sur USD si cette devise n'a pas encore de Price
// Stripe dédié (jamais null, jamais une devise inventée).
function priceIdFor(plan, currency) {
  const plans = SUBSCRIPTION_PLANS[plan];
  if (!plans) return null;
  return plans.priceIds[currency] || plans.priceIds.usd;
}

function currencyForRegion(region) {
  return REGION_CURRENCY[region] || DEFAULT_CURRENCY;
}

// Alphabet sans caractères ambigus (pas de 0/O ni de 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// TRIAL-XXXX ou RPVD-XXXX-XXXX (une fois normalisé).
const CODE_PATTERN = /^(TRIAL-[A-HJ-NP-Z2-9]{4}|RPVD-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})$/;

// Majuscules, sans espaces, tirets typographiques ramenés au tiret simple.
function normalizeCode(str) {
  return String(str == null ? '' : str)
    .toUpperCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '');
}

function isValidCodeFormat(code) {
  return CODE_PATTERN.test(code);
}

module.exports = {
  TRIAL_CREDITS,
  TRIAL_CODES_PER_EMAIL,
  TRIAL_VALIDITY_DAYS,
  PREMIUM_CODE_REDEMPTION_WINDOW_DAYS,
  PLANS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_DURATION_DAYS,
  priceIdFor,
  REGION_CURRENCY,
  DEFAULT_CURRENCY,
  currencyForRegion,
  CODE_ALPHABET,
  CODE_PATTERN,
  normalizeCode,
  isValidCodeFormat,
};
