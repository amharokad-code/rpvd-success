// Mur de paiement (contrat §3) : deux forfaits, Trio mis en avant, redirection Stripe Checkout.
// Prix réels uniquement — pas de faux prix barré, pas de compte à rebours, pas de badge
// d'urgence artificielle. Ce genre de FOMO (faux rabais, chrono qui crée une fausse urgence)
// est un dark pattern et pose un vrai problème légal (Loi sur la protection du consommateur au
// Québec, entre autres) — retiré sur demande explicite, pas juste un choix esthétique.
import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useCopy } from '../context/RegionContext'
import { ApiError, createCheckout, createUpgradeCheckout } from '../lib/api'
import { formatPlanPriceBreakdown, formatUpgradePrice, UPGRADE_TARGET } from '../lib/pricing'

// Forfaits du contrat §0 — un seul plan tarifaire, converti par devise (voir lib/pricing.js).
const PLANS = [
  { id: 'solo', featured: false },
  { id: 'trio', featured: true },
]

export default function PaywallModal({ open, credits, plan, onClose, onHaveCode }) {
  const { t, region } = useCopy()
  const [busyPlan, setBusyPlan] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setBusyPlan(null)
    setError(null)
  }, [open])

  // Éligible à la mise à niveau Premium (contrat pricing v2) : forfait de base déjà payé et
  // épuisé — le serveur revérifie tout, ceci ne pilote que l'affichage.
  const upgradeEligible = credits === 0 && Boolean(UPGRADE_TARGET[plan])

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

  async function chooseUpgrade() {
    if (busyPlan) return
    setBusyPlan('upgrade')
    setError(null)
    try {
      const { url } = await createUpgradeCheckout(region)
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

      {upgradeEligible && (
        <button
          type="button"
          onClick={chooseUpgrade}
          disabled={Boolean(busyPlan)}
          aria-busy={busyPlan === 'upgrade' || undefined}
          className={`glass squishy focus-ring mt-4 flex w-full flex-col items-start gap-1 border-amber-500/50 p-4 text-left shadow-glow-amber transition-colors duration-200 ${
            busyPlan ? 'cursor-wait opacity-60' : ''
          }`}
        >
          <span className="font-display text-lg font-bold text-amber-300">{t.paywall.upgradeTitle}</span>
          <span className="text-sm leading-relaxed text-slate-300">
            {t.paywall.upgradeDesc(formatUpgradePrice(plan, region))}
          </span>
          <span className="mt-2 font-display text-sm font-bold text-amber-400">
            {t.paywall.upgradeCta(formatUpgradePrice(plan, region))} →
          </span>
        </button>
      )}

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
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="font-display text-2xl font-bold text-slate-50">{t.paywall[plan.id]}</span>
              </span>
              {(() => {
                const { total, monthly } = formatPlanPriceBreakdown(plan.id, region)
                return (
                  <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                    {t.paywall.priceLine(total, monthly)}
                  </span>
                )
              })()}
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
