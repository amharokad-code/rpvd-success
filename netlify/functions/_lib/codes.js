'use strict';
// Constantes métier des codes d'activation et des plans (contrat §0).

const TRIAL_CREDITS = 3;
const TRIAL_CODES_PER_EMAIL = 3;
const TRIAL_VALIDITY_DAYS = 30;
const PREMIUM_CODE_VALIDITY_DAYS = 365;

// Devise selon la région (contrat §3 quadri-langue) — un seul plan tarifaire, converti.
const REGION_CURRENCY = { qc: 'cad', fr: 'eur', us: 'usd', uk: 'gbp' };
const DEFAULT_CURRENCY = 'cad';

// Montants en plus petite unité (cents), un jeu de valeurs par devise (conversions fournies,
// pas calculées à la volée à partir d'un taux de change qui bougerait).
const PLANS = {
  solo: {
    credits: 50,
    label: 'Solo',
    amounts: { cad: 1754, usd: 1299, eur: 1182, gbp: 1013 },
  },
  trio: {
    credits: 150,
    label: 'Trio',
    amounts: { cad: 3374, usd: 2499, eur: 2274, gbp: 1949 },
  },
};

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
  PREMIUM_CODE_VALIDITY_DAYS,
  PLANS,
  REGION_CURRENCY,
  DEFAULT_CURRENCY,
  currencyForRegion,
  CODE_ALPHABET,
  CODE_PATTERN,
  normalizeCode,
  isValidCodeFormat,
};
