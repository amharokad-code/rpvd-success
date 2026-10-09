// /merci?s=<session> : retour de Stripe Checkout après paiement. Les détails du billet sont
// confirmés par courriel (le webhook Stripe est la seule source de vérité du paiement).
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { trackEvent } from '../utils/track'
import { bootcampCall, queryParam } from '../lib/bootcampApi'
import { BOOTCAMP as B } from '../config/bootcamp'
import { trackAd, isPurchaseEventId } from '../utils/ads'
import { CARD, CTA, CTA_GHOST, LegalLinks, PageShell } from '../components/bootcamp/BootcampUI'

function icsStamp(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Fichier .ics généré dans le navigateur (aucune donnée personnelle).
function downloadIcs(session) {
  const start = new Date(session.starts_at)
  const end = new Date(start.getTime() + (session.duration_min || 90) * 60000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gradus//Bootcamp//FR',
    'BEGIN:VEVENT',
    `UID:${session.id}@rpvdsuccess.com`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:Bootcamp Gradus — ${session.topic}`,
    'DESCRIPTION:Lien du cours envoyé par courriel 30 à 60 minutes avant le cours.',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Bootcamp Gradus dans 1 h : surveille ton courriel pour le lien du cours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'bootcamp-rpvd.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function googleCalendarUrl(session) {
  const start = new Date(session.starts_at)
  const end = new Date(start.getTime() + (session.duration_min || 90) * 60000)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Bootcamp Gradus — ${session.topic}`,
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    details: 'Lien du cours envoyé par courriel 30 à 60 minutes avant le cours.',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

const NEXT = [
  ['📩', 'Courriel de confirmation', "Il arrive dans quelques minutes, avec le détail de ta réservation, les règles de la classe et le bouton pour annuler (jusqu'à samedi 23 h 59)."],
  ['🔗', 'Ton lien du cours', 'Envoyé par courriel 30 à 60 minutes avant le cours. Ne le partage pas.'],
  ['✏️', 'Le jour J', 'Feuille, crayon, et tes questions prêtes. Connecte-toi 5 minutes avant.'],
]

export default function MerciPage() {
  const id = queryParam('s')
  const [session, setSession] = useState(null)

  useEffect(() => {
    document.title = 'Place réservée — Bootcamp Gradus'
    trackEvent('pageview', { path: '/merci' })
    // Pixels Meta/Snap (seulement si consentement) : même event_id que l'envoi serveur -> dédupliqué.
    // `e` vient de la redirection Stripe ; format vérifié, une seule émission par onglet.
    const eventId = queryParam('e')
    if (isPurchaseEventId(eventId)) {
      trackAd(
        'Purchase',
        { value: B.priceValue, currency: B.currency, content_ids: [B.productId], content_name: B.productName, content_type: 'product', num_items: 1, transaction_id: eventId },
        { eventId, replay: true, once: true },
      )
    }
    if (id) bootcampCall('bootcamp-public', { action: 'session', id }).then((d) => setSession(d.session)).catch(() => {})
  }, [id])

  return (
    <PageShell current="bootcamp" width="max-w-xl">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="pt-8 text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl text-emerald-300 shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)]"
        >
          ✓
        </motion.span>
        <h1 className="mt-6 font-display text-4xl font-bold text-slate-50">Ta place est réservée.</h1>
        {session ? (
          <p className="mt-3 text-lg text-slate-300">
            <b className="text-slate-50">{session.topic}</b>
            <br />
            {session.when}
          </p>
        ) : (
          <p className="mt-3 text-slate-400">Merci ! Ton paiement est en cours de confirmation.</p>
        )}
      </motion.div>

      <ol className="mt-10 space-y-3">
        {NEXT.map(([icon, title, text], i) => (
          <motion.li key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className={`${CARD} flex gap-4 p-5`}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold text-slate-50">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      {session && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => downloadIcs(session)} className={`${CTA} flex-1`}>
            Ajouter à mon calendrier
          </button>
          <a href={googleCalendarUrl(session)} target="_blank" rel="noreferrer" className={`${CTA_GHOST} flex-1`}>
            Google Agenda
          </a>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Pas de courriel d'ici 15 minutes ? Regarde dans les courriels indésirables.
      </p>
      <LegalLinks />
    </PageShell>
  )
}
