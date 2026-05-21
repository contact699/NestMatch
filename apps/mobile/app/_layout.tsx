import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../src/providers/auth-provider'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { ErrorBoundary } from '../src/components/error-boundary'
import { useAppFonts } from '../src/theme/fonts'

const queryClient = new QueryClient()

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — splash already hidden in some hot-reload scenarios
})

export default function RootLayout() {
  const { fontsLoaded, fontError } = useAppFonts()

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen
                name="settings"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="edit-profile"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="verify"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
