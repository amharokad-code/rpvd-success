// AnalysisEngine — le Moteur D (contrat §3) : affichage d'une analyse en 3 niveaux, LE composant signature.
// Niveau 1 : le pattern avec ses slots génériques (italique). Niveau 2 : le MÊME texte, où les
// slots se transforment EN PLACE en pilules chiffrées (font-mono emerald, pulse amber en cascade).
// Niveau 3 : les étapes « ton ami t'explique » qui montent en cascade + la réponse finale encadrée.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCopy } from '../context/RegionContext'
import Button from './ui/Button'
import GlassCard from './ui/GlassCard'
import ArbreCheminement from './ArbreCheminement'
import TextToSpeech from './TextToSpeech'
import ClonePractice from './ClonePractice'
import BetaFeedback from './BetaFeedback'
import VisualLevel from './VisualLevel'
import { stripMath } from './MathText'
import { isProPlan } from '../lib/plan'
import { trackEvent } from '../utils/track'

const SLOT_PATTERN = /\{\{(\d+)\}\}/g
const VALUE_STAGGER_MS = 60
const STEP_STAGGER_MS = 120

// Découpe le template en morceaux { type: 'text', text } | { type: 'slot', index, order }.
// `order` = rang d'apparition du slot dans le texte (sert au décalage d'animation).
function parseTemplate(template) {
  const parts = []
  const regex = new RegExp(SLOT_PATTERN.source, 'g')
  let last = 0
  let order = 0
  let match
  while ((match = regex.exec(template)) !== null) {
    if (match.index > last) parts.push({ type: 'text', text: template.slice(last, match.index) })
    parts.push({ type: 'slot', index: Number(match[1]), order: order++ })
    last = match.index + match[0].length
  }
  if (last < template.length) parts.push({ type: 'text', text: template.slice(last) })
  return parts
}

// Le template est exploitable si chaque `{{i}}` pointe vers un slot existant.
function isTemplateUsable(template, slots) {
  if (typeof template !== 'string' || !Array.isArray(slots) || slots.length === 0) return false
  const parts = parseTemplate(template)
  const slotParts = parts.filter((p) => p.type === 'slot')
  return slotParts.length > 0 && slotParts.every((p) => slots[p.index] != null)
}

// Texte du pattern : mêmes mots aux deux niveaux, seuls les slots changent de forme.
// Les `key` des spans changent avec le mode pour remonter les éléments et rejouer l'animation.
function PatternText({ template, slots, mode, animateValues }) {
  const parts = useMemo(() => parseTemplate(template), [template])

  return (
    <p className="text-base leading-loose text-slate-100 sm:text-lg">
      {parts.map((part, idx) => {
        if (part.type === 'text') return <Fragment key={`text-${idx}`}>{part.text}</Fragment>
        const slot = slots[part.index]
        if (!slot) return null

        if (mode === 'generic') {
          return (
            <span key={`generic-${idx}`} className="italic text-slate-300">
              {slot.generic}
            </span>
          )
        }

        return (
          <span
            key={`value-${idx}`}
            className={`mx-0.5 inline-block rounded-full bg-slate-700/50 px-3 py-1 font-mono text-emerald-400 font-bold leading-tight tabular-nums ${
              animateValues ? 'motion-safe:animate-value-pulse' : ''
            }`}
            style={animateValues ? { animationDelay: `${part.order * VALUE_STAGGER_MS}ms` } : undefined}
          >
            {slot.value}
          </span>
        )
      })}
    </p>
  )
}

// Repli sans slots : texte simple `level_1` / `level_2`, re-monté pour une transition douce.
function PlainText({ text, mode }) {
  return (
    <p key={mode} className="text-base leading-loose text-slate-100 motion-safe:animate-rise sm:text-lg">
      {text}
    </p>
  )
}

