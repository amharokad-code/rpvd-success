// ArbreCheminement — séquence linéaire verticale ("chemin de fer") de bulles reliées,
// affichée à côté du texte de vulgarisation. Générique (aucune logique spécifique aux maths) :
// consomme un tableau [{ type: 'concept' | 'action', text, isFormula }] fourni par le parent,
// extrait du niveau 1 par Gemini (voir netlify/functions/_lib/gemini.js → `cheminement`).
//
// Synchronisation texte ↔ arbre pilotée par le PARENT via `activeStepIndex` (state machine
// partagée) — ce composant ne possède aucun IntersectionObserver ni état de lecture interne,
// pour éviter deux sources de vérité qui se désynchronisent sur scroll rapide / mobile.
import { motion } from 'framer-motion'

// concept (bleu) = mot-clé théorique vulgarisé. action (vert) = étape exécutable / formule isolée.
const STEP_STYLES = {
  concept: {
    dot: 'border-sky-500/60 bg-sky-500/15 text-sky-300',
    dotActive: 'border-sky-400 bg-sky-500/25 text-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.35)]',
  },
  action: {
    dot: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300',
    dotActive: 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
  },
}

function StepBubble({ step, index, active, onSelect }) {
  const style = STEP_STYLES[step.type] ?? STEP_STYLES.concept
  return (
    <li className="relative flex gap-4">
      {/* Ligne verticale reliant les bulles ; masquée sur la dernière étape via CSS (last:hidden sur le frère). */}
      <div className="flex flex-col items-center">
        <motion.button
          type="button"
          onClick={() => onSelect?.(index)}
          animate={{ scale: active ? 1.08 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-200 focus-ring ${
            active ? style.dotActive : style.dot
          }`}
          aria-current={active || undefined}
        >
          {index + 1}
        </motion.button>
        <div className="mt-1 w-px flex-1 bg-slate-700/70 last:hidden" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 pb-6">
        {step.isFormula ? (
          <span className="inline-block rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-1.5 font-mono text-sm text-slate-100">
            {step.text}
          </span>
        ) : (
          <p className={`text-sm leading-relaxed ${active ? 'text-slate-100' : 'text-slate-400'}`}>{step.text}</p>
        )}
      </div>
    </li>
  )
}

// `steps` : [{ type, text, isFormula }]. `activeStepIndex` : index piloté par le parent (survol/lecture
// du texte correspondant) — passer -1 ou undefined pour n'illuminer aucune bulle.
export default function ArbreCheminement({ steps, activeStepIndex, onStepSelect }) {
  if (!Array.isArray(steps) || steps.length === 0) return null

  return (
    <motion.nav
      aria-label="Cheminement"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-2xl p-5"
    >
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <StepBubble key={index} step={step} index={index} active={index === activeStepIndex} onSelect={onStepSelect} />
        ))}
      </ol>
    </motion.nav>
  )
}
