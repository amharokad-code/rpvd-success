'use strict';
// Constantes métier des codes d'activation et des plans (contrat §0).

const TRIAL_CREDITS = 3;
const TRIAL_CODES_PER_EMAIL = 3;
const TRIAL_VALIDITY_DAYS = 30;
const PREMIUM_CODE_VALIDITY_DAYS = 365;

// Montants en cents CAD.
const PLANS = {
  solo: { credits: 50, amount: 1299, label: 'Solo' },
  trio: { credits: 150, amount: 2499, label: 'Trio' },
};

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
  CODE_ALPHABET,
  CODE_PATTERN,
  normalizeCode,
  isValidCodeFormat,
};
