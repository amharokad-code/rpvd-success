// Prix par devise (contrat quadri-langue) — miroir exact des `currency_options` du Price Stripe
// (voir netlify/functions/_lib/codes.js) : un seul Price par plan, avec CAD/EUR/GBP/USD dessus.
export const PLAN_AMOUNTS = {
  basic: { usd: 1200, cad: 1700, eur: 1000, gbp: 900 },
  pro: { usd: 2000, cad: 2800, eur: 1800, gbp: 1500 },
}

export const PLAN_DURATION_MONTHS = 3

const REGION_CURRENCY = { qc: 'cad', fr: 'eur', us: 'usd', uk: 'gbp' }
const CURRENCY_LOCALE = { cad: 'fr-CA', eur: 'fr-FR', usd: 'en-US', gbp: 'en-GB' }

export function currencyForRegion(region) {
  return REGION_CURRENCY[region] || 'usd'
}

function formatAmount(cents, currency) {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// Devise d'affichage selon la région — Stripe Checkout choisit lui-même la devise de
// présentation réelle selon la localisation du client (currency_options sur un Price unique),
// donc ceci n'a besoin que d'être cohérent avec ce que Stripe affichera dans l'immense majorité
// des cas (région choisie = localisation réelle), jamais une garantie absolue de correspondance.
function billedCurrency(plan, region) {
  const currency = currencyForRegion(region)
  return PLAN_AMOUNTS[plan]?.[currency] != null ? currency : 'usd'
}

export function formatPlanPrice(plan, region) {
  const currency = billedCurrency(plan, region)
  const amount = PLAN_AMOUNTS[plan]?.[currency] ?? 0
  return formatAmount(amount, currency)
}

export function formatPlanPriceBreakdown(plan, region) {
  const currency = billedCurrency(plan, region)
  const totalCents = PLAN_AMOUNTS[plan]?.[currency] ?? 0
  return {
    total: formatAmount(totalCents, currency),
    monthly: formatAmount(totalCents / PLAN_DURATION_MONTHS, currency),
  }
}
