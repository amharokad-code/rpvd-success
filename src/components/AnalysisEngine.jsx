// AnalysisEngine — le Moteur D (contrat §3) : affichage d'une analyse en 3 niveaux, LE composant signature.
// Niveau 1 : le pattern avec ses slots génériques (italique). Niveau 2 : le MÊME texte, où les
// slots se transforment EN PLACE en pilules chiffrées (font-mono emerald, pulse amber en cascade).
// Niveau 3 : les étapes « ton ami t'explique » qui montent en cascade + la réponse finale encadrée.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCopy } from '../context/RegionContext'
import Button from './ui/Button'
import GlassCard from './ui/GlassCard'

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

export default function AnalysisEngine({ analysis, onDone, onSave, onNew }) {
  const { t } = useCopy()
  const [level, setLevel] = useState(1)
  const [done, setDone] = useState(false)
  const [firstTry, setFirstTry] = useState(false)
  const [animateValues, setAnimateValues] = useState(false)

  // Nouvelle analyse → on repart du niveau 1.
  useEffect(() => {
    setLevel(1)
    setDone(false)
    setFirstTry(false)
    setAnimateValues(false)
  }, [analysis])

  const template = analysis?.template
  const slots = Array.isArray(analysis?.slots) ? analysis.slots : []
  const steps = Array.isArray(analysis?.level_3_steps) ? analysis.level_3_steps : []
  const finalAnswer = analysis?.final_answer
  const problemType = analysis?.problem_type
  const usable = useMemo(() => isTemplateUsable(template, slots), [template, slots])
  const hasLevel3 = steps.length > 0 || Boolean(finalAnswer)

  const mode = level >= 2 ? 'value' : 'generic'
  const patternTitle = level >= 2 ? t.analysis.level2Title : t.analysis.level1Title

  function goToLevel2() {
    setAnimateValues(true)
    setLevel(2)
  }

  function goToLevel3() {
    setLevel(3)
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
      <div aria-live="polite" className="space-y-4">
        {/* Carte du pattern : niveau 1 (génériques) → niveau 2 (valeurs, transformation en place). */}
        <GlassCard className="motion-safe:animate-bop">
          {problemType && (
            <p className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span>{t.analysis.patternLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{problemType}</span>
            </p>
          )}

          <h2 key={mode} className="font-display text-xl font-bold leading-snug text-slate-50 motion-safe:animate-rise sm:text-2xl">
            {patternTitle}
          </h2>

          <div className="mt-4">
            {usable ? (
              <PatternText template={template} slots={slots} mode={mode} animateValues={animateValues} />
            ) : (
              <PlainText text={(mode === 'value' ? analysis.level_2 : analysis.level_1) ?? analysis.level_1 ?? ''} mode={mode} />
            )}
          </div>

          {firstTry && (
            <p className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2 text-base font-semibold text-slate-900 shadow-glow-coral motion-safe:animate-spring-in">
                {t.analysis.firstTry}
              </span>
            </p>
          )}
        </GlassCard>

        {/* Niveau 3 : étapes en cascade + réponse finale. */}
        {level >= 3 && (
          <GlassCard as="article" className="motion-safe:animate-rise">
            <h2 className="font-display text-xl font-bold leading-snug text-slate-50 sm:text-2xl">{t.analysis.level3Title}</h2>

            {steps.length > 0 && (
              <ol className="mt-5 space-y-5" role="list">
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

            {finalAnswer && (
              <div className="mt-6 motion-safe:animate-rise" style={{ animationDelay: `${steps.length * STEP_STAGGER_MS}ms` }}>
                <p className="text-sm font-medium text-slate-400">{t.analysis.finalAnswer}</p>
                <p className="mt-2 inline-block max-w-full rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 px-5 py-2 font-mono text-xl font-bold tabular-nums text-emerald-300">
                  {finalAnswer}
                </p>
              </div>
            )}
          </GlassCard>
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
    </section>
  )
}
