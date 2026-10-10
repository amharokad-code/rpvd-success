// Page principale (/) : le Bootcamp Gradus. Sessions du dimanche en direct depuis la base (places
// réelles), vote en cascade, fonctionnement de la semaine, politique claire. Urgence = la vraie
// (l'examen approche, la date limite du samedi, les places de la salle) ; jamais de faux
// compte à rebours ni de fausse rareté (contrat honnêteté commerciale).
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BOOTCAMP as B } from '../config/bootcamp'
import { LEVELS, OTHER_TOPIC, SUBJECT_SHOWCASE, subjectsFor, topicsFor } from '../config/curriculum'
import Logo from '../components/Logo'
import { trackEvent } from '../utils/track'
import { bootcampCall } from '../lib/bootcampApi'
import { trackAd, getAttributionLabels } from '../utils/ads'
import { CARD, CTA, CTA_GHOST, INPUT, LegalLinks, Notice, PageShell, Reveal, SeatMeter, Section, Spinner } from '../components/bootcamp/BootcampUI'

const PAINS = [
  ['Tu as « compris » en classe…', "mais devant l'examen, plus rien ne revient."],
  ['Tu connais les formules…', 'sans savoir par quoi commencer.'],
  ['Tu refais les mêmes erreurs…', "parce qu'on ne t'a jamais montré la démarche."],
]

const WEEK = [
  ['Lun → Mer', 'Tu votes', 'Ton examen, ton niveau, le sujet qui te bloque. 30 secondes.'],
  ['Jeu · 17 h', 'Sélection', 'Les 4 sujets les plus demandés au Québec sont retenus. Courriel « SÉLECTIONNÉ ».'],
  ['Ven → Sam 23 h 59', 'Tu réserves', `${B.price} tout inclus. Remboursement intégral jusqu'à samedi 23 h 59.`],
  ['Dimanche', 'Le cours', 'Ton lien du cours arrive 30 à 60 min avant. 1 h 30 en direct.'],
]

const MINUTES = [
  ['0 → 15 min', 'La démarche', 'Les 3-4 étapes logiques du chapitre, vulgarisées. Zéro théorie abstraite.'],
  ['15 → 50 min', 'Les pièges', "3-4 exercices progressifs, calqués sur les pièges types des examens du Ministère."],
  ['50 → 60 min', 'La fiche', 'Checklist des règles d’or à garder sous les yeux le jour de l’examen.'],
  ['60 → 90 min', 'Tes questions', 'Période de questions en direct dans le chat. On débloque, un par un.'],
]

const PROMISES = [
  ['↩', 'Remboursement intégral', "Sur simple demande jusqu'au samedi 23 h 59, en un clic depuis ton courriel. Aucun remboursement le dimanche, jour du cours."],
  ['🔒', 'Lien du cours', 'Envoyé par courriel 30 à 60 minutes avant le cours. Réservé aux élèves inscrits.'],
  ['👥', `${B.capacity} élèves maximum`, 'La salle est plafonnée : quand les places sont vendues, la session est complète. Pour vrai.'],
  ['🛡', 'Zéro donnée inutile', "Seulement ton courriel. Pas de nom, pas d'âge, pas de caméra : tu choisis ton pseudo et ton micro s'ouvre seulement quand on te donne la parole."],
]

