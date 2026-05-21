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
import { useAuth } from '@/providers/auth-provider'
import { signInWithGoogle } from '@/lib/google-auth'
import { Screen, Input, Button } from '@/components/ui'
import { colors, typography } from '@/theme/tokens'

export default function SignupScreen() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
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

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: signUpError } = await signUp(email, password, name)
    if (signUpError) setError(signUpError.message)
    setLoading(false)
  }

  return (
    <Screen testID="screen-signup">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.wordmark}>NestMatch</Text>
          </View>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Find roommates and homes you can trust.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />

          <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleSignUp}>
            Create account
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button variant="outline" size="lg" fullWidth loading={googleLoading} onPress={handleGoogleSignIn}>
            Continue with Google
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Sign in
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
    fontSize: 26,
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
