import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from './supabase'

export async function signInWithGoogle() {
  const redirectUri = makeRedirectUri({ scheme: 'nestmatch' })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    return { error: error ? new Error(error.message) : new Error('Failed to start Google sign-in') }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)

  if (result.type !== 'success') {
    return { error: result.type === 'cancel' ? null : new Error('Google sign-in failed') }
  }

  const url = new URL(result.url)

  // Handle PKCE code exchange
  const code = url.searchParams.get('code')
  if (code) {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    if (sessionError) {
      return { error: new Error(sessionError.message) }
    }
    return { error: null }
  }

  // Handle implicit flow tokens in fragment
  const fragmentParams = new URLSearchParams(url.hash.substring(1))
  const accessToken = fragmentParams.get('access_token')
  const refreshToken = fragmentParams.get('refresh_token')
  if (accessToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    })
    if (sessionError) {
      return { error: new Error(sessionError.message) }
    }
    return { error: null }
  }

  return { error: new Error('No authentication data received') }
}