const FAQ = [
  ["C'est quoi la différence avec un cours ?", "Zéro blabla, zéro théorie abstraite. On t'enseigne la démarche de résolution, étape par étape, appliquée aux exercices qui piègent le plus aux examens."],
  ['Combien ça coûte ?', `${B.price} par session de ${B.duration}, tout inclus : le montant affiché est le montant payé, rien ne s'ajoute au paiement. À titre de comparaison, le tutorat privé tourne autour de ${B.tutorAnchor} de l'heure.`],
  ['Comment je reçois le lien ?', "Par courriel, 30 à 60 minutes avant le début. Il est réservé aux élèves inscrits, donc ne le partage pas."],
  ['Et si je ne peux plus venir ?', "Remboursement intégral sur simple demande jusqu'au samedi 23 h 59 (bouton dans ton courriel de confirmation). Le dimanche, plus de remboursement."],
  ["Mon sujet n'a pas été choisi ?", "Les 4 sessions retenues restent ouvertes à tous, et ton vote compte pour la semaine suivante : revote dès lundi."],
  ['Je dois allumer ma caméra ?', "Non. Les caméras des élèves sont désactivées et ton micro est coupé : il s'ouvre seulement quand l'animateur te donne la parole. On ne te demande ni ton nom ni ton âge, tu choisis ton pseudo."],
  ['Je suis mineur(e) ?', "Dès 14 ans, tu peux voter toi-même. Moins de 14 ans : demande à un parent de remplir le vote. Le paiement est toujours fait par un adulte (parent, tuteur ou élève de 18 ans et plus)."],
  ['Pourquoi pas l’histoire ou la géo ?', "Le Bootcamp ne couvre que ce qui se décompose en démarche : maths, sciences, chimie, physique et le français vu comme un algorithme."],
]

