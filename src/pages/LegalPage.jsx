// Pages légales statiques, accessibles sans authentification (voir src/main.jsx pour le routage).
// Mise en page de la marque : onglets entre documents, sommaire cliquable, sections en cartes,
// fiche du commerçant en bas (Loi sur la protection du consommateur, Loi 25).
import { useEffect } from 'react'
import { PRIVACY_POLICY, TERMS_OF_SERVICE, COOKIE_POLICY, REFUND_POLICY } from '../legal/content'
import BUSINESS from '../legal/business.json'
import { CARD, PageShell } from '../components/bootcamp/BootcampUI'

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
    fr: { title: 'Politique de confidentialité — Gradus', description: "Ce que Gradus collecte (le strict minimum : ton courriel), pourquoi, combien de temps, et tes droits selon la Loi 25." },
    en: { title: 'Privacy Policy — Gradus', description: 'What Gradus collects (the bare minimum: your email), why, for how long, and your rights.' },
  },
  terms: {
    fr: { title: "Conditions d'utilisation — Gradus", description: 'Les conditions du Bootcamp Gradus et de l’outil d’analyse : prix, remboursement, règles de la classe.' },
    en: { title: 'Terms of Service — Gradus', description: 'Terms for the Gradus Bootcamp and the analysis tool: price, refunds, class rules.' },
  },
  cookies: {
    fr: { title: 'Politique de cookies — Gradus', description: 'Les cookies et technologies similaires utilisés par Gradus, et comment les gérer.' },
    en: { title: 'Cookie Policy — Gradus', description: 'The cookies and similar technologies used by Gradus, and how to manage them.' },
  },
  refunds: {
    fr: { title: 'Politique de remboursement — Gradus', description: 'Remboursement du Bootcamp Gradus (intégral jusqu’au samedi 23 h 59) et des abonnements.' },
    en: { title: 'Refund Policy — Gradus', description: 'Refunds for the Gradus Bootcamp (full until Saturday 11:59 p.m.) and subscriptions.' },
  },
}

const TABS = {
  fr: [
    ['privacy', '/legal/privacy', 'Confidentialité'],
    ['terms', '/legal/terms', 'Conditions'],
    ['refunds', '/legal/refunds', 'Remboursements'],
    ['cookies', '/legal/cookies', 'Cookies'],
    ['contact', '/legal/contact', 'Contact légal'],
  ],
  en: [
    ['privacy', '/legal/privacy', 'Privacy'],
    ['terms', '/legal/terms', 'Terms'],
    ['refunds', '/legal/refunds', 'Refunds'],
    ['cookies', '/legal/cookies', 'Cookies'],
    ['contact', '/legal/contact', 'Legal contact'],
  ],
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

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Liens cliquables dans le texte : chemins /legal/…, cai.gouv.qc.ca, courriels.
function linkify(text) {
  const parts = text.split(/(\/legal\/[a-z]+|cai\.gouv\.qc\.ca|[\w.+-]+@[\w-]+\.[\w.]+)/g)
  return parts.map((p, i) => {
    if (/^\/legal\//.test(p)) return <a key={i} href={p} className="text-pyramid-orange hover:underline">{p}</a>
    if (p === 'cai.gouv.qc.ca') return <a key={i} href="https://www.cai.gouv.qc.ca" target="_blank" rel="noreferrer" className="text-pyramid-orange hover:underline">{p}</a>
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(p)) return <a key={i} href={`mailto:${p}`} className="text-pyramid-orange hover:underline">{p}</a>
    return p
  })
}

// Découpe le texte : 1er « ## » = titre du document, ligne suivante = date, puis sections.
function parse(text) {
  const lines = text.split('\n').map((l) => l.trim())
  const doc = { title: '', updated: '', intro: [], sections: [] }
  let current = null
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (!doc.title) {
        doc.title = line.slice(3)
        continue
      }
      current = { title: line.slice(3), lines: [] }
      doc.sections.push(current)
    } else if (!doc.updated && /^(Dernière mise à jour|Last updated)/.test(line)) {
      doc.updated = line
    } else if (current) {
      current.lines.push(line)
    } else if (line) {
      doc.intro.push(line)
    }
  }
  return doc
}

