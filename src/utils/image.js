// Préparation des fichiers avant envoi à `analyze-homework` (contrat §0 et §3).
// Image → canvas (max 1600 px), JPEG q=0.82 ; PDF → base64 brut. Jamais de préfixe `data:`.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const MAX_BYTES = 8 * 1024 * 1024

// Certains navigateurs laissent `file.type` vide : on déduit le type depuis l'extension.
function resolveMimeType(file) {
  if (file.type && ACCEPTED_TYPES.includes(file.type)) return file.type
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  return null
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('read_failed'))
    reader.readAsDataURL(blob)
  })
}

// Retire le préfixe `data:<type>;base64,`.
function stripDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

// Taille décodée (en octets) d'une chaîne base64.
function base64Bytes(base64) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

// Décode l'image en respectant l'orientation EXIF quand le navigateur le permet.
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Repli sur <img> ci-dessous (WebP ancien, option non supportée, etc.).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('errorType'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))), type, quality)
  })
}

async function prepareImage(file) {
  const source = await decodeImage(file)
  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight
  if (!srcW || !srcH) throw new Error('errorType')

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // Fond blanc : les PNG/WebP transparents deviennent lisibles une fois en JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  if (typeof source.close === 'function') source.close()

  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
  const dataUrl = await readAsDataUrl(blob)
  const base64 = stripDataUrl(dataUrl)
  if (blob.size > MAX_BYTES) throw new Error('errorSize')

  return {
    base64,
    mimeType: 'image/jpeg',
    previewUrl: dataUrl,
    sizeKb: Math.round(blob.size / 1024),
  }
}

async function preparePdf(file) {
  if (file.size > MAX_BYTES) throw new Error('errorSize')
  const dataUrl = await readAsDataUrl(file)
  const base64 = stripDataUrl(dataUrl)
  if (base64Bytes(base64) > MAX_BYTES) throw new Error('errorSize')
  return {
    base64,
    mimeType: 'application/pdf',
    previewUrl: null,
    sizeKb: Math.round(file.size / 1024),
  }
}

// Point d'entrée : lance `Error('errorType')` ou `Error('errorSize')` (clés de `t.upload`).
export async function prepareFile(file) {
  if (!file) throw new Error('errorType')
  const mimeType = resolveMimeType(file)
  if (!mimeType) throw new Error('errorType')
  if (mimeType === 'application/pdf') return preparePdf(file)
  try {
    return await prepareImage(file)
  } catch (err) {
    if (err instanceof Error && (err.message === 'errorSize' || err.message === 'errorType')) throw err
    // Image illisible / corrompue : on la traite comme un format non supporté.
    throw new Error('errorType')
  }
}
