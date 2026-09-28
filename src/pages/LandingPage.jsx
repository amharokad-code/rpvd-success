// Landing page pré-connexion (contrat design v3) : la seule chose qu'un visiteur non connecté —
// ou un crawler Google — voit avant l'AgeGate. Tout le contenu ici est factuel (vrais prix, vraies
// fonctionnalités, vrai exemple pédagogique) : aucune fausse preuve sociale, aucun faux compteur
// d'utilisateurs — même principe déjà appliqué au paywall (contrat éthique §0).
// Zéro dépendance ajoutée : Tailwind (déjà configuré, tokens "Pyramid Ascension") + Framer Motion
// (déjà une dépendance du projet) suffisent largement pour des animations soignées.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Logo from '../components/Logo'
import Flag from '../components/Flag'
import AgeGate from '../components/AgeGate'
import Footer from '../components/Footer'
import CookieConsentBanner from '../components/CookieConsentBanner'
import { useCopy } from '../context/RegionContext'
import { formatPlanPriceBreakdown } from '../lib/pricing'
import foundersPhoto from '../assets/founders.jpg'

const REGIONS = ['qc', 'fr', 'us', 'uk']

// ---------------------------------------------------------------------------
// Effets décoratifs partagés
// ---------------------------------------------------------------------------

// Barre de progression de lecture, fine, en haut de l'écran — repère visuel discret plutôt que
// pure décoration (contrat design v2 : jamais d'animation gratuite sans fonction).
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.2 })
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-amber-500 via-pyramid-orange to-amber-400"
      style={{ scaleX }}
    />
  )
}

