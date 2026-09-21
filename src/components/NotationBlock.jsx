// NotationBlock — juste au-dessus de la zone d'upload : « Y'a-t-il une notation en particulier ? »
// Interrupteur oui/non ; si oui, un champ texte (persisté au profil, contrat §3) + une photo de
// référence optionnelle (démarche/théorie d'un exemple similaire), envoyée pour CETTE analyse
// seulement — jamais stockée.
import { useRef, useState } from 'react'
import GlassCard from './ui/GlassCard'
import { prepareFile } from '../utils/image'
import { savePreferences } from '../lib/api'

const NOTATION_MAX_LENGTH = 300

export default function NotationBlock({ profile, onProfileChange, notationImage, onNotationImageChange }) {
  const [enabled, setEnabled] = useState(Boolean(profile?.preferred_notation))
  const [text, setText] = useState(() => (profile?.preferred_notation ?? '').slice(0, NOTATION_MAX_LENGTH))
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  async function persist(nextText) {
    setSaving(true)
    try {
      await savePreferences({ preferred_notation: nextText, region: profile?.region })
      onProfileChange?.({ ...(profile ?? {}), preferred_notation: nextText })
    } catch {
      // Best-effort : la notation reste utilisable pour l'analyse en cours même si la
      // sauvegarde de préférence échoue (ex. hors ligne) — on ne bloque jamais l'upload pour ça.
    } finally {
      setSaving(false)
    }
  }

  function toggle(next) {
    setEnabled(next)
    if (!next) {
      setText('')
      onNotationImageChange?.(null)
      persist('')
    }
  }

  function handleTextBlur() {
    const trimmed = text.trim().slice(0, NOTATION_MAX_LENGTH)
    if (trimmed !== (profile?.preferred_notation ?? '')) persist(trimmed)
  }

  async function handlePhoto(file) {
    if (!file) return
    try {
      const prepared = await prepareFile(file)
      onNotationImageChange?.({ base64: prepared.base64, mimeType: prepared.mimeType, previewUrl: prepared.previewUrl })
    } catch {
      // Photo de référence optionnelle : un échec de préparation ne doit jamais bloquer l'analyse.
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-base font-semibold text-slate-100">Y&rsquo;a-t-il une notation en particulier&nbsp;?</p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => toggle(!enabled)}
          className={`focus-ring squishy relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 ${
            enabled ? 'bg-amber-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-slate-950 transition-transform duration-200 ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-3 motion-safe:animate-rise">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, NOTATION_MAX_LENGTH))}
            onBlur={handleTextBlur}
            placeholder="Ex. : on écrit les fractions avec une barre, on dit « chaque bord » pour les côtés de l'équation..."
            maxLength={NOTATION_MAX_LENGTH}
            rows={3}
            className="focus-ring w-full resize-y rounded-lg border border-pyramid-grey/30 bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="squishy focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-pyramid-grey/40 bg-transparent px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              📎 Ajouter une photo d&rsquo;exemple
            </button>
            {saving && <span className="text-xs text-slate-500">Sauvegarde...</span>}
            {notationImage?.previewUrl && (
              <span className="flex items-center gap-2">
                <img src={notationImage.previewUrl} alt="Exemple de notation" className="h-10 w-10 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => onNotationImageChange?.(null)}
                  className="focus-ring text-xs font-semibold text-rose-300 hover:text-rose-200"
                >
                  Retirer
                </button>
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => handlePhoto(event.target.files?.[0])}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
    </GlassCard>
  )
}
