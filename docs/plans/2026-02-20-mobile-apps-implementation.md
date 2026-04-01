# NestMatch Mobile Apps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build native iOS and Android apps with full feature parity using React Native + Expo in a Turborepo monorepo.

**Architecture:** Expo Router file-based navigation with direct Supabase client (no Next.js API middleman). Shared types, schemas, constants, and query helpers in `packages/shared`. TanStack Query for data fetching. Supabase Edge Functions for server-side logic (Stripe, Twilio, Certn).

**Tech Stack:** Expo SDK 52, Expo Router v4, React Native, TypeScript, Supabase JS, TanStack Query, Stripe React Native, react-native-maps, EAS Build

---

## Phase 1: Monorepo Setup & Shared Package

### Task 1: Initialize Turborepo monorepo structure

**Files:**
- Create: `package.json` (root workspace — replace existing)
- Create: `turbo.json`
- Move: all existing source into `apps/web/`

**Step 1: Create root workspace package.json**

Back up the current root `package.json`, then replace it with a workspace root:

```json
{
  "name": "nestmatch",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "turbo run dev --filter=@nestmatch/web",
    "dev:mobile": "turbo run dev --filter=@nestmatch/mobile",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

**Step 3: Move web app into apps/web/**

```bash
mkdir -p apps/web
# Move all source files (not root configs) into apps/web/
# Keep: .git, .gitignore, docs/, supabase/, turbo.json, root package.json
# Move: src/, public/, next.config.ts, tsconfig.json, postcss.config.mjs,
#        tailwind.config.ts, .env.local, .env.local.example, eslint.config.mjs
#        and the ORIGINAL package.json (renamed)
```

Detailed move list:
```bash
mkdir -p apps/web
mv src apps/web/
mv public apps/web/
mv next.config.ts apps/web/
mv postcss.config.mjs apps/web/
mv .env.local apps/web/
mv .env.local.example apps/web/
mv eslint.config.mjs apps/web/
cp tsconfig.json apps/web/  # copy, we'll edit both
```

**Step 4: Create apps/web/package.json**

Rename the web app and add workspace dependency:

```json
{
  "name": "@nestmatch/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestmatch/shared": "workspace:*",
    "next": "16.1.4",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@supabase/supabase-js": "^2.91.0",
    "@supabase/ssr": "^0.8.0",
    "@supabase/auth-helpers-nextjs": "^0.15.0",
    "stripe": "^20.2.0",
    "@stripe/stripe-js": "^7.3.0",
    "react-hook-form": "^7.71.1",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^4.3.6",
    "@react-google-maps/api": "^2.20.8",
    "@react-pdf/renderer": "^4.3.2",
    "resend": "^6.9.1",
    "lucide-react": "^0.562.0",
    "sonner": "^2.0.7",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "tsx": "^4.21.0"
  }
}
```

**Step 5: Update apps/web/tsconfig.json path alias**

Change `@/*` to resolve `./src/*` and add shared package reference:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@nestmatch/shared": ["../../packages/shared/src"],
      "@nestmatch/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

**Step 6: Verify web app still builds**

```bash
cd apps/web && npm run build
```

Expected: Build succeeds (may need path adjustments).

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: restructure into Turborepo monorepo with apps/web"
```

---

### Task 2: Create shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Move: `apps/web/src/types/database.ts` → `packages/shared/src/types/database.ts`
- Move: `apps/web/src/lib/utils.ts` (constants only) → `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/queries/index.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@nestmatch/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.91.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Copy Database types**

```bash
mkdir -p packages/shared/src/types
cp apps/web/src/types/database.ts packages/shared/src/types/database.ts
```

Keep the original in `apps/web` but re-export from shared:
```typescript
// apps/web/src/types/database.ts
export type { Database } from '@nestmatch/shared/types/database'
```

**Step 4: Create shared constants**

Extract platform-agnostic constants from `apps/web/src/lib/utils.ts`:

```typescript
// packages/shared/src/constants/index.ts
export const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
]

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  AB: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Grande Prairie', 'Airdrie', 'Fort McMurray', 'Spruce Grove', 'St. Albert'],
  BC: ['Vancouver', 'Victoria', 'Kelowna', 'Kamloops', 'Nanaimo', 'Prince George', 'Abbotsford', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam', 'Langley', 'Delta', 'Chilliwack'],
  MB: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie', 'Selkirk'],
  NB: ['Moncton', 'Saint John', 'Fredericton', 'Dieppe', 'Miramichi', 'Bathurst'],
  NL: ["St. John's", 'Mount Pearl', 'Corner Brook', 'Conception Bay South', 'Paradise', 'Grand Falls-Windsor'],
  NS: ['Halifax', 'Dartmouth', 'Sydney', 'Truro', 'New Glasgow', 'Glace Bay'],
  NT: ['Yellowknife', 'Hay River', 'Inuvik', 'Fort Smith'],
  NU: ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake'],
  ON: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville', 'Burlington', 'Oshawa', 'Barrie', 'St. Catharines', 'Cambridge', 'Kingston', 'Guelph', 'Thunder Bay', 'Waterloo', 'Brantford', 'Sudbury', 'Peterborough'],
  PE: ['Charlottetown', 'Summerside', 'Stratford', 'Cornwall'],
  QC: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Levis', 'Trois-Rivieres', 'Terrebonne', 'Saint-Jean-sur-Richelieu'],
  SK: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'Yorkton'],
  YT: ['Whitehorse', 'Dawson City', 'Watson Lake', 'Haines Junction'],
}

export const MAJOR_CITIES = Object.values(CITIES_BY_PROVINCE).flat()

export const LANGUAGES = [
  'English', 'French', 'Mandarin', 'Cantonese', 'Punjabi', 'Spanish',
  'Tagalog', 'Arabic', 'Hindi', 'Italian', 'Portuguese', 'German',
  'Vietnamese', 'Korean', 'Tamil', 'Urdu', 'Farsi', 'Polish',
  'Russian', 'Ukrainian', 'Greek', 'Dutch', 'Japanese', 'Bengali', 'Gujarati',
]

export const HOUSEHOLD_SITUATIONS = [
  { value: 'alone', label: 'Living alone' },
  { value: 'couple', label: 'Couple (no children)' },
  { value: 'single_parent', label: 'Single parent with children' },
  { value: 'couple_with_children', label: 'Couple with children' },
  { value: 'with_roommate', label: 'Looking with friend/roommate' },
]

export const BATHROOM_TYPES = [
  { value: 'ensuite', label: 'Ensuite (attached to room)', description: 'Private bathroom connected to your bedroom' },
  { value: 'private', label: 'Private (not attached)', description: 'Private bathroom for your use only, not connected to room' },
  { value: 'shared', label: 'Shared', description: 'Bathroom shared with other household members' },
]

export const BATHROOM_SIZES = [
  { value: 'full', label: 'Full bathroom', description: 'Toilet, sink, shower/tub' },
  { value: 'three_quarter', label: '3/4 bathroom', description: 'Toilet, sink, shower (no tub)' },
  { value: 'half', label: 'Half bathroom', description: 'Toilet and sink only' },
]

export const HELP_TASKS = [
  { value: 'garbage', label: 'Take out garbage/recycling' },
  { value: 'yard_work', label: 'Yard work/snow removal' },
  { value: 'groceries', label: 'Grocery shopping' },
  { value: 'cooking', label: 'Help with cooking/meals' },
  { value: 'cleaning', label: 'Light cleaning/tidying' },
  { value: 'errands', label: 'Running errands' },
  { value: 'companionship', label: 'Companionship/check-ins' },
  { value: 'pet_care', label: 'Pet care (walking/feeding)' },
  { value: 'tech_help', label: 'Tech support/computer help' },
  { value: 'transportation', label: 'Driving/transportation' },
]

export const AMENITIES = [
  'WiFi', 'Laundry (In-unit)', 'Laundry (Building)', 'Parking', 'Gym',
  'Balcony', 'Air Conditioning', 'Heating', 'Dishwasher', 'Furnished',
  'Unfurnished', 'Pet Friendly', 'Wheelchair Accessible', 'Storage',
  'Elevator', 'Security', 'Pool', 'Rooftop',
]
```

**Step 5: Create shared utility functions (platform-agnostic)**

```typescript
// packages/shared/src/utils/index.ts
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(date)
}

export function getCompatibilityColor(score: number): string {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  if (score >= 40) return 'orange'
  return 'red'
}

export function getCompatibilityLabel(score: number): string {
  if (score >= 80) return 'Great Match'
  if (score >= 60) return 'Good Match'
  if (score >= 40) return 'Fair Match'
  return 'Low Match'
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
```

**Step 6: Create barrel export**

```typescript
// packages/shared/src/index.ts
export * from './types/database'
export * from './constants'
export * from './utils'
```

**Step 7: Update apps/web imports to use shared where applicable**

Update `apps/web/src/lib/utils.ts` to re-export from shared:
```typescript
// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Web-specific utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export everything from shared
export {
  formatPrice, formatDate, getRelativeTime,
  getCompatibilityColor, getCompatibilityLabel,
  slugify, truncate,
  CANADIAN_PROVINCES, CITIES_BY_PROVINCE, MAJOR_CITIES,
  LANGUAGES, HOUSEHOLD_SITUATIONS, BATHROOM_TYPES,
  BATHROOM_SIZES, HELP_TASKS, AMENITIES,
} from '@nestmatch/shared'

// Web-specific (Tailwind classes)
export function getVerificationBadgeColor(level: 'basic' | 'verified' | 'trusted'): string {
  switch (level) {
    case 'trusted': return 'bg-green-100 text-green-800 border-green-200'
    case 'verified': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
```

**Step 8: Install dependencies and verify**

```bash
npm install
cd apps/web && npm run typecheck
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shared package with types, constants, and utils"
```

---

## Phase 2: Expo App Scaffold & Auth

### Task 3: Initialize Expo app

**Files:**
- Create: `apps/mobile/` (Expo project)
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app/_layout.tsx`

**Step 1: Create Expo app with Expo Router**

```bash
cd apps
npx create-expo-app@latest mobile --template tabs
cd mobile
```

**Step 2: Update apps/mobile/package.json**

Ensure name is `@nestmatch/mobile` and add workspace dependency:

```json
{
  "name": "@nestmatch/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestmatch/shared": "workspace:*",
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "19.0.0",
    "react-native": "0.77.0",
    "@supabase/supabase-js": "^2.91.0",
    "@tanstack/react-query": "^5.62.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "expo-secure-store": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-splash-screen": "~0.29.0",
    "react-native-safe-area-context": "~5.0.0",
    "react-native-screens": "~4.5.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-reanimated": "~3.16.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "~19.0.0"
  }
}
```

**Step 3: Configure app.json**

```json
{
  "expo": {
    "name": "NestMatch",
    "slug": "nestmatch",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "nestmatch",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#3b82f6"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.nestmatch.app",
      "infoPlist": {
        "NSCameraUsageDescription": "NestMatch needs camera access to take photos for your profile and listings.",
        "NSPhotoLibraryUsageDescription": "NestMatch needs photo library access to upload photos for your profile and listings.",
        "NSLocationWhenInUseUsageDescription": "NestMatch uses your location to find nearby listings and roommates."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#3b82f6"
      },
      "package": "com.nestmatch.app",
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "ACCESS_FINE_LOCATION"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

**Step 4: Configure tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@nestmatch/shared": ["../../packages/shared/src"],
      "@nestmatch/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Step 5: Create root layout**

```typescript
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../src/providers/auth-provider'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
})

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
```

**Step 6: Verify Expo app starts**

```bash
cd apps/mobile && npx expo start
```

Expected: Expo dev server starts, shows QR code.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo mobile app with Expo Router"
```

---

### Task 4: Supabase client for React Native

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/providers/auth-provider.tsx`

**Step 1: Create Supabase client with AsyncStorage**

```typescript
// apps/mobile/src/lib/supabase.ts
import 'react-native-url-polyfill/dist/setup'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Database } from '@nestmatch/shared'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Step 2: Create AuthProvider**

```typescript
// apps/mobile/src/providers/auth-provider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useRouter, useSegments } from 'expo-router'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

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

  // Redirect based on auth state
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

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**Step 3: Create .env file**

```bash
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://pmczeilurjuktvzmkice.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from .env.local>
```

**Step 4: Install additional dependency**

```bash
cd apps/mobile && npx expo install react-native-url-polyfill
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client and AuthProvider for mobile"
```

---

### Task 5: Auth screens (login + signup)

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/signup.tsx`

**Step 1: Auth layout**

```typescript
// apps/mobile/app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
```

**Step 2: Login screen**

```typescript
// apps/mobile/app/(auth)/login.tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../src/providers/auth-provider'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) Alert.alert('Error', error.message)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#3b82f6', textAlign: 'center', marginBottom: 8 }}>NestMatch</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32 }}>Find your perfect roommate</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 }}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 16 }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#3b82f6', fontSize: 14 }}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

**Step 3: Signup screen**

```typescript
// apps/mobile/app/(auth)/signup.tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../src/providers/auth-provider'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SignupScreen() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Check your email to confirm your account')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#3b82f6', textAlign: 'center', marginBottom: 8 }}>Join NestMatch</Text>
        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32 }}>Create your account</Text>

        <TextInput
          placeholder="Full name"
          value={name}
          onChangeText={setName}
          style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 }}
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 }}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 16 }}
        />

        <TouchableOpacity
          onPress={handleSignup}
          disabled={loading}
          style={{ backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Create Account</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#3b82f6', fontSize: 14 }}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

**Step 4: Test auth flow**

Run the app, verify login/signup screens render, auth redirects work.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add login and signup screens for mobile"
```

---

## Phase 3: Tab Navigation & Core Screens

### Task 6: Tab navigator layout

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx` (dashboard)

**Step 1: Create tab layout with 5 tabs**

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Home, Search, Compass, MessageCircle, User } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
```

**Step 2: Install lucide-react-native**

```bash
cd apps/mobile && npm install lucide-react-native react-native-svg
npx expo install react-native-svg
```

**Step 3: Create placeholder dashboard screen**

```typescript
// apps/mobile/app/(tabs)/index.tsx
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/providers/auth-provider'

export default function DashboardScreen() {
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // TODO: refetch data
    setRefreshing(false)
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
          Welcome back!
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          {user?.email}
        </Text>
        {/* Quick action cards will go here */}
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 48 }}>Dashboard coming soon</Text>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Step 4: Create placeholder screens for other tabs**

