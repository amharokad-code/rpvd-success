// Session Supabase (lien magique par courriel, sans mot de passe — même modèle que la PWA) +
// profil serveur (crédits, plan) + initialisation RevenueCat liée à l'id du compte.
import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AUTH_REDIRECT_URL } from '../config'
import { fetchProfile, savePreferences } from '../lib/api'
import { initPurchases, logoutPurchases } from '../lib/purchases'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { useApp } from './AppContext'

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  refreshProfile: () => Promise<Profile | null>
  sendLink: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Traite un deep link `rpvd://auth-callback#access_token=…&refresh_token=…` (flux implicite) ou
// `?code=…` (flux PKCE). Retourne true si le lien contenait une session.
async function consumeAuthUrl(url: string): Promise<boolean> {
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')
  if (hashIndex !== -1) {
    const params = new URLSearchParams(url.slice(hashIndex + 1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      return !error
    }
  }
  if (queryIndex !== -1) {
    const query = url.slice(queryIndex + 1).split('#')[0]
    const code = new URLSearchParams(query).get('code')
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      return !error
    }
  }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { region } = useApp()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const regionRef = useRef(region)
  regionRef.current = region

  const refreshProfile = useCallback(async () => {
    try {
      const next = await fetchProfile()
      setProfile(next)
      return next
    } catch {
      return null
    }
  }, [])

  // Session : lecture initiale puis abonnement aux changements (connexion, rafraîchissement, sortie).
  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Dès qu'un compte est connecté : profil + RevenueCat (app_user_id = id Supabase).
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      const [next] = await Promise.all([fetchProfile().catch(() => null), initPurchases(userId)])
      if (!active) return
      if (next) {
        setProfile(next)
        // Le choix de région fait à l'onboarding fait foi : on le reporte sur le compte.
        if (next.region !== regionRef.current) void savePreferences(regionRef.current).catch(() => {})
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [userId])

  // Deep links : lien magique cliqué dans le courriel.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (url) void consumeAuthUrl(url)
    }
    void Linking.getInitialURL().then(handle)
    const sub = Linking.addEventListener('url', ({ url }) => handle(url))
    return () => sub.remove()
  }, [])

  const sendLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_REDIRECT_URL, shouldCreateUser: true },
    })
    if (error) throw error
  }, [])

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await logoutPurchases()
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ loading, session, profile, refreshProfile, sendLink, verifyCode, signOut }),
    [loading, session, profile, refreshProfile, sendLink, verifyCode, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
