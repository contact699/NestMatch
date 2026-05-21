# Mobile redesign — phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the web's brand identity across the mobile app (navy/teal/mint palette, Manrope/Inter typography), redesign all 11 existing screens with native-mobile UX, and fix three usability-blocking regressions (Profile load, Search load, Home Quick Action links).

**Architecture:** A new `apps/mobile/src/theme/` package owns design tokens (`tokens.ts`) and font loading (`fonts.ts`). A new `apps/mobile/src/components/ui/` package owns reusable presentational components (`Screen`, `Card`, `Badge`, `Button`, `Input`, `Avatar`, `Chip`, `SectionHeader`). Every existing screen swaps its raw-hex `StyleSheet` styles for these components and tokens. Data-layer code is unchanged except for three bug fixes.

**Tech Stack:** React Native 0.81, Expo SDK 54, expo-router 6, expo-font, @expo-google-fonts/manrope, @expo-google-fonts/inter, react-native-safe-area-context, @tanstack/react-query, @supabase/supabase-js, lucide-react-native.

**Spec:** `docs/superpowers/specs/2026-05-21-mobile-redesign-phase2-design.md`

---

## File Structure

**New files:**
- `apps/mobile/src/theme/tokens.ts` — typed color/spacing/radii/shadow/typography exports
- `apps/mobile/src/theme/fonts.ts` — `useAppFonts()` hook with splash gate
- `apps/mobile/src/components/ui/Screen.tsx`
- `apps/mobile/src/components/ui/Card.tsx`
- `apps/mobile/src/components/ui/Badge.tsx`
- `apps/mobile/src/components/ui/Button.tsx`
- `apps/mobile/src/components/ui/Input.tsx`
- `apps/mobile/src/components/ui/Avatar.tsx`
- `apps/mobile/src/components/ui/Chip.tsx`
- `apps/mobile/src/components/ui/SectionHeader.tsx`
- `apps/mobile/src/components/ui/index.ts` — barrel export

**Modified files (data unchanged unless noted):**
- `apps/mobile/app.json` (splash background)
- `apps/mobile/package.json` (new deps)
- `apps/mobile/app/_layout.tsx` (font gate)
- `apps/mobile/app/(tabs)/_layout.tsx` (tab colors)
- `apps/mobile/app/(tabs)/index.tsx` (full redesign)
- `apps/mobile/app/(tabs)/search.tsx` (full redesign + bug investigation)
- `apps/mobile/app/(tabs)/messages.tsx` (presentational restyle, data unchanged)
- `apps/mobile/app/(tabs)/profile.tsx` (full redesign + bug fix on line 41)
- `apps/mobile/app/verify.tsx` (full redesign)
- `apps/mobile/app/listing/[id].tsx` (full redesign)
- `apps/mobile/app/listing/create.tsx` (full redesign)
- `apps/mobile/app/edit-profile.tsx` (full redesign)
- `apps/mobile/app/settings.tsx` (full redesign)
- `apps/mobile/app/conversation/[id].tsx` (full redesign)
- `apps/mobile/app/(auth)/login.tsx` (full redesign)
- `apps/mobile/app/(auth)/signup.tsx` (full redesign)

---

# Phase 1: Foundation

Foundation tasks produce no user-visible change but every later task depends on them. After Phase 1 the app compiles + boots identically to today, but the tokens + components are ready to use.

## Task 1: Design tokens

**Files:**
- Create: `apps/mobile/src/theme/tokens.ts`

- [ ] **Step 1: Create the tokens file**

```ts
// apps/mobile/src/theme/tokens.ts
//
// Design tokens sourced from apps/web/src/app/globals.css.
// Single source of truth for colors, spacing, radii, shadows, typography.

export const colors = {
  primary: '#002045',
  onPrimary: '#ffffff',
  primaryContainer: '#1a365d',
  onPrimaryContainer: '#86a0cd',
  primaryFixed: '#d6e3ff',
  primaryFixedDim: '#adc7f7',

  secondary: '#006a60',
  onSecondary: '#ffffff',
  secondaryContainer: '#8cf5e4',
  onSecondaryContainer: '#007166',
  secondaryFixed: '#b0f0e4',

  tertiary: '#371800',
  tertiaryContainer: '#562a00',
  tertiaryFixed: '#ffdcc4',

  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  surfaceVariant: '#e1e3e4',

  onSurface: '#191c1d',
  onSurfaceVariant: '#43474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',

  successContainer: '#8cf5e4',
  onSuccessContainer: '#006a60',
  warningContainer: '#ffdcc4',
  onWarningContainer: '#562a00',
} as const

export type ColorToken = keyof typeof colors

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const

export const shadows = {
  sm: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
} as const

export const typography = {
  // Family names match the @expo-google-fonts packages
  fontFamily: {
    display: 'Manrope_700Bold',
    displayMedium: 'Manrope_600SemiBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodyBold: 'Inter_600SemiBold',
  },
  size: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    '4xl': 34,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/theme/tokens.ts
git commit -m "feat(mobile): add design tokens sourced from web globals.css"
```

## Task 2: Install Google Fonts packages

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install Manrope + Inter packages**

