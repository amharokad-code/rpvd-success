// État local de l'app, indépendant du compte : région choisie + onboarding (marché + porte d'âge)
// terminé. Persisté dans le stockage sécurisé pour survivre aux redémarrages.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { REGIONS, type Region } from '../config'
import { getCopy, type Copy } from '../i18n'
import { secureGet, secureSet } from '../lib/storage'

const REGION_KEY = 'rpvd_region'
const ONBOARDED_KEY = 'rpvd_onboarded'

type AppState = {
  ready: boolean
  region: Region
  onboarded: boolean
  t: Copy
  setRegion: (region: Region) => Promise<void>
  completeOnboarding: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [region, setRegionState] = useState<Region>('qc')
  const [onboarded, setOnboarded] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const [storedRegion, storedOnboarded] = await Promise.all([secureGet(REGION_KEY), secureGet(ONBOARDED_KEY)])
      if (!active) return
      if (storedRegion && (REGIONS as readonly string[]).includes(storedRegion)) setRegionState(storedRegion as Region)
      setOnboarded(storedOnboarded === '1')
      setReady(true)
    })()
    return () => {
      active = false
    }
  }, [])

  const setRegion = useCallback(async (next: Region) => {
    setRegionState(next)
    await secureSet(REGION_KEY, next)
  }, [])

  const completeOnboarding = useCallback(async () => {
    setOnboarded(true)
    await secureSet(ONBOARDED_KEY, '1')
  }, [])

  const value = useMemo<AppState>(
    () => ({ ready, region, onboarded, t: getCopy(region), setRegion, completeOnboarding }),
    [ready, region, onboarded, setRegion, completeOnboarding],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
