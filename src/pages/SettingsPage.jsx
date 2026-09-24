// Page réglages (contrat §3) : région QC/FR et convention de notation personnelle.
import { useEffect, useRef, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Flag from '../components/Flag'
import foundersPhoto from '../assets/founders.jpg'
import { useCopy } from '../context/RegionContext'
import { ApiError, savePreferences, createBillingPortalSession } from '../lib/api'
import { supabase } from '../lib/supabase'

function getSearch() {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

// Mode démo (contrat §0) : pas d'appel réseau, la sauvegarde est simulée.
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(getSearch()).has('demo')
const SAVED_FEEDBACK_MS = 2500
// Quadri-langue (contrat §3) : 2 régions FR + 2 régions EN, chacune avec son propre ton.
const REGION_OPTIONS = ['qc', 'fr', 'us', 'uk']

// La notation (contrat) a déménagé au-dessus de la zone d'upload (voir NotationBlock.jsx) :
// c'est là que l'élève en a besoin, pas enterré dans les réglages.
export default function SettingsPage({ profile, onProfileChange }) {
  const { t, region, setRegion } = useCopy()
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [portalError, setPortalError] = useState(null)
  const timerRef = useRef(null)
  // SettingsPage est démonté (pas caché) par App.jsx au changement d'onglet.
  const mountedRef = useRef(true)

  useEffect(() => {
    // Réarme le drapeau à chaque (re)montage : en dev, StrictMode monte/nettoie/remonte
    // une fois pour détecter les effets sans nettoyage — sans ce `= true` ici, le
    // nettoyage simulé laisserait `mountedRef` bloqué à `false` pour de bon.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [])

  // La région s'applique tout de suite à l'interface ; elle est persistée côté serveur au « Sauvegarder ».
  function chooseRegion(next) {
    if (next === region) return
    setRegion(next)
    if (status === 'saved') setStatus('idle')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (status === 'saving') return
    setStatus('saving')
    setError(null)
    try {
      if (!IS_DEMO) await savePreferences({ preferred_notation: profile?.preferred_notation ?? '', region })
      onProfileChange?.({ ...(profile ?? {}), region })
      if (!mountedRef.current) return
      setStatus('saved')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus('idle')
      }, SAVED_FEEDBACK_MS)
    } catch (err) {
      if (!mountedRef.current) return
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.errors.SERVER_ERROR)
      setStatus('error')
    }
  }

  async function handleManageSubscription() {
    if (openingPortal) return
    setOpeningPortal(true)
    setPortalError(null)
    try {
      const { url } = await createBillingPortalSession()
      if (!url) throw new ApiError('SERVER_ERROR')
      window.location.assign(url)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setPortalError(t.errors[code] ?? t.errors.SERVER_ERROR)
      setOpeningPortal(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await supabase.auth.signOut()
    // App.jsx écoute onAuthStateChange : la déconnexion bascule automatiquement sur LoginPage.
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <GlassCard className="motion-safe:animate-bop">
        <h1 className="font-display text-3xl font-extrabold text-slate-50">{t.settings.title}</h1>

        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-8">
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-slate-300">{t.settings.region}</legend>
            {/* Grille 2x2 (plutôt qu'une pilule unique) : 4 langues, dont deux libellés longs
                (« English (US/UK) ») qui ne tiendraient pas confortablement sur une seule ligne. */}
            <div role="group" aria-label={t.settings.region} className="grid grid-cols-2 gap-2">
              {REGION_OPTIONS.map((option) => {
                const active = option === region
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseRegion(option)}
                    className={`focus-ring flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition-colors duration-200 ${
                      active
                        ? 'bg-amber-500 text-slate-900 shadow-glow-amber'
                        : 'squishy glass text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                    }`}
                  >
                    <Flag region={option} />
                    {t.settings[option]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" variant="primary" size="lg" loading={status === 'saving'} className="w-full sm:flex-1">
              {t.settings.save}
            </Button>
            <p role="status" aria-live="polite" className="min-h-[24px] text-center text-sm font-semibold text-emerald-400 sm:flex-1">
              {status === 'saved' && <span className="inline-block motion-safe:animate-spring-in">{t.settings.saved}</span>}
            </p>
          </div>
        </form>
      </GlassCard>

      {!IS_DEMO && (
        <GlassCard as="section" className="motion-safe:animate-rise" style={{ animationDelay: '120ms' }}>
          <h2 className="font-display text-xl font-bold text-slate-50">{t.settings.account}</h2>
          {profile?.email && <p className="mt-2 leading-relaxed text-slate-300">{t.settings.loggedInAs(profile.email)}</p>}

          {(profile?.plan === 'basic' || profile?.plan === 'pro') && (
            <>
              <Button variant="secondary" onClick={handleManageSubscription} loading={openingPortal} className="mt-5 w-full">
                {t.settings.manageSubscription}
              </Button>
              {portalError && (
                <p role="alert" className="mt-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {portalError}
                </p>
              )}
            </>
          )}

          <Button variant="ghost" onClick={handleLogout} loading={loggingOut} className="mt-3 w-full">
            {t.settings.logout}
          </Button>
        </GlassCard>
      )}

      <GlassCard as="section" className="motion-safe:animate-rise" style={{ animationDelay: '200ms' }}>
        <h2 className="font-display text-xl font-bold text-slate-50">À propos</h2>
        <img
          src={foundersPhoto}
          alt="Abdel-Majid et Ismael, fondateurs de RPVD Success"
          className="mt-4 w-full rounded-2xl border border-pyramid-grey/30 object-cover"
        />
        <p className="mt-4 font-display text-lg font-bold text-slate-100">Abdel-Majid &amp; Ismael</p>
        <p className="mt-2 leading-relaxed text-slate-300">
          On a fondé RPVD Success parce qu&rsquo;on s&rsquo;est tannés de voir des élèves copier une réponse sans
          jamais comprendre la logique derrière. Pas de raccourci ici : on te montre le pattern, tu l&rsquo;appliques
          toi-même. On construit ça comme si c&rsquo;était pour notre propre petit frère ou notre propre petite sœur.
        </p>
      </GlassCard>
    </div>
  )
}
