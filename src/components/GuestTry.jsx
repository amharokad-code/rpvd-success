// Essai SANS compte : une analyse complète avant de demander le moindre courriel.
// Rien n'est enregistré (ni photo, ni fiche, ni identité). Limité côté serveur (voir analyze-guest.js).
import { useState } from 'react'
import AnalysisEngine from './AnalysisEngine'
import UploadVortex from './UploadVortex'
import Button from './ui/Button'
import GlassCard from './ui/GlassCard'
import { useCopy } from '../context/RegionContext'
import { ApiError, analyzeGuest } from '../lib/api'
import { PICKER_SUBJECTS, modeForSubject } from '../lib/mode'
import { trackEvent } from '../utils/track'

const TEXT = {
  fr: {
    title: 'Essaie, sans compte',
    subtitle: "Une photo de ton exercice, une fiche complète en 3 niveaux. Pas de courriel, rien n'est enregistré.",
    subject: "C'est quelle matière ?",
    analyze: 'Analyser ma photo',
    loading: 'Analyse en cours… ça prend quelques secondes.',
    back: '← Retour',
    ctaTitle: 'Tu veux garder cette fiche et en faire d’autres ?',
    ctaBody: 'Crée ton compte gratuit en 30 secondes : un lien par courriel, pas de mot de passe. 3 analyses gratuites, ta bibliothèque et ta série.',
    cta: 'Créer mon compte gratuit',
    another: 'Essayer une autre photo',
    used: 'Tu as déjà utilisé ton essai gratuit sur cet appareil. Crée ton compte gratuit pour continuer.',
    photo: "Je n'arrive pas à lire cette photo. Reprends-la avec plus de lumière, bien cadrée, un seul exercice.",
    big: 'Photo trop lourde. Reprends-la ou choisis-en une plus petite.',
    closed: "L'essai sans compte est fermé pour le moment. Crée ton compte gratuit pour essayer.",
    generic: "L'analyse n'a pas marché. Réessaie dans un instant.",
    network: 'Pas de connexion. Vérifie ton réseau et réessaie.',
  },
  en: {
    title: 'Try it, no account',
    subtitle: 'One photo of your exercise, a full 3-level walkthrough. No email, nothing is saved.',
    subject: 'Which subject?',
    analyze: 'Analyze my photo',
    loading: 'Analyzing… this takes a few seconds.',
    back: '← Back',
    ctaTitle: 'Want to keep this and try more?',
    ctaBody: 'Create your free account in 30 seconds: one email link, no password. 3 free analyses, your library and your streak.',
    cta: 'Create my free account',
    another: 'Try another photo',
    used: 'You already used your free try on this device. Create your free account to keep going.',
    photo: "I can't read this photo. Retake it with more light, well framed, one exercise.",
    big: 'Photo too large. Retake it or pick a smaller one.',
    closed: 'The no-account try is closed right now. Create your free account to try it.',
    generic: "The analysis didn't work. Try again in a moment.",
    network: 'No connection. Check your network and try again.',
  },
}

export default function GuestTry({ lang = 'fr', region, onSignup, onBack }) {
  const { t } = useCopy()
  const x = TEXT[lang === 'en' ? 'en' : 'fr']
  const [subject, setSubject] = useState('math')
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState('pick') // pick | loading | result | error
  const [analysis, setAnalysis] = useState(null)
  const [message, setMessage] = useState('')
  const [blocked, setBlocked] = useState(false)
  const mode = modeForSubject(subject)

  function handleFile(payload) {
    setFile(payload?.base64 ? payload : null)
    if (payload?.base64) trackEvent('guest_file_selected', { region, props: { subject, mode } })
  }

  async function run() {
    if (!file) return
    setPhase('loading')
    setMessage('')
    trackEvent('guest_analysis_started', { region, props: { subject, mode } })
    try {
      const data = await analyzeGuest({ base64: file.base64, mimeType: file.mimeType, region, mode })
      setAnalysis(data.analysis)
      setPhase('result')
      trackEvent('guest_analysis_success', { region, props: { mode } })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      trackEvent('guest_analysis_error', { region, props: { code, mode } })
      setBlocked(code === 'RATE_LIMITED')
      setMessage(
        code === 'RATE_LIMITED'
          ? x.used
          : code === 'OCR_FAIL'
            ? err.message && !/cr[ée]dit/i.test(err.message) ? err.message : x.photo
            : code === 'PAYLOAD_TOO_LARGE'
              ? x.big
              : code === 'NETWORK'
                ? x.network
                : err instanceof ApiError && err.status === 503
                  ? x.closed
                  : x.generic,
      )
      setPhase('error')
    }
  }

  function signup() {
    trackEvent('guest_signup_click', { region, props: { stage: phase } })
    onSignup?.()
  }

  function again() {
    setFile(null)
    setAnalysis(null)
    setMessage('')
    setPhase('pick')
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <div>
        <button type="button" onClick={onBack} className="focus-ring inline-flex min-h-[44px] items-center text-sm font-medium text-slate-400 hover:text-slate-200">
          {x.back}
        </button>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-slate-50">{x.title}</h1>
        <p className="mt-2 leading-relaxed text-slate-300">{x.subtitle}</p>
      </div>

      {(phase === 'pick' || phase === 'error') && (
        <div className="flex flex-col gap-4">
          <div role="group" aria-label={x.subject} className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-400">{x.subject}</span>
            {PICKER_SUBJECTS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={subject === key}
                onClick={() => setSubject(key)}
                className={`squishy focus-ring inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                  subject === key ? 'bg-amber-500 text-slate-900' : 'glass text-slate-300 hover:text-slate-100'
                }`}
              >
                {t.subjects[key]}
              </button>
            ))}
          </div>

          {message && (
            <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {message}
            </p>
          )}

          {blocked ? (
            <Button variant="primary" size="lg" onClick={signup} className="w-full">
              {x.cta}
            </Button>
          ) : (
            <>
              <UploadVortex onFile={handleFile} />
              <Button variant="primary" size="lg" onClick={run} disabled={!file} className="w-full">
                {x.analyze}
              </Button>
            </>
          )}
        </div>
      )}

      {phase === 'loading' && (
        <GlassCard className="flex flex-col items-center gap-4 py-12 text-center" role="status" aria-live="polite">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400/30 border-t-amber-400" aria-hidden="true" />
          <p className="text-slate-200">{x.loading}</p>
        </GlassCard>
      )}

      {phase === 'result' && analysis && (
        <>
          <AnalysisEngine analysis={analysis} submissionId={null} region={region} plan="free" onDone={() => {}} />
          <GlassCard className="flex flex-col gap-3 border-amber-500/30">
            <h2 className="font-display text-xl font-bold text-slate-50">{x.ctaTitle}</h2>
            <p className="leading-relaxed text-slate-300">{x.ctaBody}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={signup} className="w-full sm:flex-1">
                {x.cta}
              </Button>
              <Button variant="ghost" onClick={again} className="w-full sm:w-auto">
                {x.another}
              </Button>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
