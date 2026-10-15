// Sondage de demande de capsule : un écran par question, auto-avance au clic, barre de progression.
// Courriel + prénom + consentement UNIQUEMENT à l'écran final. Sauvegarde locale à chaque étape ;
// l'insertion dans capsule_requests se fait à la soumission finale (fonction capsule-request).
import { useEffect, useRef, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { currentPrice, formatPrice } from '../config/pricing.mjs'
import { CARD, CTA, INPUT, Notice, Spinner } from './bootcamp/BootcampUI'

const KEY = 'rpvd_capsule_survey_v1'
const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const SUBJECTS = ['Mathématiques', 'Science et technologie', 'Chimie', 'Physique', 'Français', 'Autre']
const LEVELS = ['Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5', 'Cégep']
const TOPICS = {
  Mathématiques: ['Algèbre', 'Trigonométrie', 'Fonctions', 'Probabilités', 'Géométrie'],
  'Science et technologie': ['Stœchiométrie', 'Forces et mouvement', 'Électricité', 'Univers vivant'],
  Chimie: ['Stœchiométrie', 'Équilibre chimique', 'Solutions et concentration'],
  Physique: ['Cinématique', 'Forces', 'Énergie'],
  Français: ['Accord du participe passé', 'Analyse de texte', 'Rédaction'],
  Autre: [],
}
const PRODUCTS = [
  ['concept', `Capsule Concept — ${formatPrice(currentPrice('concept'))}`],
  ['exam', `Capsule Examen — ${formatPrice(currentPrice('exam'))} (recommandé)`],
  ['bootcamp', `Bootcamp en direct — ${formatPrice(currentPrice('bootcamp'))}`],
]
const STEPS = ['subject_area', 'level', 'topic', 'exam_date', 'product_wanted', 'final']
const EMPTY = { subject_area: '', level: '', topic: '', exam_date: '', product_wanted: '', parent_first_name: '', email: '', consent_email: false, bot_field: '' }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object') return { answers: { ...EMPTY, ...saved.answers, consent_email: false }, step: Math.min(saved.step || 0, STEPS.length - 1) }
  } catch { /* stockage indisponible */ }
  return { answers: EMPTY, step: 0 }
}

