// Bêta fermée : invitation discrète à voter, après la 2e fiche complétée. Jamais bloquante,
// fermable, aucun compte à rebours (l'heure de fin est un fait, pas une pression).
import { useEffect, useState } from 'react'
import { BETA_FICHES_BEFORE_INVITE, betaHoursLeft, countMySubmissions, loadVotes } from '../lib/beta'
import { BETA_POLLS } from '../config/betaVotes'

export default function BetaVoteBanner({ profile, refreshKey }) {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([countMySubmissions(), loadVotes()]).then(([n, votes]) => {
      if (!alive) return
      const doneAll = BETA_POLLS.every((p) => votes[p.key])
      setShow(n >= BETA_FICHES_BEFORE_INVITE && !doneAll)
    })
    return () => {
      alive = false
    }
  }, [refreshKey])

  if (!show || dismissed) return null
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <span>Merci d&rsquo;avoir testé ! Vote pour la suite en 2 minutes (il reste environ {betaHoursLeft(profile)} h).</span>
      <span className="flex shrink-0 items-center gap-2">
        <a href="/beta" className="focus-ring squishy rounded-xl bg-amber-500 px-3 py-2 font-bold text-black">
          Voter
        </a>
        <button type="button" aria-label="Fermer" onClick={() => setDismissed(true)} className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-amber-200/70 hover:text-amber-100">
          ×
        </button>
      </span>
    </div>
  )
}
