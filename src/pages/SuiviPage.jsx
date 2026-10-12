// /suivi : vue PARENT en lecture seule (même connexion par lien magique sur le courriel d'achat) :
// barre de progression, dates, exercices tentés. Privé, noindex, aucun suivi publicitaire.
import { useEffect, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { examCountdown } from '../lib/examPlan'
import { authedHeaders } from './MesCapsulesPage'
import { CARD, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

const fmt = (iso) => (iso ? new Intl.DateTimeFormat('fr-CA', { dateStyle: 'long' }).format(new Date(iso)) : '—')

export default function SuiviPage() {
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Suivi — RPVD'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    authedHeaders().then((headers) => {
      if (!headers) { window.location.replace('/connexion'); return }
      bootcampCall('my-capsules', { action: 'parent' }, headers)
        .then((d) => setList(d.capsules))
        .catch((e) => (e.status === 401 ? window.location.replace('/connexion') : (setError(e.message), setList([]))))
    })
  }, [])

  return (
    <PageShell current="" width="max-w-3xl">
      <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">Suivi de votre enfant</h1>
      <p className="mt-2 text-slate-300">Lecture seule : progression, dates et exercices tentés.</p>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      {!list ? <div className="mt-8"><Spinner /></div> : (
        <div className="mt-6 space-y-5">
          {list.map((c) => {
            const left = c.date_examen ? Math.round((Date.parse(`${c.date_examen}T00:00:00Z`) - Date.now()) / 86400000) : null
            return (
              <div key={c.slug} className={`${CARD} p-5`}>
                <h2 className="font-display text-xl font-bold text-slate-50">{c.title}</h2>
                <p className="text-sm text-slate-400">{c.level} · {c.subject_area}{examCountdown(left) ? ` · ${examCountdown(left)}` : ''}</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.completed}>
                  <div className="h-full rounded-full bg-pyramid-orange" style={{ width: `${c.total ? (c.completed / c.total) * 100 : 0}%` }} />
                </div>
                <p className="mt-1 text-slate-300">{c.completed} segment{c.completed > 1 ? 's' : ''} terminé{c.completed > 1 ? 's' : ''} sur {c.total} · {c.exercises_tried} exercice{c.exercises_tried > 1 ? 's' : ''} tenté{c.exercises_tried > 1 ? 's' : ''}</p>
                <p className="mt-1 text-sm text-slate-400">Achat : {fmt(c.purchased_at)} · Premier visionnement : {fmt(c.first_activity)} · Dernière activité : {fmt(c.last_activity)}</p>
                <ul className="mt-3 text-sm text-slate-300">
                  {c.segments.map((s) => <li key={s.ordre}>{s.complete ? '✓' : '○'} {s.ordre}. {s.titre}{s.exercice_tente ? ' (exercice tenté)' : ''}</li>)}
                </ul>
              </div>
            )
          })}
          {list.length === 0 && !error && <p className="text-slate-300">Aucun achat avec ce courriel.</p>}
        </div>
      )}
      <p className="mt-8 text-sm"><a className="underline" href="/mes-capsules">Mes capsules</a></p>
    </PageShell>
  )
}
