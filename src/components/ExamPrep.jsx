// Phase 6 (RPVD_FEATURES_PROMPT.md) — Mode Veille d'Exam : les 5 patterns les plus probables
// pour un examen donné. Consomme 1 crédit (appel Gemini) côté serveur.
import { useState } from 'react'
import { useCopy } from '../context/RegionContext'
import GlassCard from './ui/GlassCard'
import Button from './ui/Button'
import { ApiError, generateExamPrep } from '../lib/api'

const FREQUENCY_DOTS = { rarely: 1, sometimes: 2, often: 3, always: 4 }

export default function ExamPrep({ region, onCreditsChange }) {
  const { t } = useCopy()
  const [examTitle, setExamTitle] = useState('')
  const [patterns, setPatterns] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAnalyze() {
    if (loading || !examTitle.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await generateExamPrep(examTitle.trim(), region)
      setPatterns(data.patterns)
      onCreditsChange?.(data.credits_remaining)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.examPrep.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard className="motion-safe:animate-bop">
      <h2 className="font-display text-xl font-bold leading-snug text-slate-50 sm:text-2xl">{t.examPrep.title}</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAnalyze()
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
          placeholder={t.examPrep.placeholder}
          className="focus-ring flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-500"
        />
        <Button type="submit" variant="primary" loading={loading} disabled={!examTitle.trim()}>
          {t.examPrep.cta}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {patterns && (
        <ul className="mt-5 space-y-3">
          {patterns.map((pattern, i) => (
            <li key={i} className="rounded-2xl bg-slate-900/60 p-4 motion-safe:animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-100">{pattern.name}</p>
                <span className="flex shrink-0 gap-1" aria-label={t.examPrep.frequency[pattern.frequency]} title={t.examPrep.frequency[pattern.frequency]}>
                  {[1, 2, 3, 4].map((dot) => (
                    <span
                      key={dot}
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${dot <= (FREQUENCY_DOTS[pattern.frequency] || 0) ? 'bg-amber-400' : 'bg-slate-700'}`}
                    />
                  ))}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{pattern.importance}</p>
              <p className="mt-2 text-xs text-slate-500">
                {t.examPrep.exampleLabel} {pattern.exampleQuestion}
              </p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