Create minimal placeholder files for each tab:
- `apps/mobile/app/(tabs)/search/index.tsx`
- `apps/mobile/app/(tabs)/discover.tsx`
- `apps/mobile/app/(tabs)/messages/index.tsx`
- `apps/mobile/app/(tabs)/profile/index.tsx`

Each should be a simple `<SafeAreaView>` with the screen name as text.

**Step 5: Verify tab navigation works**

Run app, verify 5 tabs appear and switch correctly.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add tab navigator with placeholder screens"
```

---

### Task 7: TanStack Query hooks for core data

**Files:**
- Create: `apps/mobile/src/hooks/use-profile.ts`
- Create: `apps/mobile/src/hooks/use-listings.ts`
- Create: `apps/mobile/src/hooks/use-conversations.ts`
- Create: `apps/mobile/src/hooks/use-groups.ts`

**Step 1: Profile hook**

```typescript
// apps/mobile/src/hooks/use-profile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/auth-provider'

export function useProfile(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user!.id] })
    },
  })
}
```

**Step 2: Listings hook**

```typescript
// apps/mobile/src/hooks/use-listings.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type ListingFilters = {
  city?: string
  province?: string
  minPrice?: number
  maxPrice?: number
  amenities?: string[]
}

export function useListings(filters: ListingFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('listings')
        .select('*, profiles!listings_user_id_fkey(name, profile_photo, verification_level)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 19)

      if (filters.city) query = query.eq('city', filters.city)
      if (filters.province) query = query.eq('province', filters.province)
      if (filters.minPrice) query = query.gte('price', filters.minPrice)
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined
      return allPages.length * 20
    },
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles!listings_user_id_fkey(name, profile_photo, verification_level, bio)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
```

**Step 3: Conversations hook**

```typescript
// apps/mobile/src/hooks/use-conversations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/auth-provider'

export function useConversations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user!.id])
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!conversationId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ conversationId, content, attachmentUrl, attachmentType, attachmentName }: {
      conversationId: string
      content: string
      attachmentUrl?: string
      attachmentType?: string
      attachmentName?: string
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          content,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
```

**Step 4: Groups hook**

```typescript
// apps/mobile/src/hooks/use-groups.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/auth-provider'

export function useGroups() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_renter_groups')
        .select('*, co_renter_members(user_id, role, profiles(name, profile_photo))')
        .order('created_at', { ascending: false })
      if (error) throw error
      // Filter to groups user is a member of
      return data?.filter(g =>
        g.co_renter_members?.some((m: { user_id: string }) => m.user_id === user!.id)
      )
    },
    enabled: !!user,
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_renter_groups')
        .select('*, co_renter_members(*, profiles(name, profile_photo, verification_level))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TanStack Query hooks for profiles, listings, messages, groups"
```

---

## Phase 4: Feature Screens (build each screen one at a time)

> Each task below follows the same pattern: create the screen file, wire up the data hook, build the UI with React Native components, test on device, commit.
> Due to the size of this project, the remaining tasks are described at a higher level. Each should be implemented one screen at a time.

### Task 8: Dashboard screen (full implementation)
- Profile completion card
- Quick action grid (6 buttons linking to key screens)
- Activity stats (listings, matches, messages)
- Uses `useProfile` hook

### Task 9: Search/Listings screen
- Search bar with filters (city, province, price range, amenities)
- List view with `FlatList` and infinite scroll via `useListings`
- Map view toggle using `react-native-maps`
- Pull-to-refresh
- Tap to navigate to listing detail

### Task 10: Listing detail screen
- Photo carousel with `FlatList` horizontal
- Price, location, amenities, description
- Owner profile card with verification badge
- Contact / message button
- Save/unsave toggle

### Task 11: Create/edit listing screen
- Multi-step form (details → photos → amenities → preview)
- Image picker with `expo-image-picker`
- Upload to Supabase storage
- Google Places autocomplete for address

### Task 12: Discover/matching screen
- Swipe card interface using `react-native-gesture-handler` + `Reanimated`
- Tabs: Suggestions, People, Groups (matching web)
- Compatibility score display
- Like/pass actions with haptic feedback
- Uses Supabase RPC `calculate_compatibility`

### Task 13: Messages list screen
- Conversation list with last message preview
- Unread count badges
- Online status indicators
- Supabase Realtime subscription for new messages
- Search conversations

### Task 14: Chat thread screen
- Message bubbles with timestamps
- Text input with send button
- Image/file attachment via `expo-image-picker`
- GIF picker (calls same GIF API or Giphy directly)
- Emoji picker
- Schedule meetup modal
- Read receipts
- Supabase Realtime for live messages
- `KeyboardAvoidingView` for proper keyboard handling

### Task 15: Profile screen (view + edit)
- Profile photo with edit button
- Bio, age, occupation, languages
- Verification badges
- Lifestyle quiz results
- Edit mode with form inputs
- Photo upload

### Task 16: Lifestyle quiz screen
- 12-question quiz matching web
- Progress bar
- Radio/checkbox inputs
- Save to `lifestyle_responses` table

### Task 17: Groups screens (list + detail)
- Group list with member avatars
- Create group form
- Group detail with member management
- Invitation system
- Budget display

### Task 18: Expenses screen
- Expense list grouped by group
- Add expense form (amount, description, split type)
- Pay share button (Stripe)
- Balance summary

### Task 19: Payments screen
- Payment history list
- Payment methods management
- Stripe payment sheet integration
- Connect onboarding via `expo-web-browser`

### Task 20: Calendar/events screen
- Monthly calendar view
- Event list
- Create event form
- Event status (proposed/accepted/declined)

### Task 21: Resources screens
- Resource categories grid
- Resource list with search
- Guide detail (rendered markdown or HTML)
- FAQ accordion
- Bookmarks
- Rent calculator tool
- Move-in checklist

### Task 22: Rental agreement generator
- Clause selection
- PDF generation via `expo-print`
- Share via `expo-sharing`

### Task 23: Settings screen
- Account settings
- Notification preferences (per-type toggles)
- Payment settings
- Privacy (blocked users)
- Sign out
- Delete account

### Task 24: Verification screen
- Email verification status
- Phone verification (Twilio via Edge Function)
- ID verification (Certn via Edge Function)
- Verification level display

### Task 25: Reviews screen
- Reviews received/given tabs
- Multi-dimensional rating display
- Write review form

### Task 26: Admin screens (conditional on is_admin)
- Admin dashboard with stats
- Resource management CRUD
- FAQ management CRUD
- Category management
- Question moderation
- Clause management

---

## Phase 5: Push Notifications

### Task 27: Push notification infrastructure

**Files:**
- Create: `supabase/migrations/019_push_tokens.sql`
- Create: `apps/mobile/src/lib/notifications.ts`
- Create: `supabase/functions/send-push/index.ts` (Edge Function)

**Step 1: Database migration**

```sql
-- 019_push_tokens.sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Step 2: Notification registration in app**

```typescript
// apps/mobile/src/lib/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync()).data

  // Store in database
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
    platform: Platform.OS as 'ios' | 'android',
  }, { onConflict: 'token' })

  return token
}
```

**Step 3: Supabase Edge Function for sending push notifications**

```typescript
// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, title, body, data } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0 }))

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data,
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  const result = await response.json()
  return new Response(JSON.stringify(result))
})
```

**Step 4: Wire up notification registration in AuthProvider on login**

**Step 5: Add deep link handling for notification taps**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add push notification infrastructure"
```

---

## Phase 6: Supabase Edge Functions

### Task 28: Stripe Edge Functions
- `create-payment-intent` — creates Stripe PaymentIntent
- `create-connect-account` — onboards seller to Stripe Connect
- `stripe-webhook` — handles Stripe webhooks

### Task 29: Verification Edge Functions
- `send-phone-verification` — sends Twilio SMS
- `confirm-phone-verification` — verifies code
- `initiate-id-verification` — starts Certn check

---

## Phase 7: Build & Deploy

### Task 30: EAS Build configuration

**Files:**
- Create: `apps/mobile/eas.json`

```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@email.com", "ascAppId": "your-app-id" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

### Task 31: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/mobile-ci.yml`
- Create: `.github/workflows/mobile-build.yml`

### Task 32: App store assets
- App icons (1024x1024 for iOS, adaptive icon for Android)
- Splash screen
- App store screenshots
- Privacy policy URL
- Store descriptions

---

## Execution Order Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-2 | Monorepo setup, shared package |
| 2 | 3-5 | Expo scaffold, Supabase client, auth screens |
| 3 | 6-7 | Tab navigation, data hooks |
| 4 | 8-26 | All feature screens (one at a time) |
| 5 | 27 | Push notifications |
| 6 | 28-29 | Edge Functions |
| 7 | 30-32 | Build, CI/CD, store submission |

**Total: 32 tasks across 7 phases.**

Phase 1-3 are foundational and must be done first. Phase 4 tasks (8-26) can be done in any order but the suggested order prioritizes the core user journey. Phases 5-7 can be done in parallel with later Phase 4 tasks.
