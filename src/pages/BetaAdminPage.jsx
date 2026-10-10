// Bêta fermée : tableau de bord du fondateur (/admin/beta). Agrégats seulement, jamais de réponse
// nominative. Accès : session Supabase dont le courriel figure dans ADMIN_EMAILS (vérifié côté serveur).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BETA_POLLS } from '../config/betaVotes'

const sec = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`)

function Card({ title, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="font-display text-lg font-bold text-slate-50">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  if (!rows.length) return <p className="text-sm text-slate-500">Aucune donnée.</p>
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex justify-between gap-3 text-sm text-slate-200">
            <span>{r.label}</span>
            <span className="font-mono tabular-nums">{r.n}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function labelsFor(pollKey) {
  const poll = BETA_POLLS.find((p) => p.key === pollKey)
  return Object.fromEntries((poll?.options || []).map((o) => [o.id, o.label]))
}

export default function BetaAdminPage() {
  const [state, setState] = useState({ phase: 'loading' }) // loading | login | denied | error | ready
  const [report, setReport] = useState(null)

  const load = useCallback(async () => {
    setState({ phase: 'loading' })
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return setState({ phase: 'login' })
    try {
      const res = await fetch('/.netlify/functions/beta-results', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
      if (res.status === 401) return setState({ phase: 'login' })
      if (res.status === 403) return setState({ phase: 'denied' })
      if (!res.ok) return setState({ phase: 'error' })
      setReport(await res.json())
      setState({ phase: 'ready' })
    } catch {
      setState({ phase: 'error' })
    }
  }, [])

  useEffect(() => {
    document.title = 'Bêta : résultats'
    load()
  }, [load])

  const wrap = (children) => <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 bg-void px-4 py-6 text-slate-100">{children}</main>

  if (state.phase === 'loading') return wrap(<p className="text-slate-400">Chargement…</p>)
  if (state.phase === 'login')
    return wrap(
      <>
        <h1 className="font-display text-2xl font-bold">Connexion requise</h1>
        <p className="text-slate-300">Connecte-toi à l&rsquo;outil avec ton courriel de fondateur, puis reviens sur cette page.</p>
        <a href="/app" className="rounded-2xl bg-amber-500 px-5 py-3 text-center font-bold text-ink">Ouvrir l&rsquo;outil</a>
      </>,
    )
  if (state.phase === 'denied') return wrap(<h1 className="font-display text-2xl font-bold">Accès refusé</h1>)
  if (state.phase === 'error') return wrap(<><p className="text-rose-300">Impossible de charger les résultats.</p><button type="button" onClick={load} className="rounded-2xl border border-white/15 px-5 py-3 font-semibold">Réessayer</button></>)

  const { summary: s, verdict: v } = report
  const matieres = labelsFor('matieres')
  const fonct = labelsFor('fonctionnalites')
  const format = labelsFor('format')
  const withLabels = (poll, map) => (s.votes.polls[poll]?.options || []).map((o) => ({ ...o, label: map[o.id] || o.id }))

  return wrap(
    <>
      <header className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Bêta fermée : résultats</h1>
        <button type="button" onClick={load} className="focus-ring rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold">Actualiser</button>
      </header>

      <div className={`rounded-3xl border p-5 ${v.vert ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10'}`}>
        <p className={`font-display text-3xl font-bold ${v.vert ? 'text-emerald-300' : 'text-rose-300'}`}>{v.vert ? 'VERT : la méthode passe' : 'ROUGE : critères non atteints'}</p>
        <ul className="mt-4 space-y-3">
          {v.criteres.map((c) => (
            <li key={c.id} className="flex gap-3 text-sm">
              <span aria-hidden="true" className={`mt-0.5 font-bold ${c.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{c.ok ? '✓' : '✗'}</span>
              <span>
                <span className="text-slate-100">{c.texte}</span>
                <span className="block font-mono text-xs text-slate-400">{c.valeur}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">Le verdict aide à décider, il ne décide pas. Aucune dépense pub avant ton feu vert.</p>
      </div>

      <Card title="Participants">
        <p className="text-sm text-slate-300">{s.participants} inscrit(s), {s.active} actif(s), {s.fiches.total} fiche(s) au total ({s.fiches.parParticipant} en moyenne).</p>
        <div className="mt-3"><Bars rows={['0', '1', '2', '3', '4', '5+'].map((k) => ({ id: k, label: `${k} fiche(s)`, n: s.fiches.histogramme[k] || 0 }))} /></div>
      </Card>

      <Card title="Feedback après fiche">
        <p className="mb-2 text-sm text-slate-400">{s.feedback.reponses} réponse(s), {s.feedback.commentaires} commentaire(s) (non affichés).</p>
        <p className="mb-1 text-sm font-semibold">Quel niveau a débloqué ?</p>
        <Bars rows={[['1', 'Niveau 1'], ['2', 'Niveau 2'], ['3', 'Niveau 3'], ['aucun', 'Aucun']].map(([id, label]) => ({ id, label, n: s.feedback.niveau[id] || 0 }))} />
        <p className="mb-1 mt-4 text-sm font-semibold">Pourrait refaire seul ?</p>
        <Bars rows={[['oui', 'Oui'], ['presque', 'Presque'], ['non', 'Non']].map(([id, label]) => ({ id, label, n: s.feedback.refaire[id] || 0 }))} />
      </Card>

      <Card title={`Matières (${s.votes.polls.matieres?.votants || 0} votant(s))`}>
        <Bars rows={withLabels('matieres', matieres)} />
        {s.votes.polls.matieres?.autres?.length > 0 && <p className="mt-3 text-sm text-slate-400">Autres : {s.votes.polls.matieres.autres.join(' · ')}</p>}
      </Card>
      <Card title={`Fonctionnalités (${s.votes.polls.fonctionnalites?.votants || 0} votant(s))`}><Bars rows={withLabels('fonctionnalites', fonct)} /></Card>
      <Card title={`Format (${s.votes.polls.format?.votants || 0} votant(s)) : donnée, pas une décision`}><Bars rows={withLabels('format', format)} /></Card>

      <Card title="Moteur">
        <p className="font-mono text-sm text-slate-200">{s.moteur.appels} appel(s) · médiane {sec(s.moteur.medianeMs)} · p95 {sec(s.moteur.p95Ms)} · {s.moteur.erreurs5xx} erreur(s) ({Math.round(s.moteur.tauxErreur * 100)} %)</p>
        <ul className="mt-2 text-sm text-slate-400">{Object.entries(s.moteur.parModele).map(([m, n]) => <li key={m}>{m} : {n}</li>)}</ul>
      </Card>

      <Card title="Empreintes d'appareil (observation)">
        <p className="text-sm text-slate-300">{s.empreintes.comptesAvecDeuxEmpreintesOuPlus} compte(s) avec 2 empreintes ou plus, {s.empreintes.blocages} blocage(s). Faux positifs probables : téléphone + ordinateur.</p>
      </Card>
    </>,
  )
}
