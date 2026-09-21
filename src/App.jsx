// Racine de l'application (contrat §3) : région, session Supabase (compte réel, lien
// magique par courriel), profil, navigation par onglets.
// Pas de react-router : l'onglet actif est un simple état (`analyze` | `library` | `settings` | `activate`).
//
// Auth : plus de session anonyme automatique. Chaque personne doit se connecter par
// courriel (lien magique, sans mot de passe, sans Google) avant d'obtenir des crédits —
// ça évite qu'un « nouvel utilisateur » gratuit se fabrique juste en vidant le stockage
// local de l'appareil. Le mode démo (`?demo` en dev) reste inchangé et ne touche jamais
// à l'auth.
import { useCallback, useEffect, useState } from 'react'
import { RegionProvider, useCopy } from './context/RegionContext'
import { supabase } from './lib/supabase'
import { ApiError, fetchProfile } from './lib/api'
import { motion } from 'framer-motion'
import Button from './components/ui/Button'
import GlassCard from './components/ui/GlassCard'
import Logo from './components/Logo'
import DashboardPage from './pages/DashboardPage'
import LibraryPage from './pages/LibraryPage'
import SettingsPage from './pages/SettingsPage'
import ActivatePage from './pages/ActivatePage'
import LoginPage from './pages/LoginPage'

function getSearch() {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

// Mode démo (contrat §0) : profil local avec 3 crédits, aucune session ni appel réseau.
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(getSearch()).has('demo')
const DEMO_PROFILE = {
  id: 'demo',
  credits: 3,
  plan: 'trial',
  plan_expires_at: null,
  has_fingerprint: true,
  preferred_notation: '',
  region: 'qc',
  streak_days: 3, // pour voir la flamme (composant StreakFlame) sans compte réel
}

const REGIONS = ['qc', 'fr', 'us', 'uk']
// Onglets de la barre. `activate` n'y figure pas : on y arrive par le flux
// (premier lancement sans crédit, mur de paiement « J'ai déjà un code », retour de Stripe).
const NAV_TABS = ['analyze', 'library', 'settings']

// Lit puis retire `?checkout=…` de l'URL une seule fois au chargement du module
// (les autres paramètres, dont `demo`, sont conservés ; un rechargement ne réaffiche pas la bannière).
function consumeCheckoutParam() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const value = params.get('checkout')
  if (value === null) return null
  params.delete('checkout')
  const query = params.toString()
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', next)
  return value
}
const CHECKOUT_RESULT = consumeCheckoutParam()

// Code d'erreur du contrat à partir d'une exception de démarrage (session ou profil).
function bootErrorCode(err) {
  if (err instanceof ApiError) return err.code
  const message = String(err?.message ?? '')
  if (err?.name === 'AuthRetryableFetchError' || /fetch|network/i.test(message)) return 'NETWORK'
  return 'SERVER_ERROR'
}

// Icônes de navigation : traits simples, abstraits (pas de mascotte).
function TabIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    className: 'h-6 w-6 shrink-0 sm:h-5 sm:w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  if (name === 'analyze') {
    return (
      <svg {...common}>
        <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" />
      </svg>
    )
  }
  if (name === 'library') {
    return (
      <svg {...common}>
        <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M8 3v18" />
        <path d="M12 8h4M12 12h4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 7h7M17 7h3M4 17h3M13 17h7" />
      <circle cx="14" cy="7" r="2.5" />
      <circle cx="10" cy="17" r="2.5" />
    </svg>
  )
}

// Écran de chargement « verre » affiché pendant la session et le profil.
function BootScreen({ t }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex w-full max-w-sm flex-col items-center gap-5 text-center"
      >
        <Logo variant="icon" className="h-24 w-24" />
        <span className="h-1.5 w-40 overflow-hidden rounded-full bg-pyramid-grey/30" aria-hidden="true">
          <span
            className="block h-full w-full bg-[linear-gradient(90deg,transparent,rgba(242,153,74,.7),transparent)] motion-safe:animate-shimmer"
            style={{ backgroundSize: '200% 100%' }}
          />
        </span>
        <span className="text-sm text-slate-400">{t.common.loading}</span>
      </motion.div>
    </div>
  )
}

