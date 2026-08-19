import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../src/providers/auth-provider'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { ErrorBoundary } from '../src/components/error-boundary'
import { useAppFonts } from '../src/theme/fonts'

// Mobile networks drop requests routinely, so a failed query retries twice
// before surfacing an error state, and fresh data is reused for 30s instead of
// refetching on every screen focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
})

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
              <Stack.Screen
                name="group/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="user/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="expenses"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="notifications"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="my-listings"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="saved"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
