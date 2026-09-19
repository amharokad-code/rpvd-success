// Modale de sauvegarde en bibliothèque (contrat §3) : question oui/non, puis matière + sujet.
import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useCopy } from '../context/RegionContext'
import { SUBJECT_KEYS } from '../i18n/copy'
import { ApiError, saveToLibrary } from '../lib/api'

function getSearch() {
  if (typeof window === 'undefined') return ''
  return window.location.search
}

// Mode démo (contrat §0) : la sauvegarde est simulée, aucun appel réseau.
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(getSearch()).has('demo')
const DEMO_SAVE_DELAY_MS = 400

const fieldClass =
  'focus-ring w-full min-h-[48px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500'

function pickSubject(suggested) {
  return SUBJECT_KEYS.includes(suggested) ? suggested : 'autre'
}

export default function LibraryModal({ open, submissionId, suggestedSubject, onClose, onSaved }) {
  const { t } = useCopy()
  const [step, setStep] = useState('ask') // 'ask' | 'form' | 'saved'
  const [subject, setSubject] = useState(() => pickSubject(suggestedSubject))
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Chaque ouverture correspond à un nouvel exercice : formulaire remis à zéro.
  useEffect(() => {
    if (open) {
      setStep('ask')
      setSubject(pickSubject(suggestedSubject))
      setTopic('')
      setBusy(false)
      setError(null)
    }
  }, [open, suggestedSubject])

  async function handleSubmit(event) {
    event.preventDefault()
    const topicName = topic.trim()
    if (!topicName || busy) return
    setBusy(true)
    setError(null)
    try {
      if (IS_DEMO) {
        await new Promise((resolve) => setTimeout(resolve, DEMO_SAVE_DELAY_MS))
      } else {
        await saveToLibrary(submissionId, subject, topicName)
      }
      setStep('saved')
      onSaved?.({ subject, topicName })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'SERVER_ERROR'
      setError(t.errors[code] ?? t.errors.SERVER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const title = step === 'saved' ? t.library.saved : t.library.modalTitle

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {step === 'ask' && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" onClick={onClose} className="w-full sm:flex-1">
            {t.library.no}
          </Button>
          <Button variant="primary" onClick={() => setStep('form')} className="w-full sm:flex-1">
            {t.library.yes}
          </Button>
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-300">{t.library.subject}</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={`${fieldClass} cursor-pointer`}
            >
              {SUBJECT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t.subjects[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-300">{t.library.topic}</span>
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={t.library.topicPlaceholder}
              maxLength={80}
              required
              autoFocus
              className={fieldClass}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="w-full sm:flex-1">
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!topic.trim() || busy} className="w-full sm:flex-1">
              {t.library.yes}
            </Button>
          </div>
        </form>
      )}

      {step === 'saved' && (
        <div className="flex flex-col items-center gap-5 text-center motion-safe:animate-spring-in">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-glow-emerald"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <p className="text-slate-300">
            <span className="font-semibold text-slate-100">{t.subjects[subject]}</span>
            <span aria-hidden="true"> · </span>
            <span>{topic.trim()}</span>
          </p>
          <Button variant="success" onClick={onClose} className="w-full sm:w-auto sm:min-w-[12rem]">
            {t.common.close}
          </Button>
        </div>
      )}
    </Modal>
  )
}
