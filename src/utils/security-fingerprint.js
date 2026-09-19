// Empreinte d'appareil côté client (contrat §3/§7) : UA + résolution/DPR + fuseau + langue
// + cœurs CPU + signature WebGL (vendor/renderer GPU) + micro-fingerprint canvas + UUID
// persistant en localStorage, le tout haché en SHA-256.
// Envoyée dans le header `x-device-fingerprint` : hex SHA-256 (64 caractères).

const DEVICE_ID_KEY = 'rpvd_device_id'

let cachedFingerprint = null
let memoryDeviceId = null

// UUID v4 : `crypto.randomUUID` exige un contexte sécurisé, on prévoit un repli.
function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Identifiant stable de l'appareil, créé une fois puis conservé dans localStorage.
function safeLocalStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getDeviceId() {
  if (memoryDeviceId) return memoryDeviceId
  try {
    const storage = safeLocalStorage()
    let id = storage ? storage.getItem(DEVICE_ID_KEY) : null
    if (!id) {
      id = generateUuid()
      if (storage) storage.setItem(DEVICE_ID_KEY, id)
    }
    memoryDeviceId = id
  } catch {
    // Stockage indisponible : identifiant valable pour la session seulement.
    memoryDeviceId = generateUuid()
  }
  return memoryDeviceId
}

// FNV-1a 32 bits sur une chaîne (repli quand Web Crypto est absent, ex. http non sécurisé).
function fnv1a32(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

// Produit 64 hex en enchaînant 8 hachages FNV-1a salés, pour respecter le format attendu.
function fallbackHash(input) {
  let out = ''
  for (let i = 0; i < 8; i += 1) {
    out += fnv1a32(`${i}|${input}`).toString(16).padStart(8, '0')
  }
  return out
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Canvas fingerprinting léger (contrat §7) : le rendu d'un même texte/dégradé varie selon
// le GPU, le driver, la police système et l'anti-aliasing — signal stable par appareil sans
// rien demander à l'utilisateur. Best-effort : un navigateur qui bloque/spoof le canvas
// (extensions vie privée) fait juste retomber sur les autres signaux, jamais d'exception.
function canvasSignature() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 40
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(0, 0, 220, 40)
    ctx.fillStyle = '#0f172a'
    ctx.fillText('RPVD Success 3x+7=22 🔒', 2, 2)
    ctx.strokeStyle = 'rgba(16,185,129,0.8)'
    ctx.beginPath()
    ctx.arc(180, 20, 12, 0, Math.PI * 1.5)
    ctx.stroke()
    return canvas.toDataURL()
  } catch {
    return ''
  }
}

// Vendor/renderer WebGL : combinaison GPU + driver, très discriminante entre appareils qui
// partagent par ailleurs le même user-agent (ex. même modèle de tablette scolaire).
function webglSignature() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    return `${vendor || ''}~${renderer || ''}`
  } catch {
    return ''
  }
}

function collectSignals() {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const scr = typeof screen !== 'undefined' ? screen : {}
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  let timezone = ''
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    timezone = ''
  }
  return [
    nav.userAgent || '',
    `${scr.width || 0}x${scr.height || 0}x${dpr}`,
    timezone,
    nav.language || '',
    String(nav.hardwareConcurrency || 0),
    webglSignature(),
    canvasSignature(),
    getDeviceId(),
  ].join('|')
}

// Empreinte mise en cache en mémoire : calculée une seule fois par chargement de page.
export async function getDeviceFingerprint() {
  if (cachedFingerprint) return cachedFingerprint
  const input = collectSignals()
  const hasSubtle = typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function'
  if (hasSubtle) {
    try {
      cachedFingerprint = await sha256Hex(input)
      return cachedFingerprint
    } catch {
      // On retombe sur le hachage de secours ci-dessous.
    }
  }
  cachedFingerprint = fallbackHash(input)
  return cachedFingerprint
}
