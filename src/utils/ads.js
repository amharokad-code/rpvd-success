// Mesure publicitaire côté navigateur : pixels Meta (fbq) et Snap (snaptr) + capture de la provenance.
//
// RÈGLES (voir docs/legal/01-CONFORMITE.md et campagne/08-suivi-et-tracking.md) :
//  - Aucun script Meta ni Snap n'est téléchargé sans consentement marketing (bandeau de témoins).
//    Refus ou retrait : plus rien ne part, les témoins Meta/Snap du site sont supprimés.
//  - Sans VITE_META_PIXEL_ID / VITE_SNAP_PIXEL_ID valides : module inerte (aucun script).
//  - Les pixels ne tournent que sur les pages sans identifiant personnel dans l'URL (ads-core.mjs).
//  - Aucune donnée personnelle envoyée par le navigateur : ni courriel, ni nom. Meta : autoConfig
//    désactivé (pas de « correspondance avancée automatique », pas de détection auto des boutons).
//  - Paramètres de campagne (src, utm_*) : sessionStorage, étiquettes non personnelles.
//    fbclid / ScCid : sessionStorage séparé, effacés au refus du consentement, transmis au serveur
//    SEULEMENT si l'acheteur coche la case de /reserver.
import { readConsent, hasMarketingConsent } from './consent'
import {
  parseAttribution,
  mergeAttribution,
  labelsOf,
  clickIdsOf,
  buildFbc,
  cleanPixelId,
  decidePixels,
  isTrackablePath,
  snapEventName,
  snapParams,
  newEventId,
} from './ads-core.mjs'

export { isPurchaseEventId } from './ads-core.mjs'

const META_ID = cleanPixelId('meta', import.meta.env.VITE_META_PIXEL_ID)
const SNAP_ID = cleanPixelId('snap', import.meta.env.VITE_SNAP_PIXEL_ID)

const ATTR_KEY = 'rpvd_attr' // étiquettes de campagne
const CLICK_IDS_KEY = 'rpvd_click_ids' // fbclid / ScCid (même clé que src/utils/consent.js)
const SENT_KEY = 'rpvd_ad_sent' // événements « une seule fois » déjà émis dans cet onglet
const COOKIES_TO_CLEAR = ['_fbp', '_fbc', '_scid', '_scid_r', '_sctr']
const EVENT_PREFIX = { PageView: 'pv', ViewContent: 'vc', Lead: 'ld', InitiateCheckout: 'ic', Purchase: 'p' }

const state = { meta: false, snap: false, revoked: false, listening: false, replay: new Map() }

// --- sessionStorage / témoins (tout en try/catch : un navigateur restreint ne doit rien casser) ---

function readJson(key) {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeJson(key, value) {
  try {
    if (value && Object.keys(value).length) window.sessionStorage.setItem(key, JSON.stringify(value))
    else window.sessionStorage.removeItem(key)
  } catch {
    // best-effort
  }
}

function readCookie(name) {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : ''
  } catch {
    return ''
  }
}

