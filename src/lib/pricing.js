// Prix par devise (contrat quadri-langue) — miroir de netlify/functions/_lib/codes.js.
// Conversions fournies (pas calculées à la volée), en plus petite unité (cents).
export const PLAN_AMOUNTS = {
  solo: { cad: 1754, usd: 1299, eur: 1182, gbp: 1013 },
  trio: { cad: 3374, usd: 2499, eur: 2274, gbp: 1949 },
}

const REGION_CURRENCY = { qc: 'cad', fr: 'eur', us: 'usd', uk: 'gbp' }
const CURRENCY_LOCALE = { cad: 'fr-CA', eur: 'fr-FR', usd: 'en-US', gbp: 'en-GB' }

export function currencyForRegion(region) {
  return REGION_CURRENCY[region] || 'cad'
}

export function formatPlanPrice(plan, region) {
  const currency = currencyForRegion(region)
  const amount = (PLAN_AMOUNTS[plan]?.[currency] ?? PLAN_AMOUNTS[plan]?.cad ?? 0) / 100
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || 'fr-CA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}