function AppShell() {
  const { t, setRegion } = useCopy()
  const [profile, setProfile] = useState(null)
  const [bootState, setBootState] = useState('loading') // 'loading' | 'auth' | 'ready' | 'error'
  const [bootError, setBootError] = useState(null) // code d'erreur du contrat
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState('analyze')
  const [checkoutNotice, setCheckoutNotice] = useState(CHECKOUT_RESULT === 'success')

  // Démarrage : mode démo → profil local ; sinon on écoute l'état d'auth Supabase.
  // `onAuthStateChange` émet tout de suite `INITIAL_SESSION` avec la session courante
  // (ou null), donc pas besoin d'un `getSession()` séparé — et le même écouteur capte
  // aussi bien la connexion (clic sur le lien magique, même dans un autre onglet grâce
  // à la synchronisation multi-onglets de Supabase) que la déconnexion.
  useEffect(() => {
    if (IS_DEMO) {
      setProfile(DEMO_PROFILE)
      setBootState('ready')
      return undefined
    }

    let cancelled = false

    async function loadProfile() {
      setBootState('loading')
      setBootError(null)
      try {
        const next = await fetchProfile()
        if (cancelled) return
        // Le serveur est la référence pour la région d'un compte existant.
        if (REGIONS.includes(next?.region)) setRegion(next.region)
        setProfile(next ?? {})
        // Activation par défaut : retour de Stripe, ou aucun crédit et appareil pas encore lié.
        const needsCode = (next?.credits ?? 0) === 0 && !next?.has_fingerprint
        if (CHECKOUT_RESULT === 'success' || needsCode) setTab('activate')
        setBootState('ready')
      } catch (err) {
        if (cancelled) return
        setBootError(bootErrorCode(err))
        setBootState('error')
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (!session) {
        setProfile(null)
        setBootState('auth')
        return
      }
      loadProfile()
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [attempt, setRegion])

  const selectTab = useCallback((next) => {
    setTab(next)
    window.scrollTo({ top: 0 })
  }, [])

  const handleProfileChange = useCallback((next) => {
    setProfile(next)
  }, [])

  // Code activé : crédits et plan à jour, appareil désormais lié, retour à l'analyse.
  const handleActivated = useCallback(
    (result) => {
      setProfile((current) => ({
        ...(current ?? {}),
        credits: result?.credits ?? current?.credits ?? 0,
        plan: result?.plan ?? current?.plan,
        email: result?.email ?? current?.email ?? null,
        has_fingerprint: true,
      }))
      setCheckoutNotice(false)
      selectTab('analyze')
    },
    [selectTab],
  )

  if (bootState === 'loading') return <BootScreen t={t} />

  if (bootState === 'auth') return <LoginPage />

  if (bootState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard role="alert" className="flex w-full max-w-sm flex-col items-center gap-5 text-center motion-safe:animate-bop">
          <span className="font-display text-2xl font-extrabold text-amber-400">{t.brand}</span>
          <p className="leading-relaxed text-slate-200">{t.errors[bootError] ?? t.errors.SERVER_ERROR}</p>
          <Button variant="primary" onClick={() => setAttempt((value) => value + 1)} className="w-full">
            {t.common.retry}
          </Button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen sm:flex">
      {/* Navigation : rail fixe à gauche à partir de sm (place pour de futures sections),
          barre collée en bas sur mobile où un rail latéral prendrait trop de largeur utile. */}
      <nav
        aria-label={t.brand}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-slate-900/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:sticky sm:inset-auto sm:top-0 sm:h-screen sm:w-20 sm:shrink-0 sm:flex-col sm:border-t-0 sm:border-r sm:pb-0 lg:w-56"
      >
        <div className="hidden sm:flex sm:h-16 sm:items-center sm:justify-center">
          <Logo variant="icon" className="h-9 w-9 motion-safe:animate-float" />
        </div>
        <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-2 sm:mx-0 sm:max-w-none sm:flex-col sm:items-stretch sm:justify-start sm:gap-1 sm:px-3 sm:py-2">
          {NAV_TABS.map((key) => {
            const active = tab === key
            return (
              <li key={key} className="flex-1 sm:flex-none">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectTab(key)}
                  className={`squishy focus-ring flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-3 text-xs font-semibold transition-colors duration-200 sm:min-h-[48px] sm:flex-row sm:justify-center sm:gap-3 sm:px-3 sm:text-sm lg:justify-start lg:px-4 ${
                    active
                      ? 'bg-amber-500/10 text-amber-400 sm:border-l-2 sm:border-amber-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <TabIcon name={key} />
                  <span className="sm:hidden lg:inline">{t.nav[key]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:min-w-0 sm:flex-1 sm:px-6 sm:pb-16 sm:pt-10">
        {/* L'analyse reste montée (masquée) pour ne pas perdre un résultat en visitant la bibliothèque. */}
        <div hidden={tab !== 'analyze'}>
          <DashboardPage
            profile={profile}
            onProfileChange={handleProfileChange}
            onOpenActivate={() => selectTab('activate')}
          />
        </div>

        {tab === 'library' && <LibraryPage />}

        {tab === 'settings' && <SettingsPage profile={profile} onProfileChange={handleProfileChange} />}

        {tab === 'activate' && (
          <div className="flex flex-col gap-6">
            {checkoutNotice && (
              <GlassCard
                role="status"
                className="mx-auto w-full max-w-md border-emerald-500/40 text-center motion-safe:animate-spring-in"
              >
                <p className="font-display text-xl font-bold text-emerald-300">{t.activate.trialSent}</p>
                <p className="mt-2 leading-relaxed text-slate-300">{t.activate.subtitle}</p>
              </GlassCard>
            )}
            <ActivatePage onActivated={handleActivated} />
            <Button variant="ghost" onClick={() => selectTab('analyze')} className="self-center">
              {t.common.back}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <RegionProvider>
      <AppShell />
    </RegionProvider>
  )
}