export default function CapsuleSurvey({ preselect }) {
  const [{ answers, step }, setState] = useState(load)
  const [other, setOther] = useState(false)
  const [status, setStatus] = useState('idle') // idle | busy | done
  const [error, setError] = useState(null)
  const [captcha, setCaptcha] = useState('')
  const captchaBox = useRef(null)

  // Cloudflare Turnstile (anti-robots), chargé seulement à l'écran final et si la clé publique est configurée.
  useEffect(() => {
    if (!TURNSTILE_KEY || STEPS[step] !== 'final' || !captchaBox.current) return undefined
    let widget
    const mount = () => {
      if (!window.turnstile || !captchaBox.current) return
      widget = window.turnstile.render(captchaBox.current, { sitekey: TURNSTILE_KEY, callback: setCaptcha, 'expired-callback': () => setCaptcha('') })
    }
    if (window.turnstile) mount()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = mount
      document.head.appendChild(s)
    }
    return () => { if (widget !== undefined && window.turnstile) window.turnstile.remove(widget) }
  }, [step])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ answers: { ...answers, email: '', consent_email: false }, step })) } catch { /* ignoré */ }
  }, [answers, step])
  useEffect(() => {
    if (preselect) setState((s) => ({ ...s, answers: { ...s.answers, product_wanted: preselect } }))
  }, [preselect])

  const answer = (patch, advance = true) => setState((s) => ({ answers: { ...s.answers, ...patch }, step: advance ? Math.min(s.step + 1, STEPS.length - 1) : s.step }))
  const back = () => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }))

  async function submit(e) {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      await bootcampCall('capsule-request', { ...answers, product_wanted: answers.product_wanted || 'exam', turnstile_token: captcha })
      try { localStorage.removeItem(KEY) } catch { /* ignoré */ }
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const Btn = ({ children, onClick }) => (
    <button type="button" onClick={onClick} className="min-h-[56px] rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-left text-lg font-semibold text-slate-100 transition hover:border-pyramid-orange/70">
      {children}
    </button>
  )

  if (status === 'done') {
    return <Notice tone="ok">Parfait, on prépare « {answers.topic} ». Tu recevras un courriel dès que la capsule est prête. Tu peux te désabonner en un clic dans chaque courriel.</Notice>
  }

  const current = STEPS[step]
  const topics = TOPICS[answers.subject_area] || []

  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        <div className="h-full rounded-full bg-pyramid-orange transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      {step > 0 && <button type="button" onClick={back} className="mt-3 text-sm text-slate-400 underline">← Retour</button>}

      <div className="mt-4">
        {current === 'subject_area' && (
          <>
            <h3 className="font-display text-2xl font-bold text-slate-50">En quelle matière ton enfant a-t-il besoin d’aide ?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{SUBJECTS.map((s) => <Btn key={s} onClick={() => { setOther(false); answer({ subject_area: s, topic: '' }) }}>{s}</Btn>)}</div>
          </>
        )}
        {current === 'level' && (
          <>
            <h3 className="font-display text-2xl font-bold text-slate-50">Quel est son niveau ?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{LEVELS.map((l) => <Btn key={l} onClick={() => answer({ level: l })}>{l}</Btn>)}</div>
          </>
        )}
        {current === 'topic' && (
          <>
            <h3 className="font-display text-2xl font-bold text-slate-50">Quel sujet ?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topics.map((t) => <Btn key={t} onClick={() => { setOther(false); answer({ topic: t }) }}>{t}</Btn>)}
              <Btn onClick={() => setOther(true)}>Autre</Btn>
            </div>
            {(other || topics.length === 0) && (
              <form className="mt-3 flex gap-3" onSubmit={(e) => { e.preventDefault(); if (answers.topic.trim().length >= 2) answer({}) }}>
                <input className={INPUT} autoFocus placeholder="Écris le sujet" maxLength={160} value={answers.topic} onChange={(e) => answer({ topic: e.target.value }, false)} />
                <button className={CTA} disabled={answers.topic.trim().length < 2}>OK</button>
              </form>
            )}
          </>
        )}
        {current === 'exam_date' && (
          <>
            <h3 className="font-display text-2xl font-bold text-slate-50">Quand est le prochain examen ? <span className="text-base font-normal text-slate-400">(facultatif)</span></h3>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input type="date" className={`${INPUT} max-w-xs`} value={answers.exam_date} onChange={(e) => answer({ exam_date: e.target.value }, false)} />
              <button type="button" className={CTA} onClick={() => answer({})}>Continuer</button>
              <Btn onClick={() => answer({ exam_date: '' })}>Je ne sais pas</Btn>
            </div>
          </>
        )}
        {current === 'product_wanted' && (
          <>
            <h3 className="font-display text-2xl font-bold text-slate-50">Quelle capsule veux-tu ?</h3>
            <div className="mt-4 grid gap-3">{PRODUCTS.map(([id, label]) => <Btn key={id} onClick={() => answer({ product_wanted: id })}>{label}</Btn>)}</div>
          </>
        )}
        {current === 'final' && (
          <form onSubmit={submit} className="grid gap-4">
            <h3 className="font-display text-2xl font-bold text-slate-50">Parfait, on prépare « {answers.topic || 'ta capsule'} ». Où te l’envoie-t-on ?</h3>
            <input className={INPUT} required placeholder="Ton prénom" maxLength={80} value={answers.parent_first_name} onChange={(e) => answer({ parent_first_name: e.target.value }, false)} />
            <input className={INPUT} required type="email" placeholder="Ton courriel" maxLength={254} value={answers.email} onChange={(e) => answer({ email: e.target.value }, false)} />
            <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" value={answers.bot_field} onChange={(e) => answer({ bot_field: e.target.value }, false)} />
            <label className="flex items-start gap-3 text-sm text-slate-300">
              <input type="checkbox" required checked={answers.consent_email} onChange={(e) => answer({ consent_email: e.target.checked }, false)} className="mt-1 h-5 w-5" />
              <span>J’accepte de recevoir des courriels de RPVD au sujet de ma demande (capsule prête, rappel avant l’examen, suivi). Je peux me désabonner en tout temps. <a className="underline" href="/legal/privacy">Confidentialité</a></span>
            </label>
            {TURNSTILE_KEY && <div ref={captchaBox} />}
            {error && <Notice tone="error">{error}</Notice>}
            <button type="submit" disabled={status === 'busy' || (Boolean(TURNSTILE_KEY) && !captcha)} className={CTA}>{status === 'busy' ? <Spinner /> : 'Recevoir ma capsule'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
