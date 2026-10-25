// Site E.M.A. Tutorat (ematutorat.com) : séances en direct décidées par le fondateur. Aucun sondage :
// l'élève voit ce qui se passe aujourd'hui / cette semaine, entre en un clic (prénom + courriel),
// assiste, puis paie à la sortie (19 $, prix affiché avant l'entrée). Marque propre : étoile verte, fond crème.
import { useEffect, useMemo, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { currentPrice, formatPrice, launchSummary } from '../config/pricing.mjs'

const GREEN = '#2f8f7e'
const INK = '#1f2d2a'

const TZ = 'America/Toronto'
const fmtDay = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
const fmtTime = new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)

// Regroupe : « En ce moment », « Aujourd'hui », « Cette semaine » (7 jours), « Plus tard ».
export function groupSeances(seances, now = new Date()) {
  const today = dayKey(now)
  const weekEnd = now.getTime() + 7 * 86400000
  const groups = { live: [], today: [], week: [], later: [] }
  for (const s of seances) {
    const start = new Date(s.starts_at)
    if (s.status === 'live') groups.live.push(s)
    else if (dayKey(start) === today) groups.today.push(s)
    else if (start.getTime() <= weekEnd) groups.week.push(s)
    else groups.later.push(s)
  }
  return groups
}

function Card({ s, price, onEnter, onPay, paying }) {
  const start = new Date(s.starts_at)
  return (
    <article className="rounded-2xl border border-[#e4dac7] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
        {s.status === 'live' ? 'En ce moment' : fmtDay.format(start)}
      </p>
      <h3 className="mt-1 text-xl font-bold" style={{ color: INK }}>
        {s.matiere} {s.niveau}
      </h3>
      <p className="mt-1" style={{ color: INK }}>{s.sujet}</p>
      <p className="mt-2 text-sm text-[#5b6b66]">
        {fmtTime.format(start).replace(':00', ' h')} · {s.duree_min} min · en direct, petit groupe
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onEnter(s)} className="rounded-xl px-5 py-3 font-bold text-[#ffffff]" style={{ background: GREEN }}>
          Je rentre
        </button>
        <button
          type="button"
          onClick={() => onPay(s)}
          disabled={paying === s.id}
          className="rounded-xl border border-[#cfc3ad] px-5 py-3 font-semibold disabled:opacity-60"
          style={{ color: INK }}
        >
          {paying === s.id ? 'Un instant…' : `Payer ma séance · ${price}`}
        </button>
      </div>
      <p className="mt-3 text-xs text-[#5b6b66]">Entrée libre. Tu paies {price} à la sortie si la séance t’a aidé.</p>
    </article>
  )
}

