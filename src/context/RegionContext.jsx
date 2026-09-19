// Contexte de région (QC / FR) : choisit le jeu de textes et le persiste dans localStorage.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { COPY } from '../i18n/copy'

const STORAGE_KEY = 'rpvd_region'
const DEFAULT_REGION = 'qc'
const REGIONS = Object.keys(COPY)

function safeLocalStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Lecture sûre : localStorage peut être indisponible (navigation privée, iframe).
function readStoredRegion() {
  try {
    const storage = safeLocalStorage()
    const stored = storage ? storage.getItem(STORAGE_KEY) : null
    return REGIONS.includes(stored) ? stored : DEFAULT_REGION
  } catch {
    return DEFAULT_REGION
  }
}

const RegionContext = createContext({
  t: COPY[DEFAULT_REGION],
  region: DEFAULT_REGION,
  setRegion: () => {},
})

export function RegionProvider({ children }) {
  const [region, setRegionState] = useState(readStoredRegion)

  const setRegion = useCallback((next) => {
    const value = REGIONS.includes(next) ? next : DEFAULT_REGION
    setRegionState(value)
    try {
      const storage = safeLocalStorage()
      if (storage) storage.setItem(STORAGE_KEY, value)
    } catch {
      // Stockage indisponible : la région reste valable pour la session en cours.
    }
  }, [])

  const value = useMemo(() => ({ t: COPY[region], region, setRegion }), [region, setRegion])

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

// Hook d'accès : `t` = textes de la région active.
export function useCopy() {
  return useContext(RegionContext)
}
