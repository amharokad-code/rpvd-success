// Meta Pixel côté navigateur. Rien ne se charge sans consentement « marketing » (bandeau de cookies,
// Loi 25) ni sans VITE_META_PIXEL_ID (identifiant public du pixel, pas un secret).
// L'événement Purchase n'est PAS envoyé d'ici : il part du webhook Stripe (Conversions API), seule
// source de vérité du paiement. Ici : PageView, ViewContent, Lead (vote), InitiateCheckout.
import { hasMarketingConsent } from './consent'

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || ''
let loaded = false

export function loadMetaPixel() {
  if (loaded || !PIXEL_ID || typeof window === 'undefined' || !hasMarketingConsent()) return
  loaded = true
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
}

export function pixelTrack(eventName, params = {}) {
  try {
    if (!hasMarketingConsent()) return
    loadMetaPixel()
    if (window.fbq) window.fbq('track', eventName, params)
  } catch {
    // best-effort
  }
}

function cookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : ''
}

// _fbp / _fbc pour la Conversions API. Vides sans consentement (le pixel n'a alors rien posé).
export function metaBrowserIds() {
  if (typeof document === 'undefined' || !hasMarketingConsent()) return { marketing_consent: false }
  let fbc = cookie('_fbc')
  if (!fbc) {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`
  }
  return { marketing_consent: true, fbp: cookie('_fbp'), fbc }
}
