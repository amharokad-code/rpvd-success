// Page d'accueil parents (/ et /demande) : capsules vidéo RPVD. Message central : la tranquillité d'esprit du parent.
// Le sondage (3 écrans) est DANS le premier écran : le parent obtient sa démo gratuite sans quitter la page.
// Aucune fausse urgence : seuls les prix réels (lancement jusqu'au 31 décembre 2026) et la vraie date d'examen.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import BuyBox from '../components/BuyBox'
import CapsuleSurvey from '../components/CapsuleSurvey'
import { TAX_NOTE, currentPrice, launchSummary } from '../config/pricing.mjs'
import { CARD, CTA, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const money = (cents) => `${(cents / 100).toFixed(0)} $`

const PRODUCTS = [
  { id: 'concept', name: 'Capsule Concept', price: currentPrice('concept'), featured: false, points: ['Vidéo sous-titrée', 'La méthode RPVD sur un concept précis', 'À revoir à vie'] },
  {
    id: 'exam',
    name: 'Capsule Examen',
    price: currentPrice('exam'),
    featured: true,
    points: ['Vidéo en segments courts, avec exercices corrigés', 'La méthode sur un type d’examen', 'Essai de l’app RPVD : 30 jours', 'Suivi de progression pour le parent'],
  },
  {
    id: 'bootcamp',
    name: 'Bootcamp RPVD en direct',
    price: currentPrice('bootcamp'),
    featured: false,
    points: ['Séance en direct, questions en direct', 'Essai de l’app RPVD : 30 jours', 'Clavardage de questions jusqu’à l’examen'],
  },
]

const STEPS = [
  ['1', 'Réponds à 3 questions', 'Matière, niveau, sujet : environ 30 secondes, le courriel à la toute fin.'],
  ['2', 'Regarde ta démo gratuite', 'Tu vois tout de suite comment la méthode RPVD fonctionne sur un vrai numéro.'],
  ['3', 'On produit pour toi', 'Dès que trois familles demandent le même sujet, la capsule est tournée, sous-titrée, et tu reçois un courriel.'],
]

const FAQ = [
  ['C’est quoi, la méthode RPVD ?', 'Une démarche en étapes, la même pour tous les numéros d’un type d’exercice. L’élève apprend le schéma, puis l’applique avec ses propres chiffres.'],
  ['La démo est vraiment gratuite ?', 'Oui. Tu réponds à trois questions, tu laisses ton courriel, et la démo s’affiche tout de suite. Aucune carte de crédit.'],
  ['Comment je reçois une capsule achetée ?', 'Par courriel, juste après le paiement, avec un lien de connexion à usage unique. Ensuite, tout est dans « Mes capsules », à revoir autant de fois que tu veux.'],
  ['Et l’application RPVD ?', 'La Capsule Examen et le Bootcamp incluent un code d’essai de 30 jours.'],
]

export default function ParentLandingPage() {
  const [catalog, setCatalog] = useState({ capsules: [], bootcamps: [] })
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    document.title = 'RPVD — Démo gratuite : des capsules vidéo pour réussir les examens de maths et de sciences'
    bootcampCall('capsule-public', { action: 'catalog' }).then(setCatalog).catch(() => {})
    if (window.location.pathname === '/demande') document.getElementById('demande')?.scrollIntoView()
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
    <PageShell current="" width="max-w-6xl">
      {/* Premier écran : promesse + sondage (la démo gratuite) */}
      <header className="grid items-start gap-8 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pyramid-orange">Pour les parents</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.02] text-slate-50 sm:text-6xl lg:text-7xl">
            Il sait quoi faire. Tu dors tranquille.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Des capsules vidéo sous-titrées : une même démarche pour tous les numéros d’un type d’examen. Seuls les chiffres changent.
          </p>
          <ul className="mt-6 space-y-2 text-slate-200">
            <li>✓ Démo gratuite en 30 secondes</li>
            <li>✓ Sous-titrée, à revoir à vie</li>
            <li>✓ Suivi de la progression pour le parent</li>
          </ul>
        </div>
        <section id="demande" className={`${CARD} scroll-mt-24 p-5 shadow-[0_24px_60px_-24px_rgba(60,40,20,0.35)] sm:p-6`} aria-label="Démo gratuite">
          <p className="text-xs font-bold uppercase tracking-widest text-pyramid-orange">Démo gratuite</p>
          <h2 className="mb-3 mt-1 font-display text-2xl font-bold text-slate-50">Reçois ta démo en 30 secondes</h2>
          <CapsuleSurvey />
        </section>
      </header>

      {/* Atouts */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[['Sous-titrées', 'pour que l’élève comprenne, même sans le son'], ['Revoir à vie', 'autant de fois qu’il veut, avant l’examen aussi'], ['Suivi parent', 'progression, dates et exercices tentés']].map(([a, b]) => (
          <div key={a} className={`${CARD} p-5`}>
            <p className="font-display text-xl font-bold text-slate-50">{a}</p>
            <p className="mt-1 text-slate-300">{b}</p>
          </div>
        ))}
      </section>

      {/* Produits */}
      <section className="mt-16" id="produits">
        <h2 className="font-display text-3xl font-bold text-slate-50">Trois façons d’aider ton enfant</h2>
        <p className="mt-2 text-slate-400">Paiement unique, en dollars canadiens. Pas d’abonnement. {TAX_NOTE}</p>
        {launchSummary() && <p className="mt-1 text-slate-300">{launchSummary()}</p>}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <div key={p.id} className={`${CARD} flex flex-col p-6 ${p.featured ? 'border-pyramid-orange/70 shadow-[0_24px_60px_-24px_rgba(224,123,46,0.45)]' : ''}`}>
              {p.featured && <span className="mb-2 text-xs font-bold uppercase tracking-widest text-pyramid-orange">Recommandé</span>}
              <h3 className="font-display text-xl font-bold text-slate-50">{p.name}</h3>
              <p className="mt-2 text-4xl font-bold text-slate-50">{money(p.price)} <span className="text-sm font-normal text-slate-400">CAD</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-slate-300">
                {p.points.map((t) => <li key={t}>• {t}</li>)}
              </ul>
              <a href="/capsules" className={`${CTA} mt-5`}>{p.id === 'bootcamp' ? 'Voir les séances' : 'Voir les capsules'}</a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Remboursement : voir la <a className="underline" href="/legal/refunds">politique de remboursement</a> avant d’acheter.
        </p>
      </section>

      {/* Prêtes maintenant */}
      {(catalog.capsules.length > 0 || catalog.bootcamps.length > 0) && (
        <section className="mt-16" id="catalogue">
          <h2 className="font-display text-3xl font-bold text-slate-50">Disponible maintenant</h2>
          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {catalog.capsules.map((c) => (
              <div key={c.slug} className={`${CARD} p-5`}>
                <p className="text-xs uppercase tracking-widest text-slate-400">{c.level} · {c.subject_area}</p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-50">{c.title}</h3>
                <p className="mt-1 text-slate-300">{money(c.price_cad)} CAD{c.duration_min ? ` · ${c.duration_min} min` : ''}</p>
                <a href={`/capsules/${c.slug}`} className={`${CTA} mt-4`}>Voir et acheter</a>
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

      {/* Comment ça marche */}
      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold text-slate-50">Comment ça marche</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className={`${CARD} p-6`}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pyramid-orange/20 font-display text-lg font-bold text-pyramid-orange">{n}</span>
              <h3 className="mt-3 font-display text-xl font-bold text-slate-50">{t}</h3>
              <p className="mt-2 text-slate-300">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tranquillité */}
      <section className={`${CARD} mt-16 grid items-center gap-6 p-8 md:grid-cols-2`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pyramid-orange">La tranquillité d’esprit</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-slate-50">Tu sais où en est ton enfant, sans courir après lui.</h2>
          <p className="mt-3 text-slate-300">Après chaque segment, tu vois la progression. Quelques jours avant l’examen, tu reçois le plan restant (si tu le souhaites).</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-slate-400">Capsule Examen · exemple</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-50">3 segments sur 5 terminés</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full w-3/5 rounded-full bg-pyramid-orange" /></div>
          <p className="mt-2 text-sm text-emerald-700">2 exercices tentés</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold text-slate-50">Questions fréquentes</h2>
        <div className="mt-4 space-y-3 text-slate-300">
          {FAQ.map(([q, a]) => (
            <details key={q} className={`${CARD} p-4`}>
              <summary className="cursor-pointer font-semibold text-slate-50">{q}</summary>
              <p className="mt-2">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a href="#demande" className={CTA}>Recevoir ma démo gratuite</a>
        </div>
      </section>
      <LegalLinks />
    </PageShell>
  )
}
