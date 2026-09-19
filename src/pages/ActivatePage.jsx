// Page d'activation (contrat §3) : saisie du code, puis demande de codes d'essai par courriel.
import { useEffect, useRef, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import { useCopy } from '../context/RegionContext'
import { ApiError, activateCode, requestTrial } from '../lib/api'

// Longueur du format premium `RPVD-XXXX-XXXX` (le format essai `TRIAL-XXXX` est plus court).
const CODE_MAX_LENGTH = 14
// Délai pour laisser lire la confirmation avant de basculer vers l'analyse.
const SUCCESS_DELAY_MS = 1200

const fieldClass =
  'focus-ring w-full min-h-[56px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500'

// Majuscules, sans espaces : le serveur compare en `upper(trim())`.
function normalizeCodeInput(value) {
  return value.toUpperCase().replace(/\s+/g, '').slice(0, CODE_MAX_LENGTH)
}

function errorText(t, err) {
  const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
  return t.errors[code] ?? t.errors.SERVER_ERROR
}

export default function ActivatePage({ onActivated }) {
  const { t } = useCopy()
  const [code, setCode] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [activation, setActivation] = useState(null) // { credits, plan, email }
  const [email, setEmail] = useState('')
  const [trialBusy, setTrialBusy] = useState(false)
  const [trialSent, setTrialSent] = useState(false)
  const [trialError, setTrialError] = useState(null)
  const [devCodes, setDevCodes] = useState([])
  const codeInputRef = useRef(null)
  const timerRef = useRef(null)
  // Suit le montage : ActivatePage est démonté (pas caché) par App.jsx quand on change d'onglet,
  // donc un `await` en vol ne doit plus toucher au state local après un retour anticipé.
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

  async function handleActivate(event) {
    event.preventDefault()
    const value = normalizeCodeInput(code)
    if (!value || codeBusy || activation) return
    setCodeBusy(true)
    setCodeError(null)
    try {
      const result = await activateCode(value)
      // Propagation du profil au parent en SYNCHRONE, avant tout setState local :
      // même si l'utilisateur a déjà quitté cette page, l'activation serveur doit se refléter.
      onActivated?.(result)
      if (!mountedRef.current) return
      setActivation(result)
      // Le délai ne sert qu'à l'affichage local du message de succès.
      timerRef.current = setTimeout(() => {}, SUCCESS_DELAY_MS)
    } catch (err) {
      if (!mountedRef.current) return
      setCodeError(errorText(t, err))
    } finally {
      if (mountedRef.current) setCodeBusy(false)
    }
  }

  async function handleTrial(event) {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!value || trialBusy) return
    setTrialBusy(true)
    setTrialError(null)
    try {
      const result = await requestTrial(value)
      if (!mountedRef.current) return
      setTrialSent(true)
      // Codes renvoyés uniquement en dev local (contrat §0) : on les affiche pour tester.
      if (import.meta.env.DEV && Array.isArray(result?.dev_codes)) setDevCodes(result.dev_codes)
    } catch (err) {
      if (!mountedRef.current) return
      setTrialError(errorText(t, err))
    } finally {
      if (mountedRef.current) setTrialBusy(false)
    }
  }

  // Un clic sur un code de dev le place dans le champ d'activation.
  function applyDevCode(value) {
    setCode(normalizeCodeInput(value))
    setCodeError(null)
    codeInputRef.current?.focus()
    codeInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <GlassCard className="motion-safe:animate-bop">
        <h1 className="font-display text-3xl font-extrabold text-slate-50">{t.activate.title}</h1>
        <p className="mt-2 leading-relaxed text-slate-300">{t.activate.subtitle}</p>

        {activation ? (
          <p
            role="status"
            className="mt-6 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-4 text-center font-semibold text-emerald-300 shadow-glow-emerald motion-safe:animate-spring-in"
          >
            {t.activate.success(activation.credits)}
          </p>
        ) : (
          <form onSubmit={handleActivate} className="mt-6 flex flex-col gap-4">
            <input
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={(event) => setCode(normalizeCodeInput(event.target.value))}
              placeholder={t.activate.placeholder}
              aria-label={t.activate.title}
              inputMode="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_MAX_LENGTH}
              required
              className={`${fieldClass} text-center font-mono text-xl font-bold uppercase tracking-widest`}
            />
            {codeError && (
              <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {codeError}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" loading={codeBusy} disabled={!code || codeBusy} className="w-full">
              {t.activate.submit}
            </Button>
          </form>
        )}
      </GlassCard>

      <GlassCard as="section" className="motion-safe:animate-rise" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display text-2xl font-bold text-slate-50">{t.activate.trialTitle}</h2>
        <p className="mt-2 leading-relaxed text-slate-300">{t.activate.trialSubtitle}</p>

        {trialSent ? (
          <div className="mt-6 flex flex-col gap-4 motion-safe:animate-spring-in">
            <p role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {t.activate.trialSent}
            </p>
            {devCodes.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {devCodes.map((value) => (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => applyDevCode(value)}
                      className="squishy focus-ring min-h-[44px] rounded-full border border-amber-500/40 bg-amber-500/10 px-4 font-mono text-sm font-bold tracking-widest text-amber-300"
                    >
                      {value}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <form onSubmit={handleTrial} className="mt-6 flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.activate.emailPlaceholder}
              aria-label={t.activate.emailPlaceholder}
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              className={fieldClass}
            />
            {trialError && (
              <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {trialError}
              </p>
            )}
            <Button type="submit" variant="secondary" size="lg" loading={trialBusy} disabled={!email.trim() || trialBusy} className="w-full">
              {t.activate.trialSubmit}
            </Button>
          </form>
        )}
      </GlassCard>
    </div>
  )
}
