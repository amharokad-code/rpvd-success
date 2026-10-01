// Stockage chiffré par le Keychain iOS / Keystore Android (expo-secure-store). Les tokens de
// session ne vont JAMAIS dans AsyncStorage (contrat : plan technique §1).
// Une session Supabase sérialisée dépasse souvent la limite d'environ 2 Ko par valeur de
// SecureStore : on découpe donc en morceaux (`clé.0`, `clé.1`, …) + un compteur `clé.n`.
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 1800

export async function secureGet(key: string): Promise<string | null> {
  try {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`)
    if (countRaw == null) return SecureStore.getItemAsync(key)
    const count = Number(countRaw)
    const parts: string[] = []
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`)
      if (part == null) return null
      parts.push(part)
    }
    return parts.join('')
  } catch {
    return null
  }
}

export async function secureRemove(key: string): Promise<void> {
  try {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`)
    const count = countRaw == null ? 0 : Number(countRaw)
    for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(`${key}.${i}`)
    await SecureStore.deleteItemAsync(`${key}.n`)
    await SecureStore.deleteItemAsync(key)
  } catch {
    // best-effort
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  await secureRemove(key)
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE))
  for (let i = 0; i < chunks.length; i += 1) await SecureStore.setItemAsync(`${key}.${i}`, chunks[i])
  await SecureStore.setItemAsync(`${key}.n`, String(chunks.length))
}

// Adaptateur attendu par supabase-js (`auth.storage`).
export const supabaseStorage = {
  getItem: (key: string) => secureGet(key),
  setItem: (key: string, value: string) => secureSet(key, value),
  removeItem: (key: string) => secureRemove(key),
}
