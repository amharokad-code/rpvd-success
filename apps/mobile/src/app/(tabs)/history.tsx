// Bibliothèque : réservée au forfait Pro (contrat pricing v3). Un compte Basic voit une
// présentation honnête de ce que Pro débloque, jamais un contenu verrouillé trompeur.
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Chip, ErrorBanner, H1, H2, Muted, Screen } from '../../components/ui'
import { useAnalysisStore } from '../../context/AnalysisStore'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { fetchLibrary } from '../../lib/api'
import { isProPlan } from '../../lib/plan'
import type { LibraryItem } from '../../lib/types'
import { colors, spacing } from '../../theme'

export default function History() {
  const router = useRouter()
  const { t } = useApp()
  const { profile } = useAuth()
  const store = useAnalysisStore()
  const pro = isProPlan(profile?.plan)
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!pro) return
      let active = true
      setError(null)
      fetchLibrary()
        .then((rows) => {
          if (active) setItems(rows)
        })
        .catch(() => {
          if (active) setError(t.errors.NETWORK)
        })
      return () => {
        active = false
      }
    }, [pro, t.errors.NETWORK]),
  )

  function open(item: LibraryItem) {
    store.put(item.id, { analysis: item.analysis, submissionId: item.id })
    router.push({ pathname: '/analysis/[id]', params: { id: item.id } })
  }

  if (!pro) {
    return (
      <Screen>
        <H1 style={{ marginBottom: spacing.lg }}>{t.history.title}</H1>
        <Card style={{ gap: spacing.md }}>
          <H2>{t.history.proTitle}</H2>
          <Body style={{ color: colors.textMuted }}>{t.history.proBody}</Body>
          <Button label={t.history.upgrade} onPress={() => router.push('/paywall')} />
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <H1 style={{ marginBottom: spacing.lg }}>{t.history.title}</H1>
      {error ? <ErrorBanner message={error} /> : null}
      {items === null && !error ? (
        <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.xl }} />
      ) : items && items.length === 0 ? (
        <Muted>{t.history.empty}</Muted>
      ) : (
        items?.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => open(item)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.title}>{item.topic_name || item.problem_type || '—'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {item.subject ? <Chip tone="amber" label={item.subject} /> : null}
                <Muted>{new Date(item.created_at).toLocaleDateString()}</Muted>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
})
