// Landing de l'Académie RPVD (/bootcamp) — page statique indépendante (comme /legal/contact),
// sans authentification. Vote Netlify Forms, sessions pilotées par src/config/bootcamp.js,
// pont vers la PWA. Urgence = la vraie (l'examen approche) ; prix et places réels uniquement,
// jamais de faux compte à rebours ni de fausse rareté (contrat honnêteté commerciale).
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BOOTCAMP as B } from '../config/bootcamp'
import { trackEvent } from '../utils/track'
import SiteNav from '../components/SiteNav'
import { LEVELS, OTHER_TOPIC, subjectsFor, topicsFor } from '../config/curriculum'


const PAINS = [
  ['Tu as « compris » en classe…', 'mais devant l\'examen, plus rien ne revient.'],
  ['Tu connais les formules…', 'sans savoir par quoi commencer.'],
  ['Tu refais les mêmes erreurs…', 'parce qu\'on ne t\'a jamais montré la démarche.'],
]

const STEPS = [
  ['1', 'Tu votes', 'Dis-nous tes examens et le chapitre qui te bloque.'],
  ['2', 'On choisit', 'Les 4-5 sujets les plus demandés sont retenus le jeudi.'],
  ['3', 'Tu réserves', 'Un lien, un paiement sécurisé. Salle limitée à ' + B.roomCap + ' places.'],
  ['4', 'Dimanche : blitz', '2 h 15 en direct. La démarche, puis les pièges d\'examen.'],
]

const TIMELINE = [
  ['0:00', 'La démarche', '3-4 étapes logiques du chapitre. Zéro théorie.'],
  ['0:30', 'Les pièges', 'On résout les 4 exercices qui font échouer le plus.'],
  ['1:30', 'Déblocage', 'Tes questions, en direct, dans le chat.'],
  ['2:00', 'Ton arme', 'Démo : reproduire la méthode sur tous tes devoirs.'],
]

const FAQ = [
  ["C'est quoi la différence avec un cours ?", "Zéro théorie abstraite. On t'enseigne la démarche de résolution, étape par étape, appliquée aux exercices qui piègent le plus."],
  ['Combien de places ?', `La salle Zoom est plafonnée à ${B.roomCap} personnes. On vend un peu moins pour garder une marge de sécurité.`],
  ['Et si je ne comprends pas ?', "Période de questions de 30 min en direct, puis tu peux refaire la démarche sur tes propres devoirs avec l'app RPVD Success."],
  ['Remboursement ?', 'Voir la politique de remboursement : /legal/refunds.'],
  ['Je suis mineur(e) ?', 'Un parent ou tuteur doit effectuer la réservation et le paiement.'],
]

// Prochain dimanche (vraie date, aucun minuteur) — évite d'écrire une date périmée.
function nextSunday() {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7))
  return d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="mt-24">
      <Reveal>
        {eyebrow && <p className="text-xs font-bold tracking-[0.3em] text-amber-500/80">{eyebrow}</p>}
        <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">{title}</h2>
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  )
}

