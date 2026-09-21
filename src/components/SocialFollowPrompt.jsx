// SocialFollowPrompt — invite (jamais bloquante) à suivre les réseaux, à la toute première
// connexion. Contrairement à une "vérification" : on ne prétend jamais savoir si l'élève a
// vraiment suivi (un focus de fenêtre ne prouve rien) — cliquer ouvre juste le lien, et fermer
// avec le × ne coûte rien. Les crédits gratuits sont déjà donnés, ce n'est pas une barrière.
import { useEffect, useState } from 'react'
import GlassCard from './ui/GlassCard'

const STORAGE_KEY = 'rpvd_social_prompt_dismissed'

// URLs réelles à fournir — jamais deviner un lien de marque.
const SOCIAL_LINKS = {
  facebook: '',
  instagram: '',
  tiktok: '',
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2h-3v13.6a2.9 2.9 0 1 1-2.4-2.85v-3.05a5.95 5.95 0 1 0 5.4 5.92V9.1a7.2 7.2 0 0 0 4.5 1.57V7.7a4.2 4.2 0 0 1-4.5-4.2V2z" />
    </svg>
  )
}

const NETWORKS = [
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon, url: SOCIAL_LINKS.facebook },
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon, url: SOCIAL_LINKS.instagram },
  { id: 'tiktok', label: 'TikTok', Icon: TikTokIcon, url: SOCIAL_LINKS.tiktok },
]

export default function SocialFollowPrompt() {
  const [dismissed, setDismissed] = useState(true)

  // Une seule fois, jamais bloquant : si déjà fermé une fois, on ne remontre plus jamais.
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  function close() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // best-effort : si le stockage échoue, l'écran reviendra à la prochaine visite, tant pis.
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xl">
      <GlassCard className="relative w-full max-w-md motion-safe:animate-spring-in">
        <h2 className="font-display text-2xl font-bold leading-snug text-slate-100">On se retrouve ailleurs ? 🎁</h2>
        <p className="mt-2 leading-relaxed text-slate-300">
          Suis-nous pour les astuces d&rsquo;étude et les nouveautés — complètement optionnel.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {NETWORKS.map(({ id, label, Icon, url }) => (
            <a
              key={id}
              href={url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!url}
              onClick={(event) => {
                if (!url) event.preventDefault()
              }}
              className={`squishy focus-ring flex flex-col items-center gap-2 rounded-2xl bg-slate-900 p-4 text-slate-200 transition-colors duration-200 ${
                url ? 'hover:bg-slate-700' : 'cursor-not-allowed opacity-40'
              }`}
            >
              <Icon />
              <span className="text-xs font-semibold">{label}</span>
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="focus-ring squishy absolute -bottom-4 -right-4 flex h-11 w-11 items-center justify-center rounded-full border border-pyramid-grey/30 bg-slate-800 text-slate-300 shadow-glass hover:bg-slate-700 hover:text-slate-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </GlassCard>
    </div>
  )
}
