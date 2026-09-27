// Pages légales statiques, accessibles sans authentification (voir src/main.jsx pour le routage).
import { useEffect } from 'react'
import { PRIVACY_POLICY, TERMS_OF_SERVICE, COOKIE_POLICY, REFUND_POLICY } from '../legal/content'

const DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
  cookies: COOKIE_POLICY,
  refunds: REFUND_POLICY,
}

// Title/description par page : sans ça, Google voit 4 pages légales identiques
// (même <title>/<meta description> hérités d'index.html) — mauvais signal SEO.
const PAGE_META = {
  privacy: {
    fr: { title: 'Politique de confidentialité — RPVD Success', description: "Comment RPVD Success collecte, utilise et protège les données de ton compte et de tes photos d'exercices." },
    en: { title: 'Privacy Policy — RPVD Success', description: 'How RPVD Success collects, uses and protects your account and exercise photo data.' },
  },
  terms: {
    fr: { title: "Conditions d'utilisation — RPVD Success", description: "Les règles d'utilisation de l'application RPVD Success : crédits, comptes, usage acceptable." },
    en: { title: 'Terms of Service — RPVD Success', description: 'The rules for using the RPVD Success app: credits, accounts, acceptable use.' },
  },
  cookies: {
    fr: { title: 'Politique de cookies — RPVD Success', description: 'Les cookies et technologies similaires utilisés par RPVD Success, et comment les gérer.' },
    en: { title: 'Cookie Policy — RPVD Success', description: 'The cookies and similar technologies used by RPVD Success, and how to manage them.' },
  },
  refunds: {
    fr: { title: 'Politique de remboursement — RPVD Success', description: 'Les conditions de remboursement pour les plans et crédits RPVD Success.' },
    en: { title: 'Refund Policy — RPVD Success', description: 'The refund conditions for RPVD Success plans and credits.' },
  },
}

function setMetaDescription(content) {
  const tag = document.querySelector('meta[name="description"]')
  if (tag) tag.setAttribute('content', content)
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
  const meta = (PAGE_META[doc] || PAGE_META.privacy)[lang]

  useEffect(() => {
    document.title = meta.title
    setMetaDescription(meta.description)
  }, [meta])

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <a href="/" className="text-sm text-amber-400 hover:underline">
        {lang === 'fr' ? '← Retour à RPVD Success' : '← Back to RPVD Success'}
      </a>
      <div className="mt-6 flex flex-col gap-3 text-sm">{renderBody(text)}</div>
    </div>
  )
}
