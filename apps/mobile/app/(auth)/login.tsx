import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useAuth } from '@/providers/auth-provider'
import { signInWithGoogle } from '@/lib/google-auth'
import { Screen, Input, Button } from '@/components/ui'
import { colors, radii, typography } from '@/theme/tokens'

export default function LoginScreen() {
  const { signIn, signInWithApple } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error: googleError } = await signInWithGoogle()
    if (googleError) setError(googleError.message)
    setGoogleLoading(false)
  }

  const handleAppleSignIn = async () => {
    setError(null)
    const { error: appleError } = await signInWithApple()
    if (appleError) setError(appleError.message)
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) setError(signInError.message)
    setLoading(false)
  }

  return (
    <Screen testID="screen-login">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.wordmark}>NestMatch</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your sanctuary.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Input
            testID="login-email"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Input
            testID="login-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <View style={styles.forgotRow}>
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </View>

          <Button testID="login-submit" variant="primary" size="lg" fullWidth loading={loading} onPress={handleSignIn}>
            Sign in
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button variant="outline" size="lg" fullWidth loading={googleLoading} onPress={handleGoogleSignIn}>
            Continue with Google
          </Button>

          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radii.md}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" style={styles.footerLink}>
              Sign up
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 60, gap: 12 },
  brand: { alignItems: 'center', marginBottom: 24 },
  wordmark: {
    fontFamily: typography.fontFamily.display,
    fontSize: 32,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  error: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.error,
    backgroundColor: colors.errorContainer,
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  forgotRow: { alignItems: 'flex-end', marginTop: -4, marginBottom: 4 },
  forgotLink: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.secondary,
  },
  appleButton: { width: '100%', height: 50, marginTop: 12 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footerLink: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 13,
    color: colors.secondary,
  },
})
