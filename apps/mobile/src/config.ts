// Configuration publique de l'app mobile. Seules des valeurs faites pour être embarquées dans un
// binaire (URL Supabase, clé anon, clés SDK publiques RevenueCat) passent par EXPO_PUBLIC_* —
// jamais de clé secrète ici (Gemini, Stripe, service_role restent côté Netlify Functions).

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/+$/, '')
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''
export const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

export const REGIONS = ['qc', 'fr', 'us', 'uk'] as const
export type Region = (typeof REGIONS)[number]
export type Lang = 'fr' | 'en'

export function langFor(region: Region): Lang {
  return region === 'us' || region === 'uk' ? 'en' : 'fr'
}

// Mêmes seuils que la porte d'âge web (contrat conformité §1) : QC<14, FR<15, UK<13, US<13.
export const AGE_THRESHOLDS: Record<Region, number> = { qc: 14, fr: 15, uk: 13, us: 13 }

export const SCHEME = 'rpvd'
// Doit être listée dans Supabase > Authentication > URL Configuration > Redirect URLs.
export const AUTH_REDIRECT_URL = `${SCHEME}://auth-callback`

// Identifiants de produits d'abonnement créés dans App Store Connect / Play Console, puis
// rattachés à l'offering RevenueCat. La détection côté app se fait par nom (voir purchases.ts) :
// seul le serveur (webhook RevenueCat) accorde réellement le plan et les crédits.
export const PLAN_KEYWORDS = { basic: /basic/i, pro: /(^|[_:.\-])pro([_:.\-]|$)/i } as const

export function legalUrl(page: 'privacy' | 'terms' | 'cookies' | 'refunds' | 'contact'): string {
  return `${WEB_URL}/legal/${page}`
}
