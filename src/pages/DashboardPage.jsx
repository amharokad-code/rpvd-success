// Tableau de bord (contrat §3) : photo → analyse → trois niveaux → bibliothèque.
// Gère aussi le mur de paiement, les erreurs API et le mode démo (contrat §0).
import { useCallback, useEffect, useRef, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import UploadVortex from '../components/UploadVortex'
import SkeletonLoader from '../components/SkeletonLoader'
import AnalysisEngine from '../components/AnalysisEngine'
import LibraryModal from '../components/LibraryModal'
import PaywallModal from '../components/PaywallModal'
import CreditsBadge from '../components/CreditsBadge'
import StreakFlame from '../components/StreakFlame'
import Logo from '../components/Logo'
import NotationBlock from '../components/NotationBlock'
import SocialFollowPrompt from '../components/SocialFollowPrompt'
import Flag from '../components/Flag'
import { useCopy } from '../context/RegionContext'
import { ApiError, analyzeHomework, reverifyDevice } from '../lib/api'
import { DEMO_ANALYSIS } from '../fixtures/demoAnalysis'

function getSearch() {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

// Mode démo : fixture après 1200 ms de squelette (pour voir l'animation), aucun appel API.
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(getSearch()).has('demo')
const DEMO_DELAY_MS = 1200
// Adresse de support affichée sur l'erreur d'empreinte (bouton masqué si non configurée).
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || ''

const noop = () => {}
// Mêmes 4 régions que Settings (contrat quadri-langue) — ici juste les drapeaux, sans texte,
// pour un accès rapide depuis l'accueil sans y consacrer une section complète.
const REGION_OPTIONS = ['qc', 'fr', 'us', 'uk']

// Libère l'URL d'aperçu créée par `prepareFile` (seulement les blobs, les data: URL sont inertes).
function releasePreview(file) {
  if (file?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(file.previewUrl)
}

// Sélecteur de langue compact pour l'accueil : juste le drapeau actif + un chevron — pas les
// 4 drapeaux affichés d'un coup (ça reste dans Réglages). Un clic déroule les 3 autres options.
function LanguageSwitch({ region, setRegion, t }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const others = REGION_OPTIONS.filter((option) => option !== region)

  return (
    <div ref={rootRef} className="relative self-start">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t.settings.region}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring squishy glass flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors duration-200"
      >
        <Flag region={region} className="h-4 w-6 rounded-sm" />
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.settings.region}
          className="glass absolute left-0 top-[calc(100%+6px)] z-20 flex flex-col gap-1 p-1.5 motion-safe:animate-spring-in"
        >
          {others.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              aria-label={t.settings[option]}
              onClick={() => {
                setRegion(option)
                setOpen(false)
              }}
              className="focus-ring squishy flex h-8 w-10 items-center justify-center rounded-lg opacity-70 transition-opacity duration-150 hover:opacity-100"
            >
              <Flag region={option} className="h-4 w-6 rounded-sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage({ profile, onProfileChange, onOpenActivate }) {
  const { t, region, setRegion } = useCopy()
  // Phases : 'upload' (zone de dépôt) → 'ready' (aperçu + bouton) → 'loading' → 'result' | 'error'.
  const [phase, setPhase] = useState('upload')
  const [file, setFile] = useState(null) // { base64, mimeType, previewUrl }
  const [result, setResult] = useState(null) // { submission_id, analysis }
  const [error, setError] = useState(null) // { code, message }
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [savedInfo, setSavedInfo] = useState(null) // { subject, topicName }
  const [notationImage, setNotationImage] = useState(null) // { base64, mimeType, previewUrl }
  // Friction progressive fingerprint (contrat sécurité §6) : notice douce (1er/2e écart,
  // requête déjà passée) — distincte de `error` qui, elle, bloque le flux.
  const [fingerprintNotice, setFingerprintNotice] = useState(false)
  const [reverifyState, setReverifyState] = useState('idle') // 'idle' | 'busy' | 'done' | 'error'
  const timerRef = useRef(null)
  const fileRef = useRef(null)

  const credits = profile?.credits ?? 0

  // Nettoyage : minuterie démo et URL d'aperçu.
  useEffect(() => {
    fileRef.current = file
  }, [file])
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      releasePreview(fileRef.current)
    },
    [],
  )

  // `extra` : champs additionnels à fusionner dans le même appel (ex. streak_days) — les
  // regrouper en un seul `onProfileChange` évite qu'un second appel écrase le premier avec
  // l'ancien `profile` capturé dans sa propre fermeture (deux setState séquentiels sur le
  // même objet stale se marcheraient dessus).
  const updateCredits = useCallback(
    (nextCredits, extra) => onProfileChange?.({ ...(profile ?? {}), credits: Math.max(0, nextCredits), ...extra }),
    [profile, onProfileChange],
  )

  function replaceFile(next) {
    setFile((current) => {
      if (current !== next) releasePreview(current)
      return next
    })
  }

  // Fichier prêt (compressé par UploadVortex) : on montre l'aperçu et on attend la confirmation.
  function handleFile(payload) {
    if (!payload?.base64) {
      replaceFile(null)
      setPhase('upload')
      return
    }
    replaceFile(payload)
    setPhase('ready')
  }

  function resetToUpload() {
    clearTimeout(timerRef.current)
    replaceFile(null)
    setResult(null)
    setError(null)
    setSavedInfo(null)
    setFingerprintNotice(false)
    setPhase('upload')
  }

  function openPaywall() {
    setPaywallOpen(true)
  }

  // Recours friction progressive (contrat sécurité §6) : réattache CET appareil comme légitime.
  // La preuve d'identité est la session Supabase active elle-même (auth par lien magique
  // uniquement) — voir netlify/functions/reverify-device.js.
  async function handleReverify() {
    setReverifyState('busy')
    try {
      await reverifyDevice()
      setReverifyState('done')
      setFingerprintNotice(false)
      // Le blocage récupérable (phase 'error', FINGERPRINT_REVERIFY_REQUIRED) se résout tout
      // seul une fois l'appareil confirmé : l'élève peut retenter son analyse.
      if (error?.code === 'FINGERPRINT_REVERIFY_REQUIRED') {
        setError(null)
        setPhase(file ? 'ready' : 'upload')
      }
    } catch {
      setReverifyState('error')
    }
  }

  async function runAnalysis(source) {
    if (credits === 0) {
      openPaywall()
      return
    }
    setError(null)
    setSavedInfo(null)
    setResult(null)
    setPhase('loading')

    if (IS_DEMO) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setResult({ submission_id: `demo-${Date.now()}`, analysis: DEMO_ANALYSIS })
        updateCredits(credits - 1, { streak_days: (profile?.streak_days ?? 0) + 1 })
        setPhase('result')
      }, DEMO_DELAY_MS)
      return
    }

    try {
      const data = await analyzeHomework({
        base64: source.base64,
        mimeType: source.mimeType,
        region,
        notationText: profile?.preferred_notation,
        notationImage,
      })
      setResult({ submission_id: data.submission_id, analysis: data.analysis })
      if (typeof data.credits_remaining === 'number') {
        const extra = typeof data.streak_days === 'number' ? { streak_days: data.streak_days } : undefined
        updateCredits(data.credits_remaining, extra)
      }
      if (data.fingerprint_notice) {
        setReverifyState('idle')
        setFingerprintNotice(true)
      }
      setPhase('result')
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      if (code === 'NO_CREDITS') {
        updateCredits(0)
        setPhase(source ? 'ready' : 'upload')
        openPaywall()
        return
      }
      setError({ code, message: t.errors[code] ?? t.errors.SERVER_ERROR })
      setPhase('error')
    }
  }

  function handleAnalyzeClick() {
    if (!file) return
    runAnalysis(file)
  }

  // Démo : lance l'analyse sans fichier pour revoir l'animation en un clic.
  function handleDemoClick() {
    runAnalysis(null)
  }

  function handleRetry() {
    setError(null)
    setPhase(file ? 'ready' : 'upload')
  }

  function handleSaveRequest() {
    if (!result) return
    setLibraryOpen(true)
  }

  function handleSaved(info) {
    setSavedInfo(info)
  }

  const isLocked = credits === 0

  return (
    <div className="flex flex-col gap-6">
      <SocialFollowPrompt />

      <header className="flex flex-col gap-4">
        <Logo className="w-full" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="leading-relaxed text-slate-400">{t.tagline}</p>
          <div className="flex items-center gap-2">
            <StreakFlame days={profile?.streak_days ?? 0} />
            <CreditsBadge credits={credits} onClick={openPaywall} />
          </div>
        </div>
        <LanguageSwitch region={region} setRegion={setRegion} t={t} />
      </header>

      {phase === 'upload' && (
        <div className="flex flex-col gap-4 motion-safe:animate-bop">
          <NotationBlock
            profile={profile}
            onProfileChange={onProfileChange}
            notationImage={notationImage}
            onNotationImageChange={(next) => {
              if (notationImage?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(notationImage.previewUrl)
              setNotationImage(next)
            }}
          />

          {/* Verrouillée nativement par `disabled` (aria-disabled, tabIndex=-1, ZONE_DISABLED) ;
              le clic bulle jusqu'ici (pas de stopPropagation dans UploadVortex) pour ouvrir le mur de paiement. */}
          <div onClick={isLocked ? openPaywall : undefined}>
            <UploadVortex onFile={handleFile} disabled={isLocked} />
          </div>

          {IS_DEMO && (
            <Button variant="secondary" onClick={handleDemoClick} className="self-center">
              {t.nav.analyze}
            </Button>
          )}
        </div>
      )}

      {phase === 'ready' && file && (
        <GlassCard className="flex flex-col items-center gap-6 motion-safe:animate-bop">
          {file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={t.upload.previewAlt}
              className="max-h-80 w-full rounded-2xl bg-slate-900/60 object-contain"
            />
          ) : (
            <div
              className="flex h-40 w-full items-center justify-center rounded-2xl bg-slate-900/60 text-slate-500"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
                <path d="M9 13h6M9 17h6" />
              </svg>
            </div>
          )}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button variant="ghost" onClick={resetToUpload} className="w-full sm:flex-1">
              {t.upload.retake}
            </Button>
            <Button variant="primary" size="lg" onClick={handleAnalyzeClick} className="w-full sm:flex-1">
              {t.nav.analyze}
            </Button>
          </div>
        </GlassCard>
      )}

      {phase === 'loading' && <SkeletonLoader messages={t.loader} />}

      {phase === 'result' && result && (
        <div className="flex flex-col gap-4">
          {fingerprintNotice && (
            <div
              role="status"
              className="glass flex flex-col gap-3 rounded-2xl border-amber-500/30 p-4 motion-safe:animate-spring-in sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm leading-relaxed text-slate-300">{t.security.noticeText}</p>
              <div className="flex shrink-0 items-center gap-2">
                {reverifyState === 'done' ? (
                  <span className="text-sm font-semibold text-emerald-400">{t.security.reverifyDone}</span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleReverify}
                    loading={reverifyState === 'busy'}
                    className="whitespace-nowrap"
                  >
                    {reverifyState === 'busy' ? t.security.reverifyBusy : t.security.reverifyCta}
                  </Button>
                )}
                <button
                  type="button"
                  aria-label={t.common.close}
                  onClick={() => setFingerprintNotice(false)}
                  className="focus-ring squishy flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:text-slate-300"
                >
                  ×
                </button>
              </div>
              {reverifyState === 'error' && (
                <p role="alert" className="w-full text-xs text-rose-300 sm:basis-full">
                  {t.security.reverifyError}
                </p>
              )}
            </div>
          )}
          <AnalysisEngine
            key={result.submission_id}
            analysis={result.analysis}
            submissionId={result.submission_id}
            region={region}
            onDone={noop}
            onSave={handleSaveRequest}
            onNew={resetToUpload}
            onCreditsChange={(next) => onProfileChange?.((p) => ({ ...(p ?? {}), credits: next }))}
          />
          {savedInfo && (
            <p
              role="status"
              className="self-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 motion-safe:animate-spring-in"
            >
              {t.library.saved}
              <span aria-hidden="true"> · </span>
              <span className="font-normal text-emerald-200">{t.subjects[savedInfo.subject]}</span>
            </p>
          )}
        </div>
      )}

      {phase === 'error' && error && (
        <GlassCard role="alert" className="flex flex-col gap-5 border-rose-500/40 motion-safe:animate-bop">
          <p className="text-lg leading-relaxed text-slate-100">{error.message}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {error.code === 'FINGERPRINT_REVERIFY_REQUIRED' ? (
              // Récupérable (contrat sécurité §6) : contrairement à FINGERPRINT_MISMATCH
              // ci-dessous, ce n'est pas un blocage définitif — un bouton suffit, pas besoin
              // d'écrire au support.
              <>
                <Button
                  variant="primary"
                  onClick={handleReverify}
                  loading={reverifyState === 'busy'}
                  className="w-full sm:flex-1"
                >
                  {reverifyState === 'busy' ? t.security.reverifyBusy : t.security.reverifyCta}
                </Button>
                <Button variant="ghost" onClick={resetToUpload} className="w-full sm:flex-1">
                  {t.common.back}
                </Button>
              </>
            ) : error.code === 'FINGERPRINT_MISMATCH' ? (
              <>
                {SUPPORT_EMAIL && (
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="squishy focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-slate-800 px-5 py-2 font-semibold text-slate-100 transition-colors hover:bg-slate-700 sm:flex-1"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                )}
                <Button variant="ghost" onClick={resetToUpload} className="w-full sm:flex-1">
                  {t.common.back}
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" onClick={handleRetry} className="w-full sm:flex-1">
                  {t.common.retry}
                </Button>
                <Button variant="ghost" onClick={resetToUpload} className="w-full sm:flex-1">
                  {t.analysis.newProblem}
                </Button>
              </>
            )}
          </div>
          {error.code === 'FINGERPRINT_REVERIFY_REQUIRED' && reverifyState === 'error' && (
            <p role="alert" className="text-sm text-rose-300">
              {t.security.reverifyError}
            </p>
          )}
        </GlassCard>
      )}

      <PaywallModal
        open={paywallOpen}
        credits={credits}
        onClose={() => setPaywallOpen(false)}
        onHaveCode={() => {
          setPaywallOpen(false)
          onOpenActivate?.()
        }}
      />

      <LibraryModal
        open={libraryOpen}
        submissionId={result?.submission_id ?? null}
        suggestedSubject={result?.analysis?.subject_guess}
        onClose={() => setLibraryOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