function deleteCookie(name) {
  try {
    const host = window.location.hostname
    const parts = host.split('.')
    const domains = ['', host, `.${host}`]
    if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`)
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
    }
  } catch {
    // best-effort
  }
}

// --- Provenance --------------------------------------------------------------------------------

// À l'arrivée : lit ?src=, utm_*, fbclid, ScCid. Étiquettes -> toujours (non personnelles).
// Identifiants de clic -> seulement si le visiteur n'a pas déjà refusé le marketing.
function captureAttribution() {
  const next = parseAttribution(window.location.search)
  if (!next) return
  const merged = mergeAttribution({ ...readJson(ATTR_KEY), ...readJson(CLICK_IDS_KEY) }, next)
  writeJson(ATTR_KEY, labelsOf(merged))
  const consent = readConsent()
  if (!consent || consent.marketing) writeJson(CLICK_IDS_KEY, clickIdsOf(merged))
}

// Étiquettes seulement (src, utm_*) : c'est tout ce que reçoit le vote.
export function getAttributionLabels() {
  return labelsOf(readJson(ATTR_KEY))
}

// Corps à joindre à l'appel de paiement. Sans la case cochée : étiquettes seulement.
export function getCheckoutAdPayload(adConsent) {
  const labels = getAttributionLabels()
  if (!adConsent) return { attribution: labels, marketing_consent: false }
  const ids = clickIdsOf(readJson(CLICK_IDS_KEY))
  const fbc = readCookie('_fbc') || (ids.fbclid ? buildFbc(ids.fbclid, ids.fbclid_ts || Date.now()) : '')
  const adIds = {}
  const fbp = readCookie('_fbp')
  const scid = readCookie('_scid')
  if (fbp) adIds.fbp = fbp
  if (fbc) adIds.fbc = fbc
  if (scid) adIds.sc_cookie1 = scid
  return { attribution: { ...labels, ...ids }, marketing_consent: true, ad_ids: adIds }
}

// --- Chargement des pixels (seulement après consentement) -----------------------------------------

function ensureMeta() {
  if (state.meta) {
    if (!state.revoked || !window.fbq) return false
    window.fbq('consent', 'grant')
    return true
  }
  state.meta = true
  const n = function () {
    // eslint-disable-next-line prefer-rest-params
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  }
  window.fbq = n
  if (!window._fbq) window._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  window.fbq('set', 'autoConfig', false, META_ID) // pas de correspondance avancée ni d'événements automatiques
  window.fbq('init', META_ID)
  return true
}

function ensureSnap() {
  if (state.snap) return false
  state.snap = true
  const a = function () {
    // eslint-disable-next-line prefer-rest-params
    a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments)
  }
  a.queue = []
  window.snaptr = a
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://sc-static.net/scevent.min.js'
  document.head.appendChild(s)
  window.snaptr('init', SNAP_ID, {}) // aucun user_email : pas de donnée personnelle
  return true
}

function wasSent(id) {
  return Boolean(readJson(SENT_KEY)[id])
}
function markSent(id) {
  const all = readJson(SENT_KEY)
  all[id] = 1
  writeJson(SENT_KEY, all)
}

function sendEvent({ name, params, id, once }) {
  // Dernier garde-fou : le consentement est relu à CHAQUE envoi (un retrait en cours de page compte).
  if (!hasMarketingConsent() || !isTrackablePath(window.location.pathname)) return
  if (once && wasSent(id)) return
  let sent = false
  if (state.meta && !state.revoked && typeof window.fbq === 'function') {
    window.fbq('track', name, params || {}, { eventID: id })
    sent = true
  }
  const snapName = snapEventName(name)
  if (state.snap && snapName && typeof window.snaptr === 'function') {
    window.snaptr('track', snapName, snapParams(params, id))
    sent = true
  }
  if (sent && once) markSent(id)
}

function syncPixels() {
  const want = decidePixels({ consent: readConsent(), pathname: window.location.pathname, metaId: META_ID, snapId: SNAP_ID })
  let fresh = false
  if (want.meta && ensureMeta()) fresh = true
  if (want.snap && ensureSnap()) fresh = true
  if (!fresh) return
  state.revoked = false
  sendEvent({ name: 'PageView', params: {}, id: newEventId('pv'), once: false })
  // Événements de la page déjà demandés avant le consentement : gardés en mémoire seulement, jamais envoyés avant.
  const pending = [...state.replay.values()]
  state.replay.clear()
  for (const ev of pending) sendEvent(ev)
}

// Retrait ou refus : plus aucun envoi, témoins Meta/Snap du site supprimés, mémoire vidée.
function revoke() {
  state.replay.clear()
  state.revoked = true
  try {
    if (state.meta && typeof window.fbq === 'function') window.fbq('consent', 'revoke')
  } catch {
    // best-effort
  }
  COOKIES_TO_CLEAR.forEach(deleteCookie)
}

function onConsent(event) {
  try {
    if (event && event.detail && event.detail.marketing) syncPixels()
    else revoke()
  } catch {
    // best-effort
  }
}

// À appeler une fois au démarrage (src/main.jsx). Ne lève jamais.
export function initAds() {
  try {
    captureAttribution()
    if (!state.listening) {
      state.listening = true
      window.addEventListener('rpvd:consent', onConsent)
    }
    syncPixels()
  } catch {
    // la mesure ne doit jamais casser le site
  }
}

// Émet un événement standard (PageView, ViewContent, Lead, InitiateCheckout, Purchase) vers les
// pixels chargés. Sans consentement, rien n'est envoyé. `replay` : si le visiteur accepte plus tard
// sur la même page, l'événement de la page est alors envoyé (en mémoire seulement d'ici là).
// `once` : au plus une émission par onglet pour cet eventId (rechargement de /merci).
export function trackAd(name, params = {}, { eventId, replay = false, once = false } = {}) {
  try {
    const ev = { name, params, id: eventId || newEventId(EVENT_PREFIX[name] || 'ev'), once }
    if (replay) state.replay.set(`${name}:${ev.id}`, ev)
    if (state.meta || state.snap) {
      if (replay) state.replay.delete(`${name}:${ev.id}`)
      sendEvent(ev)
    }
  } catch {
    // best-effort
  }
}
