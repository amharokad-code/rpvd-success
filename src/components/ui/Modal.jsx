// Modale accessible (contrat §3) : overlay flouté, carte glass en `animate-spring-in`,
// fermeture par Échap ou clic sur l'overlay, focus initial sur le premier bouton/champ,
// piège à focus léger (Tab boucle dans la modale) et retour du focus à la fermeture.
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCopy } from '../../context/RegionContext'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, labelledBy }) {
  const { t } = useCopy()
  const cardRef = useRef(null)
  const bodyRef = useRef(null)
  const generatedId = useId()
  const titleId = labelledBy ?? (title ? `${generatedId}-title` : undefined)

  // `onClose` passe par une ref : un parent qui fournit une fonction fléchée inline
  // ne doit pas relancer le focus initial à chaque rendu (ça volerait le focus en pleine saisie).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Échap, piège à focus, verrouillage du défilement, focus initial et restitution du focus.
  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Rend le reste de la page inerte : un lecteur d'écran en navigation virtuelle ne doit
    // pas pouvoir atteindre le contenu situé derrière l'overlay pendant que la modale est ouverte.
    const root = document.getElementById('root')
    if (root) root.inert = true

    // Focus sur le premier bouton/champ du contenu (pas le bouton « Fermer »).
    const firstTarget = bodyRef.current?.querySelector(FOCUSABLE) ?? cardRef.current
    firstTarget?.focus?.({ preventScroll: true })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !cardRef.current) return
      const focusables = Array.from(cardRef.current.querySelectorAll(FOCUSABLE))
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !cardRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (root) root.inert = false
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  // Clic sur l'overlay uniquement (pas sur la carte ni ses enfants).
  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) onClose?.()
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="glass relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto p-6 outline-none motion-safe:animate-spring-in sm:p-8"
      >
        {title && (
          <h2 id={titleId} className="pr-12 font-display text-2xl font-bold leading-snug text-slate-50">
            {title}
          </h2>
        )}

        <div ref={bodyRef} className={title ? 'mt-5' : ''}>
          {children}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-slate-100 focus-ring squishy"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
