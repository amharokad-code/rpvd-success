// Achats in-app via RevenueCat — OBLIGATOIRE pour les abonnements numériques sur iOS/Android
// (Apple/Google interdisent Stripe dans l'app pour ce type de bien : rejet garanti à la review).
// Stripe reste réservé au web. Ici : aucun prix en dur (toujours ceux du store via les
// offerings), aucun lien de paiement externe. La source de vérité est le SERVEUR : après un
// achat, le webhook RevenueCat (netlify/functions/revenuecat-webhook.js) accorde le plan et les
// crédits, et l'app ne fait que rafraîchir le profil.
import { Platform } from 'react-native'
import Purchases, { type PurchasesPackage } from 'react-native-purchases'
import { PLAN_KEYWORDS, REVENUECAT_ANDROID_KEY, REVENUECAT_IOS_KEY } from '../config'

export type PlanId = 'basic' | 'pro'
export type PlanOffer = {
  plan: PlanId
  pkg: PurchasesPackage
  priceString: string
  price: number
  currencyCode: string
}

let configured = false

function apiKey(): string {
  return Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY
}

export function purchasesAvailable(): boolean {
  return apiKey().length > 0 && (Platform.OS === 'ios' || Platform.OS === 'android')
}

// `userId` = id Supabase : c'est lui que le webhook RevenueCat reçoit comme app_user_id.
export async function initPurchases(userId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false
  try {
    if (!configured) {
      Purchases.configure({ apiKey: apiKey(), appUserID: userId })
      configured = true
    } else {
      await Purchases.logIn(userId)
    }
    return true
  } catch {
    return false
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!configured) return
  try {
    await Purchases.logOut()
  } catch {
    // déjà anonyme : rien à faire
  }
}

function planOf(identifier: string): PlanId | null {
  if (PLAN_KEYWORDS.pro.test(identifier)) return 'pro'
  if (PLAN_KEYWORDS.basic.test(identifier)) return 'basic'
  return null
}

export async function loadOffers(): Promise<PlanOffer[]> {
  const offerings = await Purchases.getOfferings()
  const packages = offerings.current?.availablePackages ?? []
  const offers: PlanOffer[] = []
  for (const pkg of packages) {
    const plan = planOf(pkg.product.identifier) ?? planOf(pkg.identifier)
    if (!plan) continue
    offers.push({
      plan,
      pkg,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
    })
  }
  return offers.sort((a, b) => (a.plan === b.plan ? 0 : a.plan === 'basic' ? -1 : 1))
}

export async function purchase(pkg: PurchasesPackage): Promise<'purchased' | 'cancelled'> {
  try {
    await Purchases.purchasePackage(pkg)
    return 'purchased'
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return 'cancelled'
    throw error
  }
}

// Obligatoire côté Apple : l'utilisateur doit pouvoir restaurer ses achats.
export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases()
  return Object.keys(info.entitlements.active).length > 0 || info.activeSubscriptions.length > 0
}

export function averageMonthly(price: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(price / 3)
  } catch {
    return (price / 3).toFixed(2)
  }
}
