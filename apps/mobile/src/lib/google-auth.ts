import * as AuthSession from 'expo-auth-session'
import { supabase } from './supabase'

const GOOGLE_CLIENT_ID = '193808460097-qsn1f0g64mshdatco53suov5nhppbosl.apps.googleusercontent.com'

// Use Supabase's OAuth flow via the browser
export async function signInWithGoogle() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'nestmatch' })

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

  // Open the OAuth URL in the browser
  const result = await AuthSession.startAsync({
    authUrl: data.url,
    returnUrl: redirectUri,
  })

  if (result.type === 'success' && result.params?.access_token) {
    // Exchange the tokens with Supabase
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.params.access_token,
      refresh_token: result.params.refresh_token,
    })

    if (sessionError) {
      return { error: new Error(sessionError.message) }
    }

    return { error: null }
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null } // User cancelled, not an error
  }

  return { error: new Error('Google sign-in failed') }
}
