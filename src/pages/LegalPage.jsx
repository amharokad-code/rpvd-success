// Pages légales statiques, accessibles sans authentification (voir src/main.jsx pour le routage).
import { PRIVACY_POLICY, TERMS_OF_SERVICE, COOKIE_POLICY, REFUND_POLICY } from '../legal/content'

const DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
  cookies: COOKIE_POLICY,
  refunds: REFUND_POLICY,
}

// fr pour QC/FR (défaut), en sinon — région persistée par le sélecteur principal.
function detectLang() {
  try {
    const region = window.localStorage.getItem('rpvd_region')
    return region === 'us' || region === 'uk' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

// Rendu minimal : '## ' = titre, '- ' = liste, sinon paragraphe. Pas de dépendance markdown.
function renderBody(text) {
  const blocks = []
  let list = []
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-5 list-disc space-y-1">
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      )
      list = []
    }
  }
  text
    .split('\n')
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line) {
        flushList()
        return
      }
      if (line.startsWith('## ')) {
        flushList()
        blocks.push(
          <h2 key={blocks.length} className="mt-6 font-display text-lg font-bold text-slate-50 first:mt-0">
            {line.slice(3)}
          </h2>,
        )
      } else if (line.startsWith('- ')) {
        list.push(line.slice(2))
      } else {
        flushList()
        blocks.push(
          <p key={blocks.length} className="leading-relaxed text-slate-300">
            {line}
          </p>,
        )
      }
    })
  flushList()
  return blocks
}

export default function LegalPage({ doc }) {
  const lang = detectLang()
  const text = (DOCS[doc] || DOCS.privacy)[lang]
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <a href="/" className="text-sm text-amber-400 hover:underline">
        {lang === 'fr' ? '← Retour à RPVD Success' : '← Back to RPVD Success'}
      </a>
      <div className="mt-6 flex flex-col gap-3 text-sm">{renderBody(text)}</div>
    </div>
  )
}
