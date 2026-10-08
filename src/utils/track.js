// Analytics first-party, anonyme (aucun courriel, aucune IP, aucun identifiant de compte). Un `sid` aléatoire
// généré dans le navigateur relie les étapes d'un même visiteur pour voir OÙ il s'arrête (entonnoir).
// `sendBeacon` survit même à une navigation immédiate (ex. clic CTA qui quitte la page vers Stripe Checkout).

const SID_KEY = 'rpvd_sid'
const SRC_KEY = 'rpvd_src'

function randomId() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  } catch {
    // repli ci-dessous
  }
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
}

// localStorage (pas sessionStorage) : le lien magique ouvre souvent un nouvel onglet du même navigateur ;
// sans ça l'entonnoir casserait artificiellement à l'étape « connecté ».
function getSid() {
  try {
    let sid = localStorage.getItem(SID_KEY)
    if (!sid) {
      sid = randomId()
      localStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return null
  }
}

function getDevice() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'
}

// Source de trafic : utm_source[:utm_campaign] de la première visite, sinon domaine du référent, sinon « direct ».
function getSource() {
  try {
    const saved = localStorage.getItem(SRC_KEY)
    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source') || params.get('src')
    if (utm) {
      const campaign = params.get('utm_campaign')
      const value = (campaign ? `${utm}:${campaign}` : utm).slice(0, 40)
      localStorage.setItem(SRC_KEY, value)
      return value
    }
    if (saved) return saved
    let ref = 'direct'
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '')
      if (host && host !== window.location.hostname) ref = host
    }
    localStorage.setItem(SRC_KEY, ref)
    return ref
  } catch {
    return 'direct'
  }
}

export function trackEvent(eventType, extra = {}) {
  try {
    const payload = JSON.stringify({
      event_type: eventType,
      path: window.location.pathname,
      sid: getSid(),
      device: getDevice(),
      source: getSource(),
      ...extra,
    })
    const url = '/.netlify/functions/track-event'
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    }
  } catch {
    // best-effort : ne doit jamais faire échouer le parcours utilisateur
  }
}

// Erreurs JavaScript réelles chez les visiteurs (une même erreur n'est envoyée qu'une fois par session, max 5).
const seen = new Set()
export function installErrorTracking() {
  if (typeof window === 'undefined' || window.__rpvdErrTracking) return
  window.__rpvdErrTracking = true
  const send = (kind, message) => {
    const msg = String(message || 'inconnue').slice(0, 80)
    if (seen.size >= 5 || seen.has(msg)) return
    seen.add(msg)
    trackEvent('client_error', { props: { kind, msg } })
  }
  window.addEventListener('error', (e) => send('js', e.message))
  window.addEventListener('unhandledrejection', (e) => send('promise', e.reason && (e.reason.message || e.reason)))
}