function EnterForm({ s, onDone, onCancel }) {
  const [prenom, setPrenom] = useState('')
  const [courriel, setCourriel] = useState('')
  const [attest, setAttest] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await bootcampCall('seances-entrer', { id: s.id, prenom, courriel, attest })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-[#cfc3ad] bg-[#fffdf8] px-4 py-3 text-base'
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-[#e4dac7] bg-[#fffdf8] p-5">
      <p className="font-bold" style={{ color: INK }}>{s.matiere} {s.niveau} : {s.sujet}</p>
      <input className={input} placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required autoComplete="given-name" />
      <input className={input} type="email" placeholder="Courriel" value={courriel} onChange={(e) => setCourriel(e.target.value)} required autoComplete="email" />
      <label className="flex items-start gap-3 text-sm" style={{ color: INK }}>
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1" required />
        J’ai 14 ans ou plus, ou un parent ou tuteur est d’accord.
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="rounded-xl px-5 py-3 font-bold text-[#ffffff] disabled:opacity-60" style={{ background: GREEN }}>
          {busy ? 'Envoi…' : 'Recevoir le lien'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-3 text-sm underline" style={{ color: INK }}>Annuler</button>
      </div>
      <p className="text-xs text-[#5b6b66]">Ton courriel sert à t’envoyer le lien de la séance. Rien d’autre. <a className="underline" href="/legal/privacy">Confidentialité</a></p>
    </form>
  )
}

export default function EmaSeancesPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [entering, setEntering] = useState(null)
  const [sent, setSent] = useState(false)
  const [paying, setPaying] = useState(null)
  const paid = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paiement') === 'ok'

  useEffect(() => {
    document.title = 'E.M.A. Tutorat — Séances de révision en direct, Sec 3 à 5'
    bootcampCall('seances-public', {}).then(setData).catch((e) => { setError(e.message); setData({ seances: [], price_cents: 1900 }) })
  }, [])

  const price = useMemo(() => `${Math.round((data?.price_cents ?? 1900) / 100)} $`, [data])
  const groups = useMemo(() => groupSeances(data?.seances ?? []), [data])

  async function pay(s) {
    const attest = window.confirm('Je confirme avoir 14 ans ou plus, ou l’accord d’un parent ou tuteur, pour ce paiement.')
    if (!attest) return
    setPaying(s.id)
    try {
      const { url } = await bootcampCall('seances-paiement', { id: s.id, attest: true })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setPaying(null)
    }
  }

  const sections = [
    ['En ce moment', groups.live],
    ['Aujourd’hui', groups.today],
    ['Cette semaine', groups.week],
    ['Plus tard', groups.later],
  ].filter(([, list]) => list.length > 0)

  return (
    <div className="min-h-screen" style={{ background: '#f8f2e6', color: INK }}>
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
        <img src="/ema/etoile.jpg" alt="" width="44" height="44" className="rounded-full" />
        <span className="text-xl font-extrabold tracking-tight">E.M.A. Tutorat</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <section className="pt-4">
          <h1 className="text-4xl font-extrabold leading-tight">Comprendre la démarche, pas juste la matière.</h1>
          <p className="mt-4 text-lg text-[#43524e]">
            Beaucoup d’élèves comprennent en classe, puis se perdent à l’examen. Chez E.M.A., on enseigne la démarche : en packs vidéo à revoir quand tu veux, ou en tutorat en direct, un seul sujet par séance, en petit groupe.
          </p>
          <p className="mt-2 text-lg text-[#43524e]">Sec 3 à 5 : maths, sciences, chimie, physique, français.</p>
        </section>

        {paid && (
          <p role="status" className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900">
            Merci, ton paiement est confirmé. Un reçu t’arrive par courriel.
          </p>
        )}
        {sent && (
          <p role="status" className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900">
            C’est fait ! Regarde ta boîte courriel (et les indésirables) : le lien de la séance t’attend.
          </p>
        )}
        {error && <p role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">{error}</p>}

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Packs vidéo</h2>
          <p className="mt-2 text-[#43524e]">Des capsules à revoir quand tu veux : une démarche visuelle par type de question. Paiement unique, accès par courriel.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['Pack Chapitre', 'concept', 'Un chapitre, les types de questions et leur démarche.'],
              ['Pack Exam', 'exam', 'Tout ce qu’il faut pour l’examen : démarches, pièges, exercices corrigés.'],
            ].map(([name, type, text]) => (
              <article key={name} className="rounded-2xl border border-[#e4dac7] bg-[#fffdf8] p-5">
                <h3 className="text-lg font-bold">{name}</h3>
                <p className="mt-1 text-sm text-[#43524e]">{text}</p>
                <p className="mt-3 text-xl font-extrabold" style={{ color: GREEN }}>{formatPrice(currentPrice(type))}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#5b6b66]">
            {launchSummary()} <a className="underline" href="/capsules">Voir les packs prêts</a> · <a className="underline" href="/demande">Demander un sujet</a>
          </p>
        </section>

        <section className="mt-12 space-y-8">
          <h2 className="-mb-4 text-2xl font-bold">Tutorat en direct</h2>
          {!data && <p>Chargement…</p>}
          {data && sections.length === 0 && (
            <p className="rounded-2xl border border-[#e4dac7] bg-[#fffdf8] p-5">La prochaine séance est annoncée très bientôt. Reviens sur cette page.</p>
          )}
          {sections.map(([title, list]) => (
            <div key={title}>
              <h2 className="mb-3 text-2xl font-bold">{title}</h2>
              <div className="grid gap-4">
                {list.map((s) => (
                  <div key={s.id}>
                    <Card s={s} price={price} onEnter={setEntering} onPay={pay} paying={paying} />
                    {entering?.id === s.id && !sent && (
                      <EnterForm s={s} onDone={() => { setSent(true); setEntering(null) }} onCancel={() => setEntering(null)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-14 text-sm text-[#5b6b66]">
          <p>
            <a className="underline" href="/legal/privacy">Confidentialité</a> · <a className="underline" href="/legal/terms">Conditions</a> · <a className="underline" href="/legal/refunds">Remboursements</a> · <a className="underline" href="/legal/contact">Contact</a>
          </p>
          <p className="mt-2">Prix en dollars canadiens, paiement unique, aucun abonnement.</p>
        </footer>
      </main>
    </div>
  )
}
