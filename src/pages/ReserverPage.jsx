// /reserver?s=<session> : récapitulatif de la session, politique claire, puis Stripe Checkout.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BOOTCAMP as B } from '../config/bootcamp'
import { trackEvent } from '../utils/track'
import { bootcampCall, queryParam } from '../lib/bootcampApi'
import { CARD, CTA, CTA_GHOST, INPUT, LegalLinks, Notice, PageShell, SeatMeter, Spinner } from '../components/bootcamp/BootcampUI'
import BUSINESS from '../legal/business.json'

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-100">{value}</span>
    </div>
  )
}

export default function ReserverPage() {
  const id = queryParam('s')
  const cancelled = queryParam('annule') === '1'
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [email, setEmail] = useState('')
  const [policy, setPolicy] = useState(false)
  const [adult, setAdult] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Réserver ma place — Bootcamp RPVD'
    trackEvent('pageview', { path: '/reserver' })
    if (!id) {
      setLoadError('Lien incomplet : aucune session choisie.')
      return
    }
    bootcampCall('bootcamp-public', { action: 'session', id })
      .then((d) => setSession(d.session))
      .catch((e) => setLoadError(e.message))
  }, [id])

  async function pay(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      trackEvent('checkout_started', { path: '/reserver', plan: 'bootcamp' })
      const { url } = await bootcampCall('bootcamp-checkout', {
        session_id: id,
        email: email.trim(),
        accept_policy: policy,
        adult_or_guardian: adult,
        source: queryParam('src') || '',
      })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const canBuy = session && (session.state === 'open' || session.state === 'last_call') && session.seats_left > 0
  const closedText = session && {
    full: 'Cette session est complète.',
    paused: "Les ventes sont fermées depuis samedi 23 h 59. Si des places se libèrent suite à des désistements, elles rouvrent dimanche à 8 h.",
    closed: 'Les réservations pour cette session sont fermées.',
    cancelled: 'Cette session est annulée.',
  }[session.state]

  return (
    <PageShell current="bootcamp" width="max-w-xl">
      <a href="/#sessions" className="text-sm text-slate-400 transition hover:text-pyramid-orange">
        ← Toutes les sessions
      </a>

      {loadError && (
        <div className="mt-8">
          <Notice tone="error">{loadError}</Notice>
          <a href="/#sessions" className={`${CTA_GHOST} mt-4`}>
            Voir les sessions
          </a>
        </div>
      )}

      {!session && !loadError && (
        <div className="flex justify-center py-24 text-pyramid-orange">
          <Spinner />
        </div>
      )}

      {session && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="mt-8 text-xs font-bold tracking-[0.3em] text-pyramid-orange">BOOTCAMP RPVD</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-slate-50">{session.topic}</h1>
          <p className="mt-2 text-slate-400">
            {session.level} · {session.subject}
          </p>

          {cancelled && (
            <div className="mt-6">
              <Notice tone="warn">Paiement annulé : ta place n'est pas réservée. Tu peux réessayer ci-dessous.</Notice>
            </div>
          )}

          <div className={`${CARD} mt-6 p-5 sm:p-6`}>
            <Row label="Quand" value={session.when} />
            <Row label="Durée" value="1 h 30 en direct sur Zoom (1 h de démarche + 30 min de questions)" />
            <Row label="Prix" value={`${B.price} tout inclus`} />
            <Row label="Remboursement" value={`Intégral jusqu'au ${session.refund_deadline}`} />
            <Row label="Lien Zoom" value="Personnel, envoyé 30 à 60 min avant le cours" />
            {canBuy && (
              <div className="pt-4">
                <SeatMeter left={session.seats_left} capacity={session.capacity} />
                <p className={`mt-2 text-sm ${session.state === 'last_call' ? 'font-semibold text-pyramid-orange' : 'text-slate-400'}`}>
                  {session.state === 'last_call'
                    ? `${session.seats_left} place${session.seats_left > 1 ? 's' : ''} libérée${session.seats_left > 1 ? 's' : ''} suite à des désistements · non remboursable le dimanche`
                    : `${session.seats_left} place${session.seats_left > 1 ? 's' : ''} restante${session.seats_left > 1 ? 's' : ''} sur ${session.capacity}`}
                </p>
              </div>
            )}
          </div>

          {canBuy ? (
            <form onSubmit={pay} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-200">
                  Courriel qui recevra le lien Zoom <span className="font-normal text-slate-500">(le seul renseignement qu'on te demande)</span>
                </span>
                <input type="email" autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300">
                <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#f2994a]" />
                <span>
                  J'accepte les{' '}
                  <a href="/legal/terms" target="_blank" rel="noreferrer" className="text-pyramid-orange hover:underline">
                    conditions du Bootcamp
                  </a>{' '}
                  : remboursement intégral sur demande jusqu'au {session.refund_deadline}, aucun remboursement le dimanche, lien Zoom personnel, caméra désactivée et micro ouvert seulement sur invitation.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300">
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#f2994a]" />
                <span>Le paiement est fait par un adulte : parent, tuteur ou élève de 18 ans et plus.</span>
              </label>
              {error && <Notice tone="error">{error}</Notice>}
              <button type="submit" disabled={busy || !policy || !adult} className={`${CTA} w-full text-lg`}>
                {busy ? <Spinner /> : `Payer ${B.price} et réserver`}
              </button>
              <p className="text-center text-xs text-slate-500">Paiement sécurisé par Stripe. Le montant affiché est le montant payé : rien ne s'ajoute.</p>
              <div className="rounded-2xl border border-white/10 px-4 py-3 text-xs leading-relaxed text-slate-500">
                <p>
                  Commerçant : <span className="text-slate-300">{BUSINESS.operator}</span> · {BUSINESS.postalAddress || BUSINESS.city} ·{' '}
                  <a href={`mailto:${BUSINESS.email}`} className="text-pyramid-orange hover:underline">
                    {BUSINESS.email}
                  </a>
                </p>
                <p className="mt-1">
                  Paiement unique, aucun abonnement. Ton courriel de confirmation est ta copie du contrat.{' '}
                  <a href="/legal/privacy" target="_blank" rel="noreferrer" className="text-pyramid-orange hover:underline">
                    Confidentialité
                  </a>
                </p>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <Notice tone="warn">{closedText}</Notice>
              <a href="/#vote" className={CTA_GHOST}>
                Voter pour la semaine prochaine
              </a>
            </div>
          )}
        </motion.div>
      )}

      <LegalLinks />
    </PageShell>
  )
}
