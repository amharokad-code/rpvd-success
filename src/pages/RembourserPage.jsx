// /rembourser?t=<jeton> : gérer / annuler une réservation (lien du courriel de confirmation).
// Remboursement intégral automatique jusqu'au samedi 23 h 59 ; plus rien le dimanche.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { bootcampCall, queryParam } from '../lib/bootcampApi'
import { CARD, CTA, CTA_GHOST, LegalLinks, Notice, PageShell, Spinner } from '../components/bootcamp/BootcampUI'

export default function RembourserPage() {
  const token = queryParam('t')
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Ma réservation — Bootcamp RPVD'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    if (!token) {
      setError('Lien incomplet. Utilise le bouton de ton courriel de confirmation.')
      return
    }
    bootcampCall('bootcamp-refund', { action: 'info', token })
      .then((d) => setTicket(d.ticket))
      .catch((e) => setError(e.message))
  }, [token])

  async function refund() {
    setBusy(true)
    setError(null)
    try {
      const d = await bootcampCall('bootcamp-refund', { action: 'refund', token })
      setTicket(d.ticket)
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = { paid: 'Réservée', refunded: 'Remboursée', pending: 'Paiement en attente', expired: 'Expirée' }

  return (
    <PageShell current="bootcamp" width="max-w-xl">
      <h1 className="pt-8 font-display text-4xl font-bold text-slate-50">Ma réservation</h1>

      {!ticket && !error && (
        <div className="flex justify-center py-20 text-pyramid-orange">
          <Spinner />
        </div>
      )}
      {error && !ticket && (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {ticket && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`${CARD} mt-6 p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {ticket.level} · {ticket.subject}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-50">{ticket.topic}</p>
            <p className="mt-1 text-slate-300">{ticket.when}</p>
            <p className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-slate-200">
              Statut : {statusLabel[ticket.status] || ticket.status}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {done && <Notice tone="ok">Remboursement confirmé : {ticket.price} reviennent sur ta carte d'ici 5 à 10 jours ouvrables. Un courriel de confirmation t'est envoyé.</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            {ticket.refundable && !done && (
              <>
                <Notice tone="info">Tu peux annuler et être remboursé intégralement ({ticket.price}) jusqu'au {ticket.refund_deadline}.</Notice>
                {confirm ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={refund} disabled={busy} className={`${CTA} flex-1`}>
                      {busy ? <Spinner /> : `Oui, annuler et rembourser ${ticket.price}`}
                    </button>
                    <button type="button" onClick={() => setConfirm(false)} className={`${CTA_GHOST} flex-1`}>
                      Garder ma place
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm(true)} className={`${CTA_GHOST} w-full`}>
                    Annuler ma réservation
                  </button>
                )}
              </>
            )}

            {!ticket.refundable && ticket.status === 'paid' && (
              <Notice tone="warn">Le délai de remboursement est passé ({ticket.refund_deadline}). Ta place est maintenue : on t'attend !</Notice>
            )}
          </div>
        </motion.div>
      )}

      <LegalLinks />
    </PageShell>
  )
}
