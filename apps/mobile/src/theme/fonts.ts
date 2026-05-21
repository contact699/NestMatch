// Loads Manrope (display) and Inter (body). The root layout uses this
// hook plus expo-splash-screen to gate first paint until fonts are ready.
// Falls back to system fonts if loading fails so the app never hard-crashes
// on a font issue.

import { useFonts as useExpoFonts } from 'expo-font'
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter'

export function useAppFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [loaded, error] = useExpoFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })
  return { fontsLoaded: loaded, fontError: error }
}
