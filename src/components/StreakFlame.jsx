// La Flamme (contrat §6, gamification passive) : jours consécutifs avec au moins une
// analyse réussie. S'intensifie visuellement par palier — rétention douce, pas un score
// affiché avec pression : rien ne s'affiche tant qu'il n'y a pas au moins 1 jour de suite.
const TIERS = [
  { min: 1, color: 'text-slate-400', glow: '' },
  { min: 2, color: 'text-amber-400', glow: 'shadow-glow-amber' },
  { min: 4, color: 'text-orange-400', glow: 'shadow-[0_0_16px_rgba(251,146,60,0.5)]' },
  { min: 7, color: 'text-rose-400', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.55)] motion-safe:animate-glow-pulse' },
]

function tierFor(days) {
  let tier = TIERS[0]
  for (const t of TIERS) if (days >= t.min) tier = t
  return tier
}

export default function StreakFlame({ days = 0 }) {
  if (!days || days < 1) return null
  const tier = tierFor(days)

  return (
    <span
      className={`glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold tabular-nums ${tier.color} ${tier.glow}`}
      role="status"
      aria-label={`${days} ${days > 1 ? 'jours' : 'jour'} de suite`}
      title={`${days} ${days > 1 ? 'jours' : 'jour'} de suite`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12.5 2c1 3-2 4.5-2 7.5a2.5 2.5 0 0 0 5 0c0-1-.3-1.8-.7-2.5 2 1 3.2 3.3 3.2 5.7A6 6 0 1 1 6 12.7C6 9 8.5 6.5 9.5 4c.3 1.5 1.3 2.4 3 2C12.2 4.7 12 3.3 12.5 2Z" />
      </svg>
      {days}
    </span>
  )
}
