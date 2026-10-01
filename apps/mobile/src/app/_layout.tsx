// Racine : providers + garde d'accès. Ordre du parcours : onboarding (région + porte d'âge) →
// connexion par lien magique → app. Aucune donnée n'est collectée avant la porte d'âge.
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AnalysisStoreProvider } from '../context/AnalysisStore'
import { AppProvider, useApp } from '../context/AppContext'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { colors } from '../theme'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const app = useApp()
  const auth = useAuth()
  const ready = app.ready && !auth.loading

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  const authed = auth.session != null
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!app.onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={app.onboarded && !authed}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={app.onboarded && authed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="analysis/[id]" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Screen name="auth-callback" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <AuthProvider>
          <AnalysisStoreProvider>
            <RootNavigator />
          </AnalysisStoreProvider>
        </AuthProvider>
      </AppProvider>
    </SafeAreaProvider>
  )
}
