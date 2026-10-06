// Logique PURE de la mesure publicitaire : aucun accès au navigateur ici, donc testable avec
// node:test (src/utils/__tests__/ads-core.test.mjs). Les effets (chargement des scripts Meta/Snap,
// sessionStorage, témoins) sont dans src/utils/ads.js. Le serveur revalide tout de son côté
// (netlify/functions/_lib/attribution.js) : ces règles-ci ne sont qu'une première barrière.

export const LABEL_LIMITS = { src: 40, utm_source: 40, utm_medium: 40, utm_campaign: 80, utm_content: 80, utm_term: 80 }
export const LABEL_KEYS = Object.keys(LABEL_LIMITS)
export const CLICK_ID_KEYS = ['fbclid', 'fbclid_ts', 'sccid']

function truncate(str, max) {
  return Array.from(str).slice(0, max).join('')
}

// Étiquette de campagne : lettres, chiffres et _-.:+ et espace seulement ; le reste est retiré.
export function sanitizeLabel(value, max = 80) {
  if (typeof value !== 'string') return null
  const stripped = value
    .slice(0, 500)
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_\-.:+ ]/gu, '')
    .replace(/ +/g, ' ')
    .trim()
  return truncate(stripped, max).trim() || null
}

// Identifiant de clic (fbclid, ScCid) : format exact, jamais modifié (fbclid est sensible à la casse).
export function sanitizeClickId(value, min = 8, max = 512) {
  if (typeof value !== 'string') return null
  if (value.length < min || value.length > max) return null
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null
}

// Lit ?src=, utm_*, fbclid et ScCid d'une chaîne de requête. Null s'il n'y a rien d'utilisable.
export function parseAttribution(search, nowMs = Date.now()) {
  let params
  try {
    params = new URLSearchParams(search || '')
  } catch {
    return null
  }
  const out = {}
  for (const key of LABEL_KEYS) {
    const v = sanitizeLabel(params.get(key), LABEL_LIMITS[key])
    if (v) out[key] = v
  }
  const fbclid = sanitizeClickId(params.get('fbclid'), 10, 512)
  if (fbclid) {
    out.fbclid = fbclid
    out.fbclid_ts = nowMs // moment où l'identifiant a été vu (sert à fabriquer fbc)
  }
  for (const [name, value] of params.entries()) {
    if (name.toLowerCase() === 'sccid') {
      const id = sanitizeClickId(value, 8, 300)
      if (id) out.sccid = id
    }
  }
  return Object.keys(out).length ? out : null
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') out[k] = obj[k]
  return out
}

export const labelsOf = (attr) => pick(attr, LABEL_KEYS)
export const clickIdsOf = (attr) => pick(attr, CLICK_ID_KEYS)

// Dernier contact gagnant : de nouvelles étiquettes remplacent les anciennes en bloc ; sinon on garde
// les anciennes. Les identifiants de clic sont remplacés un par un (même fbclid = même horodatage).
export function mergeAttribution(prev, next) {
  const before = prev || {}
  if (!next) return { ...labelsOf(before), ...clickIdsOf(before) }
  const hasNewLabels = LABEL_KEYS.some((k) => next[k])
  const ids = { ...clickIdsOf(before), ...clickIdsOf(next) }
  if (before.fbclid && before.fbclid === next.fbclid && before.fbclid_ts) ids.fbclid_ts = before.fbclid_ts
  return { ...(hasNewLabels ? labelsOf(next) : labelsOf(before)), ...ids }
}

// fbc = fb.<index>.<ms>.<fbclid> (https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)
export function buildFbc(fbclid, tsMs) {
  return `fb.1.${tsMs}.${fbclid}`
}

// --- Pixels : identifiants, pages autorisées, décision de chargement ---------------------------

export const META_PIXEL_RE = /^\d{8,20}$/
export const SNAP_PIXEL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Identifiant de pixel valide ou null (null = module inerte : aucun script chargé).
export function cleanPixelId(kind, raw) {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (kind === 'meta') return META_PIXEL_RE.test(v) ? v : null
  if (kind === 'snap') return SNAP_PIXEL_RE.test(v) ? v : null
  return null
}

// Les pixels envoient l'URL complète de la page à Meta/Snap. Ils ne tournent donc JAMAIS sur les pages
// dont l'adresse porte un identifiant personnel (/rembourser?t=, /desabonner?v=, /admin, /app, légal).
export const TRACKABLE_PATHS = ['/', '/vote', '/bootcamp', '/reserver', '/merci', '/accueil']

export function isTrackablePath(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/'
  return TRACKABLE_PATHS.includes(p)
}

// Seul point de décision du chargement des pixels. `consent` = objet de readConsent() (ou null).
export function decidePixels({ consent, pathname, metaId, snapId }) {
  const allowed = Boolean(consent && consent.marketing === true) && isTrackablePath(pathname)
  return { meta: allowed && cleanPixelId('meta', metaId) !== null, snap: allowed && cleanPixelId('snap', snapId) !== null }
}

// --- Événements -------------------------------------------------------------------------------

// Lead : Snap n'a pas d'événement « Lead » ; SIGN_UP (inscription au vote) est le plus proche.
export const SNAP_EVENTS = {
  PageView: 'PAGE_VIEW',
  ViewContent: 'VIEW_CONTENT',
  Lead: 'SIGN_UP',
  InitiateCheckout: 'START_CHECKOUT',
  Purchase: 'PURCHASE',
}

export function snapEventName(name) {
  return SNAP_EVENTS[name] || null
}

// Paramètres Snap : client_dedup_id (== event_id côté API de conversions) ; transaction_id pour l'achat.
export function snapParams(params = {}, eventId) {
  const out = {}
  if (eventId) out.client_dedup_id = eventId
  if (params.value !== undefined && params.value !== null) out.price = params.value
  if (params.currency) out.currency = params.currency
  if (params.content_ids) out.item_ids = params.content_ids
  if (params.num_items !== undefined && params.num_items !== null) out.number_items = params.num_items
  if (params.content_name) out.description = params.content_name
  if (params.transaction_id) out.transaction_id = params.transaction_id
  return out
}

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const PURCHASE_ID_RE = new RegExp(`^p_${UUID_RE}$`, 'i')

// Identifiant d'événement : préfixe + UUID aléatoire (non personnel). `uuid` injectable pour les tests.
export function newEventId(prefix, uuid) {
  const id = uuid || (globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : fallbackUuid())
  return `${prefix}_${id}`
}

function fallbackUuid() {
  const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`
}

// Identifiant d'achat venu de la redirection Stripe (?e=) : doit être p_<uuid>, sinon ignoré.
export function isPurchaseEventId(value) {
  return typeof value === 'string' && PURCHASE_ID_RE.test(value)
}
