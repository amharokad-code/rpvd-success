// Bibliothèque (contrat §3) : RPVD sauvegardés, filtrés et groupés par matière, relecture en modale.
import { useEffect, useMemo, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import AnalysisEngine from '../components/AnalysisEngine'
import { useCopy } from '../context/RegionContext'
import { SUBJECT_KEYS } from '../i18n/copy'
import { ApiError, fetchLibrary, removeFromLibrary } from '../lib/api'
import { DEMO_ANALYSIS } from '../fixtures/demoAnalysis'

function getSearch() {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

// Mode démo (contrat §0) : une entrée construite à partir de la fixture, aucun appel réseau.
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(getSearch()).has('demo')
const DEMO_ITEMS = [
  {
    id: 'demo-1',
    subject: DEMO_ANALYSIS.subject_guess,
    topic_name: DEMO_ANALYSIS.problem_type,
    problem_type: DEMO_ANALYSIS.problem_type,
    analysis: DEMO_ANALYSIS,
    created_at: new Date().toISOString(),
  },
]

const subjectOf = (item) => (SUBJECT_KEYS.includes(item.subject) ? item.subject : 'autre')

function errorText(t, err) {
  const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
  return t.errors[code] ?? t.errors.SERVER_ERROR
}

export default function LibraryPage() {
  const { t, region } = useCopy()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState(null) // entrée ouverte en relecture
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setLoadError(null)
    const load = IS_DEMO ? Promise.resolve(DEMO_ITEMS) : fetchLibrary()
    load
      .then((rows) => {
        if (cancelled) return
        setItems(Array.isArray(rows) ? rows : [])
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(errorText(t, err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // `t` ne sert qu'au texte d'erreur : inutile de recharger quand la région change.
  }, [attempt])

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(region === 'fr' ? 'fr-FR' : 'fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }),
    [region],
  )

  // Matières présentes (ordre du contrat) avec leur compteur, pour les pilules de filtre.
  const subjectCounts = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      const key = subjectOf(item)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return SUBJECT_KEYS.filter((key) => counts.has(key)).map((key) => ({ key, count: counts.get(key) }))
  }, [items])

  // Si la matière filtrée disparaît (après un retrait), on revient à « Toutes ».
  useEffect(() => {
    if (filter !== 'all' && !subjectCounts.some((entry) => entry.key === filter)) setFilter('all')
  }, [filter, subjectCounts])

  const groups = useMemo(() => {
    const visible = filter === 'all' ? items : items.filter((item) => subjectOf(item) === filter)
    return SUBJECT_KEYS.map((key) => ({ key, items: visible.filter((item) => subjectOf(item) === key) })).filter(
      (group) => group.items.length > 0,
    )
  }, [items, filter])

  function formatDate(value) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
  }

  function closeModal() {
    if (removing) return
    setActive(null)
    setRemoveError(null)
  }

  async function handleRemove() {
    if (!active || removing) return
    setRemoving(true)
    setRemoveError(null)
    try {
      if (!IS_DEMO) await removeFromLibrary(active.id)
      setItems((current) => current.filter((item) => item.id !== active.id))
      setActive(null)
    } catch (err) {
      setRemoveError(errorText(t, err))
    } finally {
      setRemoving(false)
    }
  }

  const filterPills = [{ key: 'all', count: items.length }, ...subjectCounts]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-slate-50 sm:text-4xl">{t.library.pageTitle}</h1>
        {status === 'ready' && items.length > 0 && (
          <span className="font-mono text-sm tabular-nums text-slate-400">{t.library.count(items.length)}</span>
        )}
      </header>

      {status === 'loading' && (
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">{t.common.loading}</span>
          {[0, 1, 2].map((index) => (
            <div key={index} className="glass h-24 animate-pulse" style={{ animationDelay: `${index * 120}ms` }} aria-hidden="true" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <GlassCard role="alert" className="flex flex-col items-center gap-5 text-center motion-safe:animate-bop">
          <p className="leading-relaxed text-slate-200">{loadError}</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            {t.common.retry}
          </Button>
        </GlassCard>
      )}

      {status === 'ready' && items.length === 0 && (
        <GlassCard className="flex flex-col items-center gap-5 py-12 text-center motion-safe:animate-bop">
          <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden="true">
            <rect x="14" y="10" width="36" height="46" rx="8" className="stroke-slate-600" strokeWidth="3" />
            <rect x="22" y="20" width="20" height="4" rx="2" className="fill-slate-600" />
            <rect x="22" y="30" width="14" height="4" rx="2" className="fill-slate-600" />
            <circle cx="44" cy="44" r="6" className="fill-emerald-500/30 stroke-emerald-400" strokeWidth="2" />
          </svg>
          <p className="max-w-sm leading-relaxed text-slate-300">{t.library.empty}</p>
        </GlassCard>
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          <div role="group" aria-label={t.library.subject} className="flex flex-wrap gap-2">
            {filterPills.map(({ key, count }) => {
              const isActive = filter === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilter(key)}
                  className={`squishy focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? 'bg-amber-500 text-slate-900 shadow-glow-amber'
                      : 'glass text-slate-300 hover:border-white/15 hover:text-slate-100'
                  }`}
                >
                  <span>{key === 'all' ? t.library.all : t.subjects[key]}</span>
                  <span className={`font-mono tabular-nums ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{count}</span>
                </button>
              )
            })}
          </div>

          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              aria-labelledby={`library-group-${group.key}`}
              className="flex flex-col gap-4 motion-safe:animate-rise"
              style={{ animationDelay: `${groupIndex * 80}ms` }}
            >
              <h2 id={`library-group-${group.key}`} className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-slate-50">{t.subjects[group.key]}</span>
                <span className="font-mono text-sm tabular-nums text-slate-400">{t.library.count(group.items.length)}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActive(item)}
                      aria-label={`${t.library.open} : ${item.topic_name ?? item.problem_type ?? ''}`}
                      className="glass squishy focus-ring flex min-h-[44px] w-full flex-col gap-2 p-5 text-left transition-colors duration-200 hover:border-white/15"
                    >
                      <span className="text-lg font-semibold leading-snug text-slate-50">{item.topic_name}</span>
                      {item.problem_type && <span className="text-sm leading-relaxed text-slate-400">{item.problem_type}</span>}
                      <span className="mt-1 font-mono text-xs tabular-nums text-slate-400">{formatDate(item.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <Modal
        open={Boolean(active)}
        onClose={closeModal}
        title={active?.topic_name || active?.problem_type || t.library.pageTitle}
      >
        {active && (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-slate-300">{t.subjects[subjectOf(active)]}</span>
              {active.problem_type && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{active.problem_type}</span>
                </>
              )}
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{formatDate(active.created_at)}</span>
            </p>

            {active.analysis ? (
              <AnalysisEngine key={active.id} analysis={active.analysis} onDone={() => {}} onSave={closeModal} onNew={closeModal} />
            ) : null}

            {removeError && (
              <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {removeError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row">
              <Button variant="ghost" onClick={handleRemove} loading={removing} className="w-full text-rose-300 sm:flex-1">
                {t.library.remove}
              </Button>
              <Button variant="secondary" onClick={closeModal} disabled={removing} className="w-full sm:flex-1">
                {t.common.close}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
