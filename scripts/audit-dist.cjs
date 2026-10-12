// Audit du bundle : aucune clé secrète ne doit figurer dans dist/ (npm run audit:dist après npm run build).
const fs = require('fs')
const path = require('path')

const PATTERNS = [
  [/sk_(live|test)_[A-Za-z0-9]{10,}/, 'clé secrète Stripe'],
  [/whsec_[A-Za-z0-9]{10,}/, 'secret de webhook Stripe'],
  [/re_[A-Za-z0-9]{20,}/, 'clé Resend'],
  [/AIza[0-9A-Za-z_-]{30,}/, 'clé Google'],
  [/service_role/, 'rôle service Supabase'],
  [/(SUPABASE_SERVICE_KEY|STRIPE_SECRET_KEY|VDOCIPHER_API_SECRET|RESEND_API_KEY|TURNSTILE_SECRET_KEY)["'`]?\s*[:=]\s*["'`][A-Za-z0-9_.-]{20,}/, 'secret assigné dans le code'],
  [/Apisecret\s+[A-Za-z0-9]{20,}/, 'secret VdoCipher'],
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
}

const root = path.join(__dirname, '..', 'dist')
if (!fs.existsSync(root)) {
  console.error('dist/ introuvable : lance npm run build d’abord.')
  process.exit(2)
}
let bad = 0
for (const file of walk(root).filter((f) => /\.(js|css|html|json|map|txt|xml)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8')
  for (const [re, label] of PATTERNS) {
    if (re.test(text)) {
      console.error(`⚠ ${label} dans ${path.relative(root, file)}`)
      bad += 1
    }
  }
}
console.log(bad ? `${bad} problème(s).` : 'dist/ propre : aucune clé secrète trouvée.')
process.exit(bad ? 1 : 0)
