// Sondage en 4 écrans, pensé pour le téléphone : plus c'est gros, plus ça passe.
//   1. matière + niveau (dans l'accueil ; dès que les deux sont choisis, le sondage passe en PLEIN ÉCRAN)
//   2. sujet : le parent l'ÉCRIT (gros champ) ou touche une suggestion ; Gemini regroupe ensuite les sujets voisins (serveur)
//   3. type de capsule : Concept, Examen ou Bootcamp (trois grosses cartes, avance au toucher)
//   4. courriel + case de consentement (LCAP, non cochée) → la démo gratuite s'affiche tout de suite
// Pas de prénom ni de date ici : facultatifs, ils viennent APRÈS (voir DemoReward).
// Sauvegarde locale à chaque étape (sans courriel). Turnstile à l'écran final si la clé publique est configurée.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { bootcampCall } from '../lib/bootcampApi'
import { currentPrice, formatPrice } from '../config/pricing.mjs'
import { CTA, INPUT, Notice, Spinner } from './bootcamp/BootcampUI'
import DemoReward from './DemoReward'

const KEY = 'rpvd_capsule_survey_v3'
// Nettoyé : une clé collée avec des chevrons ou des espaces reste valide.
const TURNSTILE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').replace(/[^0-9A-Za-z_-]/g, '')
const SUBJECTS = ['Mathématiques', 'Science et technologie', 'Chimie', 'Physique', 'Français', 'Autre']
const LEVELS = ['Secondaire 1', 'Secondaire 2', 'Secondaire 3', 'Secondaire 4', 'Secondaire 5', 'Cégep']
// Simples suggestions : le parent peut écrire n'importe quel sujet.
const TOPICS = {
  Mathématiques: ['Algèbre', 'Trigonométrie', 'Fonctions', 'Probabilités', 'Géométrie'],
  'Science et technologie': ['Stœchiométrie', 'Forces et mouvement', 'Électricité', 'Univers vivant'],
  Chimie: ['Stœchiométrie', 'Équilibre chimique', 'Solutions et concentration'],
  Physique: ['Cinématique', 'Forces', 'Énergie'],
  Français: ['Accord du participe passé', 'Analyse de texte', 'Rédaction'],
  Autre: [],
}
const PRODUCTS = [
  { id: 'concept', name: 'Concept', text: 'Une méthode pour un type de numéro' },
  { id: 'exam', name: 'Examen', text: 'Toute la matière de l’examen, une démarche par type de numéro' },
  { id: 'bootcamp', name: 'Bootcamp en direct', text: 'Une séance en direct avec questions, places limitées à 25' },
]
const EMPTY = { subject_area: '', level: '', topic: '', product_wanted: '', email: '', consent_email: false, bot_field: '' }
const STEPS = ['start', 'topic', 'product', 'email']

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...EMPTY, ...saved.answers, email: '', consent_email: false }
  } catch { /* stockage indisponible */ }
  return EMPTY
}

const Chip = ({ active, onClick, big, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`${big ? 'min-h-[64px] text-lg' : 'min-h-[48px] text-base'} rounded-2xl border px-4 py-2 text-left font-semibold transition ${active ? 'border-pyramid-orange bg-pyramid-orange/20 text-slate-50' : 'border-white/15 bg-white/[0.04] text-slate-100 hover:border-pyramid-orange/70'}`}
  >
    {children}
  </button>
)

