// Prix par devise (contrat quadri-langue) — miroir de netlify/functions/_lib/codes.js.
// Conversions fournies (pas calculées à la volée), en plus petite unité (cents).
export const PLAN_AMOUNTS = {
  solo: { cad: 1754, usd: 1299, eur: 1182, gbp: 1013 },
  trio: { cad: 3374, usd: 2499, eur: 2274, gbp: 1949 },
  premium_solo: { cad: 3499, usd: 2599, eur: 2358, gbp: 2021 },
  premium_trio: { cad: 5999, usd: 4499, eur: 4043, gbp: 3466 },
}

// Base éligible → son Premium (miroir de UPGRADE_TARGET côté function).
export const UPGRADE_TARGET = { solo: 'premium_solo', trio: 'premium_trio' }
const MIN_UPGRADE_AMOUNT = 100

const REGION_CURRENCY = { qc: 'cad', fr: 'eur', us: 'usd', uk: 'gbp' }
const CURRENCY_LOCALE = { cad: 'fr-CA', eur: 'fr-FR', usd: 'en-US', gbp: 'en-GB' }

export function currencyForRegion(region) {
  return REGION_CURRENCY[region] || 'cad'
}

function formatAmount(cents, currency) {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || 'fr-CA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatPlanPrice(plan, region) {
  const currency = currencyForRegion(region)
  const amount = PLAN_AMOUNTS[plan]?.[currency] ?? PLAN_AMOUNTS[plan]?.cad ?? 0
  return formatAmount(amount, currency)
}

// Tous les forfaits (Solo/Trio/Premium) durent 3 mois (contrat) — le prix affiché seul masque
// le vrai coût mensuel et, pire, un prix codé en dur dans un texte (ex: "12,99$") ne s'applique
// qu'à UNE devise alors que le contrat est quadri-devise. On calcule donc les DEUX montants
// (total réel + équivalent mensuel) dans la devise de la région active, jamais un texte fixe.
const PLAN_DURATION_MONTHS = 3
export function formatPlanPriceBreakdown(plan, region) {
  const currency = currencyForRegion(region)
  const totalCents = PLAN_AMOUNTS[plan]?.[currency] ?? PLAN_AMOUNTS[plan]?.cad ?? 0
  return {
    total: formatAmount(totalCents, currency),
    monthly: formatAmount(totalCents / PLAN_DURATION_MONTHS, currency),
  }
}

// Différence de prix Base → Premium (contrat pricing v2) : ce qu'il reste à payer pour la
// mise à niveau, pas le plein tarif Premium.
export function formatUpgradePrice(basePlan, region) {
  const currency = currencyForRegion(region)
  const base = PLAN_AMOUNTS[basePlan]?.[currency] ?? PLAN_AMOUNTS[basePlan]?.cad ?? 0
  const target = PLAN_AMOUNTS[UPGRADE_TARGET[basePlan]]?.[currency] ?? 0
  return formatAmount(Math.max(target - base, MIN_UPGRADE_AMOUNT), currency)
}
