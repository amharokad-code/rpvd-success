// Mur de paiement (contrat pricing v3) : Basic et Pro, deux abonnements Stripe RÉCURRENTS
// (facturation automatique tous les 3 mois) — Pro mis en avant. Prix réels uniquement — pas de
// faux prix barré, pas de compte à rebours, pas de badge d'urgence artificielle. Le caractère
// récurrent est annoncé explicitement (honnêteté commerciale, même principe que le refus des
// dark patterns) : l'app doit dire clairement que la carte sera redébitée, et offrir un moyen
// simple d'annuler (Réglages → Gérer mon abonnement, Stripe Customer Portal).
import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Footer from './Footer'
import { useCopy } from '../context/RegionContext'
import { ApiError, createCheckout } from '../lib/api'
import { formatPlanPriceBreakdown } from '../lib/pricing'

const PLANS = [
  { id: 'basic', featured: false },
  { id: 'pro', featured: true },
]

export default function PaywallModal({ open, credits, onClose, onHaveCode }) {
  const { t, region } = useCopy()
  const [busyPlan, setBusyPlan] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setBusyPlan(null)
    setError(null)
  }, [open])

  async function choosePlan(plan) {
    if (busyPlan) return
    setBusyPlan(plan)
    setError(null)
    try {
      const { url } = await createCheckout(plan, region)
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
      <p className="text-slate-300 leading-relaxed">{t.paywall.subtitle}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.paywall.recurringNotice}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isBusy = busyPlan === plan.id
          const isDisabled = Boolean(busyPlan)
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => choosePlan(plan.id)}
              disabled={isDisabled}
              aria-busy={isBusy || undefined}
              className={`glass focus-ring flex min-h-[44px] w-full flex-col items-start gap-2 p-5 text-left transition-colors duration-200 ${
                plan.featured ? 'border-amber-500/60 shadow-glow-amber' : 'hover:border-white/15'
              } ${isDisabled ? 'cursor-wait opacity-60' : 'squishy'}`}
            >
              {(() => {
                const { total, monthly } = formatPlanPriceBreakdown(plan.id, region)
                return (
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="font-display text-2xl font-bold text-slate-50">{t.paywall[plan.id]}</span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400">
                        {t.paywall.monthlyPrice(monthly)}
                      </span>
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-emerald-400">{total}</span>
                  </span>
                )
              })()}
              <span className="text-sm leading-relaxed text-slate-300">{t.paywall[`${plan.id}Desc`]}</span>
              <span className="text-xs leading-relaxed text-emerald-300/80">
                {t.paywall.tutorAnchor(formatPlanPriceBreakdown(plan.id, region).monthly)}
              </span>
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

      <Footer className="mt-6" />
    </Modal>
  )
}
