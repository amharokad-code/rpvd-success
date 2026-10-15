// Landing parents (/) : capsules vidéo RPVD. Message : la tranquillité d'esprit du parent.
// Textes = brouillon à valider (titre, arguments, FAQ). Aucune fausse urgence : seuls les prix réels et la vraie date d'examen.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import BuyBox from '../components/BuyBox'
import CapsuleSurvey from '../components/CapsuleSurvey'
import { TAX_NOTE, currentPrice, launchSummary } from '../config/pricing.mjs'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const DEMO_VIDEO_URL = import.meta.env.VITE_DEMO_VIDEO_URL || ''
const money = (cents) => `${(cents / 100).toFixed(0)} $`

const PRODUCTS = [
  { id: 'concept', name: 'Capsule Concept', price: currentPrice('concept'), featured: false, points: ['Vidéo sous-titrée', 'La méthode RPVD appliquée à un concept'] },
  {
    id: 'exam',
    name: 'Capsule Examen',
    price: currentPrice('exam'),
    featured: true,
    points: ['Vidéo sous-titrée, plus complète', 'La méthode RPVD sur un type d’examen', 'Code d’essai de l’application RPVD : 30 jours'],
  },
  {
    id: 'bootcamp',
    name: 'Bootcamp RPVD en direct',
    price: currentPrice('bootcamp'),
    featured: false,
    points: ['Séance en direct avec questions en direct', 'Code d’essai de l’application RPVD : 30 jours', 'Clavardage de questions jusqu’à l’examen'],
  },
]

export default function ParentLandingPage() {
  const [catalog, setCatalog] = useState({ capsules: [], bootcamps: [] })
  const [product, setProduct] = useState('')
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    document.title = 'RPVD — Des capsules vidéo pour que ton enfant arrive prêt à l’examen'
    bootcampCall('capsule-public', { action: 'catalog' }).then(setCatalog).catch(() => {})
  }, [])

  async function buy(body, key) {
    setBuying(key)
    try {
      const { url } = await bootcampCall('capsule-checkout', body)
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBuying(null)
    }
  }

  return (
    <PageShell current="" width="max-w-5xl">
      <header className="pt-6 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">Ton enfant arrive à l’examen en sachant quoi faire. Toi, tu dors tranquille.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          Des capsules vidéo sous-titrées qui montrent la méthode RPVD : la même démarche pour tous les numéros d’un type d’examen, seuls les chiffres et le contexte changent.
        </p>
        <a href="#demande" className={`${CTA} mt-6`}>Demander une capsule</a>
      </header>

      <section className="mt-10">
        <div className={`${CARD} overflow-hidden`}>
          {DEMO_VIDEO_URL ? (
            <video controls preload="metadata" className="aspect-video w-full bg-black" src={DEMO_VIDEO_URL} />
          ) : (
            <div className="flex aspect-video items-center justify-center p-6 text-center text-slate-400">Vidéo de démonstration à venir.</div>
          )}
        </div>
      </section>

      <section className="mt-14" id="produits">
        <h2 className="font-display text-3xl font-bold text-slate-50">Trois façons d’aider ton enfant</h2>
        <p className="mt-2 text-slate-400">Paiement unique, en dollars canadiens. Pas d’abonnement.{TAX_NOTE ? ` ${TAX_NOTE}.` : ''}</p>
        {launchSummary() && <p className="mt-1 text-slate-300">{launchSummary()}</p>}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <div key={p.id} className={`${CARD} flex flex-col p-6 ${p.featured ? 'border-pyramid-orange/70' : ''}`}>
              {p.featured && <span className="mb-2 text-xs font-bold uppercase tracking-widest text-pyramid-orange">Recommandé</span>}
              <h3 className="font-display text-xl font-bold text-slate-50">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold text-slate-50">{money(p.price)} <span className="text-sm font-normal text-slate-400">CAD</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-slate-300">
                {p.points.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
              <a href="#demande" onClick={() => setProduct(p.id)} className={`${CTA} mt-5`}>Je veux celle-ci</a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Remboursement : voir la <a className="underline" href="/legal/refunds">politique de remboursement</a> avant d’acheter.
        </p>
      </section>

      {(catalog.capsules.length > 0 || catalog.bootcamps.length > 0) && (
        <section className="mt-14" id="catalogue">
          <h2 className="font-display text-3xl font-bold text-slate-50">Disponible maintenant</h2>
          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {catalog.capsules.map((c) => (
              <div key={c.slug} className={`${CARD} p-5`}>
                <p className="text-xs uppercase tracking-widest text-slate-400">{c.level} · {c.subject_area}</p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-50">{c.title}</h3>
                <p className="mt-1 text-slate-300">{money(c.price_cad)} CAD{c.duration_min ? ` · ${c.duration_min} min` : ''}</p>
                <div className="mt-4 flex gap-3">
                  <a href={`/capsules/${c.slug}`} className={CTA}>Voir et acheter</a>
                  <a href={`/capsule/${c.slug}`} className="inline-flex items-center text-sm underline">Détails</a>
                </div>
              </div>
            ))}
            {catalog.bootcamps.map((b) => (
              <div key={b.id} className={`${CARD} p-5`}>
                <p className="text-xs uppercase tracking-widest text-slate-400">Bootcamp en direct</p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-50">{b.title}</h3>
                <p className="mt-1 text-slate-300">
                  {new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' }).format(new Date(b.starts_at))} · {money(b.price_cad)} CAD
                </p>
                <BuyBox label="Réserver ma place" busy={buying === b.id} onBuy={(c) => buy({ kind: 'bootcamp', id: b.id, ...c }, b.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14" id="demande">
        <h2 className="font-display text-3xl font-bold text-slate-50">Demander une capsule</h2>
        <p className="mt-2 text-slate-400">Quelques clics. Dès que trois familles demandent le même sujet, on produit la capsule et on t’écrit.</p>
        <div className="mt-6"><CapsuleSurvey preselect={product} /></div>
        <p className="mt-4 text-sm"><a className="underline" href="/capsules">Voir les capsules déjà prêtes</a></p>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl font-bold text-slate-50">Questions fréquentes</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          <details className={`${CARD} p-4`}><summary className="cursor-pointer font-semibold">C’est quoi, la méthode RPVD ?</summary><p className="mt-2">Une démarche en étapes, la même pour tous les numéros d’un type d’exercice. L’élève apprend le schéma, puis l’applique avec ses propres chiffres.</p></details>
          <details className={`${CARD} p-4`}><summary className="cursor-pointer font-semibold">Comment je reçois la capsule ?</summary><p className="mt-2">Par courriel, juste après le paiement, avec un lien personnel. Les vidéos sont sous-titrées.</p></details>
          <details className={`${CARD} p-4`}><summary className="cursor-pointer font-semibold">Et l’application RPVD ?</summary><p className="mt-2">La Capsule Examen et le Bootcamp incluent un code d’essai de 30 jours.</p></details>
        </div>
      </section>
      <LegalLinks />
    </PageShell>
  )
}
