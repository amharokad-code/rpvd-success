// « Cerveau en marche » (contrat §3) : 3 barres glass qui pulsent avec un reflet glissant,
// message qui tourne toutes les 800 ms sur messages[0..2], puis se fixe sur messages[3] après 3 s.
import { useEffect, useState } from 'react'
import GlassCard from './ui/GlassCard'

const ROTATE_MS = 800
const SETTLE_MS = 3000
const ROTATING_COUNT = 3
const BAR_WIDTHS = ['w-3/4', 'w-full', 'w-1/2']

export default function SkeletonLoader({ messages = [] }) {
  const [index, setIndex] = useState(0)
  const total = messages.length

  // Dépend du nombre de messages (pas de la référence) : un tableau recréé par le parent
  // à chaque rendu ne doit pas remettre les minuteries à zéro.
  useEffect(() => {
    const rotating = Math.min(ROTATING_COUNT, total)
    if (rotating === 0) return undefined

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % rotating)
    }, ROTATE_MS)

    // Phase 4 : on arrête la rotation et on reste sur le dernier message s'il existe.
    const settle = window.setTimeout(() => {
      window.clearInterval(interval)
      if (total > ROTATING_COUNT) setIndex(ROTATING_COUNT)
    }, SETTLE_MS)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(settle)
    }
  }, [total])

  const message = messages[index] ?? messages[0] ?? ''

  return (
    <GlassCard role="status" aria-live="polite" aria-busy="true" className="motion-safe:animate-bop">
      <div className="space-y-4" aria-hidden="true">
        {BAR_WIDTHS.map((width, i) => (
          <div
            key={width}
            className={`h-5 ${width} overflow-hidden rounded-full border border-white/5 bg-slate-700/40 motion-safe:animate-pulse`}
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="h-full w-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.10)_50%,transparent_100%)] bg-[length:200%_100%] motion-safe:animate-shimmer" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400 motion-safe:animate-glow-pulse" aria-hidden="true" />
        <p key={index} className="text-base font-medium leading-relaxed text-slate-200 motion-safe:animate-rise">
          {message}
        </p>
      </div>
    </GlassCard>
  )
}