function SessionCard({ s, index }) {
  const canBuy = (s.state === 'open' || s.state === 'last_call') && s.seats_left > 0
  const labels = {
    open: `${s.seats_left} place${s.seats_left > 1 ? 's' : ''} restante${s.seats_left > 1 ? 's' : ''}`,
    last_call: `${s.seats_left} place${s.seats_left > 1 ? 's' : ''} libérée${s.seats_left > 1 ? 's' : ''} · premier arrivé, premier servi`,
    full: 'Complet',
    paused: 'Ventes fermées · réouverture dimanche 8 h si des places se libèrent',
    closed: 'Réservations fermées',
  }
  return (
    <Reveal delay={index * 0.06}>
      <li className={`${CARD} group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-pyramid-orange/60 sm:p-6 ${canBuy ? 'cursor-pointer' : ''}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-baseline gap-2 sm:w-24 sm:flex-col sm:gap-0">
            <span className="font-display text-4xl font-bold text-pyramid-orange">{s.slot.replace(':00', ' h')}</span>
            <span className="text-xs uppercase tracking-widest text-slate-500">{s.when.split(' à ')[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {s.level} · {s.subject}
            </p>
            <p className="mt-1 font-display text-xl font-bold leading-snug text-slate-50">{s.topic}</p>
            <div className="mt-3">
              {(s.state === 'open' || s.state === 'last_call') && <SeatMeter left={s.seats_left} capacity={s.capacity} />}
              <p className={`mt-2 text-sm ${s.state === 'last_call' ? 'font-semibold text-pyramid-orange' : 'text-slate-400'}`}>{labels[s.state] || labels.closed}</p>
            </div>
          </div>
          {canBuy ? (
            <a
              href={`/reserver?s=${s.id}`}
              onClick={() => trackEvent('cta_click', { path: '/#session' })}
              className={`${CTA} shrink-0 text-lg after:absolute after:inset-0 after:content-[''] sm:min-w-[190px]`}
            >
              Réserver · {B.price}
            </a>
          ) : (
            <span className="shrink-0 rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-semibold text-slate-500 sm:min-w-[170px]">
              {s.state === 'full' ? 'Complet' : 'Fermé'}
            </span>
          )}
        </div>
      </li>
    </Reveal>
  )
}

function VoteForm() {
  const [form, setForm] = useState({ email: '', level: '', subject: '', topic: '', topic_other: '', bot_field: '', consent: false, age_ok: false })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const tick = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))
  const setLevel = (e) => setForm((f) => ({ ...f, level: e.target.value, subject: '', topic: '', topic_other: '' }))
  const setSubject = (e) => setForm((f) => ({ ...f, subject: e.target.value, topic: '', topic_other: '' }))
  const subjects = subjectsFor(form.level)
  const topics = topicsFor(form.level, form.subject)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Provenance : étiquettes de campagne seulement (src, utm_*), jamais d'identifiant publicitaire.
      await bootcampCall('submit-vote', { ...form, attribution: getAttributionLabels() })
      trackEvent('cta_click', { path: '/#vote-sent' })
      // Pixels Meta/Snap : seulement si consentement ; aucune donnée personnelle (ni courriel, ni choix).
      trackAd('Lead', { content_name: 'Vote Bootcamp Gradus' })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8">
        <p className="font-display text-2xl font-bold text-emerald-300">✓ Vote reçu</p>
        <p className="mt-2 leading-relaxed text-emerald-100/90">
          Un courriel de confirmation arrive. Jeudi à 17 h, si ton sujet fait partie des 4 plus demandés, tu reçois ta place à réserver.
        </p>
      </motion.div>
    )
  }

  const step = form.topic ? 4 : form.subject ? 3 : form.level ? 2 : 1
  return (
    <form onSubmit={submit} className={`${CARD} flex flex-col gap-4 p-5 sm:p-8`}>
      <div className="flex items-center gap-2" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${n <= step ? 'bg-pyramid-orange' : 'bg-white/10'}`} />
        ))}
      </div>
      <p hidden aria-hidden="true">
        <label>
          Ne pas remplir <input tabIndex={-1} autoComplete="off" value={form.bot_field} onChange={set('bot_field')} />
        </label>
      </p>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-slate-200">Ton courriel</span>
        <input type="email" required autoComplete="email" placeholder="toi@exemple.com" value={form.email} onChange={set('email')} className={INPUT} />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-slate-200">Ton niveau</span>
        <select required value={form.level} onChange={setLevel} className={INPUT}>
          <option value="" disabled>Choisis ton niveau</option>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </label>
      {form.level && (
        <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Ta matière</span>
          <select required value={form.subject} onChange={setSubject} className={INPUT}>
            <option value="" disabled>Choisis ta matière</option>
            {subjects.map(([name]) => <option key={name}>{name}</option>)}
          </select>
        </motion.label>
      )}
      {form.subject && (
        <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Le sujet à détruire dimanche</span>
          <select required value={form.topic} onChange={set('topic')} className={INPUT}>
            <option value="" disabled>Choisis ton sujet</option>
            {topics.map((t) => <option key={t}>{t}</option>)}
          </select>
        </motion.label>
      )}
      {form.topic === OTHER_TOPIC && (
        <motion.label initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Précise ton sujet</span>
          <input required maxLength={200} value={form.topic_other} onChange={set('topic_other')} className={INPUT} />
        </motion.label>
      )}
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300">
        <input type="checkbox" required checked={form.consent} onChange={tick('consent')} className="mt-1 h-5 w-5 shrink-0 accent-[#f2994a]" />
        <span>J'accepte de recevoir par courriel le résultat du vote et les annonces du Bootcamp Gradus. Désabonnement en un clic dans chaque courriel.</span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300">
        <input type="checkbox" required checked={form.age_ok} onChange={tick('age_ok')} className="mt-1 h-5 w-5 shrink-0 accent-[#f2994a]" />
        <span>J'ai 14 ans ou plus, ou je suis le parent / tuteur qui remplit ce formulaire pour mon enfant.</span>
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={busy} className={`${CTA} w-full`}>
        {busy ? <Spinner /> : 'Envoyer mon vote'}
      </button>
      <p className="text-center text-xs leading-relaxed text-slate-500">
        On te demande seulement ton courriel : jamais ton nom, ton âge ni ta photo. Aucune revente, jamais.{' '}
        <a href="/legal/privacy" className="text-pyramid-orange hover:underline">
          Confidentialité
        </a>
      </p>
    </form>
  )
}

