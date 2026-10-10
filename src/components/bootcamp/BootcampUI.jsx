// Briques visuelles partagées par les pages du Bootcamp (/, /reserver, /merci, /rembourser) :
// fond noir du logo, orange pyramide, verre sombre, apparitions douces au défilement.
import { motion, useReducedMotion } from 'framer-motion'
import SiteNav from '../SiteNav'
import CookieConsentBanner from '../CookieConsentBanner'
import { resetConsent } from '../../utils/consent'

export const CTA =
  'squishy focus-ring inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#f5ad6b] to-[#e07b2e] px-7 font-bold text-[#0b0b0c] shadow-[0_0_40px_-8px_rgba(242,153,74,0.75)] transition hover:brightness-110 disabled:opacity-60'
export const CTA_GHOST =
  'focus-ring inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-6 font-semibold text-slate-100 transition hover:border-pyramid-orange/60 hover:text-white'
export const INPUT =
  'focus-ring min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-2 text-slate-100 transition placeholder:text-slate-600 focus:border-pyramid-orange/70'
export const CARD = 'rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur'

export function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Eyebrow({ children }) {
  return <p className="text-xs font-bold tracking-[0.3em] text-pyramid-orange/90">{children}</p>
}

export function Section({ id, eyebrow, title, intro, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-24 pt-24 ${className}`}>
      <Reveal>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-slate-400">{intro}</p>}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  )
}

// Halo orange qui respire + grille du site (déjà sur <body>) + navigation flottante.
export function PageShell({ current = 'bootcamp', children, width = 'max-w-3xl' }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative min-h-screen overflow-x-clip text-slate-200">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#f5ad6b]/25 blur-[130px]"
        animate={reduce ? undefined : { opacity: [0.45, 0.9, 0.45], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <SiteNav current={current} className="left-1/2 -translate-x-1/2" />
      <div className={`relative mx-auto ${width} px-4 pb-32 pt-24 sm:px-6`}>{children}</div>
      <CookieConsentBanner />
    </div>
  )
}

export function Notice({ tone = 'info', children }) {
  const tones = {
    info: 'border-white/10 bg-white/[0.04] text-slate-300',
    ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    warn: 'border-pyramid-orange/40 bg-pyramid-orange/10 text-orange-100',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  }
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>
}

// Jauge de places : uniquement des chiffres réels venus du serveur.
export function SeatMeter({ left, capacity }) {
  const taken = Math.max(0, Math.min(1, (capacity - left) / capacity))
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#f5ad6b] to-[#e07b2e]" style={{ width: `${Math.round(taken * 100)}%` }} />
      </div>
    </div>
  )
}

export function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
}

export function LegalLinks() {
  return (
    <p className="mt-20 flex flex-wrap justify-center gap-x-1 text-center text-xs text-slate-500">
      <a href="/" className="inline-block px-2 py-2.5 hover:underline">Bootcamp</a>
      <a href="/accueil" className="inline-block px-2 py-2.5 hover:underline">Accueil</a>
      <a href="/app" className="inline-block px-2 py-2.5 hover:underline">Analyser</a>
      <a href="/legal/terms" className="inline-block px-2 py-2.5 hover:underline">Conditions</a>
      <a href="/legal/privacy" className="inline-block px-2 py-2.5 hover:underline">Confidentialité</a>
      <a href="/legal/refunds" className="inline-block px-2 py-2.5 hover:underline">Remboursements</a>
      <a href="/legal/contact" className="inline-block px-2 py-2.5 hover:underline">Contact légal</a>
      <button type="button" onClick={resetConsent} className="inline-block px-2 py-2.5 hover:underline">Gérer mes cookies</button>
    </p>
  )
}
