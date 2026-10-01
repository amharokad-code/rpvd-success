// Onboarding : choix de la région puis porte d'âge (contrat conformité §1, même règles que la PWA).
// QC<14 / FR<15 / UK<13 : case d'autorisation parentale (déclaratif). US<13 : blocage dur (COPPA).
// La confirmation est consignée côté serveur (age-gate-confirm) par empreinte d'appareil.
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, H1, H2, Muted, Screen } from '../components/ui'
import { LegalLinks } from '../components/LegalLinks'
import { AGE_THRESHOLDS, REGIONS, type Region } from '../config'
import { useApp } from '../context/AppContext'
import { reportAgeGate } from '../lib/api'
import { trackEvent } from '../lib/track'
import { colors, radius, spacing } from '../theme'

type Step = 'market' | 'age' | 'consent' | 'blocked'

const FLAGS: Record<Region, string> = { qc: '⚜️', fr: '🇫🇷', us: '🇺🇸', uk: '🇬🇧' }

export default function Onboarding() {
  const { region, setRegion, completeOnboarding, t } = useApp()
  const o = t.onboarding
  const [step, setStep] = useState<Step>('market')
  const [parentOk, setParentOk] = useState(false)
  const threshold = AGE_THRESHOLDS[region]

  async function chooseRegion(next: Region) {
    await setRegion(next)
    trackEvent('pageview', 'age-gate', { region: next })
    setStep('age')
  }

  async function answerAge(over: boolean) {
    if (over) {
      void reportAgeGate({ market: region, ageConfirmed: true, parentAuthDeclared: false })
      trackEvent('age_gate_confirmed', 'age-gate', { region })
      await completeOnboarding()
      return
    }
    if (region === 'us') {
      void reportAgeGate({ market: region, ageConfirmed: false, parentAuthDeclared: false, blocked: true })
      setStep('blocked')
      return
    }
    setStep('consent')
  }

  async function confirmParent() {
    void reportAgeGate({ market: region, ageConfirmed: false, parentAuthDeclared: true })
    trackEvent('age_gate_confirmed', 'age-gate', { region })
    await completeOnboarding()
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityLabel="RPVD Success" />
        <H1 style={{ textAlign: 'center' }}>{o.title}</H1>
        <Muted style={{ textAlign: 'center', fontSize: 16, lineHeight: 23 }}>{o.tagline}</Muted>
      </View>

      {step === 'market' ? (
        <Card>
          <H2>{o.marketTitle}</H2>
          <Muted style={{ marginTop: 4, marginBottom: spacing.md }}>{o.marketHint}</Muted>
          <View style={{ gap: spacing.sm }}>
            {REGIONS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => void chooseRegion(item)}
                style={({ pressed }) => [styles.market, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 22 }}>{FLAGS[item]}</Text>
                <Text style={styles.marketLabel}>{o.markets[item]}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {step === 'age' ? (
        <Card>
          <Muted>{o.ageTitle}</Muted>
          <H2 style={{ marginTop: 4, marginBottom: spacing.lg }}>{o.ageQuestion(threshold)}</H2>
          <View style={{ gap: spacing.sm }}>
            <Button label={o.ageYes(threshold)} onPress={() => void answerAge(true)} />
            <Button label={o.ageNo(threshold)} onPress={() => void answerAge(false)} variant="secondary" />
          </View>
        </Card>
      ) : null}

      {step === 'consent' ? (
        <Card>
          <H2>{o.consentTitle}</H2>
          <Body style={{ marginVertical: spacing.md, color: colors.textMuted }}>{o.consentBody}</Body>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: parentOk }}
            onPress={() => setParentOk((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkBox, parentOk && { backgroundColor: colors.amber, borderColor: colors.amber }]}>
              {parentOk ? <Text style={{ color: '#0f172a', fontWeight: '800' }}>✓</Text> : null}
            </View>
            <Text style={{ color: colors.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{o.consentCheckbox}</Text>
          </Pressable>
          <Button label={o.consentButton} onPress={() => void confirmParent()} disabled={!parentOk} style={{ marginTop: spacing.lg }} />
        </Card>
      ) : null}

      {step === 'blocked' ? (
        <Card>
          <H2>{o.blockedTitle}</H2>
          <Body style={{ marginTop: spacing.md, color: colors.textMuted }}>{o.blockedBody}</Body>
          <Button label={t.common.back} onPress={() => setStep('age')} variant="secondary" style={{ marginTop: spacing.lg }} />
        </Card>
      ) : null}

      <LegalLinks
        items={[
          { page: 'privacy', label: t.account.privacy },
          { page: 'terms', label: t.account.terms },
        ]}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  logo: { width: 84, height: 84, borderRadius: 20 },
  market: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
  },
  marketLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
