import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Persist the auth session in the OS keychain/keystore via expo-secure-store on
// native, instead of plaintext AsyncStorage. Supabase stores the full session
// JSON under one key; that can exceed SecureStore's practical per-value limits
// on some platforms, so native storage chunks values into small SecureStore
// entries. SecureStore is unavailable on web, so fall back to AsyncStorage there
// (Expo web is dev-only for this app).
const SECURE_STORE_CHUNK_SIZE = 1800

type SecureStoreMeta = {
  chunks: number
}

const metaKey = (key: string) => `${key}.meta`
const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`

async function readChunkMeta(key: string): Promise<SecureStoreMeta | null> {
  const raw = await SecureStore.getItemAsync(metaKey(key))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SecureStoreMeta>
    if (typeof parsed.chunks === 'number' && parsed.chunks > 0) {
      return { chunks: parsed.chunks }
    }
  } catch {
    // Ignore malformed metadata; callers will fall back to legacy locations.
  }

  return null
}

async function removeSecureChunks(key: string, chunkCount: number) {
  await Promise.all([
    SecureStore.deleteItemAsync(metaKey(key)),
    ...Array.from({ length: chunkCount }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, index))
    ),
  ])
}

async function getSecureItem(key: string): Promise<string | null> {
  const meta = await readChunkMeta(key)
  if (meta) {
    const chunks = await Promise.all(
      Array.from({ length: meta.chunks }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index))
      )
    )
    if (chunks.every((chunk): chunk is string => typeof chunk === 'string')) {
      return chunks.join('')
    }

    await removeSecureChunks(key, meta.chunks)
  }

  // Legacy direct SecureStore value from earlier app versions.
  const direct = await SecureStore.getItemAsync(key)
  if (direct) return direct

  // Migration from the previous AsyncStorage-based auth session.
  return AsyncStorage.getItem(key)
}

async function setSecureItem(key: string, value: string): Promise<void> {
  const previousMeta = await readChunkMeta(key)
  const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, 'gs')) ?? ['']

  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
  )
  await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ chunks: chunks.length }))

  // Clear legacy locations and stale chunks after a successful secure write.
  const staleChunks =
    previousMeta && previousMeta.chunks > chunks.length
      ? Array.from(
          { length: previousMeta.chunks - chunks.length },
          (_, index) => SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index))
        )
      : []

  await Promise.all([
    SecureStore.deleteItemAsync(key),
    AsyncStorage.removeItem(key),
    ...staleChunks,
  ])
}

async function removeSecureItem(key: string): Promise<void> {
  const meta = await readChunkMeta(key)
  await Promise.all([
    ...(meta ? [removeSecureChunks(key, meta.chunks)] : []),
    SecureStore.deleteItemAsync(key),
    AsyncStorage.removeItem(key),
  ])
}

const secureStorage = {
  getItem: getSecureItem,
  setItem: setSecureItem,
  removeItem: removeSecureItem,
}

const authStorage = Platform.OS === 'web' ? AsyncStorage : secureStorage

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
