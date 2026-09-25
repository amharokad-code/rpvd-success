// Bandeau de streak (contrat §6, gamification passive) — variante "header" de StreakFlame.jsx
// (qui reste la pastille compacte utilisée ailleurs). Affiche l'état du jour ("actif" vs
// "à risque" si pas encore scanné aujourd'hui) et une légère animation quand le streak
// vient de progresser (2 jours consécutifs et +). Ne s'affiche pas à 0 (même logique douce
// que StreakFlame : pas de pression avant le premier jour).
import { useEffect, useRef, useState } from 'react'

const TIERS = [
  { min: 1, color: 'text-slate-300', ring: 'ring-white/10' },
  { min: 2, color: 'text-amber-400', ring: 'ring-amber-400/30' },
  { min: 4, color: 'text-orange-400', ring: 'ring-orange-400/40' },
  { min: 7, color: 'text-rose-400', ring: 'ring-rose-400/40' },
]

function tierFor(days) {
  let tier = TIERS[0]
  for (const t of TIERS) if (days >= t.min) tier = t
  return tier
}

// 'YYYY-MM-DD' local, même granularité que la colonne `last_analysis_date` (type `date`) —
// comparaison purement calendaire, sans fuseau horaire serveur.
function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * @param {number} days - streak_days du profil.
 * @param {string|null} lastAnalysisDate - users.last_analysis_date ('YYYY-MM-DD' ou null).
 * @param {{active: string, atRisk: (days:number)=>string}} copy - textes déjà traduits (i18n).
 */
export default function StreakHeader({ days = 0, lastAnalysisDate = null, copy, className = '' }) {
  const prevDays = useRef(days)
  const [justProgressed, setJustProgressed] = useState(false)

  useEffect(() => {
    if (days > prevDays.current && days >= 2) {
      setJustProgressed(true)
      const t = setTimeout(() => setJustProgressed(false), 900)
      prevDays.current = days
      return () => clearTimeout(t)
    }
    prevDays.current = days
  }, [days])

  if (!days || days < 1) return null

  const tier = tierFor(days)
  const activeToday = lastAnalysisDate === todayLocal()
  const unitLabel = days > 1 ? 'jours' : 'jour'
  const activeText = copy?.active ?? `${days} ${unitLabel} de suite`
  const atRiskText = copy?.atRisk ? copy.atRisk(days) : `${days} ${unitLabel} — scanne aujourd'hui pour continuer`

  return (
    <div
      role="status"
      aria-label={activeToday ? activeText : atRiskText}
      className={`glass flex min-h-[44px] items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${tier.ring} ${
        justProgressed ? 'motion-safe:animate-spring-in' : ''
      } ${className}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/60 ${tier.color} ${
          activeToday ? '' : 'opacity-60'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12.5 2c1 3-2 4.5-2 7.5a2.5 2.5 0 0 0 5 0c0-1-.3-1.8-.7-2.5 2 1 3.2 3.3 3.2 5.7A6 6 0 1 1 6 12.7C6 9 8.5 6.5 9.5 4c.3 1.5 1.3 2.4 3 2C12.2 4.7 12 3.3 12.5 2Z" />
        </svg>
      </span>

      <span className="flex min-w-0 flex-col">
        <span className={`font-mono text-sm font-bold tabular-nums ${tier.color}`}>{days} {unitLabel}</span>
        <span className={`truncate text-xs ${activeToday ? 'text-emerald-400' : 'text-amber-400/90'}`}>
          {activeToday ? (copy?.activeSubtitle ?? 'Actif aujourd’hui') : (copy?.atRiskSubtitle ?? 'À risque — pas encore scanné aujourd’hui')}
        </span>
      </span>
    </div>
  )
}
