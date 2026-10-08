// Bêta fermée : page de votes (/beta). Réservée aux comptes de bêta (users.is_beta) pendant leur
// fenêtre de 72 h. Un vote par sondage par élève (upsert), modifiable jusqu'à la fin de la fenêtre.
// Données minimales : aucun nom, « autre » limité à 40 caractères avec consigne anti-info-perso.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchProfile } from '../lib/api'
import { BETA_POLLS } from '../config/betaVotes'
import { betaHoursLeft, clip, isBetaActive, loadVotes, saveVote } from '../lib/beta'

function Shell({ children }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 bg-[#0b0b0c] px-4 py-8 text-slate-100">
      <a href="/app" className="text-sm text-slate-400 hover:text-slate-200">
        ← Retour à l&rsquo;outil
      </a>
      {children}
    </main>
  )
}

function Progress({ index, total }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-amber-300">
        Vote {index + 1} sur {total}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
    </div>
  )
}

export default function BetaPage() {
  const [state, setState] = useState({ phase: 'loading' }) // loading | login | nobeta | ended | ready | error
  const [profile, setProfile] = useState(null)
  const [saved, setSaved] = useState({})
  const [answers, setAnswers] = useState({}) // pollKey → { choices: [], autre: '' }
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Bêta RPVD Success : vote pour la suite'
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data?.session) return alive && setState({ phase: 'login' })
        const p = await fetchProfile()
        if (!alive) return
        setProfile(p)
        if (!p?.is_beta) return setState({ phase: 'nobeta' })
        if (!isBetaActive(p)) return setState({ phase: 'ended' })
        const votes = await loadVotes()
        if (!alive) return
        setSaved(votes)
        setAnswers(Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, { choices: v.choices || [], autre: v.autre || '' }])))
        setState({ phase: 'ready' })
      } catch {
        if (alive) setState({ phase: 'error' })
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (state.phase === 'loading') return <Shell><p className="text-slate-400">Chargement…</p></Shell>
  if (state.phase === 'login')
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold">Connecte-toi d&rsquo;abord</h1>
        <p className="text-slate-300">Ouvre l&rsquo;outil et connecte-toi avec ton courriel, puis reviens ici.</p>
        <a href="/app" className="rounded-2xl bg-amber-500 px-5 py-3 text-center font-bold text-black">Ouvrir l&rsquo;outil</a>
      </Shell>
    )
  if (state.phase === 'nobeta')
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold">Cette page est réservée à la bêta fermée</h1>
        <p className="text-slate-300">Ton compte n&rsquo;a pas de code de bêta activé.</p>
      </Shell>
    )
  if (state.phase === 'ended')
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold">La bêta est terminée</h1>
        <p className="text-slate-300">Merci d&rsquo;avoir testé ! Les votes sont fermés.</p>
      </Shell>
    )
  if (state.phase === 'error')
    return (
      <Shell>
        <p className="text-rose-300">Impossible de charger la page. Réessaie dans un instant.</p>
      </Shell>
    )

  const total = BETA_POLLS.length
  const done = step >= total
  if (done)
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold">Merci ! 🙌</h1>
        <p className="text-slate-300">Tes votes sont enregistrés. Tu peux les modifier jusqu&rsquo;à la fin de la bêta (environ {betaHoursLeft(profile)} h).</p>
        <button type="button" onClick={() => setStep(0)} className="focus-ring rounded-2xl border border-white/15 px-5 py-3 font-semibold">Modifier mes votes</button>
        <a href="/app" className="rounded-2xl bg-amber-500 px-5 py-3 text-center font-bold text-black">Retour à l&rsquo;outil</a>
      </Shell>
    )

  const poll = BETA_POLLS[step]
  const current = answers[poll.key] || { choices: [], autre: '' }
  const max = poll.type === 'single' ? 1 : poll.max

  function toggle(id) {
    setError('')
    let next
    if (poll.type === 'single') next = [id]
    else if (current.choices.includes(id)) next = current.choices.filter((c) => c !== id)
    else if (current.choices.length >= max) {
      setError(`Choisis ${max} options au maximum.`)
      return
    } else next = [...current.choices, id]
    setAnswers({ ...answers, [poll.key]: { ...current, choices: next } })
  }

  async function next() {
    if (current.choices.length === 0 && !(poll.autre && current.autre.trim())) {
      setError('Choisis au moins une option (ou passe avec « Passer »).')
      return
    }
    setBusy(true)
    setError('')
    try {
      await saveVote(profile.id, poll.key, current.choices, current.autre)
      setSaved({ ...saved, [poll.key]: true })
      setStep(step + 1)
    } catch {
      setError('Pas enregistré (fenêtre terminée ou connexion). Réessaie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Progress index={step} total={total} />
      <h1 className="font-display text-2xl font-bold">{poll.titre}</h1>
      {poll.type === 'multi' && <p className="-mt-3 text-sm text-slate-400">Jusqu&rsquo;à {max} choix.</p>}
      <div role={poll.type === 'single' ? 'radiogroup' : 'group'} aria-label={poll.titre} className="flex flex-col gap-3">
        {poll.options.map((o) => {
          const on = current.choices.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              role={poll.type === 'single' ? 'radio' : 'checkbox'}
              aria-checked={on}
              onClick={() => toggle(o.id)}
              className={`focus-ring squishy min-h-[48px] rounded-2xl border p-4 text-left transition-colors ${
                on ? 'border-amber-500 bg-amber-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <span className="font-semibold">{o.label}</span>
              {o.exemple && <span className="mt-2 block whitespace-pre-line text-sm text-slate-300">{o.exemple}</span>}
            </button>
          )
        })}
      </div>
      {poll.autre && (
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {poll.autre.label}
          <input
            type="text"
            maxLength={poll.autre.max}
            value={current.autre}
            onChange={(e) => setAnswers({ ...answers, [poll.key]: { ...current, autre: clip(e.target.value, poll.autre.max) } })}
            className="focus-ring rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-100"
          />
          <span className="text-right text-xs text-slate-500">{current.autre.length}/{poll.autre.max} · n&rsquo;écris ni nom ni info perso</span>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="focus-ring rounded-2xl border border-white/15 px-5 py-3 font-semibold">Retour</button>
        )}
        <button type="button" onClick={() => setStep(step + 1)} className="focus-ring rounded-2xl border border-white/15 px-5 py-3 font-semibold text-slate-300">Passer</button>
        <button type="button" disabled={busy} onClick={next} className="focus-ring flex-1 rounded-2xl bg-amber-500 px-5 py-3 font-bold text-black disabled:opacity-60">
          {busy ? 'Enregistrement…' : step === total - 1 ? 'Envoyer' : 'Continuer'}
        </button>
      </div>
    </Shell>
  )
}
