// Accueil : photographier (ou choisir) un devoir → analyse serveur → écran de résultat.
// Les crédits affichés sont toujours ceux du serveur ; aucune décrémentation côté app.
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Body, Button, Card, CreditBadge, ErrorBanner, FadeIn, H1, Muted, Screen } from '../../components/ui'
import { useAnalysisStore } from '../../context/AnalysisStore'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { analyzeHomework, ApiError, reverifyDevice } from '../../lib/api'
import { pickImage } from '../../lib/image'
import { trackEvent } from '../../lib/track'
import { colors, spacing } from '../../theme'

const LOADING_STEP_MS = 3200

export default function Home() {
  const router = useRouter()
  const { t, region } = useApp()
  const { profile, refreshProfile } = useAuth()
  const store = useAnalysisStore()
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<ApiError | string | null>(null)
  const [reverifying, setReverifying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const credits = profile?.credits ?? 0
  const outOfCredits = profile != null && credits <= 0

  useEffect(() => {
    trackEvent('pageview', 'home', { region })
  }, [region])

  useEffect(() => {
    if (!loading) return
    setStepIndex(0)
    timer.current = setInterval(() => setStepIndex((i) => Math.min(i + 1, t.home.loading.length - 1)), LOADING_STEP_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [loading, t.home.loading.length])

  async function scan(source: 'camera' | 'library') {
    setError(null)
    if (outOfCredits) {
      trackEvent('cta_click', 'home-no-credits', { region })
      router.push('/paywall')
      return
    }
    trackEvent('cta_click', source === 'camera' ? 'home-scan' : 'home-pick', { region })

    let picked
    try {
      picked = await pickImage(source)
    } catch {
      setError(t.errors.SERVER_ERROR)
      return
    }
    if (picked.status === 'cancelled') return
    if (picked.status === 'denied') {
      setError(t.home.permissionCamera)
      return
    }

    setLoading(true)
    try {
      const result = await analyzeHomework({ base64: picked.image.base64, mimeType: picked.image.mimeType, region })
      const key = result.submission_id ?? `tmp-${Date.now()}`
      store.put(key, { analysis: result.analysis, submissionId: result.submission_id })
      await refreshProfile()
      router.push({ pathname: '/analysis/[id]', params: { id: key } })
    } catch (e) {
      const apiError = e instanceof ApiError ? e : new ApiError('SERVER_ERROR')
      if (apiError.code === 'NO_CREDITS') {
        await refreshProfile()
        router.push('/paywall')
      } else {
        setError(apiError)
      }
    } finally {
      setLoading(false)
    }
  }

  async function reattach() {
    setReverifying(true)
    try {
      await reverifyDevice()
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('SERVER_ERROR'))
    } finally {
      setReverifying(false)
    }
  }

  const errorCode = error instanceof ApiError ? error.code : null
  const errorMessage =
    error == null ? null : typeof error === 'string' ? error : (t.errors[error.code] ?? t.errors.SERVER_ERROR)

  if (loading) {
    return (
      <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <FadeIn key={stepIndex} style={{ alignItems: 'center', gap: spacing.lg }}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Body style={{ textAlign: 'center' }}>{t.home.loading[stepIndex]}</Body>
        </FadeIn>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.header}>
        <H1>RPVD Success</H1>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {profile ? <CreditBadge credits={credits} label={outOfCredits ? t.home.noCredits : t.home.credits(credits)} /> : null}
          {profile && profile.streak_days > 0 ? (
            <View style={styles.streak}>
              <Muted style={{ color: colors.orange }}>{`🔥 ${t.home.streak(profile.streak_days)}`}</Muted>
            </View>
          ) : null}
        </View>
      </View>

      {errorMessage ? (
        <ErrorBanner
          message={errorMessage}
          action={
            errorCode === 'FINGERPRINT_REVERIFY_REQUIRED' ? (
              <Button label={t.errors.reverify} onPress={() => void reattach()} loading={reverifying} variant="secondary" />
            ) : undefined
          }
        />
      ) : null}

      <Card style={{ gap: spacing.md, paddingVertical: spacing.xl }}>
        <Body style={{ textAlign: 'center', color: colors.textMuted }}>{t.home.hint}</Body>
        <Button label={outOfCredits ? t.home.getCredits : t.home.scanCta} onPress={() => void scan('camera')} />
        {!outOfCredits ? <Button label={t.home.pickCta} onPress={() => void scan('library')} variant="secondary" /> : null}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.lg },
  streak: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
})
