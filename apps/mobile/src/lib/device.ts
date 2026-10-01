// Empreinte d'appareil (contrat sécurité) : le backend exige un header `x-device-fingerprint` =
// SHA-256 hex (64 caractères) stable par appareil. Sur mobile, un UUID aléatoire conservé dans le
// Keychain/Keystore + le modèle suffisent — pas de canvas/WebGL ici. On évite volontairement la
// version de l'OS dans l'empreinte (elle change à chaque mise à jour et ferait croire à un autre
// appareil).
import * as Crypto from 'expo-crypto'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { secureGet, secureSet } from './storage'

const DEVICE_ID_KEY = 'rpvd_device_id'
let cached: string | null = null

async function getDeviceId(): Promise<string> {
  const existing = await secureGet(DEVICE_ID_KEY)
  if (existing) return existing
  const id = Crypto.randomUUID()
  await secureSet(DEVICE_ID_KEY, id)
  return id
}

export async function getDeviceFingerprint(): Promise<string> {
  if (cached) return cached
  const deviceId = await getDeviceId()
  const input = ['rpvd-mobile', Platform.OS, Device.modelName ?? '', deviceId].join('|')
  cached = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input)
  return cached
}
