// Génère src/lib/katexSource.ts : le JS de KaTeX embarqué comme chaîne, injecté dans la WebView
// (rendu LaTeX 100 % hors ligne, sans polices ni CSS : sortie MathML). À relancer après un `npm i katex`.
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(require.resolve('katex/dist/katex.min.js'), 'utf8')
const version = require('katex/package.json').version
// Évite qu'un "</script>" éventuel dans la lib ferme la balise lors de l'injection dans le HTML.
const safe = src.replace(/<\/script/gi, '<\\/script')
const out =
  `// GÉNÉRÉ par scripts/build-katex-asset.cjs (katex ${version}) — ne pas éditer à la main.\n` +
  `export const KATEX_VERSION = ${JSON.stringify(version)}\n` +
  `export const KATEX_JS = ${JSON.stringify(safe)}\n`
fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'katexSource.ts'), out)
console.log('katexSource.ts écrit', Math.round(out.length / 1024), 'Ko')
