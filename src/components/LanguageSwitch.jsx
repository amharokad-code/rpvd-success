// Sélecteur de langue compact (drapeau actif + chevron, les 3 autres se déroulent au clic) —
// partagé entre le tableau de bord et les écrans pré-connexion (AgeGate/login), pour que
// l'utilisateur puisse changer de langue AVANT de lire la porte d'âge ou les conditions.
import { useEffect, useRef, useState } from 'react'
import Flag from './Flag'
import { useCopy } from '../context/RegionContext'

const REGION_OPTIONS = ['qc', 'fr', 'us', 'uk']

// `className` doit fournir le positionnement (fixed/relative/absolute) — volontairement pas
// de `relative` codé en dur ici : sur Tailwind, la classe utilitaire `relative` du composant
// gagnerait toujours contre un `fixed` passé par l'appelant (même propriété CSS, ordre interne
// de Tailwind), ce qui renvoyait le sélecteur hors écran quand on voulait un positionnement fixe.
export default function LanguageSwitch({ className = 'relative self-start' }) {
  const { t, region, setRegion } = useCopy()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const others = REGION_OPTIONS.filter((option) => option !== region)

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t.settings.region}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring squishy glass flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors duration-200"
      >
        <Flag region={region} className="h-4 w-6 rounded-sm" />
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.settings.region}
          className="glass absolute right-0 top-[calc(100%+6px)] z-20 flex flex-col gap-1 p-1.5 motion-safe:animate-spring-in"
        >
          {others.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              aria-label={t.settings[option]}
              onClick={() => {
                setRegion(option)
                setOpen(false)
              }}
              className="focus-ring squishy flex h-8 w-10 items-center justify-center rounded-lg opacity-70 transition-opacity duration-150 hover:opacity-100"
            >
              <Flag region={option} className="h-4 w-6 rounded-sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
