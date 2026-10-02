// MathText — rend $...$ (inline) et $$...$$ (bloc) avec KaTeX ; le reste du texte reste du texte.
// `katex` direct (pas react-katex : conflit de peer deps avec React 19). trust:false → pas de HTML/URL arbitraires.
import katex from 'katex'
import 'katex/dist/katex.min.css'

const render = (tex, display) =>
  katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'html' })

export default function MathText({ text = '' }) {
  const parts = String(text).split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('$$') && p.length > 4 ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: render(p.slice(2, -2), true) }} />
        ) : p.startsWith('$') && p.length > 2 ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: render(p.slice(1, -1), false) }} />
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  )
}

// Garantit du rendu maths : `always` (champ expression) enveloppe tout dans $...$ ; sinon seulement si le texte
// ressemble à du LaTeX / une équation (le modèle oublie parfois les $ sur les maths simples).
export function autoMath(text = '', always = false) {
  const s = String(text).trim()
  if (!s || s.includes('$')) return s
  return always || /[\\=^_]/.test(s) ? `$${s}$` : s
}

// Coupe « $C_1$, $V_{0{,}5}$, masse » sur les virgules HORS formules.
export function splitOutsideMath(text = '') {
  const items = []
  let current = ''
  let inMath = false
  for (const ch of String(text)) {
    if (ch === '$') inMath = !inMath
    if (ch === ',' && !inMath) {
      if (current.trim()) items.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) items.push(current.trim())
  return items
}

// Texte brut lisible (lecture vocale) : retire les $ et les commandes LaTeX courantes.
export function stripMath(text = '') {
  return String(text)
    .replace(/\$+/g, '')
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 sur $2')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
}
