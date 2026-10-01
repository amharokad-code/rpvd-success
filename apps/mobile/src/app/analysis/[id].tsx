import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AnalysisView } from '../../components/AnalysisView'
import { Body, ErrorBanner, Screen } from '../../components/ui'
import { useAnalysisStore } from '../../context/AnalysisStore'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { saveToLibrary } from '../../lib/api'
import { isProPlan } from '../../lib/plan'
import type { Analysis } from '../../lib/types'
import { colors, spacing } from '../../theme'

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { t } = useApp()
  const { profile } = useAuth()
  const store = useAnalysisStore()
  const [entry, setEntry] = useState<{ analysis: Analysis; submissionId: string | null } | null | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void store.get(id).then((found) => {
      if (active) setEntry(found)
    })
    return () => {
      active = false
    }
  }, [id, store])

  function goHome() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  async function save() {
    if (!entry?.submissionId) return
    setError(null)
    try {
      await saveToLibrary(entry.submissionId, entry.analysis.subject_guess || 'autre', entry.analysis.problem_type || '')
      setSaved(true)
    } catch {
      setError(t.errors.SERVER_ERROR)
    }
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={goHome} style={{ paddingVertical: spacing.sm, marginBottom: spacing.sm }}>
        <Text style={{ color: colors.amber, fontSize: 16 }}>{`‹ ${t.common.back}`}</Text>
      </Pressable>

      {entry === undefined ? (
        <View style={{ paddingVertical: spacing.xxl }}>
          <ActivityIndicator color={colors.amber} />
        </View>
      ) : entry === null ? (
        <Body>{t.analysis.notFound}</Body>
      ) : (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <AnalysisView
            analysis={entry.analysis}
            plan={profile?.plan}
            saved={saved}
            canSave={isProPlan(profile?.plan) && entry.submissionId != null}
            onSave={() => void save()}
            onNew={goHome}
          />
        </>
      )}
    </Screen>
  )
}
