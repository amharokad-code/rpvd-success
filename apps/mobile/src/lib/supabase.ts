// Client Supabase unique de l'app. Session persistée dans le stockage sécurisé, rafraîchie
// automatiquement tant que l'app est au premier plan (recommandation Supabase pour React Native).
import 'react-native-url-polyfill/auto'
import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config'
import { supabaseStorage } from './storage'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Pas de navigateur : les liens magiques arrivent par deep link (rpvd://), traités à la main.
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
