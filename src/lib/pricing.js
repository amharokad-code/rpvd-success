// Prix par devise (contrat quadri-langue) — miroir de netlify/functions/_lib/codes.js.
// Contrat pricing v3 : abonnement Stripe récurrent (Basic/Pro), facturé automatiquement tous
// les 3 mois. Un seul Price Stripe réel existe pour l'instant (USD) par plan — tant que
// CAD/EUR/GBP n'ont pas leur propre Price ID (voir _lib/codes.js), on affiche le montant USD
// partout plutôt qu'un montant inventé qui ne correspondrait pas à ce que Stripe facture
// réellement (mentir sur le prix serait pire que d'afficher du USD à tout le monde).
export const PLAN_AMOUNTS = {
  basic: { usd: 1200, cad: null, eur: null, gbp: null },
  pro: { usd: 2000, cad: null, eur: null, gbp: null },
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

// Devise RÉELLEMENT facturée pour ce plan (retombe sur USD si la devise de la région n'a pas
// encore de Price Stripe dédié) — jamais une devise différente de ce que create-checkout.js va
// effectivement utiliser côté serveur.
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
