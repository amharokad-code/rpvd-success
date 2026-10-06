// Bandeau de consentement cookies — refus aussi facile qu'acceptation (contrat conformité §4).
import { useEffect, useState } from 'react'
import Button from './ui/Button'
import { useCopy } from '../context/RegionContext'
import { readConsent, writeConsent } from '../utils/consent'

const COPY = {
  fr: {
    text: "On utilise le strict nécessaire (connexion, langue, anti-partage). Tu peux aussi accepter la mesure de nos publicités (Google Analytics, pixels Meta et Snapchat) : refuser ne change rien à ton accès, et tu peux changer d'avis en tout temps (« Gérer mes cookies » au bas de la page).",
    acceptAll: 'Tout accepter',
    necessaryOnly: 'Nécessaire seulement',
    learnMore: 'En savoir plus',
  },
  en: {
    text: 'We use only what\'s necessary (login, language, anti-sharing). You can also accept ad measurement (Google Analytics, Meta and Snapchat pixels): declining doesn\'t change your access, and you can change your mind at any time (the "Gérer mes cookies" link at the bottom of the page).',
    acceptAll: 'Accept all',
    necessaryOnly: 'Necessary only',
    learnMore: 'Learn more',
  },
}

export default function CookieConsentBanner() {
  const { region } = useCopy()
  const lang = region === 'us' || region === 'uk' ? 'en' : 'fr'
  const c = COPY[lang]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!readConsent())
    // « Gérer mes cookies » (pied de page) rouvre le bandeau pour changer ou retirer le choix.
    const reopen = () => setVisible(true)
    window.addEventListener('rpvd:consent-reopen', reopen)
    return () => window.removeEventListener('rpvd:consent-reopen', reopen)
  }, [])

  if (!visible) return null

  function choose(marketing) {
    writeConsent(marketing)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label={c.text}
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-2xl flex-col gap-3 border border-white/10 bg-slate-900/95 p-4 text-sm text-slate-300 shadow-glow-amber backdrop-blur-xl sm:m-4 sm:rounded-2xl"
    >
      <p className="leading-relaxed">
        {c.text} <a href="/legal/cookies" className="text-amber-400 hover:underline">{c.learnMore}</a>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" onClick={() => choose(false)} className="w-full sm:flex-1">
          {c.necessaryOnly}
        </Button>
        <Button variant="primary" onClick={() => choose(true)} className="w-full sm:flex-1">
          {c.acceptAll}
        </Button>
      </div>
    </div>
  )
}
