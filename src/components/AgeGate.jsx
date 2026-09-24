// Porte d'âge par marché (contrat conformité §1) : bloque avant toute connexion/collecte de
// courriel. QC<14/FR<15/UK<13 = déclaratif (case à cocher autorisation parentale) ; US<13 =
// blocage dur (COPPA), aucun essai gratuit sans consentement parental vérifiable.
import { useEffect, useState } from 'react'
import GlassCard from './ui/GlassCard'
import Button from './ui/Button'
import { getDeviceFingerprint } from '../utils/security-fingerprint'

const AGE_THRESHOLDS = { qc: 14, fr: 15, uk: 13, us: 13 }
const STORAGE_KEY = 'rpvd_age_gate'

const COPY = {
  fr: {
    question: (n) => `As-tu ${n} ans ou plus ?`,
    yes: (n) => `Oui, ${n} ans ou plus`,
    no: (n) => `Non, moins de ${n} ans`,
    consentTitle: 'Autorisation parentale requise',
    consentBody: "Tu dois avoir l'autorisation d'un parent ou tuteur pour utiliser RPVD. En cochant la case ci-dessous, tu confirmes avoir cette autorisation.",
    consentCheckbox: "J'ai l'autorisation d'un parent ou tuteur pour utiliser RPVD",
    blockedTitle: 'Accès réservé aux 13 ans et plus',
    blockedBody: "Conformément à la loi américaine COPPA, RPVD ne peut pas offrir d'essai gratuit aux utilisateurs de moins de 13 ans sans consentement parental vérifié. Un parent ou tuteur peut créer un compte et payer directement pour débloquer l'accès.",
    blockedCta: 'Je suis un parent, je continue',
    title: 'Avant de commencer',
  },
  en: {
    question: (n) => `Are you ${n} or older?`,
    yes: (n) => `Yes, ${n} or older`,
    no: (n) => `No, under ${n}`,
    consentTitle: 'Parental Authorization Required',
    consentBody: 'You must have a parent or guardian\'s authorization to use RPVD. By checking the box below, you confirm you have that authorization.',
    consentCheckbox: 'I have a parent or guardian\'s authorization to use RPVD',
    blockedTitle: 'Access restricted to 13 and older',
    blockedBody: 'Under US COPPA law, RPVD cannot offer a free trial to users under 13 without verifiable parental consent. A parent or guardian can create an account and pay directly to unlock access.',
    blockedCta: "I'm a parent, continue",
    title: 'Before you start',
  },
}

function safeStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readStored() {
  try {
    const storage = safeStorage()
    const raw = storage ? storage.getItem(STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(value) {
  try {
    const storage = safeStorage()
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // best-effort
  }
}

async function reportConfirmation(payload) {
  try {
    const fingerprint = await getDeviceFingerprint()
    await fetch('/.netlify/functions/age-gate-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': fingerprint },
      body: JSON.stringify(payload),
    })
  } catch {
    // best-effort : ne bloque jamais l'accès si l'écriture échoue
  }
}

// `market` = région active (qc/fr/us/uk). `onConfirm` n'est appelé qu'une fois l'accès autorisé.
export default function AgeGate({ market, lang, onConfirm }) {
  const c = COPY[lang] || COPY.fr
  const threshold = AGE_THRESHOLDS[market] || AGE_THRESHOLDS.qc
  const [stage, setStage] = useState('checking') // checking | question | consent | blocked | done

  useEffect(() => {
    const stored = readStored()
    if (stored && stored.market === market && stored.confirmed) {
      setStage('done')
      onConfirm()
      return
    }
    setStage('question')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market])

  function handleAnswer(isOverThreshold) {
    if (!isOverThreshold && market === 'us') {
      setStage('blocked')
      reportConfirmation({ market, ageConfirmed: false, parentAuthDeclared: false, blocked: true })
      return
    }
    if (!isOverThreshold) {
      setStage('consent')
      return
    }
    writeStored({ market, confirmed: true, parentAuthDeclared: false, ts: Date.now() })
    reportConfirmation({ market, ageConfirmed: true, parentAuthDeclared: false })
    setStage('done')
    onConfirm()
  }

  function handleParentConsent() {
    writeStored({ market, confirmed: true, parentAuthDeclared: true, ts: Date.now() })
    reportConfirmation({ market, ageConfirmed: false, parentAuthDeclared: true })
    setStage('done')
    onConfirm()
  }

  if (stage === 'checking' || stage === 'done') return null

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-sm motion-safe:animate-bop">
        {stage === 'blocked' && (
          <div className="flex flex-col gap-4 text-center">
            <h1 className="font-display text-xl font-bold text-rose-300">{c.blockedTitle}</h1>
            <p className="leading-relaxed text-slate-300">{c.blockedBody}</p>
            <Button variant="secondary" onClick={handleParentConsent} className="w-full">
              {c.blockedCta}
            </Button>
          </div>
        )}

        {stage === 'consent' && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-xl font-bold text-slate-50">{c.consentTitle}</h1>
            <p className="leading-relaxed text-slate-300">{c.consentBody}</p>
            <label className="flex items-start gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                onChange={(e) => e.target.checked && handleParentConsent()}
                className="mt-1 h-5 w-5 shrink-0 rounded border-white/20 bg-slate-900"
              />
              {c.consentCheckbox}
            </label>
          </div>
        )}

        {stage === 'question' && (
          <div className="flex flex-col gap-4 text-center">
            <h1 className="font-display text-xl font-bold text-slate-50">{c.title}</h1>
            <p className="leading-relaxed text-slate-300">{c.question(threshold)}</p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={() => handleAnswer(true)} className="w-full">
                {c.yes(threshold)}
              </Button>
              <Button variant="ghost" onClick={() => handleAnswer(false)} className="w-full">
                {c.no(threshold)}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
