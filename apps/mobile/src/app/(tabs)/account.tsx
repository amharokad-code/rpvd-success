// Compte : infos, région, notifications (opt-in), liens légaux, déconnexion et suppression de
// compte in-app (exigée par Apple pour toute app qui permet de créer un compte).
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { LegalLinks } from '../../components/LegalLinks'
import { Body, Button, Card, Divider, ErrorBanner, H1, Muted, Screen } from '../../components/ui'
import { REGIONS, type Region } from '../../config'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { ApiError, deleteAccount, savePreferences } from '../../lib/api'
import { isProPlan } from '../../lib/plan'
import { disablePush, enablePush, isPushEnabled } from '../../lib/push'
import { colors, radius, spacing } from '../../theme'

const MANAGE_URL =
  Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Muted>{label}</Muted>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export default function Account() {
  const router = useRouter()
  const { t, region, setRegion } = useApp()
  const { profile, signOut } = useAuth()
  const a = t.account
  const [push, setPush] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pro = isProPlan(profile?.plan)

  useEffect(() => {
    void isPushEnabled().then(setPush)
  }, [])

  async function changeRegion(next: Region) {
    await setRegion(next)
    try {
      await savePreferences(next)
    } catch {
      // le choix local reste appliqué ; il sera reporté au prochain lancement
    }
  }

  async function togglePush(value: boolean) {
    setError(null)
    if (!value) {
      await disablePush()
      setPush(false)
      return
    }
    const result = await enablePush()
    if (result === 'granted') setPush(true)
    else setError(result === 'denied' ? a.notificationsDenied : t.errors.SERVER_ERROR)
  }

  function confirmDelete() {
    Alert.alert(a.deleteTitle, a.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: a.deleteConfirm,
        style: 'destructive',
        onPress: () => void doDelete(),
      },
    ])
  }

  async function doDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      await disablePush().catch(() => {})
      await signOut()
    } catch (e) {
      setError(e instanceof ApiError ? (t.errors[e.code] ?? t.errors.SERVER_ERROR) : t.errors.SERVER_ERROR)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Screen>
      <H1 style={{ marginBottom: spacing.lg }}>{a.title}</H1>
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <Row label={a.email} value={profile?.email ?? '—'} />
        <Divider />
        <Row label={a.plan} value={a.planNames[profile?.plan ?? 'free'] ?? profile?.plan ?? '—'} />
        <Divider />
        <Row label={a.credits} value={String(profile?.credits ?? 0)} />
        {!pro ? <Button label={t.history.upgrade} onPress={() => router.push('/paywall')} style={{ marginTop: spacing.lg }} /> : null}
        {profile && profile.plan !== 'free' && profile.plan !== 'trial' ? (
          <Button label={t.paywall.manage} onPress={() => void Linking.openURL(MANAGE_URL)} variant="ghost" />
        ) : null}
      </Card>

      <Card>
        <Muted style={{ marginBottom: spacing.sm }}>{a.region}</Muted>
        <View style={styles.regions}>
          {REGIONS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: item === region }}
              onPress={() => void changeRegion(item)}
              style={[styles.regionPill, item === region && styles.regionActive]}
            >
              <Text style={{ color: item === region ? '#0f172a' : colors.text, fontWeight: '600' }}>{t.onboarding.markets[item]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{a.notifications}</Body>
            <Muted style={{ marginTop: 2 }}>{a.notificationsHint}</Muted>
          </View>
          <Switch
            value={push}
            onValueChange={(v) => void togglePush(v)}
            trackColor={{ true: colors.amber, false: colors.surfaceRaised }}
            accessibilityLabel={a.notifications}
          />
        </View>
      </Card>

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Button label={a.signOut} onPress={() => void signOut()} variant="secondary" />
        <Button label={deleting ? a.deleting : a.deleteAccount} onPress={confirmDelete} variant="danger" loading={deleting} />
      </View>

      <LegalLinks
        items={[
          { page: 'privacy', label: a.privacy },
          { page: 'terms', label: a.terms },
          { page: 'refunds', label: a.refunds },
          { page: 'contact', label: a.contact },
        ]}
      />
      <Muted style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 12 }}>
        {`${a.version} ${Constants.expoConfig?.version ?? ''}`}
      </Muted>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  regions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  regionPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  regionActive: { backgroundColor: colors.amber, borderColor: colors.amber },
})
