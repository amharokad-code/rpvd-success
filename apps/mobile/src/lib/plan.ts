// Contrat pricing v3 (même règle que src/lib/plan.js côté web) : Basic = scan + crédits ;
// Pro (et l'ancien palier Premium, équivalent) débloque bibliothèque, indice, pièges, consigne.
const FULL_ACCESS_PLANS = ['pro', 'premium_solo', 'premium_trio']

export function isProPlan(plan: string | null | undefined): boolean {
  return plan != null && FULL_ACCESS_PLANS.includes(plan)
}