Run from `apps/mobile`:
```bash
npx expo install @expo-google-fonts/manrope @expo-google-fonts/inter expo-font expo-splash-screen
```

Expected: packages added to `apps/mobile/package.json`, lockfile updated.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json package-lock.json
git commit -m "feat(mobile): add Manrope + Inter via @expo-google-fonts"
```

## Task 3: Font loader

**Files:**
- Create: `apps/mobile/src/theme/fonts.ts`

- [ ] **Step 1: Create the font hook**

```ts
// apps/mobile/src/theme/fonts.ts
//
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/theme/fonts.ts
git commit -m "feat(mobile): font loader hook for Manrope + Inter"
```

## Task 4: Wire fonts into root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Replace the layout with one that gates on font load**

Full replacement contents:

```tsx
// apps/mobile/app/_layout.tsx
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
    // Splash is still visible; render nothing
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): gate first paint on font load via splash screen"
```

## Task 5: Update splash background

**Files:**
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Change splash + adaptive icon backgrounds**

In `apps/mobile/app.json`:
- `expo.splash.backgroundColor`: `"#fcf2d9"` → `"#f8f9fa"`
- `expo.android.adaptiveIcon.backgroundColor`: `"#fcf2d9"` → `"#f8f9fa"`

- [ ] **Step 2: Verify the file is still valid JSON**

Run: `cd apps/mobile && node -e "require('./app.json')"`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app.json
git commit -m "fix(mobile): update splash + adaptive icon bg to match new background"
```

## Task 6: Screen component

**Files:**
- Create: `apps/mobile/src/components/ui/Screen.tsx`

- [ ] **Step 1: Create the Screen wrapper**

```tsx
// apps/mobile/src/components/ui/Screen.tsx
import { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from 'react-native'
import { SafeAreaView, Edge } from 'react-native-safe-area-context'
import { colors } from '@/theme/tokens'

type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  edges?: Edge[]
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView testID={testID} style={[styles.root, style]} edges={edges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView testID={testID} style={[styles.root, style]} edges={edges}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/ui/Screen.tsx
git commit -m "feat(mobile/ui): Screen wrapper with safe-area + optional scroll"
```

## Task 7: Card component

**Files:**
- Create: `apps/mobile/src/components/ui/Card.tsx`

- [ ] **Step 1: Create Card**

```tsx
// apps/mobile/src/components/ui/Card.tsx
import { ReactNode } from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import { colors, radii, shadows } from '@/theme/tokens'

type CardProps = {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  variant?: 'surface' | 'primary'
}

export function Card({ children, onPress, style, variant = 'surface' }: CardProps) {
  const bg = variant === 'primary' ? colors.primary : colors.surfaceContainerLowest
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: variant === 'primary' ? colors.primary : colors.outlineVariant },
        shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  )
  if (onPress) {
    return (
      <Pressable onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
        {content}
      </Pressable>
    )
  }
  return content
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/ui/Card.tsx
git commit -m "feat(mobile/ui): Card with surface + primary variants"
```

## Task 8: Badge component

**Files:**
- Create: `apps/mobile/src/components/ui/Badge.tsx`

- [ ] **Step 1: Create Badge**

```tsx
// apps/mobile/src/components/ui/Badge.tsx
import { ReactNode } from 'react'
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type Variant = 'success' | 'info' | 'warning' | 'neutral' | 'error'

type BadgeProps = {
  children: ReactNode
  variant?: Variant
  style?: StyleProp<ViewStyle>
}

const PALETTE: Record<Variant, { bg: string; fg: string }> = {
  success: { bg: colors.successContainer, fg: colors.onSuccessContainer },
  info: { bg: colors.primaryFixed, fg: colors.primary },
  warning: { bg: colors.warningContainer, fg: colors.onWarningContainer },
  neutral: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
  error: { bg: colors.errorContainer, fg: colors.error },
}

export function Badge({ children, variant = 'neutral', style }: BadgeProps) {
  const { bg, fg } = PALETTE[variant]
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/Badge.tsx
git commit -m "feat(mobile/ui): Badge with success/info/warning/neutral/error variants"
```

## Task 9: Button component

**Files:**
- Create: `apps/mobile/src/components/ui/Button.tsx`

- [ ] **Step 1: Create Button**

```tsx
// apps/mobile/src/components/ui/Button.tsx
import { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = {
  children: ReactNode
  onPress?: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: 'transparent', fg: colors.error, border: colors.error },
}

const SIZE: Record<Size, { py: number; px: number; fs: number }> = {
  sm: { py: 8, px: 14, fs: 13 },
  md: { py: 12, px: 18, fs: 15 },
  lg: { py: 14, px: 22, fs: 16 },
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const v = VARIANT[variant]
  const s = SIZE[size]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            <Text
              style={[
                styles.label,
                { color: v.fg, fontSize: s.fs },
              ]}
            >
              {children}
            </Text>
            {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
          </>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: typography.fontFamily.bodyBold },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/Button.tsx
git commit -m "feat(mobile/ui): Button with 5 variants and 3 sizes"
```

## Task 10: Input component

**Files:**
- Create: `apps/mobile/src/components/ui/Input.tsx`

