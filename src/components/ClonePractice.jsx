// Phase 1 (RPVD_FEATURES_PROMPT.md) — Générateur de clones : un bouton qui génère un exercice
// au même pattern que l'analyse affichée, pour que l'élève s'entraîne. Consomme 1 crédit par
// clone (appel Gemini) côté serveur — ce composant se contente d'afficher le résultat et de
// notifier le parent du nouveau solde.
import { useState } from 'react'
import { useCopy } from '../context/RegionContext'
import Button from './ui/Button'
import GlassCard from './ui/GlassCard'
import { ApiError, generateClone } from '../lib/api'
import SimulationMode from './SimulationMode'

export default function ClonePractice({ submissionId, region, onCreditsChange }) {
  const { t } = useCopy()
  const [clones, setClones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())

  if (!submissionId) return null

  async function handleGenerate() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await generateClone(submissionId, region)
      setClones((prev) => [...prev, data.clone])
      onCreditsChange?.(data.credits_remaining)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.analysis.cloneError)
    } finally {
      setLoading(false)
    }
  }

  function toggleReveal(number) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  const atMax = clones.length >= 10

  return (
    <GlassCard className="motion-safe:animate-rise">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={handleGenerate} loading={loading} disabled={atMax}>
          {t.analysis.cloneCta}
        </Button>
        {clones.length > 0 && <SimulationMode submissionId={submissionId} clones={clones} />}
      </div>

      {atMax && <p className="mt-3 text-sm text-slate-400">{t.analysis.cloneMax}</p>}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {clones.length > 0 && (
        <ul className="mt-4 space-y-3">
          {clones.map((clone) => (
            <li key={clone.number} className="rounded-2xl bg-slate-900/60 p-4 motion-safe:animate-rise">
              <p className="font-semibold text-slate-100">{t.analysis.cloneTitle(clone.number)}</p>
              <p className="mt-1 leading-relaxed text-slate-300">{clone.exercise}</p>
              {revealed.has(clone.number) ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-slate-400">{t.analysis.cloneSteps}</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                    {clone.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                  <p className="font-mono text-sm font-bold text-emerald-400">
                    {t.analysis.cloneAnswerLabel} {clone.correctAnswer}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleReveal(clone.number)}
                  className="squishy focus-ring mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  {t.analysis.cloneShowSolution}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
