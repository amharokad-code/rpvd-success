// Mur de paiement (contrat §3) : deux forfaits, Trio mis en avant, redirection Stripe Checkout.
// Cadrage psychologique : sobre, urgent, ultra-premium (le payeur, pas l'élève, est visé ici).
// Le rabais/chrono sont purement visuels (front) — Stripe et Supabase ne connaissent que le vrai prix.
import { useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useCopy } from '../context/RegionContext'
import { ApiError, createCheckout } from '../lib/api'

// Forfaits du contrat §0 (prix réels en CAD, ceux envoyés à Stripe/Supabase).
// `regularPrice`/`discountPct` sont des ancrages marketing affichés seulement côté front.
const PLANS = [
  { id: 'solo', price: 12.99, regularPrice: 29.99, discountPct: 56, featured: false },
  { id: 'trio', price: 24.99, regularPrice: 59.99, discountPct: 58, featured: true },
]

const priceFormatter = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
})

const COUNTDOWN_MS = 15 * 60 * 1000
const COUNTDOWN_KEY = 'rpvd_paywall_deadline'

// Échéance réelle de LA session en cours, persistée pour survivre à un refresh — mais jamais
// régénérée après une vraie expiration. Un chrono qui se relance silencieusement à chaque
// visite reproduirait une fausse urgence permanente (problème de conformité, pas cosmétique) :
// une fois expiré, `getDeadline` retourne l'échéance passée telle quelle, et l'UI passe en
// état « expired » explicite (CTA désactivés) plutôt que de faire semblant qu'il reste du temps.
function getDeadline() {
  try {
    const stored = Number(window.localStorage.getItem(COUNTDOWN_KEY))
    if (stored) return stored
  } catch {
    // localStorage indisponible (mode privé, etc.) : le chrono reste en mémoire seulement.
  }
  const deadline = Date.now() + COUNTDOWN_MS
  try {
    window.localStorage.setItem(COUNTDOWN_KEY, String(deadline))
  } catch {
    // best-effort
  }
  return deadline
}

function formatCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function PaywallModal({ open, credits, onClose, onHaveCode }) {
  const { t } = useCopy()
  const [busyPlan, setBusyPlan] = useState(null)
  const [error, setError] = useState(null)
  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_MS)
  const deadlineRef = useRef(null)

  // On repart propre à chaque ouverture, mais le chrono lui-même survit (voir getDeadline).
  useEffect(() => {
    if (!open) return
    setBusyPlan(null)
    setError(null)
    deadlineRef.current = getDeadline()
    setRemainingMs(deadlineRef.current - Date.now())

    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  const expired = remainingMs <= 0

  async function choosePlan(plan) {
    if (busyPlan || expired) return
    setBusyPlan(plan)
    setError(null)
    try {
      const { url } = await createCheckout(plan)
      if (!url) throw new ApiError('SERVER_ERROR')
      window.location.assign(url)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.errors.SERVER_ERROR)
      setBusyPlan(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.paywall.title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-300 motion-safe:animate-pulse">
          {t.paywall.badge}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300">
          {t.paywall.badgeAlt}
        </span>
      </div>

      <p className="mt-3 text-slate-300 leading-relaxed">{t.paywall.subtitle}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isBusy = busyPlan === plan.id
          const isDisabled = Boolean(busyPlan) || expired
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => choosePlan(plan.id)}
              disabled={isDisabled}
              aria-busy={isBusy || undefined}
              aria-disabled={expired || undefined}
              className={`glass focus-ring flex min-h-[44px] w-full flex-col items-start gap-2 p-5 text-left transition-colors duration-200 ${
                plan.featured ? 'border-amber-500/60 shadow-glow-amber' : 'hover:border-white/15'
              } ${expired ? 'cursor-not-allowed opacity-40 grayscale' : isDisabled ? 'cursor-wait opacity-60' : 'squishy'}`}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-display text-2xl font-bold text-slate-50">{t.paywall[plan.id]}</span>
                <span className="flex flex-col items-end">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-500 line-through">
                      {priceFormatter.format(plan.regularPrice)}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      {t.paywall.discountBadge(plan.discountPct)}
                    </span>
                  </span>
                  <span className="font-mono text-xl font-bold tabular-nums text-emerald-400">
                    {priceFormatter.format(plan.price)}
                  </span>
                </span>
              </span>
              <span className="text-sm leading-relaxed text-slate-300">{t.paywall[`${plan.id}Desc`]}</span>
              {isBusy && (
                <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60" aria-hidden="true">
                  <span
                    className="block h-full w-full bg-[linear-gradient(90deg,transparent,rgba(245,158,11,.7),transparent)] motion-safe:animate-shimmer"
                    style={{ backgroundSize: '200% 100%' }}
                  />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p
        role="timer"
        aria-live="off"
        className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-center font-mono text-base font-bold tabular-nums ${
          expired ? 'border-slate-700 bg-slate-800/60 text-slate-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        }`}
      >
        {expired ? t.paywall.expired : `${t.paywall.urgencyLabel} ${formatCountdown(remainingMs)}`}
      </p>

      {!expired && <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">{t.paywall.pressureText}</p>}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost" onClick={onClose} className="w-full sm:flex-1">
          {credits === 1 ? t.paywall.lastFree : t.paywall.later}
        </Button>
        <Button variant="secondary" onClick={onHaveCode} className="w-full sm:flex-1">
          {t.paywall.haveCode}
        </Button>
      </div>
    </Modal>
  )
}
