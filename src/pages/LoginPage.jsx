// Page de connexion (lien magique par courriel, pas de mot de passe, pas de Google).
// Remplace la session anonyme automatique : chaque élève/parent doit posséder un compte
// réel avant de recevoir des crédits, ce qui empêche de fabriquer un « nouvel utilisateur »
// gratuit à répétition juste en vidant le stockage local de l'appareil.
import { useEffect, useRef, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import { useCopy } from '../context/RegionContext'
import { supabase } from '../lib/supabase'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Filet de sécurité : si l'appel Supabase ne répond jamais (réseau capricieux, onglet en
// veille prolongée…), on n'affiche pas « Envoi en cours... » indéfiniment.
const REQUEST_TIMEOUT_MS = 15000

export default function LoginPage() {
  const { t } = useCopy()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState(null)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    // Réarme le drapeau à chaque (re)montage : en dev, StrictMode monte/nettoie/remonte
    // une fois pour détecter les effets sans nettoyage — sans ce `= true` ici, le
    // nettoyage simulé laisserait `mountedRef` bloqué à `false` pour de bon (le bouton
    // resterait « Envoi en cours... » indéfiniment après le tout premier montage en dev).
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function sendLink(value) {
    setBusy(true)
    setError(null)
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      const { error: authError } = await Promise.race([
        supabase.auth.signInWithOtp({
          email: value,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT_MS)),
      ])
      if (authError) throw authError
      if (!mountedRef.current) return
      setSentTo(value)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err?.code === 'over_email_send_rate_limit' ? t.errors.RATE_LIMITED : t.errors.NETWORK)
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(value) || busy) {
      setError(t.auth.errorInvalid)
      return
    }
    sendLink(value)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-sm motion-safe:animate-bop">
        <div className="mb-6 text-center">
          <span className="font-display text-3xl font-extrabold text-amber-400">{t.auth.brand}</span>
        </div>

        {sentTo ? (
          <div className="flex flex-col items-center gap-4 text-center motion-safe:animate-spring-in">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-2xl shadow-glow-emerald"
              aria-hidden="true"
            >
              📬
            </span>
            <h1 className="font-display text-2xl font-bold text-slate-50">{t.auth.sentTitle}</h1>
            <p className="leading-relaxed text-slate-300">{t.auth.sentSubtitle(sentTo)}</p>
            <div className="flex w-full flex-col gap-3 pt-2">
              <Button variant="secondary" onClick={() => sendLink(sentTo)} loading={busy} className="w-full">
                {t.auth.resend}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSentTo(null)
                  setError(null)
                }}
                className="w-full"
              >
                {t.auth.changeEmail}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-slate-50">{t.auth.title}</h1>
            <p className="mt-2 leading-relaxed text-slate-300">{t.auth.subtitle}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-300">{t.auth.emailLabel}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoFocus
                  spellCheck={false}
                  required
                  className="focus-ring min-h-[56px] w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!email.trim() || busy} className="w-full">
                {busy ? t.auth.sending : t.auth.submit}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">{t.auth.footer}</p>
          </>
        )}
      </GlassCard>
    </div>
  )
}
