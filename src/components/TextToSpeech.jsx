// Phase 4 (RPVD_FEATURES_PROMPT.md) — Mode vocal via la Web Speech API du navigateur, aucun
// appel Gemini. Langue pilotée par la région active (qc/fr → français, us/uk → anglais).
import { useEffect, useState } from 'react'
import { useCopy } from '../context/RegionContext'

const SPEECH_LANG = { qc: 'fr-CA', fr: 'fr-FR', us: 'en-US', uk: 'en-GB' }

export default function TextToSpeech({ text, region = 'qc' }) {
  const { t } = useCopy()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Coupe la voix si le composant disparaît (nouvel exercice, navigation) pour ne jamais laisser
  // une lecture tourner en fond sur un texte qui n'est plus affiché.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  if (!supported || !text) return null

  function handleSpeak() {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LANG[region] || SPEECH_LANG.qc
    utterance.rate = 0.9

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className="squishy focus-ring inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
      aria-pressed={isSpeaking}
    >
      <span aria-hidden="true">{isSpeaking ? '🔊' : '🔈'}</span>
      {isSpeaking ? t.analysis.ttsStop : t.analysis.ttsPlay}
    </button>
  )
}