- [ ] **Step 1: Create Input**

```tsx
// apps/mobile/src/components/ui/Input.tsx
import { forwardRef, ReactNode, useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type InputProps = TextInputProps & {
  label?: string
  error?: string
  leftIcon?: ReactNode
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leftIcon, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.outlineVariant

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, { borderColor }]}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={colors.outline}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/Input.tsx
git commit -m "feat(mobile/ui): Input with focus ring + error state + left icon"
```

## Task 11: Avatar component

**Files:**
- Create: `apps/mobile/src/components/ui/Avatar.tsx`

- [ ] **Step 1: Create Avatar**

```tsx
// apps/mobile/src/components/ui/Avatar.tsx
import { Image, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native'
import { colors, typography } from '@/theme/tokens'

type AvatarProps = {
  src?: string | null
  name?: string | null
  size?: number
  style?: StyleProp<ViewStyle>
}

function initialsOf(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({ src, name, size = 48, style }: AvatarProps) {
  const radius = size / 2
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      />
    )
  }
  const fontSize = Math.max(12, size * 0.4)
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initialsOf(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.onSecondaryContainer,
  },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/Avatar.tsx
git commit -m "feat(mobile/ui): Avatar with initials fallback"
```

## Task 12: Chip component

**Files:**
- Create: `apps/mobile/src/components/ui/Chip.tsx`

- [ ] **Step 1: Create Chip**

```tsx
// apps/mobile/src/components/ui/Chip.tsx
import { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, StyleProp, ViewStyle } from 'react-native'
import { colors, radii, typography } from '@/theme/tokens'

type ChipProps = {
  children: ReactNode
  active?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function Chip({ children, active = false, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={active ? styles.textActive : styles.textInactive}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
  },
  textActive: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  textInactive: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.onSurface,
  },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/Chip.tsx
git commit -m "feat(mobile/ui): Chip with active/inactive states"
```

## Task 13: SectionHeader component

**Files:**
- Create: `apps/mobile/src/components/ui/SectionHeader.tsx`

- [ ] **Step 1: Create SectionHeader**

```tsx
// apps/mobile/src/components/ui/SectionHeader.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, typography } from '@/theme/tokens'

type SectionHeaderProps = {
  title: string
  actionLabel?: string
  onActionPress?: () => void
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 16,
    color: colors.primary,
  },
  action: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    color: colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/SectionHeader.tsx
git commit -m "feat(mobile/ui): SectionHeader with optional action link"
```

## Task 14: Barrel export

**Files:**
- Create: `apps/mobile/src/components/ui/index.ts`

- [ ] **Step 1: Create the barrel**

```ts
// apps/mobile/src/components/ui/index.ts
export { Screen } from './Screen'
export { Card } from './Card'
export { Badge } from './Badge'
export { Button } from './Button'
export { Input } from './Input'
export { Avatar } from './Avatar'
export { Chip } from './Chip'
export { SectionHeader } from './SectionHeader'
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/src/components/ui/index.ts
git commit -m "feat(mobile/ui): barrel export for UI components"
```

---

# Phase 2: Bug fixes

## Task 15: Fix Profile load (1-line)

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx:41`

- [ ] **Step 1: Replace the column name**

In `apps/mobile/app/(tabs)/profile.tsx`, change:

```tsx
.eq('id', user!.id)
```

to:

```tsx
.eq('user_id', user!.id)
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/profile.tsx
git commit -m "fix(mobile/profile): query profiles by user_id, not id"
```

## Task 16: Diagnose + fix Search load

**Files:**
- Modify: `apps/mobile/app/(tabs)/search.tsx`

- [ ] **Step 1: Add diagnostic logging temporarily**

In `apps/mobile/app/(tabs)/search.tsx`, in the `queryFn`, replace:

```tsx
const { data, error } = await query
if (error) throw error
return (data ?? []) as Listing[]
```

with:

```tsx
const { data, error } = await query
if (error) {
  console.warn('[search] supabase error', JSON.stringify(error, null, 2))
  throw error
}
return (data ?? []) as Listing[]
```

- [ ] **Step 2: Run the app in dev mode against prod Supabase**

```bash
cd apps/mobile && npx expo start --tunnel
```

Open on phone, navigate to Search tab. Watch Metro terminal for `[search] supabase error`. Capture the message + code.

- [ ] **Step 3: Apply the fix based on the error**

Common possibilities and their fixes:
- `column listings.status does not exist` → remove the `.eq('status', 'active')` line; the listings table doesn't use a status column.
- `permission denied for table listings` → adjust query so it passes RLS; likely needs the user-id-based ownership check or the column doesn't grant anon select. Replace the query with one that the existing web app uses.
- Other → look up the column in `apps/web/src/types/database.ts` for the real schema, mirror the working web query.

After applying the fix, **remove** the `console.warn` line added in step 1.

- [ ] **Step 4: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/search.tsx
git commit -m "fix(mobile/search): adjust query to match deployed listings schema"
```

---

# Phase 3: Tab redesigns

Each tab task replaces the entire screen file. Data-fetch logic (useQuery hooks etc.) is **preserved verbatim**; only the JSX + StyleSheet are replaced.

