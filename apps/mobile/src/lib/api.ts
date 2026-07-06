import { supabase } from './supabase'

/**
 * Origin of the NestMatch web API. The native app calls the same server routes
 * the web app uses (auth via Bearer token, see callWebApi). Override with
 * EXPO_PUBLIC_API_URL for local/staging testing (origin only, no trailing /api).
 */
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'https://www.nestmatch.app').replace(
  /\/+$/,
  '',
)

export interface CallWebApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
}

/**
 * Call a NestMatch web API route (`/api${path}`) authenticated with the current
 * user's Supabase access token as a Bearer header. React Native's fetch is not a
 * browser fetch, so there is no CORS preflight to worry about.
 *
 * Throws if the user isn't signed in or the response is not ok.
 */
export async function callWebApi<T = unknown>(
  path: string,
  options: CallWebApiOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('Not authenticated')
  }

  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    json = undefined
  }

  if (!res.ok) {
    const message =
      (json as { error?: string } | undefined)?.error ?? `Request failed (${res.status})`
    throw new Error(message)
  }

  return json as T
}