export default function BootcampPage() {
  const reduce = useReducedMotion()
  const [sessions, setSessions] = useState(null)
  const [cycle, setCycle] = useState(null)

  useEffect(() => {
    document.title = "Bootcamp Gradus — la démarche, la veille de l'examen"
    const tag = document.querySelector('meta[name="description"]')
    if (tag) tag.setAttribute('content', `Bootcamp Gradus : 1 h 30 en direct en ligne, le dimanche, pour maîtriser la démarche d'un chapitre avant ton examen. Sec 1 à 5. ${B.price} tout inclus.`)
    trackEvent('pageview', { path: '/' })
    trackAd('ViewContent', { content_name: B.productName, content_type: 'product', content_ids: [B.productId] }, { replay: true })
    bootcampCall('bootcamp-public', { action: 'sessions' })
      .then((d) => {
        setSessions(d.sessions || [])
        setCycle(d.cycle || null)
      })
      .catch(() => setSessions([]))
  }, [])

  // Lien court des pubs (/vote) : on descend au formulaire une fois les sessions affichées,
  // sinon leur chargement décale la page après le défilement.
  useEffect(() => {
    if (sessions === null) return
    const wantsVote = window.location.pathname.replace(/\/+$/, '') === '/vote' || window.location.hash === '#vote'
    if (wantsVote) setTimeout(() => document.getElementById('vote')?.scrollIntoView({ behavior: 'smooth' }), 400)
  }, [sessions])

  const buyable = (sessions || []).filter((s) => (s.state === 'open' || s.state === 'last_call') && s.seats_left > 0)
  const nextSelection = cycle ? new Date(cycle.next_selection_at).toLocaleDateString('fr-CA', { timeZone: 'America/Toronto', weekday: 'long', day: 'numeric', month: 'long' }) : 'jeudi'
  const single = buyable.length === 1 ? buyable[0] : null
  const primary = single
    ? { href: `/reserver?s=${single.id}`, label: `Réserver ma place · ${B.price}` }
    : buyable.length > 0
      ? { href: '#sessions', label: `Choisir mon sujet · ${B.price}` }
      : { href: '#vote', label: 'Voter pour mon sujet' }
  // Réassurance honnête (faits réels de la politique) : levée des freins juste sous le bouton.
  const reassure = buyable.length > 0
    ? `Remboursable jusqu'à ${cycle ? cycle.sales_deadline : 'samedi 23 h 59'} · ton courriel seulement · paiement sécurisé Stripe`
    : null

  return (
    <PageShell current="bootcamp" width="max-w-4xl">
      {/* HERO */}
      <header className="pt-6 text-center">
        <div className="mb-8 flex justify-center">
          <Logo className="items-center" tagline="la marche à suivre" />
        </div>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-pyramid-orange/30 bg-pyramid-orange/10 px-4 py-1.5 text-xs font-bold tracking-[0.25em] text-pyramid-orange"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pyramid-orange opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pyramid-orange" />
          </span>
          MODE CLUTCH · BOOTCAMP GRADUS
        </motion.p>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.04] text-slate-50 sm:text-7xl"
        >
          L'examen est demain.
          <span className="mt-2 block bg-gradient-to-r from-[#f5ad6b] via-pyramid-orange to-[#e07b2e] bg-clip-text text-transparent">Il te reste une chance.</span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
        >
          {B.duration} en direct en ligne pour maîtriser la <b className="text-slate-50">démarche</b> de ton chapitre. Zéro blabla, zéro théorie abstraite : les étapes, les pièges d'examen, tes questions.
        </motion.p>

        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={primary.href} onClick={() => trackEvent('cta_click', { path: '/#hero' })} className={CTA}>
            {primary.label}
          </a>
          <a href={buyable.length > 0 ? '#vote' : '#semaine'} className={CTA_GHOST}>
            {buyable.length > 0 ? 'Voter pour la semaine prochaine' : 'Comment ça marche'}
          </a>
        </motion.div>

        {reassure && <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-400">🔒 {reassure}</p>}

        <motion.ul initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [B.duration, 'en direct'],
            [B.price, 'tout inclus'],
            ['Sec 1 à 5', 'Québec'],
            [`${B.capacity} max`, 'par salle'],
          ].map(([a, b]) => (
            <li key={a} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="font-display text-lg font-bold text-slate-50">{a}</p>
              <p className="text-xs text-slate-500">{b}</p>
            </li>
          ))}
        </motion.ul>
      </header>

      {/* SESSIONS */}
      <Section id="sessions" eyebrow="CE DIMANCHE" title="Les sessions" intro={buyable.length ? `Places vendues jusqu'à ${cycle ? cycle.sales_deadline : 'samedi 23 h 59'}. Les chiffres de places sont en temps réel.` : null}>
        {sessions === null ? (
          <div className="flex justify-center py-10 text-pyramid-orange">
            <Spinner />
          </div>
        ) : sessions.length > 0 ? (
          <ul className="space-y-3">
            {sessions.map((s, i) => (
              <SessionCard key={s.id} s={s} index={i} />
            ))}
          </ul>
        ) : (
          <Reveal>
            <div className={`${CARD} p-6 sm:p-8`}>
              <p className="font-display text-xl font-bold text-slate-50">Les 4 sujets de dimanche sont annoncés {nextSelection} à 17 h.</p>
              <p className="mt-2 text-slate-400">Ce sont les élèves qui choisissent. Vote maintenant : si ton sujet est retenu, tu reçois ta place en priorité.</p>
              <a href="#vote" className={`${CTA} mt-5`}>
                Voter pour mon sujet
              </a>
            </div>
          </Reveal>
        )}
      </Section>

      {/* DOULEUR */}
      <Section eyebrow="TU TE RECONNAIS ?" title="Ce n'est pas un manque d'intelligence.">
        <div className="grid gap-3 sm:grid-cols-3">
          {PAINS.map(([a, b], i) => (
            <Reveal key={a} delay={i * 0.08}>
              <div className={`${CARD} h-full p-5`}>
                <p className="font-semibold text-slate-50">{a}</p>
                <p className="mt-1 text-slate-400">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <p className="mt-6 text-lg text-slate-300">
            Le problème, c'est la <b className="text-pyramid-orange">démarche</b>. RPVD : <b className="text-slate-50">Résumer les Principes, Vulgariser la Démarche.</b>
          </p>
        </Reveal>
      </Section>

      {/* SEMAINE */}
      <Section id="semaine" eyebrow="LA SEMAINE GRADUS" title="Tu votes. On choisit. Tu réussis.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WEEK.map(([when, title, text], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <li className={`${CARD} relative h-full p-5`}>
                <span className="font-display text-sm font-bold text-pyramid-orange">{when}</span>
                <p className="mt-2 font-display text-xl font-bold text-slate-50">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
                <span className="absolute right-4 top-4 font-display text-4xl font-bold text-white/5">{i + 1}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* VOTE */}
      <Section id="vote" eyebrow="30 SECONDES" title="Vote & Clutch" intro={`Sélection ${nextSelection} à 17 h.`}>
        <Reveal>
          <VoteForm />
        </Reveal>
      </Section>

      {/* 90 MINUTES */}
      <Section eyebrow={`${B.duration.toUpperCase()}`} title="Ce qui se passe en direct">
        <div className="relative ml-1 border-l border-pyramid-orange/30 pl-7">
          {MINUTES.map(([t, h, d], i) => (
            <Reveal key={t} delay={i * 0.08} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[34px] top-1 h-3 w-3 rounded-full bg-pyramid-orange shadow-[0_0_16px_rgba(242,153,74,0.9)]" />
              <p className="font-mono text-sm text-pyramid-orange">{t}</p>
              <p className="font-display text-lg font-bold text-slate-50">{h}</p>
              <p className="text-sm text-slate-400">{d}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {buyable.length > 0 && (
        <Reveal>
          <div className="mt-14 rounded-3xl border border-pyramid-orange/40 bg-gradient-to-b from-pyramid-orange/10 to-transparent p-6 text-center sm:p-8">
            <p className="font-display text-2xl font-bold text-slate-50">Prêt pour l'examen ?</p>
            <p className="mt-1 text-sm text-slate-300">{B.duration} en direct, {B.price} tout inclus. Remboursable jusqu'à {cycle ? cycle.sales_deadline : 'samedi 23 h 59'}.</p>
            <a href={primary.href} onClick={() => trackEvent('cta_click', { path: '/#mid' })} className={`${CTA} mt-5 text-lg`}>
              {primary.label}
            </a>
          </div>
        </Reveal>
      )}

      {/* MATIÈRES */}
      <Section eyebrow="CE QU'ON COUVRE" title="Seulement ce qui se décompose en démarche." intro="Pas d'histoire, de géographie ni d'éthique : pas de « par cœur » ici. Des étapes, des algorithmes, des pièges.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECT_SHOWCASE.map((s, i) => (
            <Reveal key={s.name} delay={i * 0.06}>
              <div className={`${CARD} h-full p-5 transition hover:border-pyramid-orange/40`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-pyramid-orange">{s.range}</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-50">{s.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ENGAGEMENTS */}
      <Section eyebrow="CLAIR ET NET" title="Nos engagements">
        <div className="grid gap-3 sm:grid-cols-2">
          {PROMISES.map(([icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className={`${CARD} h-full p-5`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pyramid-orange/15 text-lg text-pyramid-orange">{icon}</span>
                <p className="mt-3 font-display text-lg font-bold text-slate-50">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* APRÈS */}
      <Section eyebrow="APRÈS LE COURS" title="Garde la démarche avec toi, 24/7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal>
            <a href="/app?src=bootcamp" onClick={() => trackEvent('cta_click', { path: '/#door-app' })} className="group block h-full rounded-3xl border border-pyramid-orange/40 bg-gradient-to-b from-pyramid-orange/10 to-transparent p-6 transition hover:-translate-y-1 hover:border-pyramid-orange">
              <p className="text-3xl">📸</p>
              <p className="mt-3 font-display text-xl font-bold text-slate-50">Analyser un exercice</p>
              <p className="mt-1 text-sm text-slate-400">Une photo de ton exercice, et Gradus t'explique le pattern en 3 niveaux, à n'importe quelle heure.</p>
              <p className="mt-4 text-sm font-semibold text-pyramid-orange transition group-hover:translate-x-1">Ouvrir l'outil →</p>
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <a href="/accueil" onClick={() => trackEvent('cta_click', { path: '/#door-accueil' })} className="group block h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-pyramid-orange/50">
              <p className="text-3xl">🧭</p>
              <p className="mt-3 font-display text-xl font-bold text-slate-50">La méthode RPVD</p>
              <p className="mt-1 text-sm text-slate-400">Comment on décompose un exercice, un vrai exemple en 3 niveaux et les forfaits.</p>
              <p className="mt-4 text-sm font-semibold text-pyramid-orange transition group-hover:translate-x-1">Découvrir →</p>
            </a>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="Questions fréquentes">
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <Reveal key={q}>
              <details className={`group ${CARD} rounded-2xl p-5`}>
                <summary className="cursor-pointer list-none font-semibold text-slate-50 after:float-right after:text-pyramid-orange after:content-['+'] group-open:after:content-['–']">{q}</summary>
                <p className="mt-3 leading-relaxed text-slate-400">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Section>

      <LegalLinks />

      {/* CTA collant mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/85 p-3 backdrop-blur sm:hidden">
        <a href={primary.href} onClick={() => trackEvent('cta_click', { path: '/#sticky' })} className={`${CTA} w-full`}>
          {primary.label}
        </a>
        {reassure && <p className="mt-1.5 text-center text-[11px] text-slate-400">Remboursable jusqu'au samedi 23 h 59 · courriel seulement</p>}
      </div>
    </PageShell>
  )
}
