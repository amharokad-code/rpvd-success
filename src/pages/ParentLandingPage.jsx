// Landing parents (/) : capsules vidéo RPVD. Message : la tranquillité d'esprit du parent.
// Textes = brouillon à valider (titre, arguments, FAQ). Aucune fausse urgence : seuls les prix réels et la vraie date d'examen.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CARD, CTA, INPUT, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const DEMO_VIDEO_URL = import.meta.env.VITE_DEMO_VIDEO_URL || ''
const money = (cents) => `${(cents / 100).toFixed(0)} $`
const LEVELS = ['Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5', 'Cégep']
const SUBJECTS = ['Mathématiques', 'Science et technologie', 'Chimie', 'Physique', 'Français', 'Autre']

const PRODUCTS = [
  { id: 'concept', name: 'Capsule Concept', price: 2400, featured: false, points: ['Vidéo sous-titrée', 'La méthode RPVD appliquée à un concept'] },
  {
    id: 'exam',
    name: 'Capsule Examen',
    price: 2900,
    featured: true,
    points: ['Vidéo sous-titrée, plus complète', 'La méthode RPVD sur un type d’examen', 'Code d’essai de l’application RPVD : 30 jours'],
  },
  {
    id: 'bootcamp',
    name: 'Bootcamp RPVD en direct',
    price: 9900,
    featured: false,
    points: ['Séance en direct avec questions en direct', 'Code d’essai de l’application RPVD : 30 jours', 'Clavardage de questions jusqu’à l’examen'],
  },
]

const EMPTY = { parent_first_name: '', email: '', child_first_name: '', level: '', subject_area: '', topic: '', exam_date: '', product_wanted: 'exam', consent_email: false, bot_field: '' }

export default function ParentLandingPage() {
  const [catalog, setCatalog] = useState({ capsules: [], bootcamps: [] })
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    document.title = 'RPVD — Des capsules vidéo pour que ton enfant arrive prêt à l’examen'
    bootcampCall('capsule-public', { action: 'catalog' }).then(setCatalog).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setState('busy')
    setError(null)
    try {
      await bootcampCall('capsule-request', form)
      setState('done')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

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

  const select = (k, options, placeholder) => (
    <select required value={form[k]} onChange={set(k)} className={INPUT}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )

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
        <p className="mt-2 text-slate-400">Paiement unique, en dollars canadiens. Pas d’abonnement.</p>
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
              <a href="#demande" onClick={() => setForm((f) => ({ ...f, product_wanted: p.id }))} className={`${CTA} mt-5`}>Je veux celle-ci</a>
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
                  <button type="button" disabled={buying === c.slug} onClick={() => buy({ kind: 'capsule', slug: c.slug }, c.slug)} className={CTA}>
                    {buying === c.slug ? <Spinner /> : 'Acheter'}
                  </button>
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
                <button type="button" disabled={buying === b.id} onClick={() => buy({ kind: 'bootcamp', id: b.id }, b.id)} className={`${CTA} mt-4`}>
                  {buying === b.id ? <Spinner /> : 'Réserver ma place'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14" id="demande">
        <h2 className="font-display text-3xl font-bold text-slate-50">Demander une capsule</h2>
        <p className="mt-2 text-slate-400">Dis-nous le sujet de l’examen. Dès que trois familles demandent le même, on produit la capsule et on t’écrit.</p>
        <div className={`${CARD} mt-6 p-5 sm:p-6`}>
          {state === 'done' ? (
            <Notice tone="ok">Demande reçue. Tu recevras un courriel quand la capsule sera prête. Tu peux te désabonner en un clic dans chaque courriel.</Notice>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <input className={INPUT} required placeholder="Ton prénom (parent)" value={form.parent_first_name} onChange={set('parent_first_name')} maxLength={80} />
              <input className={INPUT} required type="email" placeholder="Ton courriel" value={form.email} onChange={set('email')} maxLength={254} />
              <input className={INPUT} placeholder="Prénom de ton enfant (facultatif)" value={form.child_first_name} onChange={set('child_first_name')} maxLength={80} />
              {select('level', LEVELS, 'Niveau')}
              {select('subject_area', SUBJECTS, 'Matière')}
              <input className={INPUT} required placeholder="Sujet de l’examen (ex. : trigonométrie)" value={form.topic} onChange={set('topic')} maxLength={160} />
              <label className="text-sm text-slate-300">
                Date de l’examen (si connue)
                <input className={`${INPUT} mt-1`} type="date" value={form.exam_date} onChange={set('exam_date')} />
              </label>
              <label className="text-sm text-slate-300">
                Produit souhaité
                <select className={`${INPUT} mt-1`} value={form.product_wanted} onChange={set('product_wanted')}>
                  <option value="concept">Capsule Concept — 24 $</option>
                  <option value="exam">Capsule Examen — 29 $</option>
                  <option value="bootcamp">Bootcamp RPVD en direct — 99 $</option>
                </select>
              </label>
              <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.bot_field} onChange={set('bot_field')} name="website" />
              <label className="flex items-start gap-3 text-sm text-slate-300 sm:col-span-2">
                <input type="checkbox" required checked={form.consent_email} onChange={set('consent_email')} className="mt-1 h-5 w-5" />
                <span>
                  J’accepte de recevoir des courriels de RPVD au sujet de ma demande (capsule prête, rappel avant l’examen, suivi). Je peux me désabonner en tout temps.{' '}
                  <a className="underline" href="/legal/privacy">Politique de confidentialité</a>
                </span>
              </label>
              {error && <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div>}
              <button type="submit" disabled={state === 'busy'} className={`${CTA} sm:col-span-2`}>
                {state === 'busy' ? <Spinner /> : 'Envoyer ma demande'}
              </button>
            </form>
          )}
        </div>
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
