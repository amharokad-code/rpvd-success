// Phase 5 (RPVD_FEATURES_PROMPT.md) — Simulation chronométrée : l'élève s'entraîne sur les
// clones déjà générés (gratuit, pas de nouvel appel Gemini) avec un chrono par exercice.
import { useEffect, useState } from 'react'
import { useCopy } from '../context/RegionContext'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { ApiError, startSimulation, finishSimulation } from '../lib/api'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function SimulationMode({ submissionId, clones }) {
  const { t } = useCopy()
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)
  const [simulation, setSimulation] = useState(null) // { id, exercises }
  const [index, setIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [answer, setAnswer] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [startedAt, setStartedAt] = useState(null)
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (!open) {
      setSimulation(null)
      setIndex(0)
      setTimeRemaining(null)
      setAnswer('')
      setCorrectCount(0)
      setResults(null)
      setError(null)
    }
  }, [open])

  // Chrono par exercice : passe au suivant automatiquement à 0, ne compte jamais négatif.
  useEffect(() => {
    if (!simulation || results || timeRemaining == null) return undefined
    if (timeRemaining <= 0) {
      handleNext()
      return undefined
    }
    const timer = setTimeout(() => setTimeRemaining((t) => t - 1), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, simulation, results])

  async function handleStart() {
    if (starting) return
    setStarting(true)
    setError(null)
    try {
      const data = await startSimulation(submissionId, clones.length)
      setSimulation(data)
      setIndex(0)
      setTimeRemaining(data.exercises[0]?.timePerExercise ?? 120)
      setStartedAt(Date.now())
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.errors.SERVER_ERROR)
    } finally {
      setStarting(false)
    }
  }

  function handleNext() {
    const current = simulation?.exercises[index]
    const isCorrect =
      current && answer.trim() && current.correctAnswer && answer.trim().toLowerCase() === current.correctAnswer.trim().toLowerCase()
    const nextCorrect = correctCount + (isCorrect ? 1 : 0)
    setCorrectCount(nextCorrect)
    setAnswer('')

    if (!simulation || index + 1 >= simulation.exercises.length) {
      finishNow(nextCorrect)
      return
    }
    setIndex((i) => i + 1)
    setTimeRemaining(simulation.exercises[index + 1]?.timePerExercise ?? 120)
  }

  async function finishNow(finalCorrectCount) {
    const timeSpentSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
    try {
      const data = await finishSimulation(simulation.id, finalCorrectCount, timeSpentSeconds)
      setResults(data)
    } catch {
      // Best-effort : même si l'enregistrement échoue, on montre quand même le score local.
      setResults({
        correct_count: finalCorrectCount,
        total_count: simulation.exercises.length,
        score_percent: Math.round((finalCorrectCount / simulation.exercises.length) * 100),
      })
    }
  }

  const current = simulation?.exercises[index]

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t.analysis.simulationCta(clones.length)}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={t.analysis.simulationCta(clones.length)}>
        {error && (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        {!simulation && !results && (
          <Button variant="primary" onClick={handleStart} loading={starting} className="w-full">
            {t.analysis.simulationCta(clones.length)}
          </Button>
        )}

        {simulation && !results && current && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {index + 1} / {simulation.exercises.length}
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-amber-400">{formatTime(timeRemaining ?? 0)}</span>
            </div>
            <p className="leading-relaxed text-slate-100">{current.exercise}</p>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t.analysis.simulationAnswerPlaceholder}
              className="focus-ring rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-500"
            />
            <Button variant="secondary" onClick={handleNext}>
              {index + 1 >= simulation.exercises.length ? t.analysis.simulationFinish : t.analysis.simulationNext}
            </Button>
          </div>
        )}

        {results && (
          <div className="flex flex-col items-center gap-3 text-center">
            <h3 className="font-display text-xl font-bold text-slate-50">{t.analysis.simulationResultsTitle}</h3>
            <p className="font-mono text-3xl font-bold tabular-nums text-emerald-400">{results.score_percent}%</p>
            <p className="text-slate-300">{t.analysis.simulationScore(results.correct_count, results.total_count)}</p>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.common.back}
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
