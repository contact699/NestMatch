# NestMatch Mobile Apps Design

**Date:** 2026-02-20
**Status:** Approved
**Approach:** React Native + Expo, direct Supabase client, monorepo

## Summary

Build fully native iOS and Android apps using React Native with Expo in a Turborepo monorepo alongside the existing Next.js web app. The mobile app connects directly to Supabase (bypassing Next.js API routes) and shares types, schemas, and query logic via a shared package. Full feature parity with the web app at launch.

## Monorepo Structure

```
nestmatch-app/
├── apps/
│   ├── web/              # existing Next.js app (moved from root)
│   └── mobile/           # new Expo app
├── packages/
│   └── shared/           # shared types, schemas, Supabase queries
│       ├── types/
│       │   └── database.ts
│       ├── schemas/       # Zod validation schemas
│       ├── queries/       # Supabase query builders
│       └── constants/
├── package.json           # root workspace config
└── turbo.json             # Turborepo build orchestration
```

## Navigation

**5 bottom tabs:** Home, Search, Discover, Messages, Profile

```
apps/mobile/app/
├── (auth)/
│   ├── login.tsx
│   └── signup.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx              # dashboard/home
│   ├── search/
│   │   └── index.tsx          # listing search + map
│   ├── discover.tsx           # roommate matching (swipe cards)
│   ├── messages/
│   │   ├── index.tsx          # conversation list
│   │   └── [id].tsx           # chat thread
│   └── profile/
│       ├── index.tsx          # own profile
│       └── edit.tsx           # edit profile
├── listings/
│   ├── [id].tsx               # listing detail
│   ├── [id]/edit.tsx
│   └── new.tsx
├── groups/
│   ├── index.tsx
│   └── [id].tsx
├── roommates.tsx
├── quiz.tsx
├── expenses.tsx
├── payments.tsx
├── calendar.tsx
├── resources/
├── settings/
│   ├── index.tsx
│   └── payments.tsx
├── verify.tsx
├── reviews.tsx
└── admin/
```

Native patterns: stack navigation within tabs, swipe-back (iOS), pull-to-refresh, native keyboard avoidance, haptic feedback on match actions.

## Data Layer & Auth

**Authentication:**
- `@supabase/supabase-js` with `AsyncStorage` adapter for token persistence
- `AuthProvider` React context for session management
- Deep linking for email verification (`nestmatch://verify`)
- Optional biometric unlock via `expo-local-authentication`

**Data fetching:**
- TanStack Query (React Query) for caching, background refetch, optimistic updates
- Direct Supabase client calls
- Supabase Realtime subscriptions for messaging, online status, match notifications

**Offline support:**
- TanStack Query cache persistence via `AsyncStorage`
- Read-from-cache-first for listings, profiles, messages
- Queue mutations when offline, sync on reconnect

**Server-side logic (Supabase Edge Functions):**
- Stripe payment intents & Connect onboarding
- Twilio phone verification
- Certn ID verification webhooks
- Push notification dispatch

## Push Notifications

**Provider:** Expo Push Notifications (APNs + FCM)

**Database addition:**
```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Notification types:**
- New message (sender name + preview)
- New match
- Group invitation
- Expense added
- Payment received
- Verification complete

**Behavior:**
- Deep-link to relevant screen on tap
- Badge count for unread messages
- In-app banners when foregrounded
- Per-type toggle in settings

## Native Features & Integrations

| Feature | Library |
|---------|---------|
| Maps | `react-native-maps` (Apple Maps iOS, Google Maps Android) |
| Location | `expo-location` |
| Camera/Photos | `expo-image-picker`, `expo-camera` |
| Image compression | `expo-image-manipulator` |
| Payments | `@stripe/stripe-react-native` |
| PDF generation | `expo-print` + `expo-sharing` |
| Haptics | `expo-haptics` |
| Biometrics | `expo-local-authentication` |
| Deep links | `expo-linking` (`nestmatch://`) |
| Secure storage | `expo-secure-store` |
| Clipboard | `expo-clipboard` |

**App Store accounts needed:**
- Apple Developer ($99/year)
- Google Play Developer ($25 one-time)

## Build, Deploy & Testing

**Builds:** EAS Build (cloud-based, no local Xcode/Android Studio needed)
- Development builds for testing with native modules
- Preview builds for internal testing (TestFlight / internal track)
- Production builds for store submission

**OTA Updates:** EAS Update for JS bundle hot-fixes without store review

**Testing:**
- Jest + React Native Testing Library (unit/component)
- Maestro for E2E test flows (YAML-based)

**CI/CD (GitHub Actions):**
- On PR: lint, typecheck, unit tests
- On merge to main: EAS Build (preview) → distribute to testers
- On release tag: EAS Build (production) → submit to stores

**Environment config:**
- `eas.json` with `development`, `preview`, `production` profiles
- EAS Secrets for environment variables