function Body({ lines }) {
  const blocks = []
  let list = []
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-2">
          {list.map((item, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pyramid-orange" />
              <span>{linkify(item)}</span>
            </li>
          ))}
        </ul>,
      )
      list = []
    }
  }
  for (const line of lines) {
    if (!line) {
      flush()
    } else if (line.startsWith('### ')) {
      flush()
      blocks.push(
        <h3 key={blocks.length} className="pt-2 font-display text-base font-bold text-pyramid-orange">
          {line.slice(4)}
        </h3>,
      )
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2))
    } else {
      flush()
      blocks.push(
        <p key={blocks.length} className="leading-relaxed text-slate-300">
          {linkify(line)}
        </p>,
      )
    }
  }
  flush()
  return <div className="space-y-3 text-[15px]">{blocks}</div>
}

export default function LegalPage({ doc }) {
  const lang = detectLang()
  const text = (DOCS[doc] || DOCS.privacy)[lang]
  const meta = (PAGE_META[doc] || PAGE_META.privacy)[lang]
  const parsed = parse(text)
  const fr = lang === 'fr'

  useEffect(() => {
    document.title = meta.title
    setMetaDescription(meta.description)
  }, [meta])

  return (
    <PageShell current="" width="max-w-3xl">
      <nav aria-label={fr ? 'Documents légaux' : 'Legal documents'} className="-mx-1 flex gap-2 overflow-x-auto pb-2 pt-4">
        {TABS[lang].map(([id, href, label]) => (
          <a
            key={id}
            href={href}
            aria-current={id === doc ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${id === doc ? 'bg-pyramid-orange text-[#0b0b0c]' : 'border border-white/10 text-slate-300 hover:border-pyramid-orange/50'}`}
          >
            {label}
          </a>
        ))}
      </nav>

      <header className="mt-8">
        <p className="text-xs font-bold tracking-[0.3em] text-pyramid-orange">{fr ? 'CADRE LÉGAL' : 'LEGAL'}</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-slate-50">{parsed.title}</h1>
        {parsed.updated && <p className="mt-2 text-sm text-slate-500">{parsed.updated}</p>}
        {parsed.intro.length > 0 && (
          <div className="mt-5">
            <Body lines={parsed.intro} />
          </div>
        )}
      </header>

      {parsed.sections.length > 3 && (
        <nav aria-label={fr ? 'Sommaire' : 'Contents'} className={`${CARD} mt-8 rounded-2xl p-5`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{fr ? 'Sommaire' : 'Contents'}</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {parsed.sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#${slug(s.title)}`} className="text-sm text-slate-300 transition hover:text-pyramid-orange">
                  <span className="mr-2 font-mono text-xs text-slate-600">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-6 space-y-4">
        {parsed.sections.map((s) => (
          <section key={s.title} id={slug(s.title)} className={`${CARD} scroll-mt-24 rounded-2xl p-5 sm:p-6`}>
            <h2 className="font-display text-xl font-bold text-slate-50">{s.title}</h2>
            <div className="mt-3">
              <Body lines={s.lines} />
            </div>
          </section>
        ))}
      </div>

      <aside className="mt-8 rounded-2xl border border-pyramid-orange/25 bg-pyramid-orange/5 p-5 text-sm leading-relaxed text-slate-300">
        <p className="font-semibold text-slate-100">{BUSINESS.operator}</p>
        <p>{BUSINESS.postalAddress || BUSINESS.city}</p>
        <p>
          <a href={`mailto:${BUSINESS.email}`} className="text-pyramid-orange hover:underline">
            {BUSINESS.email}
          </a>
          {' · '}
          <a href="/legal/contact" className="text-pyramid-orange hover:underline">
            {fr ? 'Exercer un droit / porter plainte' : 'Exercise a right / complain'}
          </a>
        </p>
      </aside>
    </PageShell>
  )
}