export default function CapsuleSurvey() {
  const [answers, setAnswers] = useState(load)
  const [step, setStep] = useState('start')
  const [status, setStatus] = useState('idle') // idle | busy | done
  const [error, setError] = useState(null)
  const [captcha, setCaptcha] = useState('')
  const [requestId, setRequestId] = useState(null)
  const [info, setInfo] = useState(null)
  const captchaBox = useRef(null)
  const fullscreen = step !== 'start' && status !== 'done'

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ answers: { ...answers, email: '', consent_email: false } })) } catch { /* ignoré */ }
  }, [answers])

  // Plein écran : on fige le défilement de la page et Échap ferme.
  useEffect(() => {
    if (!fullscreen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setStep('start') }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey) }
  }, [fullscreen])

  // Cloudflare Turnstile : chargé seulement à l'écran du courriel, et seulement si la clé publique existe.
  useEffect(() => {
    if (!TURNSTILE_KEY || step !== 'email' || !captchaBox.current) return undefined
    let widget
    const mount = () => {
      if (!window.turnstile || !captchaBox.current) return
      widget = window.turnstile.render(captchaBox.current, { sitekey: TURNSTILE_KEY, appearance: 'interaction-only', callback: setCaptcha, 'expired-callback': () => setCaptcha('') })
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

  const patch = (p) => setAnswers((a) => ({ ...a, ...p }))

  function pickStart(p) {
    const next = { ...answers, ...p }
    // Si la matière change, le sujet est remis à zéro (les suggestions dépendent de la matière).
    patch(p.subject_area && p.subject_area !== answers.subject_area ? { ...p, topic: '' } : p)
    if (next.subject_area && next.level) setStep('topic')
  }

  async function submit(e) {
    e.preventDefault()
    setStatus('busy')
    setError(null)
    try {
      const r = await bootcampCall('capsule-request', { ...answers, product_wanted: answers.product_wanted || undefined, turnstile_token: captcha })
      setRequestId(r.id || null)
      setInfo({ count: r.count, needed: r.needed, readySlug: r.ready_slug })
      try { localStorage.removeItem(KEY) } catch { /* ignoré */ }
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'done') return <DemoReward requestId={requestId} topic={answers.topic} info={info} />

  const stepIndex = Math.max(STEPS.indexOf(step), 0) + 1
  const topics = TOPICS[answers.subject_area] || []
  const Q = 'font-display text-3xl font-bold leading-tight text-slate-50 sm:text-4xl'

  const start = (
    <div className="space-y-4">
      <div>
        <p className="font-display text-xl font-bold text-slate-50">Quelle matière ?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{SUBJECTS.map((s) => <Chip key={s} active={answers.subject_area === s} onClick={() => pickStart({ subject_area: s })}>{s}</Chip>)}</div>
      </div>
      <div>
        <p className="font-display text-xl font-bold text-slate-50">Quel niveau ?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{LEVELS.map((l) => <Chip key={l} active={answers.level === l} onClick={() => pickStart({ level: l })}>{l.replace('Secondaire ', 'Sec ')}</Chip>)}</div>
      </div>
    </div>
  )

  if (!fullscreen) return start

  // Portail : la carte de l'accueil a un flou d'arrière-plan qui piégerait un élément « fixed ».
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950" role="dialog" aria-modal="true" aria-label="Démo gratuite">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 pb-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep(STEPS[stepIndex - 2] || 'start')} className="min-h-[44px] text-base text-slate-400 underline">← Retour</button>
          <p className="text-sm font-semibold text-slate-400">{stepIndex} / {STEPS.length}</p>
          <button type="button" onClick={() => setStep('start')} aria-label="Fermer" className="min-h-[44px] min-w-[44px] text-2xl text-slate-400">✕</button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={stepIndex}>
          <div className="h-full rounded-full bg-pyramid-orange transition-all" style={{ width: `${(stepIndex / STEPS.length) * 100}%` }} />
        </div>

        {step === 'topic' && (
          <form className="mt-8 flex flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (answers.topic.trim().length >= 2) setStep('product') }}>
            <p className="text-sm font-semibold text-slate-400">{answers.subject_area} · {answers.level}</p>
            <h2 className={`mt-1 ${Q}`}>C’est quoi le sujet de l’examen ?</h2>
            <input className={`${INPUT} mt-5 min-h-[68px] text-xl`} autoFocus placeholder="Écris-le comme tu veux" maxLength={160} enterKeyHint="next" value={answers.topic} onChange={(e) => patch({ topic: e.target.value })} />
            {topics.length > 0 && (
              <>
                <p className="mt-6 text-sm text-slate-400">Ou touche un sujet :</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topics.map((t) => <Chip key={t} big active={answers.topic === t} onClick={() => { patch({ topic: t }); setStep('product') }}>{t}</Chip>)}
                </div>
              </>
            )}
            <button className={`${CTA} mt-8 min-h-[64px] text-lg`} disabled={answers.topic.trim().length < 2}>Continuer</button>
          </form>
        )}

        {step === 'product' && (
          <div className="mt-8 flex flex-1 flex-col">
            <h2 className={Q}>Qu’est-ce qui t’aiderait le plus ?</h2>
            <div className="mt-5 grid gap-3">
              {PRODUCTS.map((p) => (
                <Chip key={p.id} big active={answers.product_wanted === p.id} onClick={() => { patch({ product_wanted: p.id }); setStep('email') }}>
                  <span className="block font-display text-xl font-bold">{p.name} · {formatPrice(currentPrice(p.id))}</span>
                  <span className="mt-1 block text-base font-normal text-slate-300">{p.text}</span>
                </Chip>
              ))}
            </div>
            <button type="button" onClick={() => { patch({ product_wanted: '' }); setStep('email') }} className="mt-5 min-h-[48px] text-base text-slate-400 underline">Je ne sais pas encore</button>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={submit} className="mt-8 grid gap-4">
            <h2 className={Q}>Où t’envoie-t-on ta démo gratuite ?</h2>
            <p className="-mt-2 text-sm text-slate-400">{answers.topic} · {answers.subject_area}, {answers.level}</p>
            <input className={`${INPUT} min-h-[68px] text-xl`} required type="email" autoFocus autoComplete="email" inputMode="email" placeholder="Ton courriel" maxLength={254} value={answers.email} onChange={(e) => patch({ email: e.target.value })} />
            <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" value={answers.bot_field} onChange={(e) => patch({ bot_field: e.target.value })} />
            <label className="flex items-start gap-3 text-base text-slate-300">
              <input type="checkbox" required checked={answers.consent_email} onChange={(e) => patch({ consent_email: e.target.checked })} className="mt-1 h-6 w-6 shrink-0" />
              <span>J’accepte de recevoir des courriels de RPVD au sujet de ma demande (démo, capsule prête). Je peux me désabonner en tout temps. <a className="underline" href="/legal/privacy">Confidentialité</a></span>
            </label>
            {TURNSTILE_KEY && <div ref={captchaBox} />}
            {error && <Notice tone="error">{error}</Notice>}
            <button type="submit" disabled={status === 'busy' || (Boolean(TURNSTILE_KEY) && !captcha)} className={`${CTA} min-h-[64px] text-lg`}>
              {status === 'busy' ? <Spinner /> : 'Recevoir ma démo gratuite'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
