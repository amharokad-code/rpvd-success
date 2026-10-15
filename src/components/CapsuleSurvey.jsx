// Sondage ULTRA court : 3 écrans, environ 3 touches + le courriel.
//   1. matière + niveau (deux rangées de boutons, avance toute seule dès que les deux sont choisis)
//   2. sujet (boutons selon la matière, ou « Autre » en texte libre ; avance au clic)
//   3. courriel + case de consentement (LCAP, non cochée) → la démo gratuite s'affiche tout de suite
// Pas de prénom, pas de date, pas de produit : ces détails sont facultatifs et viennent APRÈS (voir DemoReward).
// Sauvegarde locale à chaque étape (sans courriel). Turnstile à l'écran final si la clé publique est configurée.
import { useEffect, useRef, useState } from 'react'
import { bootcampCall } from '../lib/bootcampApi'
import { CTA, INPUT, Notice, Spinner } from './bootcamp/BootcampUI'
import DemoReward from './DemoReward'

const KEY = 'rpvd_capsule_survey_v2'
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
const EMPTY = { subject_area: '', level: '', topic: '', email: '', consent_email: false, bot_field: '' }
const STEPS = ['start', 'topic', 'email']

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object') return { answers: { ...EMPTY, ...saved.answers, email: '', consent_email: false }, step: STEPS.includes(saved.step) ? saved.step : 'start' }
  } catch { /* stockage indisponible */ }
  return { answers: EMPTY, step: 'start' }
}

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`min-h-[48px] rounded-2xl border px-4 py-2 text-left text-base font-semibold transition ${active ? 'border-pyramid-orange bg-pyramid-orange/20 text-slate-50' : 'border-white/15 bg-white/[0.04] text-slate-100 hover:border-pyramid-orange/70'}`}
  >
    {children}
  </button>
)

export default function CapsuleSurvey() {
  const [{ answers, step }, setState] = useState(load)
  const [other, setOther] = useState(false)
  const [status, setStatus] = useState('idle') // idle | busy | done
  const [error, setError] = useState(null)
  const [captcha, setCaptcha] = useState('')
  const [requestId, setRequestId] = useState(null)
  const captchaBox = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ answers: { ...answers, email: '', consent_email: false }, step })) } catch { /* ignoré */ }
  }, [answers, step])

  // Cloudflare Turnstile : chargé seulement à l'écran du courriel, et seulement si la clé publique existe.
  useEffect(() => {
    if (!TURNSTILE_KEY || step !== 'email' || !captchaBox.current) return undefined
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

  const patch = (p, nextStep) => setState((s) => ({ answers: { ...s.answers, ...p }, step: nextStep || s.step }))
  const go = (nextStep) => setState((s) => ({ ...s, step: nextStep }))

  function pickStart(p) {
    const next = { ...answers, ...p }
    // Dès que matière ET niveau sont choisis, on passe au sujet (si la matière change, le sujet est remis à zéro).
    const resetTopic = p.subject_area && p.subject_area !== answers.subject_area ? { topic: '' } : {}
    setOther(false)
    patch({ ...p, ...resetTopic }, next.subject_area && next.level ? 'topic' : 'start')
  }

  async function submit(e) {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      const r = await bootcampCall('capsule-request', { ...answers, turnstile_token: captcha })
      setRequestId(r.id || null)
      try { localStorage.removeItem(KEY) } catch { /* ignoré */ }
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'done') return <DemoReward requestId={requestId} topic={answers.topic} />

  const stepIndex = STEPS.indexOf(step) + 1
  const topics = TOPICS[answers.subject_area] || []

  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={stepIndex}>
        <div className="h-full rounded-full bg-pyramid-orange transition-all" style={{ width: `${(stepIndex / 3) * 100}%` }} />
      </div>
      {step !== 'start' && (
        <button type="button" onClick={() => go(step === 'email' ? 'topic' : 'start')} className="mt-3 text-sm text-slate-400 underline">← Retour</button>
      )}

      {step === 'start' && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-display text-xl font-bold text-slate-50">Quelle matière ?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{SUBJECTS.map((s) => <Chip key={s} active={answers.subject_area === s} onClick={() => pickStart({ subject_area: s })}>{s}</Chip>)}</div>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-slate-50">Quel niveau ?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">{LEVELS.map((l) => <Chip key={l} active={answers.level === l} onClick={() => pickStart({ level: l })}>{l.replace('Secondaire ', 'Sec ')}</Chip>)}</div>
          </div>
        </div>
      )}

      {step === 'topic' && (
        <div className="mt-4">
          <p className="font-display text-xl font-bold text-slate-50">Quel sujet ?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {topics.map((t) => <Chip key={t} active={answers.topic === t} onClick={() => { setOther(false); patch({ topic: t }, 'email') }}>{t}</Chip>)}
            <Chip active={other} onClick={() => setOther(true)}>Autre</Chip>
          </div>
          {(other || topics.length === 0) && (
            <form className="mt-3 flex gap-3" onSubmit={(e) => { e.preventDefault(); if (answers.topic.trim().length >= 2) go('email') }}>
              <input className={INPUT} autoFocus placeholder="Écris le sujet" maxLength={160} value={answers.topic} onChange={(e) => patch({ topic: e.target.value })} />
              <button className={CTA} disabled={answers.topic.trim().length < 2}>OK</button>
            </form>
          )}
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <p className="font-display text-xl font-bold text-slate-50">Où t’envoie-t-on ta démo gratuite ?</p>
          <p className="-mt-1 text-sm text-slate-400">Sujet : {answers.topic} · {answers.subject_area}, {answers.level}</p>
          <input className={INPUT} required type="email" autoFocus autoComplete="email" inputMode="email" placeholder="Ton courriel" maxLength={254} value={answers.email} onChange={(e) => patch({ email: e.target.value })} />
          <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" value={answers.bot_field} onChange={(e) => patch({ bot_field: e.target.value })} />
          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input type="checkbox" required checked={answers.consent_email} onChange={(e) => patch({ consent_email: e.target.checked })} className="mt-1 h-5 w-5 shrink-0" />
            <span>J’accepte de recevoir des courriels de RPVD au sujet de ma demande (démo, capsule prête). Je peux me désabonner en tout temps. <a className="underline" href="/legal/privacy">Confidentialité</a></span>
          </label>
          {TURNSTILE_KEY && <div ref={captchaBox} />}
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" disabled={status === 'busy' || (Boolean(TURNSTILE_KEY) && !captcha)} className={CTA}>
            {status === 'busy' ? <Spinner /> : 'Recevoir ma démo gratuite'}
          </button>
        </form>
      )}
    </div>
  )
}
