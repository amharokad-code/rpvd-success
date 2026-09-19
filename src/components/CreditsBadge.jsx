// Pilule de crédits (contrat §3) : texte et couleur dépendent du nombre restant.
// 0 → gris (accès requis), 1 → amber qui respire (dernier essai), sinon emerald.
import { useCopy } from '../context/RegionContext'

function creditsLabel(t, credits) {
  if (credits === 0) return t.credits.zero
  if (credits === 1) return t.credits.one
  if (credits === 3) return t.credits.three
  return t.credits.many(credits)
}

function creditsTone(credits) {
  if (credits === 0) return 'text-slate-400'
  if (credits === 1) return 'text-amber-400 motion-safe:animate-glow-pulse'
  return 'text-emerald-400'
}

export default function CreditsBadge({ credits = 0, onClick }) {
  const { t } = useCopy()
  const label = creditsLabel(t, credits)
  const baseClass = `glass inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold tabular-nums ${creditsTone(credits)}`

  // Cliquable seulement si le parent fournit une action (ouvrir le mur de paiement).
  if (typeof onClick === 'function') {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} squishy focus-ring`} aria-live="polite">
        {label}
      </button>
    )
  }

  return (
    <span className={baseClass} aria-live="polite">
      {label}
    </span>
  )
}
