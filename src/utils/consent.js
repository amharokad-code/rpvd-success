// Consentement cookies (contrat conformité §4) — stockage local uniquement, aucun compte tiers.
// Tout ce qui est « marketing » (Google Analytics, pixels Meta et Snap : src/utils/ads.js) est
// bloqué tant que le visiteur n'a pas cliqué « Tout accepter ». Refuser est aussi simple qu'accepter,
// et « Gérer mes cookies » (pied de page) permet de changer ou de retirer le choix en tout temps.
const STORAGE_KEY = 'rpvd_cookie_consent'
const CLICK_IDS_KEY = 'rpvd_click_ids' // identifiants de clic (fbclid, ScCid) : même clé que src/utils/ads.js

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

// Prévient ads.js (pixels) sans import circulaire : il charge ou coupe les pixels selon `marketing`.
function notify(marketing) {
  try {
    window.dispatchEvent(new CustomEvent('rpvd:consent', { detail: { marketing: Boolean(marketing) } }))
  } catch {
    // best-effort
  }
}

// Refus ou retrait : Google repasse en « refusé » et les identifiants de clic gardés en session sont effacés.
function revokeMarketing() {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    }
  } catch {
    // best-effort
  }
  try {
    window.sessionStorage.removeItem(CLICK_IDS_KEY)
  } catch {
    // best-effort
  }
}

export function writeConsent(marketing) {
  try {
    const storage = safeStorage()
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, marketing: Boolean(marketing), ts: Date.now() }))
    // Google Analytics n'est chargé qu'à l'acceptation (voir index.html → window.rpvdLoadAnalytics).
    if (marketing && typeof window.rpvdLoadAnalytics === 'function') window.rpvdLoadAnalytics()
    if (!marketing) revokeMarketing()
  } catch {
    // best-effort
  }
  notify(marketing)
}

// « Gérer mes cookies » : efface le choix (le marketing s'arrête tout de suite) et rouvre le bandeau.
export function resetConsent() {
  try {
    const storage = safeStorage()
    if (storage) storage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort
  }
  revokeMarketing()
  notify(false)
  try {
    window.dispatchEvent(new Event('rpvd:consent-reopen'))
  } catch {
    // best-effort
  }
}

// À consulter avant tout chargement de script marketing.
export function hasMarketingConsent() {
  const consent = readConsent()
  return Boolean(consent && consent.marketing === true)
}
