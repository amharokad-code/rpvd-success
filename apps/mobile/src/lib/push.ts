// Notifications push (opt-in explicite depuis l'écran Compte — jamais demandées au lancement).
// Le token Expo est enregistré dans la table `push_tokens` (voir supabase_mobile.sql). L'envoi
// lui-même (Expo Push API) n'est pas branché : aucune notification n'est émise tant qu'un cas
// d'usage honnête n'est pas défini — pas de fausse urgence, pas de relances agressives.
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { secureGet, secureRemove, secureSet } from './storage'
import { supabase } from './supabase'

const TOKEN_KEY = 'rpvd_push_token'

export type PushResult = 'granted' | 'denied' | 'unsupported'

export async function isPushEnabled(): Promise<boolean> {
  return (await secureGet(TOKEN_KEY)) != null
}

export async function enablePush(): Promise<PushResult> {
  if (!Device.isDevice) return 'unsupported'
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RPVD Success',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return 'denied'

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) return 'unsupported'
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

  const { error } = await supabase.from('push_tokens').upsert({ token, platform: Platform.OS }, { onConflict: 'token' })
  if (error) return 'unsupported'
  await secureSet(TOKEN_KEY, token)
  return 'granted'
}

export async function disablePush(): Promise<void> {
  const token = await secureGet(TOKEN_KEY)
  if (token) await supabase.from('push_tokens').delete().eq('token', token)
  await secureRemove(TOKEN_KEY)
}