## Task 17: Home tab redesign

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace the file**

Full replacement contents:

```tsx
// apps/mobile/app/(tabs)/index.tsx
import { useMemo } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Plus, Search as SearchIcon, Heart } from 'lucide-react-native'
import { Screen, Card, Badge, Avatar, Chip, SectionHeader } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'

type RoommateCard = {
  user_id: string
  name: string | null
  age: number | null
  occupation: string | null
  city: string | null
  profile_photo: string | null
}

type ListingCard = {
  id: string
  title: string
  price: number
  city: string | null
  photos: string[] | null
}

const CATEGORIES = ['All', 'Roommates', 'Listings', 'Co-living'] as const

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const firstName = (user?.user_metadata?.name as string | undefined)?.split(' ')[0] ?? 'there'

  const { data: roommates, isLoading: roommatesLoading } = useQuery({
    queryKey: ['home-roommates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .neq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as RoommateCard[]
    },
    enabled: !!user,
  })

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['home-listings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as ListingCard[]
    },
    enabled: !!user,
  })

  const matchOf = useMemo(() => {
    // Deterministic placeholder match % until real algo lands
    const cache = new Map<string, number>()
    return (id: string) => {
      if (cache.has(id)) return cache.get(id)!
      let h = 0
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
      const pct = 85 + (h % 15) // 85–99
      cache.set(id, pct)
      return pct
    }
  }, [])

  const renderRoommate = ({ item }: { item: RoommateCard }) => (
    <Pressable
      style={styles.roommateCard}
      onPress={() => router.push(`/profile/${item.user_id}` as never)}
    >
      <Avatar src={item.profile_photo} name={item.name} size={56} style={styles.roommateAvatar} />
      <Text style={styles.roommateName} numberOfLines={1}>
        {item.name ?? 'Anonymous'}
        {item.age ? `, ${item.age}` : ''}
      </Text>
      <Text style={styles.roommateMeta} numberOfLines={1}>
        {[item.occupation, item.city].filter(Boolean).join(' · ') || 'NestMatch member'}
      </Text>
      <Badge variant="success" style={styles.roommateMatch}>{matchOf(item.user_id)}% match</Badge>
    </Pressable>
  )

  return (
    <Screen testID="screen-home" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Find your nest</Text>
        <Text style={styles.subtitle}>
          Roommates and listings curated for you{firstName !== 'there' ? `, ${firstName}` : ''}
        </Text>

        <Pressable style={styles.searchPill} onPress={() => router.push('/(tabs)/search')}>
          <SearchIcon size={16} color={colors.outline} />
          <Text style={styles.searchText}>Where are you looking?</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c, i) => (
            <Chip key={c} active={i === 0} onPress={() => router.push('/(tabs)/search')}>
              {c}
            </Chip>
          ))}
        </ScrollView>

        <SectionHeader
          title="Roommates near you"
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {roommatesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <FlatList
            horizontal
            data={roommates ?? []}
            keyExtractor={(i) => i.user_id}
            renderItem={renderRoommate}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            ListEmptyComponent={
              <Card style={styles.empty}>
                <Text style={styles.emptyTitle}>No roommates yet</Text>
                <Text style={styles.emptyBody}>Be among the first — complete your profile.</Text>
              </Card>
            }
          />
        )}

        <SectionHeader
          title="Listings near you"
          actionLabel="SEE ALL"
          onActionPress={() => router.push('/(tabs)/search')}
        />
        {listingsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (listings?.length ?? 0) === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>Be the first — list your place.</Text>
          </Card>
        ) : (
          listings!.map((l) => (
            <Pressable
              key={l.id}
              style={styles.listing}
              onPress={() => router.push(`/listing/${l.id}`)}
            >
              <View style={styles.listingImg}>
                <View style={styles.heart}>
                  <Heart size={14} color={colors.primary} />
                </View>
              </View>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.listingMeta} numberOfLines={1}>{l.city ?? 'Location TBD'}</Text>
                <Text style={styles.listingPrice}>
                  ${l.price?.toLocaleString() ?? '---'}<Text style={styles.listingPriceUnit}>/mo</Text>
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/listing/create')}
      >
        <Plus color={colors.onPrimary} size={26} />
      </TouchableOpacity>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 100 },
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
    marginTop: 4,
    marginBottom: 16,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
  },
  searchText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  chipsRow: { gap: 8, paddingRight: 16 },
  hList: { gap: 10, paddingRight: 16 },
  roommateCard: {
    width: 150,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  roommateAvatar: { alignSelf: 'center', marginBottom: 8 },
  roommateName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
  },
  roommateMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  roommateMatch: { alignSelf: 'center' },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: 10,
    ...shadows.sm,
  },
  listingImg: {
    height: 120,
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingInfo: { padding: 12 },
  listingTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  listingMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  listingPrice: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  listingPriceUnit: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  empty: { width: 240, padding: 16 },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile/home): redesign with new tokens, sectioned roommate + listing feed"
```

## Task 18: Search tab redesign

