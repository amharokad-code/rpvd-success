// Génère public/icons/icon-192.png et icon-512.png en Node pur (zlib + CRC32 maison).
// Pictogramme "Pyramid Ascension" : triangle à 4 bandes horizontales (orange → orange foncé →
// blanc → gris, mêmes teintes que le logo officiel) sur fond noir pur — pas le logo recoloré,
// une reconstruction fidèle à sa géométrie (aucune lib d'image dispo pour recadrer le fichier
// source directement). Usage : node scripts/gen-icons.cjs
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
const SIZES = [192, 512]

// Couleurs (RGB) — palette "Pyramid Ascension", identiques à tailwind.config.js.
const BLACK = [0x00, 0x00, 0x00]
const ORANGE = [0xf2, 0x99, 0x4a]
const ORANGE_DEEP = [0xe0, 0x7b, 0x2e]
const WHITE = [0xf5, 0xf5, 0xf0]
const GREY = [0x6b, 0x6d, 0x70]

// Géométrie exprimée dans un repère 512×512, mise à l'échelle par taille.
// Triangle isocèle centré, coupé en 4 bandes horizontales égales (sommet → base).
const DESIGN = {
  size: 512,
  apex: [256, 96],
  baseY: 416,
  halfBaseWidth: 176,
  bands: [ORANGE, ORANGE, ORANGE_DEEP, WHITE, GREY], // 4 bandes, la 1re dupliquée pour l'épaisseur du sommet
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

// --- Rendu du triangle -------------------------------------------------------

// À une hauteur y donnée (entre apex.y et baseY), demi-largeur du triangle à cette hauteur.
function halfWidthAt(y, apex, baseY, halfBaseWidth) {
  const t = Math.max(0, Math.min(1, (y - apex[1]) / (baseY - apex[1])))
  return t * halfBaseWidth
}

function renderIcon(size) {
  const scale = size / DESIGN.size
  const apex = [DESIGN.apex[0] * scale, DESIGN.apex[1] * scale]
  const baseY = DESIGN.baseY * scale
  const halfBaseWidth = DESIGN.halfBaseWidth * scale
  const bandCount = DESIGN.bands.length
  const bandHeight = (baseY - apex[1]) / bandCount

  const rgba = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      let color = BLACK

      if (py >= apex[1] && py <= baseY) {
        const halfWidth = halfWidthAt(py, apex, baseY, halfBaseWidth)
        if (Math.abs(px - apex[0]) <= halfWidth) {
          const bandIndex = Math.min(bandCount - 1, Math.floor((py - apex[1]) / bandHeight))
          color = DESIGN.bands[bandIndex]
        }
      }

      const offset = (y * size + x) * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = 255
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
