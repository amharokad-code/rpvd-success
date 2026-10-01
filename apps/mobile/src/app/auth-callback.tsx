// Point d'arrivée du deep link `rpvd://auth-callback#…` : la session est posée par AuthContext
// (écouteur d'URL global) ; cet écran n'affiche qu'un indicateur puis redirige.
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme'

const GIVE_UP_MS = 6000

export default function AuthCallback() {
  const { session } = useAuth()
  const { onboarded } = useApp()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), GIVE_UP_MS)
    return () => clearTimeout(timer)
  }, [])

  if (session) return <Redirect href="/" />
  if (timedOut) return <Redirect href={onboarded ? '/login' : '/onboarding'} />
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.amber} />
    </View>
  )
}