export default function BootcampPage() {
  const reduce = useReducedMotion()
  const [form, setForm] = useState({ email: '', level: '', subject: '', topic: '', topic_other: '', exams: '', bot_field: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  // Cascade : changer le niveau réinitialise matière et sujet ; changer la matière, le sujet.
  const setLevel = (e) => setForm((f) => ({ ...f, level: e.target.value, subject: '', topic: '', topic_other: '' }))
  const setSubject = (e) => setForm((f) => ({ ...f, subject: e.target.value, topic: '', topic_other: '' }))
  const subjects = subjectsFor(form.level)
  const topics = topicsFor(form.level, form.subject)
  const sunday = nextSunday()

  useEffect(() => {
    document.title = "Bootcamp Clutch RPVD — ta dernière chance avant l'examen"
    const tag = document.querySelector('meta[name="description"]')
    if (tag) tag.setAttribute('content', "Blitz en direct de 2 h 15 : maîtrise la démarche de résolution avant ton examen. Dès 12 $.")
    trackEvent('pageview', { path: '/bootcamp' })
  }, [])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const src = new URLSearchParams(window.location.search).get('src') || new URLSearchParams(window.location.search).get('utm_source') || ''
      const res = await fetch('/.netlify/functions/submit-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: src }),
      })
      if (!res.ok) throw new Error('SUBMIT_FAILED')
      trackEvent('cta_click', { path: '/bootcamp#vote' })
      setSent(true)
    } catch {
      setError('Envoi impossible. Réessaie dans un instant.')
    } finally {
      setBusy(false)
    }
  }

  const input =
    'focus-ring min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-slate-100 transition focus:border-amber-500/60'
  const live = B.phase === 'sales' || B.phase === 'live'
  const cta =
    'squishy focus-ring inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-7 font-bold text-slate-950 shadow-[0_0_40px_-6px_rgba(245,158,11,0.7)]'

  return (
    <div className="relative overflow-x-clip text-slate-200">
      {/* Halo d'ambiance qui respire */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-amber-500/20 blur-[120px]"
        animate={reduce ? undefined : { opacity: [0.5, 0.95, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <SiteNav current="bootcamp" className="left-1/2 -translate-x-1/2" />

      <div className="relative mx-auto max-w-2xl px-5 pb-32 pt-24">
        {/* HERO */}
        <header className="mt-6 text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold tracking-[0.25em] text-amber-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            MOMENT CLUTCH
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] text-slate-50 sm:text-6xl"
          >
            L'examen est demain.
            <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 bg-clip-text text-transparent">
              Il te reste une chance.
            </span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-300"
          >
            2 h 15 en direct pour maîtriser la <b className="text-slate-50">démarche</b> d'un chapitre au complet. Pas de théorie. Pas de jargon. Juste ce qui fait réussir.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-9 flex flex-col items-center gap-3"
          >
            <a href="#vote" onClick={() => trackEvent('cta_click', { path: '/bootcamp#hero' })} className={cta}>
              Je veux ma place pour {sunday}
            </a>
            <a href="/accueil" className="text-sm font-semibold text-slate-300 underline-offset-4 transition hover:text-amber-400 hover:underline">
              Découvrir la méthode RPVD →
            </a>
            <p className="text-sm text-slate-400">
              Dès <b className="text-amber-400">{B.earlyPrice} $</b> en réservation anticipée · {B.lastMinutePriceMin}-{B.lastMinutePriceMax} $ ensuite
            </p>
          </motion.div>
        </header>

        {/* DOULEUR */}
        <Section eyebrow="TU TE RECONNAIS ?" title="Ce n'est pas un manque d'intelligence.">
          <div className="space-y-3">
            {PAINS.map(([a, b], i) => (
              <Reveal key={a} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
                  <p className="font-semibold text-slate-50">{a}</p>
                  <p className="mt-1 text-slate-400">{b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg text-slate-300">
              Le problème, c'est la <b className="text-amber-400">démarche</b>. Et ça se corrige en une soirée.
            </p>
          </Reveal>
        </Section>

        {/* COMMENT */}
        <Section eyebrow="COMMENT ÇA MARCHE" title="4 étapes. Aucune complication.">
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 0.08}>
                <li className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="font-display text-3xl font-bold text-amber-500">{n}</span>
                  <p className="mt-1 font-semibold text-slate-50">{t}</p>
                  <p className="mt-1 text-sm text-slate-400">{d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* TIMELINE */}
        <Section eyebrow="135 MINUTES" title="Ce qui se passe en direct">
          <div className="relative border-l border-amber-500/30 pl-6">
            {TIMELINE.map(([t, h, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.9)]" />
                <p className="font-mono text-sm text-amber-400">{t}</p>
                <p className="font-semibold text-slate-50">{h}</p>
                <p className="text-sm text-slate-400">{d}</p>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* SESSIONS */}
        <Section eyebrow="CETTE SEMAINE" title="Les sessions">
          <div id="sessions" />
          {live && B.sessions.length > 0 ? (
            <ul className="space-y-3">
              {B.sessions.map((s, i) => (
                <Reveal key={s.title + s.time} delay={i * 0.07}>
                  <li className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <div>
                      <p className="font-semibold text-slate-50">{s.title}</p>
                      <p className="text-sm text-slate-400">{s.level} · {s.time}</p>
                    </div>
                    {s.url ? (
                      <a href={s.url} onClick={() => trackEvent('checkout_started', { path: '/bootcamp', plan: 'bootcamp' })} className={cta + ' !min-h-[44px] !px-5'}>
                        Réserver
                      </a>
                    ) : (
                      <span className="text-sm text-slate-500">Bientôt</span>
                    )}
                  </li>
                </Reveal>
              ))}
            </ul>
          ) : (
            <Reveal>
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-300">
                Les chapitres sont choisis selon les votes (jeudi matin). <b className="text-amber-400">Vote juste en dessous</b> : ton chapitre peut devenir la session de dimanche.
              </p>
            </Reveal>
          )}
        </Section>

        {/* VOTE */}
        <Section eyebrow="30 SECONDES" title="Vote & Clutch">
          <div id="vote" />
          <Reveal>
            {sent ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
                <p className="font-display text-xl font-bold text-emerald-300">✓ Vote reçu</p>
                <p className="mt-2 text-emerald-200">Un courriel de confirmation arrive. Jeudi, si ton sujet est retenu, tu reçois le lien de réservation en priorité.</p>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur sm:p-7">
            <p hidden aria-hidden="true"><label>Ne pas remplir <input tabIndex={-1} autoComplete="off" value={form.bot_field} onChange={set('bot_field')} /></label></p>
            <label className="flex flex-col gap-2 text-sm"><span className="font-semibold">Courriel</span>
              <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={input} /></label>
            <label className="flex flex-col gap-2 text-sm"><span className="font-semibold">Ton niveau</span>
              <select required value={form.level} onChange={setLevel} className={input}>
                <option value="" disabled>Choisis ton niveau</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            {form.level && (
              <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm"><span className="font-semibold">Ta matière</span>
                <select required value={form.subject} onChange={setSubject} className={input}>
                  <option value="" disabled>Choisis ta matière</option>{subjects.map(([name]) => <option key={name}>{name}</option>)}</select></motion.label>
            )}
            {form.subject && (
              <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm"><span className="font-semibold">Le sujet à détruire</span>
                <select required value={form.topic} onChange={set('topic')} className={input}>
                  <option value="" disabled>Choisis ton sujet</option>{topics.map((t) => <option key={t}>{t}</option>)}</select></motion.label>
            )}
            {form.topic === OTHER_TOPIC && (
              <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm"><span className="font-semibold">Précise ton sujet</span>
                <input required value={form.topic_other} onChange={set('topic_other')} className={input} /></motion.label>
            )}
            <label className="flex flex-col gap-2 text-sm"><span className="font-semibold">Tes examens cette semaine <span className="font-normal text-slate-500">(optionnel)</span></span>
              <input value={form.exams} onChange={set('exams')} className={input} /></label>
            {error && <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
            <button type="submit" disabled={busy} className={cta + ' w-full disabled:opacity-60'}>{busy ? '…' : 'Envoyer mon vote'}</button>
            <p className="text-center text-xs text-slate-500">Ton courriel sert uniquement à t'avertir des sessions. Aucune revente.</p>
          </form>
            )}
          </Reveal>
        </Section>

        {/* PREMIUM */}
        <Section eyebrow="POUR LES EXAMENS QUI COMPTENT" title="Pack Premium">
          <Reveal>
            <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent p-6">
              <p className="font-display text-2xl font-bold text-slate-50">{B.premiumPriceMin}-{B.premiumPriceMax} $ <span className="text-base font-normal text-slate-400">· micro-groupe de 4-5</span></p>
              <ul className="mt-4 space-y-2 text-slate-300">
                <li>✓ Marathon intensif sur un domaine complet</li>
                <li>✓ App RPVD Success incluse</li>
                <li>✓ Coaching 1-on-1 de 5-15 min avant tes examens</li>
                <li>✓ Garantie « Démarche maîtrisée » : reprise individuelle gratuite si une démarche n'est pas assimilée</li>
              </ul>
              <a
                href={B.premiumUrl || 'mailto:support@rpvdsuccess.app?subject=Pack%20Premium%20RPVD'}
                onClick={() => trackEvent('cta_click', { path: '/bootcamp#premium' })}
                className={cta + ' mt-6'}
              >
                {B.premiumUrl ? 'Réserver un appel' : 'Demander une place'}
              </a>
            </div>
          </Reveal>
        </Section>

        {/* DEUX PORTES */}
        <Section eyebrow="ET APRÈS ?" title="Deux façons d'aller plus loin">
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal>
              <a href="/accueil" onClick={() => trackEvent('cta_click', { path: '/bootcamp#door-accueil' })} className="group block h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-amber-500/50">
                <p className="text-3xl">🧭</p>
                <p className="mt-3 font-display text-xl font-bold text-slate-50">Accueil</p>
                <p className="mt-1 text-sm text-slate-400">Comprends la méthode RPVD, vois un vrai exemple en 3 niveaux et les tarifs.</p>
                <p className="mt-4 text-sm font-semibold text-amber-400 transition group-hover:translate-x-1">Découvrir →</p>
              </a>
            </Reveal>
            <Reveal delay={0.1}>
              <a href="/app?src=bootcamp" onClick={() => trackEvent('cta_click', { path: '/bootcamp#door-app' })} className="group block h-full rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent p-6 transition hover:-translate-y-1 hover:border-amber-400">
                <p className="text-3xl">📸</p>
                <p className="mt-3 font-display text-xl font-bold text-slate-50">Application</p>
                <p className="mt-1 text-sm text-slate-400">Une photo de ton exercice, le pattern expliqué en 3 niveaux. 24/7.</p>
                <p className="mt-4 text-sm font-semibold text-amber-400 transition group-hover:translate-x-1">Ouvrir l'app →</p>
              </a>
            </Reveal>
          </div>
        </Section>

        {/* FAQ */}
        <Section eyebrow="FAQ" title="Questions fréquentes">
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <Reveal key={q}>
                <details className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <summary className="cursor-pointer list-none font-semibold text-slate-50 after:float-right after:text-amber-500 after:content-['+'] group-open:after:content-['–']">{q}</summary>
                  <p className="mt-3 text-slate-400">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Section>

        <p className="mt-20 text-center text-xs text-slate-500">
          <a href="/accueil" className="hover:underline">Accueil</a> · <a href="/app" className="hover:underline">Application</a> · <a href="/legal/terms" className="hover:underline">Conditions</a> · <a href="/legal/privacy" className="hover:underline">Confidentialité</a> · <a href="/legal/refunds" className="hover:underline">Remboursements</a>
        </p>
      </div>

      {/* CTA collant mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/80 p-3 backdrop-blur sm:hidden">
        <a href="#vote" onClick={() => trackEvent('cta_click', { path: '/bootcamp#sticky' })} className={cta + ' w-full'}>
          Voter pour mon chapitre
        </a>
      </div>
    </div>
  )
}
