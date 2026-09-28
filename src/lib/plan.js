// Contrat pricing v3 : Basic = scan + crédits seulement (les 3 niveaux d'analyse de base).
// Pro (et l'ancien palier Premium, équivalent) débloque tout le reste : indice, pièges,
// traduction de consigne, clones/simulation, lecture vocale, veille d'examen, bibliothèque,
// notation personnalisée.
const FULL_ACCESS_PLANS = ['pro', 'premium_solo', 'premium_trio']

export function isProPlan(plan) {
  return FULL_ACCESS_PLANS.includes(plan)
}
