// Bêta fermée : micro-feedback sous la fiche (repliable, 1 tap par question, jamais bloquant).
// Une seule réponse par fiche (upsert) ; modifiable tant que la fenêtre de 72 h est ouverte.
import { useEffect, useRef, useState } from 'react'
import { BETA_FEEDBACK_QUESTIONS as Q } from '../config/betaVotes'
import { loadFeedback, saveFeedback } from '../lib/beta'

function Choices({ options, value, onPick, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onPick(o.id)}
          className={`focus-ring squishy min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition-colors ${
            value === o.id ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function BetaFeedback({ userId, submissionId }) {
  const [vals, setVals] = useState({ niveau: null, refaire: null, commentaire: '' })
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const loaded = useRef(false)

  useEffect(() => {
    let alive = true
    loaded.current = false
    loadFeedback(submissionId).then((row) => {
      if (!alive) return
      if (row) setVals({ niveau: row.niveau_debloquant, refaire: row.refaire_seul, commentaire: row.commentaire || '' })
      loaded.current = true
    })
    return () => {
      alive = false
    }
  }, [submissionId])

  async function persist(next) {
    setVals(next)
    setStatus('saving')
    try {
      await saveFeedback(userId, submissionId, next)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <details className="glass rounded-2xl p-4 open:border-amber-500/30">
      <summary className="focus-ring cursor-pointer list-none text-sm font-semibold text-slate-100 after:float-right after:text-amber-400 after:content-['+'] open:after:content-['–']">
        2 petites questions sur cette fiche (bêta)
      </summary>
      <div className="mt-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300">{Q.niveau.titre}</p>
          <Choices label={Q.niveau.titre} options={Q.niveau.options} value={vals.niveau} onPick={(id) => persist({ ...vals, niveau: id })} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300">{Q.refaire.titre}</p>
          <Choices label={Q.refaire.titre} options={Q.refaire.options} value={vals.refaire} onPick={(id) => persist({ ...vals, refaire: id })} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`beta-comment-${submissionId}`} className="text-sm text-slate-300">
            Un mot (facultatif) <span className="text-slate-500">· n&rsquo;écris ni nom ni info perso</span>
          </label>
          <textarea
            id={`beta-comment-${submissionId}`}
            rows={2}
            maxLength={Q.commentaireMax}
            value={vals.commentaire}
            onChange={(e) => setVals({ ...vals, commentaire: e.target.value.slice(0, Q.commentaireMax) })}
            onBlur={() => loaded.current && (vals.niveau || vals.refaire || vals.commentaire) && persist(vals)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-100"
          />
          <p className="text-right text-xs text-slate-500">
            {vals.commentaire.length}/{Q.commentaireMax}
          </p>
        </div>
        <p role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-slate-400">
          {status === 'saving' && 'Enregistrement…'}
          {status === 'saved' && 'Merci, c’est enregistré ✓'}
          {status === 'error' && 'Pas enregistré (fenêtre terminée ou connexion). Ce n’est pas grave.'}
        </p>
      </div>
    </details>
  )
}