// Halos flous qui dérivent lentement en fond — mêmes teintes que la marque (ambre + un vert
// émeraude déjà utilisé ailleurs sur le site pour le succès), jamais assez vif pour nuire à la
// lisibilité. Statiques si l'utilisateur préfère moins d'animation.
function AuroraBackground() {
  const reduceMotion = useReducedMotion()
  const blobs = [
    { className: 'left-[-10%] top-[-10%] h-[40rem] w-[40rem] bg-amber-500/20', dur: 26 },
    { className: 'right-[-15%] top-[10%] h-[36rem] w-[36rem] bg-emerald-500/10', dur: 32 },
    { className: 'left-[10%] bottom-[-15%] h-[34rem] w-[34rem] bg-pyramid-orange/10', dur: 28 },
  ]
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[100px] ${blob.className}`}
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1] }
          }
          transition={{ duration: blob.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// Révélation au scroll, une seule fois — évite le clignotement de contenu qui réapparaît en
// remontant, gênant pour la lecture d'une page marketing.
function Reveal({ children, delay = 0, className = '' }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-72px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Bouton "magnétique" : suit légèrement le curseur au survol (desktop uniquement — les valeurs
// restent à 0 tant qu'aucun `pointermove` n'arrive, donc inoffensif au toucher).
function Magnetic({ children, strength = 18 }) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  if (reduceMotion) return children

  function onPointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * strength)
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * strength)
  }
  function onPointerLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      transition={{ type: 'spring', stiffness: 150, damping: 12 }}
      className="inline-block"
    >
      {children}
    </motion.div>
  )
}

// Compteur qui monte jusqu'à la valeur réelle une fois visible — jamais utilisé ici pour un
// chiffre de "preuve sociale" (nombre d'utilisateurs, etc.), seulement pour des faits vérifiables
// du produit (nombre de niveaux, de marchés, de crédits offerts) — contrat honnêteté commerciale.
function CountUp({ to, suffix = '', duration = 900 }) {
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(reduceMotion ? to : 0)
  const ref = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (reduceMotion || startedRef.current) return undefined
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setValue(to)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || startedRef.current) return
        startedRef.current = true
        const start = performance.now()
        function tick(now) {
          const progress = Math.min(1, (now - start) / duration)
          setValue(Math.round(to * (1 - (1 - progress) ** 3)))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [to, duration, reduceMotion])

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Icônes (mêmes conventions que TabIcon dans App.jsx : traits, pas de remplissage)
// ---------------------------------------------------------------------------
function Icon({ path, className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  )
}

const ICONS = {
  hint: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 .9 1.1 1.6h4.8c.1-.7.5-1.15 1.1-1.6A6 6 0 0 0 12 3z" />,
  pitfall: <path d="M12 2 1 21h22L12 2zM12 9v5M12 17h.01" />,
  consigne: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  clone: <><path d="M9 9h10v10H9z" /><path d="M5 15V5h10" /></>,
  tts: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>,
  examprep: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 2v4M16 2v4M8 12l2.5 2.5L16 9" /></>,
  simulation: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v2" /></>,
  grade: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  transfer: <><path d="M17 2.1l4 4-4 4" /><path d="M3 12.7V12a4 4 0 0 1 4-4h14" /><path d="M7 21.9l-4-4 4-4" /><path d="M21 11.3V12a4 4 0 0 1-4 4H3" /></>,
  lasting: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
}

// ---------------------------------------------------------------------------
// Démo en direct — mêmes 3 niveaux que la vraie app, exemple réel (3x + 7 = 22), cycle en boucle.
// ---------------------------------------------------------------------------
function LiveDemoCard({ t }) {
  const reduceMotion = useReducedMotion()
  const levels = [
    { label: t.landing.demoLevel1, text: t.landing.demoLevel1Text },
    { label: t.landing.demoLevel2, text: t.landing.demoLevel2Text },
    { label: t.landing.demoLevel3, text: t.landing.demoLevel3Text },
  ]
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduceMotion || paused) return undefined
    const id = setInterval(() => setActive((v) => (v + 1) % levels.length), 3200)
    return () => clearInterval(id)
  }, [reduceMotion, paused, levels.length])

  return (
    <div
      className="glass relative w-full max-w-sm overflow-hidden p-6 pyramid-accent motion-safe:animate-float"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">{t.landing.demoLabel}</span>
        <span className="font-mono text-lg font-bold tabular-nums text-amber-400">{t.landing.demoProblem}</span>
      </div>

      <div className="mt-5 flex gap-1.5">
        {levels.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i === active ? 'bg-amber-400' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="mt-4 min-h-[128px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-display text-sm font-bold text-amber-400">{levels[active].label}</p>
            <p className="mt-2 leading-relaxed text-slate-200">{levels[active].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage({ market, lang, onAgeConfirm }) {
  const { t, region, setRegion } = useCopy()
  const l = t.landing

  const FEATURES = [
    ['hint', l.featureHintTitle, l.featureHintText],
    ['pitfall', l.featurePitfallTitle, l.featurePitfallText],
    ['consigne', l.featureConsigneTitle, l.featureConsigneText],
    ['clone', l.featureCloneTitle, l.featureCloneText],
    ['tts', l.featureTtsTitle, l.featureTtsText],
    ['examprep', l.featureExamTitle, l.featureExamText],
    ['simulation', l.featureSimTitle, l.featureSimText],
  ]

  const basic = formatPlanPriceBreakdown('basic', region)
  const pro = formatPlanPriceBreakdown('pro', region)

  function scrollToStart(event) {
    event.preventDefault()
    document.getElementById('start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function scrollToHow(event) {
    event.preventDefault()
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative">
      <ScrollProgressBar />
      <AuroraBackground />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-28 px-4 pb-24 pt-10 sm:gap-36 sm:px-6">
        {/* ---------------------------------------------------------------- Hero */}
        <header className="grid gap-12 pt-8 lg:grid-cols-2 lg:items-center lg:gap-8">
          <div>
            <Logo variant="icon" className="h-12 w-12 motion-safe:animate-float" />
            <p className="mt-6 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300">
              {l.eyebrow}
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] text-slate-50 sm:text-5xl">
              <span
                className="bg-[linear-gradient(90deg,#f5f5f0,#f2994a,#c98a52,#f5f5f0)] bg-[length:300%_100%] bg-clip-text text-transparent motion-safe:animate-gradient-pan"
              >
                {l.heroTitle}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-300">{l.heroSubtitle}</p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Magnetic>
                <a
                  href="#start"
                  onClick={scrollToStart}
                  className="squishy focus-ring inline-flex min-h-[56px] items-center justify-center rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 px-7 text-lg font-semibold text-slate-900 shadow-glow-amber hover:from-amber-300 hover:to-amber-400"
                >
                  {l.ctaPrimary}
                </a>
              </Magnetic>
              <a href="#how" onClick={scrollToHow} className="focus-ring squishy text-sm font-semibold text-slate-300 hover:text-slate-100">
                {l.ctaSecondary} →
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {l.badgeNoCard}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {l.badgeCredits}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {l.badgeMarkets}
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LiveDemoCard t={t} />
          </div>
        </header>

        {/* ---------------------------------------------------------------- Stats factuelles */}
        <Reveal>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              [3, lang === 'en' ? 'levels per problem' : 'niveaux par problème'],
              [4, lang === 'en' ? 'markets covered' : 'marchés couverts'],
              [2, lang === 'en' ? 'languages' : 'langues'],
              [3, lang === 'en' ? 'free credits, no card' : 'crédits gratuits, sans carte'],
            ].map(([num, label], i) => (
              <div key={i} className="text-center">
                <p className="font-display text-4xl font-extrabold text-amber-400">
                  <CountUp to={num} />
                </p>
                <p className="mt-1 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ---------------------------------------------------------------- La démarche (thèse centrale) */}
        <Reveal>
          <section className="glass relative overflow-hidden p-8 pyramid-accent sm:p-12">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(242,153,74,0.12),transparent_55%)]" />
            <div className="relative mx-auto max-w-2xl text-center">
              <p className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300">
                {l.approachEyebrow}
              </p>
              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-slate-50 sm:text-4xl">
                {l.approachTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">{l.approachBody}</p>
            </div>

            <div className="relative mt-10 grid gap-6 sm:grid-cols-3">
              {[
                ['grade', l.approachPoint1Title, l.approachPoint1Text],
                ['transfer', l.approachPoint2Title, l.approachPoint2Text],
                ['lasting', l.approachPoint3Title, l.approachPoint3Text],
              ].map(([key, title, text]) => (
                <div key={key} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                    <Icon path={ICONS[key]} />
                  </span>
                  <h3 className="font-display text-sm font-bold text-slate-50">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------------------------------------------------------- Comment ça marche */}
        <section id="how">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-slate-50 sm:text-4xl">{l.howTitle}</h2>
            <p className="mt-2 text-center text-slate-400">{l.howSubtitle}</p>
          </Reveal>

          <div className="relative mt-14 grid gap-8 sm:grid-cols-3">
            <div aria-hidden="true" className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent sm:block" />
            {[
              [l.how1Title, l.how1Text],
              [l.how2Title, l.how2Text],
              [l.how3Title, l.how3Text],
            ].map(([title, text], i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className="relative flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-black font-display text-lg font-bold text-amber-400 shadow-glow-amber">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-50">{title}</h3>
                  <p className="leading-relaxed text-slate-400">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- Fonctionnalités */}
        <section>
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-slate-50 sm:text-4xl">{l.featuresTitle}</h2>
            <p className="mt-2 text-center text-slate-400">{l.featuresSubtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([key, title, text], i) => (
              <Reveal key={key} delay={(i % 3) * 0.08}>
                <div className="glass group h-full p-6 transition-colors duration-300 hover:border-amber-400/30">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 transition-transform duration-300 group-hover:scale-110">
                    <Icon path={ICONS[key]} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-50">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- Pricing teaser */}
        <section>
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-slate-50 sm:text-4xl">{l.pricingTitle}</h2>
            <p className="mt-2 text-center text-slate-400">{l.pricingSubtitle}</p>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-2xl gap-5 sm:grid-cols-2">
            {[
              ['basic', basic, false],
              ['pro', pro, true],
            ].map(([id, price, featured]) => (
              <Reveal key={id} delay={featured ? 0.1 : 0}>
                <div className={`glass h-full p-6 ${featured ? 'border-amber-500/50 shadow-glow-amber' : ''}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl font-bold text-slate-50">{t.paywall[id]}</span>
                    <span className="font-mono text-2xl font-bold tabular-nums text-emerald-400">{price.total}</span>
                  </div>
                  <p className="font-mono text-xs font-semibold text-emerald-400/80">{t.paywall.monthlyPrice(price.monthly)}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.paywall[`${id}Desc`]}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a href="#start" onClick={scrollToStart} className="focus-ring squishy glass px-6 py-3 text-sm font-semibold text-amber-400 hover:border-amber-400/40">
              {l.pricingCta} →
            </a>
          </div>
        </section>

        {/* ---------------------------------------------------------------- Fondateurs */}
        <Reveal>
          <section className="glass grid gap-8 p-8 sm:grid-cols-[auto,1fr] sm:items-center sm:p-10">
            <img
              src={foundersPhoto}
              alt={t.settings.aboutAlt}
              className="h-40 w-40 shrink-0 rounded-2xl border border-pyramid-grey/30 object-cover sm:h-48 sm:w-48"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">{l.foundersLabel}</p>
              <h3 className="mt-2 font-display text-xl font-bold text-slate-50">{t.settings.aboutNames}</h3>
              <p className="mt-3 leading-relaxed text-slate-300">{t.settings.aboutBody}</p>
            </div>
          </section>
        </Reveal>

        {/* ---------------------------------------------------------------- CTA finale */}
        <Reveal>
          <section className="glass relative overflow-hidden p-10 text-center pyramid-accent sm:p-14">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(242,153,74,0.14),transparent_60%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">{l.finalTitle}</h2>
              <p className="mx-auto mt-3 max-w-md text-slate-300">{l.finalSubtitle}</p>
              <div className="mt-7 flex justify-center">
                <Magnetic>
                  <a
                    href="#start"
                    onClick={scrollToStart}
                    className="squishy focus-ring inline-flex min-h-[56px] items-center justify-center rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 px-8 text-lg font-semibold text-slate-900 shadow-glow-amber hover:from-amber-300 hover:to-amber-400"
                  >
                    {l.finalCta}
                  </a>
                </Magnetic>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ---------------------------------------------------------------- Sélecteur de marché + entrée (AgeGate → connexion) */}
        <section id="start" className="scroll-mt-6">
          <div className="mb-6 flex justify-center gap-2">
            {REGIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={t.settings[option]}
                aria-pressed={region === option}
                onClick={() => setRegion(option)}
                className={`focus-ring squishy flex h-9 items-center rounded-lg px-2 transition-colors duration-200 ${
                  region === option ? 'glass border-amber-400/40' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Flag region={option} className="h-4 w-6 rounded-sm" />
              </button>
            ))}
          </div>
          <AgeGate market={market} lang={lang} onConfirm={onAgeConfirm} inline />
        </section>

        <Footer />
      </div>

      <CookieConsentBanner />
    </div>
  )
}
