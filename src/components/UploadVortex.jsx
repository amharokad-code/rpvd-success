// UploadVortex — « le Vortex à devoirs » (contrat §3/§7) : zone de dépôt drag&drop +
// sélecteur de fichier + caméra mobile, avec pré-réveil (`ping`) de la Function d'analyse.
// États : idle | drag | uploading | error. Prépare le fichier via `prepareFile` puis appelle
// `onFile({ base64, mimeType, previewUrl })`. Toute la zone est utilisable au clavier.
import { useEffect, useRef, useState } from 'react'
import { useCopy } from '../context/RegionContext'
import { prepareFile } from '../utils/image'
import Button from './ui/Button'

// Classes de la zone selon l'état : sobre au repos, amber + halo radial + glow au survol/drag.
const ZONE_BASE =
  'relative flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed p-6 text-center transition-all duration-200 ease-out focus-ring'
const ZONE_IDLE =
  'cursor-pointer border-slate-600 bg-slate-800/30 hover:border-amber-500 hover:bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_70%)] hover:shadow-glow-amber'
const ZONE_DRAG =
  'cursor-copy border-amber-500 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_70%)] shadow-glow-amber motion-safe:animate-glow-pulse'
const ZONE_BUSY = 'cursor-wait border-amber-500/60 bg-slate-800/30'
const ZONE_DISABLED = 'cursor-not-allowed border-slate-700 bg-slate-800/20 opacity-60'

// Icône abstraite « photo qui entre » (pas de mascotte).
function UploadIcon({ active }) {
  return (
    <svg
      className={`h-12 w-12 transition-colors duration-200 ${active ? 'text-amber-400' : 'text-slate-400'}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect x="6" y="12" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="3" />
      <circle cx="18" cy="23" r="4" stroke="currentColor" strokeWidth="3" />
      <path d="M10 36l10-9 7 6 5-4 8 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 4v10M20 8l4-4 4 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg className="h-12 w-12 text-emerald-400" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 6h16l10 10v24a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M28 6v10h10" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 30h14M17 36h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-10 w-10 text-amber-400 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// Anti Cold-Start (contrat §6) : un seul ping fire-and-forget par montage, dès le premier
// signal d'intention (survol souris, focus clavier ou premier contact tactile) — bien avant
// le vrai upload, pour que le conteneur Netlify de `analyze-homework` soit déjà tiède.
let prewarmed = false
function prewarm() {
  if (prewarmed) return
  prewarmed = true
  fetch('/.netlify/functions/ping', { method: 'GET', keepalive: true }).catch(() => {
    // Best-effort : un échec (offline, dev sans fonctions) ne doit jamais gêner l'upload réel.
    prewarmed = false
  })
}

export default function UploadVortex({ onFile, disabled = false }) {
  const { t } = useCopy()
  const [status, setStatus] = useState('idle') // idle | drag | uploading | error
  const [errorKey, setErrorKey] = useState(null) // 'errorType' | 'errorSize'
  const [preview, setPreview] = useState(null) // { previewUrl, mimeType, name }
  const [hasCamera, setHasCamera] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const dragDepth = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    // Bouton caméra seulement sur écran tactile (pointeur grossier).
    try {
      setHasCamera(window.matchMedia('(pointer: coarse)').matches)
    } catch {
      setHasCamera(false)
    }
    return () => {
      mounted.current = false
    }
  }, [])

  const busy = status === 'uploading'
  const locked = disabled || busy

  // Vide les inputs pour que re-choisir le même fichier déclenche bien `onChange`.
  function resetInputs() {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function handleFile(file) {
    if (!file || locked) return
    setErrorKey(null)
    setStatus('uploading')
    try {
      const prepared = await prepareFile(file)
      if (!mounted.current) return
      setPreview({ previewUrl: prepared.previewUrl, mimeType: prepared.mimeType, name: file.name })
      setStatus('idle')
      onFile?.({ base64: prepared.base64, mimeType: prepared.mimeType, previewUrl: prepared.previewUrl })
    } catch (err) {
      if (!mounted.current) return
      const key = err?.message === 'errorSize' ? 'errorSize' : 'errorType'
      setErrorKey(key)
      setPreview(null)
      setStatus('error')
    } finally {
      resetInputs()
    }
  }

  function handleInputChange(event) {
    handleFile(event.target.files?.[0])
  }

  function openPicker() {
    if (locked) return
    fileInputRef.current?.click()
  }

  function openCamera() {
    if (locked) return
    cameraInputRef.current?.click()
  }

  function handleZoneKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  // Drag & drop : compteur de profondeur pour ignorer les enter/leave des enfants.
  function handleDragEnter(event) {
    event.preventDefault()
    if (locked) return
    dragDepth.current += 1
    setStatus('drag')
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = locked ? 'none' : 'copy'
  }

  function handleDragLeave(event) {
    event.preventDefault()
    if (locked) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setStatus(errorKey ? 'error' : 'idle')
  }

  function handleDrop(event) {
    event.preventDefault()
    dragDepth.current = 0
    if (locked) return
    setStatus('idle')
    handleFile(event.dataTransfer?.files?.[0])
  }

  function handleRetake() {
    setPreview(null)
    setErrorKey(null)
    setStatus('idle')
    resetInputs()
    openPicker()
  }

  // Un glisser-déposer par-dessus un aperçu réaffiche l'invite « Lâche-la ici ! ».
  const zoneState = disabled ? ZONE_DISABLED : busy ? ZONE_BUSY : status === 'drag' ? ZONE_DRAG : ZONE_IDLE
  const zoneLabel = busy ? t.upload.uploading : status === 'drag' ? t.upload.drag : t.upload.idle

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={locked ? -1 : 0}
        aria-disabled={locked || undefined}
        aria-label={zoneLabel}
        onClick={openPicker}
        onKeyDown={handleZoneKeyDown}
        onMouseEnter={prewarm}
        onFocus={prewarm}
        onTouchStart={prewarm}
        onDragEnter={(event) => {
          prewarm()
          handleDragEnter(event)
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`${ZONE_BASE} ${zoneState}`}
      >
        {busy ? (
          <>
            <Spinner />
            <p className="text-base font-medium text-slate-200">{t.upload.uploading}</p>
          </>
        ) : preview && status !== 'drag' ? (
          <>
            {preview.previewUrl ? (
              <img
                src={preview.previewUrl}
                alt={t.upload.previewAlt}
                className="max-h-64 w-auto max-w-full rounded-2xl object-contain shadow-glass motion-safe:animate-bop"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 motion-safe:animate-bop">
                <PdfIcon />
                <p className="max-w-full truncate font-mono text-sm text-slate-300">{preview.name}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <UploadIcon active={status === 'drag'} />
            <p className="text-base font-medium leading-relaxed text-slate-200 sm:text-lg">{zoneLabel}</p>
          </>
        )}
      </div>

      {/* Inputs cachés : sélecteur classique + caméra arrière sur mobile. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={locked}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={locked}
      />

      {errorKey && (
        <p role="alert" className="mt-3 rounded-2xl bg-coral/10 px-4 py-3 text-base leading-relaxed text-coral-soft">
          {t.upload[errorKey] ?? t.upload.errorType}
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.upload.hint}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {preview ? (
          <Button variant="secondary" onClick={handleRetake} disabled={locked} className="w-full sm:w-auto">
            {t.upload.retake}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={openPicker} disabled={locked} className="w-full sm:w-auto">
              {t.upload.choose}
            </Button>
            {hasCamera && (
              <Button variant="secondary" onClick={openCamera} disabled={locked} className="w-full sm:w-auto">
                {t.upload.camera}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