Full replacement keeping the same data layer. After Task 16's fix, the existing `useQuery` should already work. Apply the segmented control (Listings / Roommates), the search Input from UI, and the listing/profile result cards.

**Files:**
- Modify: `apps/mobile/app/(tabs)/search.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// apps/mobile/app/(tabs)/search.tsx
import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Search as SearchIcon, Heart } from 'lucide-react-native'
import { Screen, Input, Avatar, Badge } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

type Listing = {
  id: string
  title: string
  price: number
  city: string | null
  photos: string[] | null
}

type RoommateRow = {
  user_id: string
  name: string | null
  age: number | null
  occupation: string | null
  city: string | null
  profile_photo: string | null
}

type Segment = 'listings' | 'roommates'

export default function SearchScreen() {
  const router = useRouter()
  const [segment, setSegment] = useState<Segment>('listings')
  const [query, setQuery] = useState('')

  const listingsQuery = useQuery({
    queryKey: ['search-listings', query],
    queryFn: async () => {
      let q = supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .order('created_at', { ascending: false })
        .limit(50)
      if (query.trim()) {
        q = q.or(`title.ilike.%${query}%,city.ilike.%${query}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Listing[]
    },
    enabled: segment === 'listings',
  })

  const roommatesQuery = useQuery({
    queryKey: ['search-roommates', query],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .order('created_at', { ascending: false })
        .limit(50)
      if (query.trim()) {
        q = q.or(`name.ilike.%${query}%,city.ilike.%${query}%,occupation.ilike.%${query}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as RoommateRow[]
    },
    enabled: segment === 'roommates',
  })

  const active = segment === 'listings' ? listingsQuery : roommatesQuery

  return (
    <Screen testID="screen-search" edges={['bottom']}>
      <View style={styles.head}>
        <Text style={styles.title}>Discover</Text>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setSegment('listings')}
            style={[styles.segBtn, segment === 'listings' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, segment === 'listings' && styles.segTextActive]}>Listings</Text>
          </Pressable>
          <Pressable
            onPress={() => setSegment('roommates')}
            style={[styles.segBtn, segment === 'roommates' && styles.segBtnActive]}
          >
            <Text style={[styles.segText, segment === 'roommates' && styles.segTextActive]}>Roommates</Text>
          </Pressable>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={segment === 'listings' ? 'Search by title or city' : 'Search by name, city, occupation'}
          leftIcon={<SearchIcon size={18} color={colors.outline} />}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : active.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load. Pull down to retry.</Text>
        </View>
      ) : segment === 'listings' ? (
        <FlatList
          data={(listingsQuery.data ?? []) as Listing[]}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyBody}>
                {query ? 'Try a different search.' : 'No active listings right now.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.listing} onPress={() => router.push(`/listing/${item.id}`)}>
              <View style={styles.listingImg}>
                <View style={styles.heart}><Heart size={14} color={colors.primary} /></View>
              </View>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.listingMeta} numberOfLines={1}>{item.city ?? '—'}</Text>
                <Text style={styles.listingPrice}>
                  ${item.price?.toLocaleString() ?? '---'}<Text style={styles.listingPriceUnit}>/mo</Text>
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={(roommatesQuery.data ?? []) as RoommateRow[]}
          keyExtractor={(i) => i.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No roommates found</Text>
              <Text style={styles.emptyBody}>
                {query ? 'Try a different search.' : 'Check back later.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.profile}
              onPress={() => router.push(`/profile/${item.user_id}` as never)}
            >
              <Avatar src={item.profile_photo} name={item.name} size={48} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {item.name ?? 'Anonymous'}{item.age ? `, ${item.age}` : ''}
                </Text>
                <Text style={styles.profileMeta} numberOfLines={1}>
                  {[item.occupation, item.city].filter(Boolean).join(' · ') || 'NestMatch member'}
                </Text>
              </View>
              <Badge variant="success">View</Badge>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 8, gap: 12 },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  segBtnActive: { backgroundColor: colors.surfaceContainerLowest, ...shadows.sm },
  segText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  segTextActive: { color: colors.primary, fontFamily: typography.fontFamily.bodyBold },
  list: { padding: 20, paddingTop: 0, gap: 10 },
  center: { padding: 40, alignItems: 'center' },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 14,
    color: colors.error,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listingImg: { height: 140, backgroundColor: colors.surfaceContainer, position: 'relative' },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingInfo: { padding: 14 },
  listingTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary },
  listingMeta: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  listingPrice: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.secondary, marginTop: 4 },
  listingPriceUnit: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  profileMeta: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/search.tsx
git commit -m "feat(mobile/search): segmented Listings/Roommates with new design tokens"
```

## Task 19: Messages tab restyle

Data layer untouched. Only the JSX + StyleSheet change to use Card + Avatar + Badge + tokens.

**Files:**
- Modify: `apps/mobile/app/(tabs)/messages.tsx`

- [ ] **Step 1: Read the full current file**

`cat apps/mobile/app/(tabs)/messages.tsx` — note the data fetching block (lines ~24-101) and the `renderConversation`/styles below.

- [ ] **Step 2: Replace JSX + styles, keep data fetching**

Replace the render section (everything from the first `return (` to the end of file) with:

```tsx
return (
  <Screen testID="screen-messages" edges={['bottom']}>
    <View style={styles.head}>
      <Text style={styles.title}>Messages</Text>
    </View>
    {isLoading ? (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    ) : error ? (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load conversations.</Text>
      </View>
    ) : (
      <FlatList
        data={conversations ?? []}
        keyExtractor={(c) => c.conversation_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              Start one by tapping a listing or roommate profile.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/conversation/${item.conversation_id}`)}
          >
            <Avatar name={item.other_user_name} size={48} />
            <View style={styles.rowMid}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.other_user_name || 'Anonymous'}
              </Text>
              <Text style={styles.rowPreview} numberOfLines={1}>
                {item.last_message ?? 'No messages yet'}
              </Text>
            </View>
            {item.unread_count > 0 ? (
              <Badge variant="success">{item.unread_count}</Badge>
            ) : null}
          </Pressable>
        )}
      />
    )}
  </Screen>
)
```

Replace the imports at the top to include:

```tsx
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { Screen, Avatar, Badge } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'
```

(Drop the old `SafeAreaView` import.)

Replace the StyleSheet at the bottom with:

```tsx
const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 8 },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  list: { padding: 20, paddingTop: 4, gap: 8 },
  center: { padding: 40, alignItems: 'center' },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
  emptyTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary, marginBottom: 4 },
  emptyBody: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  rowMid: { flex: 1 },
  rowName: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  rowPreview: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/messages.tsx
