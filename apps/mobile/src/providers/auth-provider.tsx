import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '../lib/supabase'
import { useRouter, useSegments } from 'expo-router'

/**
 * Where Supabase sends the user after they tap the confirmation link in the
 * signup email. Without this the link resolves to the Supabase project URL and
 * dead-ends.
 */
const EMAIL_REDIRECT_TO = 'https://www.nestmatch.app/login'

export type SignUpResult = {
  error: Error | null
  /** True when Supabase created the user but no session — email confirmation is pending. */
  needsConfirmation: boolean
}

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>
  signInWithApple: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Persist the display name Apple hands over on the *first* authorization only.
 *
 * Apple's identity token carries no name, so `handle_new_user()` (migration 021)
 * creates the profiles row with `name` NULL — unlike email signup (metadata
 * `name`) and Google (metadata `full_name`), which the trigger reads. Apple only
 * ever returns `credential.fullName` once, so if it is dropped here the user is
 * "Anonymous" forever.
 *
 * Mirrors the trigger's path: seed auth metadata `name`, then backfill
 * profiles.name — but only while it is still empty, so a user who has since
 * renamed themselves keeps their own value.
 */
async function persistAppleDisplayName(userId: string, fullName: string) {
  try {
    await supabase.auth.updateUser({ data: { name: fullName } })

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle()

    const currentName = (profile as { name: string | null } | null)?.name
    if (!currentName || !currentName.trim()) {
      await supabase.from('profiles').update({ name: fullName }).eq('user_id', userId)
    }
  } catch {
    // A failed backfill must never block an otherwise successful sign-in.
  }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
  ): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: EMAIL_REDIRECT_TO },
    })
    return {
      error: error ? new Error(error.message) : null,
      needsConfirmation: !error && !data.session,
    }
  }

  /**
   * Sign in with Apple (iOS only). Exchanges the Apple identity token for a
   * Supabase session. A user cancelling the native sheet is not an error.
   */
  const signInWithApple = async (): Promise<{ error: Error | null }> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        return { error: new Error('Apple did not return an identity token.') }
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) return { error: new Error(error.message) }

      // Apple supplies fullName only on the first authorization — capture it now
      // or it is gone for good.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .map((part) => part?.trim())
        .filter((part): part is string => !!part)
        .join(' ')

      if (fullName && data.user?.id) {
        await persistAppleDisplayName(data.user.id, fullName)
      }

      return { error: null }
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        return { error: null }
      }
      return { error: err instanceof Error ? err : new Error('Apple sign-in failed.') }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
