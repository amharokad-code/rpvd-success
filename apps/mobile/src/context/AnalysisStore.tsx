// Garde en mémoire les analyses de la session pour que l'écran de résultat s'ouvre instantanément
// après un scan (la réponse d'analyze-homework contient déjà tout). Repli : lecture Supabase par id
// (utilisé depuis la bibliothèque).
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react'
import { fetchAnalysisById } from '../lib/api'
import type { Analysis } from '../lib/types'

type Entry = { analysis: Analysis; submissionId: string | null }
type StoreState = {
  put: (key: string, entry: Entry) => void
  get: (key: string) => Promise<Entry | null>
}

const StoreContext = createContext<StoreState | null>(null)

export function AnalysisStoreProvider({ children }: { children: ReactNode }) {
  const map = useRef(new Map<string, Entry>())

  const put = useCallback((key: string, entry: Entry) => {
    map.current.set(key, entry)
  }, [])

  const get = useCallback(async (key: string) => {
    const cached = map.current.get(key)
    if (cached) return cached
    try {
      const analysis = await fetchAnalysisById(key)
      if (!analysis) return null
      const entry = { analysis, submissionId: key }
      map.current.set(key, entry)
      return entry
    } catch {
      return null
    }
  }, [])

  const value = useMemo(() => ({ put, get }), [put, get])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAnalysisStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAnalysisStore doit être utilisé dans <AnalysisStoreProvider>')
  return ctx
}
