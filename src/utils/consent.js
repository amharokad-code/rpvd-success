// Consentement cookies (contrat conformité §4) — stockage local uniquement, aucun compte tiers.
// Prépare le terrain pour Meta Pixel : rien de « marketing » ne doit se charger sans ce consentement.
const STORAGE_KEY = 'rpvd_cookie_consent'

function safeStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readConsent() {
  try {
    const storage = safeStorage()
    const raw = storage ? storage.getItem(STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeConsent(marketing) {
  try {
    const storage = safeStorage()
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, marketing: Boolean(marketing), ts: Date.now() }))
  } catch {
    // best-effort
  }
}

// À appeler avant de charger le script Meta Pixel (actuellement non utilisé côté client —
// seul le Meta CAPI serveur tourne, sur le webhook Stripe, indépendant des cookies navigateur).
export function hasMarketingConsent() {
  const consent = readConsent()
  return Boolean(consent && consent.marketing)
}