export default function AnalysisEngine({ analysis, submissionId, region, plan, betaUserId, onDone, onSave, onNew, onCreditsChange }) {
  const { t } = useCopy()
  // Contrat pricing v3 : Basic = scan de base seulement. L'indice/pièges/consigne sont déjà
  // retirés côté serveur pour ce plan (analyze-homework.js) — `analysis?.hint` etc. sont donc
  // naturellement absents ci-dessous, sans condition supplémentaire à ajouter. Seuls le mode
  // vocal et les clones/simulation (jamais gratuits en appel Gemini) ont besoin d'un garde ici.
  const hasFullAccess = isProPlan(plan)
  const [level, setLevel] = useState(1)
  const [done, setDone] = useState(false)
  const [firstTry, setFirstTry] = useState(false)
  const [animateValues, setAnimateValues] = useState(false)
  // Phase 2 (RPVD_FEATURES_PROMPT.md) : l'indice reste caché tant que l'élève ne le demande pas.
  const [showHint, setShowHint] = useState(false)
  // État partagé texte ↔ Arbre de Cheminement : une seule source de vérité, pilotée ici,
  // jamais par un IntersectionObserver interne à ArbreCheminement (désync scroll/mobile).
  const [activeStepIndex, setActiveStepIndex] = useState(-1)

  // Nouvelle analyse → on repart du niveau 1.
  useEffect(() => {
    setLevel(1)
    setDone(false)
    setFirstTry(false)
    setAnimateValues(false)
    setActiveStepIndex(-1)
    setShowHint(false)
  }, [analysis])

  const template = analysis?.template
  const slots = Array.isArray(analysis?.slots) ? analysis.slots : []
  const steps = Array.isArray(analysis?.level_3_steps) ? analysis.level_3_steps : []
  const finalAnswer = analysis?.final_answer
  const problemType = analysis?.problem_type
  const usable = useMemo(() => isTemplateUsable(template, slots), [template, slots])
  const hasLevel3 = steps.length > 0 || Boolean(finalAnswer)

  const mode = level >= 2 ? 'value' : 'generic'
  const cheminement = Array.isArray(analysis?.cheminement) ? analysis.cheminement : []
  // MÉTHODE RPVD (Identification → Démarche → Principe) : repli silencieux sur l'ancien
  // rendu template/slots pour les analyses sauvegardées avant l'ajout de ces champs.
  const connu = Array.isArray(analysis?.connu) ? analysis.connu : []
  const cherche = analysis?.cherche
  const demarche = analysis?.demarche
  const principe = analysis?.principe
  const hasMethode = Boolean(demarche)
  // Moteur D « RPVD Visuel v2 » : 3 niveaux structurés (analyses plus anciennes : rendu historique ci-dessous).
  const niveaux = Array.isArray(analysis?.niveaux) && analysis.niveaux.length >= 3 ? analysis.niveaux : null
  const hasVisuel = Boolean(niveaux)

  function goToLevel2() {
    setAnimateValues(true)
    setLevel(2)
    if (submissionId) trackEvent('level_viewed', { props: { level: 2, mode: analysis?.mode } })
  }

  function goToLevel3() {
    setLevel(3)
    if (submissionId) trackEvent('level_viewed', { props: { level: 3, mode: analysis?.mode } })
  }

  function handleDone() {
    if (level === 1) setFirstTry(true)
    setDone(true)
    onDone?.(level)
  }

  if (!analysis) return null

  return (
    <section className="space-y-4">
      {/* Zone des niveaux annoncée aux lecteurs d'écran ; les boutons restent en dehors. */}
      <div aria-live="polite" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Carte du pattern : niveau 1 (génériques) → niveau 2 (valeurs, transformation en place). */}
        <GlassCard className="motion-safe:animate-bop">
          {problemType && (
            <p className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span>{t.analysis.patternLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{problemType}</span>
            </p>
          )}

          {hasVisuel ? (
            <>
              <h2 key={level} className="mb-3 font-display text-xl font-bold leading-snug text-slate-50 motion-safe:animate-rise sm:text-2xl">
                {t.analysis.visuelTitles?.[level - 1]}
              </h2>
              {/* Confiance : bandeau discret seulement si le moteur n'est pas sûr de lui. */}
              {(analysis.confiance === 'moyenne' || analysis.confiance === 'basse') && analysis.a_verifier && (
                <p role="note" className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm leading-relaxed text-amber-200/90">
                  <span className="font-semibold">{t.analysis.confidenceNote} : </span>
                  {analysis.a_verifier}
                </p>
              )}
              {/* « Reconnais-le » : les signaux qui annoncent ce type d'exercice. */}
              {Array.isArray(analysis.declencheurs) && analysis.declencheurs.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.analysis.recognize}</span>
                  {analysis.declencheurs.map((d, i) => (
                    <span key={i} className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-0.5 text-xs text-[#f2994a]">
                      {d}
                    </span>
                  ))}
                </div>
              )}
              <VisualLevel
                key={level}
                level={niveaux[level - 1]}
                answerLabel={t.analysis.finalAnswer}
                mode={analysis.mode}
                labels={t.analysis}
              />
              {hasFullAccess && analysis.piege && (
                <p className="mt-4 rounded-r-xl border-l-4 border-[#f2994a] bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-200">
                  <span className="font-semibold text-[#f2994a]">{t.analysis.trapLabel} : </span>
                  {analysis.piege}
                </p>
              )}
            </>
          ) : hasMethode ? (
            <>
              {/* MÉTHODE RPVD — Identification : toujours visible, aucun spoiler (juste les
                  variables/mots-clés de l'énoncé, pas la façon de les utiliser). */}
              <h2 className="font-display text-xl font-bold leading-snug text-slate-50 sm:text-2xl">{t.analysis.level1Title}</h2>
              <dl className="mt-3 flex flex-col gap-2 font-mono text-sm">
                {connu.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="shrink-0 font-semibold tracking-wide text-amber-400">{t.analysis.connuLabel} :</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {connu.map((item, i) => (
                        <span key={i} className="rounded-md border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-100">
                          {item}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {cherche && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="shrink-0 font-semibold tracking-wide text-emerald-400">{t.analysis.chercheLabel} :</dt>
                    <dd>
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        {cherche}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Démarche : dévoilée au niveau 2 — un seul paragraphe fluide, jamais de liste. */}
              {level >= 2 && demarche && (
                <div className="mt-5 border-l-2 border-amber-400/40 pl-4 motion-safe:animate-rise">
                  <h3 className="font-display text-lg font-bold leading-snug text-slate-50">{t.analysis.level2Title}</h3>
                  <p className="mt-2 text-base leading-loose text-slate-100 sm:text-lg">{demarche}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 key={mode} className="font-display text-xl font-bold leading-snug text-slate-50 motion-safe:animate-rise sm:text-2xl">
                {level >= 2 ? t.analysis.level2Title : t.analysis.level1Title}
              </h2>
              <div className="mt-4">
                {usable ? (
                  <PatternText template={template} slots={slots} mode={mode} animateValues={animateValues} />
                ) : (
                  <PlainText text={(mode === 'value' ? analysis.level_2 : analysis.level_1) ?? analysis.level_1 ?? ''} mode={mode} />
                )}
              </div>
            </>
          )}

          {hasFullAccess && analysis?.hint && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="squishy focus-ring inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                aria-expanded={showHint}
              >
                {t.analysis.hintCta}
              </button>
              {showHint && (
                <p className="mt-2 rounded-2xl bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-200 motion-safe:animate-rise">
                  {analysis.hint}
                </p>
              )}
            </div>
          )}

          {firstTry && (
            <p className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2 text-base font-semibold text-ink shadow-glow-coral motion-safe:animate-spring-in">
                {t.analysis.firstTry}
              </span>
            </p>
          )}
        </GlassCard>

        {cheminement.length > 0 && (
          <ArbreCheminement steps={cheminement} activeStepIndex={activeStepIndex} onStepSelect={setActiveStepIndex} />
        )}

        {/* Niveau 3 : étapes en cascade + réponse finale. */}
        {level >= 3 && (!hasVisuel || hasFullAccess) && (
          <GlassCard as="article" className="motion-safe:animate-rise lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!hasVisuel && <h2 className="font-display text-xl font-bold leading-snug text-slate-50 sm:text-2xl">{t.analysis.level3Title}</h2>}
              {/* Phase 4 : mode vocal — réservé au forfait Pro (contrat pricing v3). */}
              {hasFullAccess && steps.length > 0 && (
                <TextToSpeech text={steps.map((step) => stripMath(`${step.title}. ${step.text || ''}`)).join(' ')} region={region} />
              )}
            </div>

            {/* MÉTHODE RPVD — Principe : l'idée derrière la démarche, 2-3 phrases, jamais de formule. */}
            {hasMethode && principe && (
              <p className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-relaxed text-emerald-100">
                {principe}
              </p>
            )}

            {/* Exercices complexes = plus d'étapes (contrat) : scroll interne au-delà d'une
                certaine hauteur plutôt que de laisser la carte s'étirer indéfiniment. */}
            {!hasVisuel && steps.length > 0 && (
              <ol className="mt-5 max-h-[40rem] space-y-5 overflow-y-auto pr-1" role="list">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 motion-safe:animate-rise"
                    style={{ animationDelay: `${i * STEP_STAGGER_MS}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-display text-lg font-bold text-emerald-400"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-1.5">
                      <p className="font-semibold text-slate-100">{step.title}</p>
                      {step.text && <p className="mt-1 text-base leading-relaxed text-slate-300">{step.text}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {!hasVisuel && finalAnswer && (
              <div className="mt-6 motion-safe:animate-rise" style={{ animationDelay: `${steps.length * STEP_STAGGER_MS}ms` }}>
                <p className="text-sm font-medium text-slate-400">{t.analysis.finalAnswer}</p>
                <p className="mt-2 inline-block max-w-full rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 px-5 py-2 font-mono text-xl font-bold tabular-nums text-emerald-300">
                  {finalAnswer}
                </p>
              </div>
            )}

            {/* Phase 3 : piège classique + traduction de consigne — réservés au forfait Pro. */}
            {hasFullAccess && (analysis?.pitfall || analysis?.consigne_translation) && (
              <div className="mt-6 space-y-2">
                {analysis?.pitfall && !hasVisuel && (
                  <details className="rounded-2xl bg-slate-900/60 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">{t.analysis.pitfallLabel}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{analysis.pitfall}</p>
                  </details>
                )}
                {analysis?.consigne_translation && (
                  <details className="rounded-2xl bg-slate-900/60 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">{t.analysis.consigneLabel}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{analysis.consigne_translation}</p>
                  </details>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* Phase 1/5 : clones d'entraînement + simulation chronométrée — réservé au forfait Pro
            (contrat pricing v3), une fois le niveau 3 vu. */}
        {hasFullAccess && level >= 3 && submissionId && (
          <div className="lg:col-span-2">
            <ClonePractice submissionId={submissionId} region={region} onCreditsChange={onCreditsChange} />
          </div>
        )}
      </div>

      {/* Boutons selon le niveau, puis sauvegarde / nouvel exercice une fois « catché ». */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {done ? (
          <>
            {onSave && (
              <Button variant="primary" onClick={() => onSave()} className="w-full sm:w-auto">
                {t.analysis.save}
              </Button>
            )}
            {onNew && (
              <Button variant="ghost" onClick={() => onNew()} className="w-full sm:w-auto">
                {t.analysis.newProblem}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="success" onClick={handleDone} className="w-full sm:w-auto">
              {t.analysis.done}
            </Button>
            {level === 1 && (
              <Button variant="secondary" onClick={goToLevel2} className="w-full sm:w-auto">
                {t.analysis.toLevel2}
              </Button>
            )}
            {level === 2 && hasLevel3 && (
              <Button variant="secondary" onClick={goToLevel3} className="w-full sm:w-auto">
                {t.analysis.toLevel3}
              </Button>
            )}
          </>
        )}
      </div>
      {betaUserId && submissionId && <BetaFeedback userId={betaUserId} submissionId={submissionId} />}
    </section>
  )
}