git commit -m "feat(mobile/messages): restyle with new tokens + Card/Avatar/Badge"
```

## Task 20: Profile tab redesign

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Replace the file**

Full replacement:

```tsx
// apps/mobile/app/(tabs)/profile.tsx
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { Settings, ShieldCheck, ChevronRight, Bookmark, Home as HomeIcon } from 'lucide-react-native'
import { Screen, Avatar, Badge, Button, Card } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

type Profile = {
  id: string
  user_id: string
  name: string | null
  email: string | null
  profile_photo: string | null
  verification_level: 'basic' | 'verified' | 'trusted' | null
  bio: string | null
  created_at: string | null
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, profile_photo, verification_level, bio, created_at')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ])
  }

  if (isLoading) {
    return (
      <Screen testID="screen-profile">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen testID="screen-profile">
        <View style={styles.center}><Text style={styles.errorText}>Failed to load profile.</Text></View>
      </Screen>
    )
  }

  const level = profile?.verification_level ?? 'basic'
  const verifyVariant: 'success' | 'info' | 'neutral' = level === 'trusted'
    ? 'success'
    : level === 'verified'
      ? 'info'
      : 'neutral'
  const verifyLabel = level === 'trusted' ? 'Trusted' : level === 'verified' ? 'Verified' : 'Unverified'
  const trustPct = level === 'trusted' ? 80 : level === 'verified' ? 50 : 20

  return (
    <Screen testID="screen-profile" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.headerCard}>
          <Avatar src={profile?.profile_photo} name={profile?.name} size={80} />
          <Text style={styles.name}>{profile?.name ?? 'No name set'}</Text>
          <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
          <Badge variant={verifyVariant} style={{ marginTop: 8 }}>{verifyLabel}</Badge>
        </Card>

        <Card style={styles.trustCard} variant="primary">
          <Text style={styles.trustLabel}>TRUST QUOTIENT</Text>
          <Text style={styles.trustPct}>{trustPct}%</Text>
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${trustPct}%` }]} />
          </View>
          <Text style={styles.trustHint}>
            {trustPct < 80 ? 'Add more verifications to reach Trusted' : 'You are fully verified'}
          </Text>
        </Card>

        <Card style={{ padding: 0 }}>
          <NavRow icon={<HomeIcon size={18} color={colors.primary} />} label="My Listings" sub="Manage your listings" onPress={() => router.push('/(tabs)/search')} />
          <Sep />
          <NavRow icon={<Bookmark size={18} color={colors.primary} />} label="Saved" sub="Listings you bookmarked" onPress={() => router.push('/(tabs)/search')} />
          <Sep />
          <NavRow icon={<ShieldCheck size={18} color={colors.secondary} />} label="Trust Center" sub={`${verifyLabel} — view verifications`} onPress={() => router.push('/verify')} />
          <Sep />
          <NavRow icon={<Settings size={18} color={colors.onSurfaceVariant} />} label="Settings" sub="Privacy and account" onPress={() => router.push('/settings')} />
        </Card>

        <Button variant="danger" fullWidth onPress={handleSignOut} style={{ marginTop: 14 }}>
          Sign Out
        </Button>
      </ScrollView>
    </Screen>
  )
}

function NavRow({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <View style={styles.navIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={colors.outline} />
    </Pressable>
  )
}

function Sep() {
  return <View style={styles.sep} />
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
  headerCard: { alignItems: 'center', paddingVertical: 22 },
  name: {
    fontFamily: typography.fontFamily.display,
    fontSize: 22,
    color: colors.primary,
    marginTop: 12,
  },
  email: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  trustCard: { marginTop: 14 },
  trustLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    color: colors.onPrimary,
    opacity: 0.7,
    letterSpacing: 1,
  },
  trustPct: {
    fontFamily: typography.fontFamily.display,
    fontSize: 36,
    color: colors.onPrimary,
    marginTop: 4,
  },
  trustBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  trustBarFill: { height: '100%', backgroundColor: colors.secondaryContainer, borderRadius: 3 },
  trustHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: 12,
    color: colors.onPrimary,
    opacity: 0.85,
    marginTop: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { fontFamily: typography.fontFamily.bodyBold, fontSize: 14, color: colors.primary },
  navSub: { fontFamily: typography.fontFamily.body, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 },
  sep: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: 62 },
})
```

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/profile.tsx
git commit -m "feat(mobile/profile): redesign with Trust Quotient card + nav rows + new tokens"
```

## Task 21: Tab navigation colors

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Read the current layout**

`cat apps/mobile/app/(tabs)/_layout.tsx` — capture the Tab options structure.

- [ ] **Step 2: Update the Tabs screenOptions**

Replace any existing `screenOptions={{ ... }}` on the `<Tabs>` element with:

```tsx
import { colors, typography } from '@/theme/tokens'

