// Analytics v1 first-party (contrat honnêteté commerciale) : compte les visites et l'entonnoir
// de conversion, sans donnée personnelle ni tracker tiers. `sendBeacon` survit même à une
// navigation immédiate (ex. clic CTA qui quitte la page vers Stripe Checkout).
export function trackEvent(eventType, extra = {}) {
  try {
    const payload = JSON.stringify({ event_type: eventType, path: window.location.pathname, ...extra })
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
