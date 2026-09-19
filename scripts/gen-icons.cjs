// Génère public/icons/icon-192.png et icon-512.png en Node pur (zlib + CRC32 maison).
// Motif identique à public/icons/icon.svg : carré arrondi amber, trait slate reliant trois points emerald.
// Usage : node scripts/gen-icons.cjs
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
const SIZES = [192, 512]

// Couleurs (RGB).
const AMBER = [0xf5, 0x9e, 0x0b]
const EMERALD = [0x10, 0xb9, 0x81]
const SLATE = [0x0f, 0x17, 0x2a]

// Géométrie exprimée dans un repère 512×512, mise à l'échelle par taille.
const DESIGN = {
  size: 512,
  cornerRadius: 112,
  dots: [
    [160, 336],
    [256, 256],
    [352, 176],
  ],
  dotRadius: 34,
  strokeWidth: 28,
}

// --- CRC32 (table calculée une fois) ----------------------------------------

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// --- Encodage PNG -----------------------------------------------------------

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profondeur 8 bits
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0 // compression deflate
  ihdr[11] = 0 // filtre standard
  ihdr[12] = 0 // pas d'entrelacement

  // Chaque ligne est préfixée d'un octet de filtre (0 = aucun).
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// --- Rendu par distance signée ----------------------------------------------

// Couverture anti-aliasée : 1 à l'intérieur, 0 dehors, dégradé sur ~1 px autour du bord.
function coverage(signedDistance) {
  return Math.min(1, Math.max(0, 0.5 - signedDistance))
}

// Distance signée à un carré arrondi centré, demi-côté `half`, rayon `r`.
function roundedSquareDistance(x, y, half, r) {
  const qx = Math.abs(x) - (half - r)
  const qy = Math.abs(y) - (half - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

// Distance d'un point au segment [a, b].
function segmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const lengthSq = abx * abx + aby * aby
  let t = lengthSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / lengthSq
  t = Math.min(1, Math.max(0, t))
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t))
}

// Composition « source over » d'une couleur opaque avec une couverture donnée.
function blend(pixel, color, alpha) {
  if (alpha <= 0) return pixel
  const [r, g, b, a] = pixel
  const outA = alpha + a * (1 - alpha)
  if (outA === 0) return [0, 0, 0, 0]
  return [
    (color[0] * alpha + r * a * (1 - alpha)) / outA,
    (color[1] * alpha + g * a * (1 - alpha)) / outA,
    (color[2] * alpha + b * a * (1 - alpha)) / outA,
    outA,
  ]
}

function renderIcon(size) {
  const scale = size / DESIGN.size
  const half = size / 2
  const cornerRadius = DESIGN.cornerRadius * scale
  const dotRadius = DESIGN.dotRadius * scale
  const strokeHalf = (DESIGN.strokeWidth * scale) / 2
  const dots = DESIGN.dots.map(([x, y]) => [x * scale, y * scale])

  const rgba = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Échantillon au centre du pixel.
      const px = x + 0.5
      const py = y + 0.5
      let pixel = [0, 0, 0, 0]

      // 1) Carré arrondi amber, coins transparents.
      const squareCoverage = coverage(roundedSquareDistance(px - half, py - half, half, cornerRadius))
      pixel = blend(pixel, AMBER, squareCoverage)

      // 2) Trait slate reliant les points (extrémités arrondies).
      let strokeDistance = Infinity
      for (let i = 0; i < dots.length - 1; i += 1) {
        const [ax, ay] = dots[i]
        const [bx, by] = dots[i + 1]
        strokeDistance = Math.min(strokeDistance, segmentDistance(px, py, ax, ay, bx, by))
      }
      // Le trait reste confiné au carré : on le multiplie par la couverture du fond.
      pixel = blend(pixel, SLATE, coverage(strokeDistance - strokeHalf) * squareCoverage)

      // 3) Trois points emerald par-dessus.
      let dotDistance = Infinity
      for (const [cx, cy] of dots) dotDistance = Math.min(dotDistance, Math.hypot(px - cx, py - cy))
      pixel = blend(pixel, EMERALD, coverage(dotDistance - dotRadius) * squareCoverage)

      const offset = (y * size + x) * 4
      rgba[offset] = Math.round(pixel[0])
      rgba[offset + 1] = Math.round(pixel[1])
      rgba[offset + 2] = Math.round(pixel[2])
      rgba[offset + 3] = Math.round(pixel[3] * 255)
    }
  }

  return encodePng(size, size, rgba)
}

// --- Exécution --------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon-${size}.png`)
  const png = renderIcon(size)
  fs.writeFileSync(file, png)
  console.log(`${path.relative(process.cwd(), file)} (${png.length} octets)`)
}
