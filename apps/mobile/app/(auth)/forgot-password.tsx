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
import { supabase } from '@/lib/supabase'
import { Screen, Input, Button } from '@/components/ui'
import { colors, typography } from '@/theme/tokens'

/** Web page that handles the recovery link Supabase emails out. */
const RESET_REDIRECT_TO = 'https://www.nestmatch.app/reset-password'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleReset = async () => {
    if (!email) {
      setError('Enter the email address you signed up with.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT_TO,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setSentTo(email)
    }
    setLoading(false)
  }

  return (
    <Screen testID="screen-forgot-password">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.wordmark}>NestMatch</Text>
          </View>

          {sentTo ? (
            <>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={styles.subtitle}>
                If an account exists for {sentTo}, we sent a link to reset your password. The link
                opens in your browser.
              </Text>
              <Button variant="outline" size="lg" fullWidth onPress={() => setSentTo(null)}>
                Send to a different email
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
              />

              <Button variant="primary" size="lg" fullWidth loading={loading} onPress={handleReset}>
                Send reset link
              </Button>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remembered it? </Text>
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
    lineHeight: 20,
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