// ... inside the component
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.outline,
    tabBarStyle: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopColor: colors.outlineVariant,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tabBarLabelStyle: {
      fontFamily: typography.fontFamily.bodyMedium,
      fontSize: 11,
    },
  }}
>
```

(Add `StyleSheet` to the import list if needed.)

- [ ] **Step 3: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile/tabs): apply new tokens to tab bar (navy active, gray inactive)"
```

---

# Phase 4: Sub-screens

Each sub-screen task uses the same pattern: read the existing file to capture its data layer, then rewrite the JSX + styles to use the new tokens + components from Phase 1. Tasks below give the structural recipe; the executing agent should produce the actual edited file following the spec's "Screen-by-screen design" section.

## Task 22: Verify (Trust Center) redesign

**Files:**
- Modify: `apps/mobile/app/verify.tsx`

- [ ] **Step 1: Apply spec §"Verify (Trust Center)" structure**

Read the current `apps/mobile/app/verify.tsx`, preserve all data fetching (verification status query, initiate handlers, payment handlers). Restructure the JSX to:

1. Header strip with back-chevron + screen title "Trust Center"
2. `Badge` variant="info" reading "SECURE PROFILE"
3. Display title + subtitle (per spec, matches web copy)
4. Identity card (`Card`): Avatar + name + member-since + city/occupation
5. Trust Quotient hero `Card variant="primary"` with mint progress bar (reuse the styles from Profile tab's trust card)
6. Stacked verification check `Card`s — one each for Government ID, Phone, Credit, Background — each with status text + CTA `Button`
7. Packages section: two-column grid of `Card`s with savings `Badge`

All `Button`/`Card`/`Badge` come from `@/components/ui`. All colors come from `@/theme/tokens`.

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/verify.tsx
git commit -m "feat(mobile/verify): redesign Trust Center with new tokens + cards"
```

## Task 23: Listing Detail redesign

**Files:**
- Modify: `apps/mobile/app/listing/[id].tsx`

- [ ] **Step 1: Apply spec §"Listing Detail" structure**

Preserve data fetching and photo carousel logic. Restructure to:

1. Full-bleed photo carousel (existing) with absolute Back chevron + Heart toggle overlay
2. Below photos in scroll: title (display), price (teal display) + "/mo", city + listing type
3. Quick facts row: 3-4 inline stats with icons (bed, bath, furnished, available)
4. Description paragraph
5. Amenities as horizontal row of `Chip`s (inactive variant)
6. Host card (`Card`): Avatar + name + verification `Badge` + "Message" `Button` outline variant
7. Sticky bottom bar (positioned absolute or with View at end of ScrollView): "Message host" primary `Button` full-width

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/listing/[id].tsx
git commit -m "feat(mobile/listing-detail): redesign with sticky CTA and new tokens"
```

## Task 24: Listing Create redesign

**Files:**
- Modify: `apps/mobile/app/listing/create.tsx`

- [ ] **Step 1: Apply spec §"Listing Create" structure**

Preserve form state + submission logic. Restructure as multi-step form:

- Top: progress dots (1/4, 2/4, 3/4, 4/4)
- Step 1 — Basics: title (`Input`), type (`Chip` group), price (`Input` numeric), city (`Input`)
- Step 2 — Details: bed count (`Chip` row), bath count, available date, description (`Input` multiline)
- Step 3 — Photos: existing `expo-image-picker` integration restyled with `Button` variants
- Step 4 — Review: summary view + primary "Publish" `Button`
- Bottom nav: "Back" outline + "Next"/"Publish" primary

If the current file already has a single-page form, keep the single-page approach for now (multi-step is a refactor that adds risk) — just restyle the existing inputs/buttons with the new components.

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/listing/create.tsx
git commit -m "feat(mobile/listing-create): restyle form with new tokens + Input/Button"
```

## Task 25: Edit Profile redesign

**Files:**
- Modify: `apps/mobile/app/edit-profile.tsx`

- [ ] **Step 1: Apply spec §"Edit Profile" structure**

Preserve form state + submission. Group fields into sections with `SectionHeader` titles:

- Basics: name, age, occupation
- Lifestyle: cleanliness, schedule, smoking/cannabis/alcohol, pets (each as `Chip` group)
- About: bio (`Input` multiline), languages
- Location: city, province
- Budget: budget_min, budget_max

Sticky "Save" primary `Button` at bottom.

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/edit-profile.tsx
git commit -m "feat(mobile/edit-profile): restyle sectioned form with new tokens"
```

## Task 26: Settings redesign

**Files:**
- Modify: `apps/mobile/app/settings.tsx`

- [ ] **Step 1: Apply spec §"Settings" structure**

Preserve any data fetching. Restructure as a list of nav rows grouped into sections:

- **Account**: email (display), Change Password, Sign Out
- **Notifications**: placeholder card "Push notifications — coming soon"
- **Privacy**: toggle `show_verification_badges`
- **About**: app version, Terms, Privacy Policy
- **Danger zone**: Delete account (confirmation modal)

Each section is a `Card` containing pressable rows separated by 1px `outlineVariant` line.

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/settings.tsx
git commit -m "feat(mobile/settings): restyle as sectioned list with new tokens"
```

## Task 27: Conversation redesign

**Files:**
- Modify: `apps/mobile/app/conversation/[id].tsx`

- [ ] **Step 1: Apply spec §"Conversation" structure**

Preserve data + send logic. Restyle:

- Header bar: back chevron + Avatar + name (display medium)
- Inverted `FlatList` of bubbles:
  - Mine: navy bg, white text, right-aligned, max 80% width
  - Theirs: white bg, navy text, left border subtle, left-aligned
  - First message of group shows their Avatar; subsequent don't
  - Date/time only shown on group breaks (gap > 5min)
- Sticky bottom input bar: `Input` flexed, send `Button` icon-only variant (use the existing send button styling but with `colors.secondary` when input has text, `colors.outline` when empty)

- [ ] **Step 2: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/conversation/[id].tsx
git commit -m "feat(mobile/conversation): restyle chat bubbles with new tokens"
```

## Task 28: Auth screens redesign

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`

- [ ] **Step 1: Replace login**

Restructure to:
- `Screen` with center alignment
- "NestMatch" wordmark (display font, 32pt, primary color)
- Display title "Welcome back"
- Body subtitle "Sign in to your sanctuary."
- `Input` for email
- `Input` for password (with secureTextEntry)
- Primary `Button` full-width "Sign In"
- "Forgot password?" `Button` ghost variant
- Divider "or"
- Outline `Button` "Continue with Google" (uses existing OAuth flow via `expo-auth-session`)
- "Don't have an account? Sign up" link → `/signup`

- [ ] **Step 2: Replace signup**

Mirror of login but with name field + "Create account" button + "Already have an account? Sign in" link.

- [ ] **Step 3: Verify TS** & **commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(auth)/login.tsx apps/mobile/app/(auth)/signup.tsx
git commit -m "feat(mobile/auth): redesign login and signup with new tokens"
```

---

# Final verification

## Task 29: End-to-end check

- [ ] **Step 1: Full mobile typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Full mobile lint**

```bash
cd apps/mobile && npx expo lint 2>&1 | tail -40
```

Expected: zero errors. Warnings about pre-existing unused imports are acceptable.

- [ ] **Step 3: expo-doctor**

```bash
cd apps/mobile && npx expo-doctor@latest 2>&1 | tail -10
```

Expected: 16-17/17 checks passed. (One duplicate-react warning may persist; that's known per spec §"Open risks".)

- [ ] **Step 4: Trigger EAS preview build**

```bash
cd apps/mobile && eas build --platform android --profile preview --non-interactive
```

When the APK is ready, install on device, smoke-test each tab and major sub-screen, capture any new issues for follow-up.

---

# Self-Review

**Spec coverage check:**
- §"Design system foundation" → Tasks 1, 3, 6-14 ✅
- §"Fonts" → Tasks 2, 3, 4 ✅
- §"Splash" → Task 5 ✅
- §"Bug fixes" → Tasks 15, 16, 17 (Home links covered by Home redesign) ✅
- §"Screen-by-screen: Home" → Task 17 ✅
- §"Search" → Task 18 ✅
- §"Messages" → Task 19 ✅
- §"Profile" → Task 20 ✅
- §"Verify" → Task 22 ✅
- §"Listing Detail" → Task 23 ✅
- §"Listing Create" → Task 24 ✅
- §"Edit Profile" → Task 25 ✅
- §"Settings" → Task 26 ✅
- §"Conversation" → Task 27 ✅
- §"Auth" → Task 28 ✅
- §"Navigation" → Task 21 ✅

**Type consistency:** All component prop names, token names, and import paths verified consistent across tasks.

**Risks acknowledged:** Match % is a deterministic placeholder per spec §"Open risks"; real matching algorithm is a follow-up spec. Profile sub-route `/profile/[user_id]` referenced in Home/Search may not exist yet — Task 17 uses `as never` cast and will simply not navigate; if that screen lands later the cast becomes a real type.
