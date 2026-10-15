// Source UNIQUE des prix (CAD, en cents). Lue par le site (Vite) ET par les fonctions Netlify.
// Tarification de lancement jusqu'au 31 décembre 2026 inclusivement ; prix régulier dès le 1er janvier 2027,
// 00 h (America/Toronto). Aucun prix barré, aucun pourcentage de rabais, aucun compte à rebours.
// Le prix réellement facturé est choisi côté serveur à la création du paiement (jamais fié au navigateur).

// Premier instant où le prix régulier s'applique (minuit au Québec, UTC-5 en hiver).
export const LAUNCH_ENDS_AT = '2027-01-01T00:00:00-05:00'

// regularPrice = null : prix régulier pas encore décidé, le prix de lancement reste en vigueur.
export const PRICING = {
  concept: { launchPrice: 2400, regularPrice: 3700 },
  exam: { launchPrice: 3700, regularPrice: 5000 },
  bootcamp: { launchPrice: 9900, regularPrice: null },
}

// Mention près du prix. Aucune taxe n'est perçue pour l'instant (décision des fondateurs, 2026-10-15) : le prix affiché
// est le prix payé. À changer si l'inscription aux taxes change (ex. « + taxes »).
export const TAX_NOTE = 'Le prix affiché est le prix payé.'

// Phrase unique pour les pages qui montrent plusieurs produits (affichée une seule fois, factuellement).
export function launchSummary(now = new Date()) {
  if (!isLaunchPeriod(now)) return null
  const parts = []
  if (PRICING.concept.regularPrice != null) parts.push(`Concept ${formatPrice(PRICING.concept.regularPrice)}`)
  if (PRICING.exam.regularPrice != null) parts.push(`Examen ${formatPrice(PRICING.exam.regularPrice)}`)
  if (parts.length === 0) return null
  return `Prix de lancement jusqu'au 31 décembre 2026 — dès le 1er janvier 2027 : ${parts.join(', ')}.`
}

export function isLaunchPeriod(now = new Date()) {
  return now.getTime() < Date.parse(LAUNCH_ENDS_AT)
}

function entry(type) {
  const p = PRICING[type]
  if (!p) throw new Error(`Produit inconnu : ${type}`)
  return p
}

// Prix à facturer maintenant (cents).
export function currentPrice(type, now = new Date()) {
  const p = entry(type)
  if (isLaunchPeriod(now)) return p.launchPrice
  return p.regularPrice == null ? p.launchPrice : p.regularPrice
}

export function formatPrice(cents) {
  return `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')} $`
}

// Mention factuelle, affichée une seule fois, seulement pendant la période de lancement.
export function launchNotice(type, now = new Date()) {
  const p = entry(type)
  if (!isLaunchPeriod(now) || p.regularPrice == null) return null
  return `Prix de lancement jusqu'au 31 décembre 2026 — dès le 1er janvier 2027 : ${formatPrice(p.regularPrice)}`
}
