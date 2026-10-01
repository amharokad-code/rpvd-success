// Paywall : abonnements Basic / Pro via RevenueCat (achats in-app Apple/Google). Règles des
// stores respectées : prix toujours ceux du store (aucun prix en dur), aucune mention ni lien de
// paiement externe, abonnement récurrent annoncé clairement, « Restaurer mes achats » présent,
// liens Conditions + Confidentialité visibles. Même honnêteté commerciale que le web : le montant
// réel porte son « / 3 mois », jamais présenté comme un prix mensuel.
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, ErrorBanner, H1, H2, Muted, Screen } from '../components/ui'
import { LegalLinks } from '../components/LegalLinks'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { isProPlan } from '../lib/plan'
import {
  averageMonthly,
  loadOffers,
  purchase,
  purchasesAvailable,
  restore,
  type PlanId,
  type PlanOffer,
} from '../lib/purchases'
import { trackEvent } from '../lib/track'
import { colors, spacing } from '../theme'

const POLL_MS = 2000
const POLL_ATTEMPTS = 10
const MANAGE_URL =
  Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'

export default function Paywall() {
  const router = useRouter()
  const { t, region } = useApp()
  const { profile, refreshProfile } = useAuth()
  const p = t.paywall
  const [offers, setOffers] = useState<PlanOffer[] | null>(null)
  const [busy, setBusy] = useState<PlanId | 'restore' | null>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)

  useEffect(() => {
    trackEvent('pageview', 'paywall', { region })
    if (!purchasesAvailable()) {
      setOffers([])
      return
    }
    loadOffers()
      .then(setOffers)
      .catch(() => setOffers([]))
  }, [region])

  // Le webhook RevenueCat accorde le plan côté serveur : on interroge le profil jusqu'à voir le
  // changement (quelques secondes), sans jamais « créditer » localement.
  const waitForActivation = useCallback(async () => {
    const before = profile?.plan
    for (let i = 0; i < POLL_ATTEMPTS; i += 1) {
      const next = await refreshProfile()
      if (next && (next.plan !== before || isProPlan(next.plan))) return true
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
    return false
  }, [profile?.plan, refreshProfile])

  async function subscribe(offer: PlanOffer) {
    setBusy(offer.plan)
    setMessage(null)
    trackEvent('checkout_started', 'paywall', { region, plan: offer.plan })
    try {
      const outcome = await purchase(offer.pkg)
      if (outcome === 'purchased') {
        setMessage({ tone: 'ok', text: p.purchaseOk })
        await waitForActivation()
        router.back()
      }
    } catch {
      setMessage({ tone: 'error', text: p.purchaseFail })
    } finally {
      setBusy(null)
    }
  }

  async function doRestore() {
    setBusy('restore')
    setMessage(null)
    try {
      const found = await restore()
      if (found) {
        await waitForActivation()
        setMessage({ tone: 'ok', text: p.restored })
      } else {
        setMessage({ tone: 'ok', text: p.nothingToRestore })
      }
    } catch {
      setMessage({ tone: 'error', text: p.purchaseFail })
    } finally {
      setBusy(null)
    }
  }

  const plans: { id: PlanId; name: string; features: string[]; featured: boolean }[] = [
    { id: 'basic', name: p.basic, features: p.basicFeatures, featured: false },
    { id: 'pro', name: p.pro, features: p.proFeatures, featured: true },
  ]
  const currentPlan = profile?.plan

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label={t.common.close} onPress={() => router.back()} variant="ghost" style={{ minHeight: 40 }} />
      </View>
      <H1>{p.title}</H1>
      <Muted style={{ marginTop: spacing.sm, fontSize: 16 }}>{p.subtitle}</Muted>
      <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.lg, fontSize: 12 }}>{p.recurring}</Muted>

      {message ? (
        message.tone === 'error' ? (
          <ErrorBanner message={message.text} />
        ) : (
          <Card accent="emerald">
            <Body style={{ color: '#d1fae5' }}>{message.text}</Body>
          </Card>
        )
      ) : null}

      {offers === null ? <ActivityIndicator color={colors.amber} style={{ marginVertical: spacing.xl }} /> : null}
      {offers !== null && offers.length === 0 ? <ErrorBanner message={p.unavailable} /> : null}

      {plans.map((plan) => {
        const offer = offers?.find((o) => o.plan === plan.id)
        const isCurrent = currentPlan === plan.id || (plan.id === 'pro' && isProPlan(currentPlan))
        return (
          <Card key={plan.id} style={[styles.planCard, plan.featured && styles.featured]}>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <H2>{plan.name}</H2>
                {offer ? <Muted style={{ marginTop: 2 }}>{p.average(averageMonthly(offer.price, offer.currencyCode))}</Muted> : null}
              </View>
              {offer ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>{offer.priceString}</Text>
                  <Text style={styles.period}>{p.perPeriod}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 6, marginVertical: spacing.md }}>
              {plan.features.map((feature) => (
                <View key={feature} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.emerald} style={{ marginTop: 2 }} />
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 }}>{feature}</Text>
                </View>
              ))}
            </View>

            {isCurrent ? (
              <Muted style={{ color: colors.emerald }}>{p.currentPlan}</Muted>
            ) : (
              <Button
                label={p.subscribe}
                onPress={() => offer && void subscribe(offer)}
                loading={busy === plan.id}
                disabled={!offer || busy != null}
                variant={plan.featured ? 'primary' : 'secondary'}
              />
            )}
          </Card>
        )
      })}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Button label={busy === 'restore' ? p.restoring : p.restore} onPress={() => void doRestore()} variant="ghost" loading={busy === 'restore'} />
        <Button label={p.manage} onPress={() => void Linking.openURL(MANAGE_URL)} variant="ghost" />
      </View>

      <LegalLinks
        items={[
          { page: 'terms', label: p.terms },
          { page: 'privacy', label: p.privacy },
          { page: 'refunds', label: t.account.refunds },
        ]}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  planCard: { marginBottom: spacing.md },
  featured: { borderColor: 'rgba(201,138,82,0.55)' },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  price: { color: colors.emerald, fontSize: 22, fontWeight: '800' },
  period: { color: colors.emerald, fontSize: 12, fontWeight: '700' },
})
