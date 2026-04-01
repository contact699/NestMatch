# Mobile App Phase 2: Auth Screens & Tab Navigator

## Overview

Build the authentication flow and main navigation skeleton for the NestMatch Expo mobile app. This phase makes the app functional enough to log in, sign up, reset a password, and navigate between 5 placeholder tabs.

**Branch:** `feat/mobile-app` (continues from existing scaffold)

**Builds on:**
- Expo app scaffold with SDK 54, Expo Router v6
- Supabase client (`apps/mobile/src/lib/supabase.ts`) with AsyncStorage persistence
- Auth provider (`apps/mobile/src/providers/auth-provider.tsx`) with session management and auto-redirect
- `app.json` with `"scheme": "nestmatch"` for deep linking

## File Structure

```
apps/mobile/app/
├── _layout.tsx                    # Root layout (providers, splash)
├── index.tsx                      # Entry redirect
├── reset-password.tsx             # Deep link target: nestmatch://reset-password
├── (auth)/
│   ├── _layout.tsx                # Auth stack layout
│   ├── login.tsx                  # Login screen
│   ├── signup.tsx                 # Signup screen
│   └── forgot-password.tsx        # Forgot password screen
└── (tabs)/
    ├── _layout.tsx                # Tab navigator (5 tabs)
    ├── index.tsx                  # Home/Dashboard placeholder
    ├── search.tsx                 # Search placeholder
    ├── discover.tsx               # Discover placeholder
    ├── messages.tsx               # Messages placeholder
    └── profile.tsx                # Profile placeholder
```

12 new files total.

## Root Layout & Providers

`app/_layout.tsx` wraps the app with three providers in this order:

1. **GestureHandlerRootView** — required by react-native-gesture-handler
2. **QueryClientProvider** — TanStack React Query client
3. **AuthProvider** — existing provider, handles session state and auto-redirect between `(auth)` and `(tabs)` groups

Uses `expo-splash-screen` to keep the splash visible until auth state resolves (the `loading` flag in AuthProvider), preventing a flash of login screen for already-authenticated users.

`app/index.tsx` is a simple entry point that redirects based on auth state. Acts as a fallback before AuthProvider's `useEffect` redirect kicks in.

No custom fonts or theme system in this phase — system defaults only.

## Auth Screens

### Login (`(auth)/login.tsx`)

- Email and password fields with basic validation (non-empty, valid email format)
- "Sign In" button with loading spinner during submission
- "Sign in with Google" button — triggers OAuth flow (see Google OAuth section)
- "Forgot password?" link → navigates to `/(auth)/forgot-password`
- "Don't have an account? Sign up" link → navigates to `/(auth)/signup`
- Error display below form (red text) for invalid credentials
- Calls existing `signIn(email, password)` from AuthProvider

### Signup (`(auth)/signup.tsx`)

- Fields: full name, email, password, confirm password
- Password validation matching web app rules: 8+ characters, at least one uppercase, one lowercase, one number
- Password match validation between password and confirm fields
- "Create Account" button with loading spinner
- "Sign up with Google" button (same OAuth flow)
- Success state: replaces form with "Check your email to verify your account" message
- Error handling: catches duplicate email (Supabase returns user with empty identities array)
- "Already have an account? Sign in" link
- Calls existing `signUp(email, password, name)` from AuthProvider

### Forgot Password (`(auth)/forgot-password.tsx`)

- Email field
- "Send Reset Link" button with loading spinner
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'nestmatch://reset-password' })`
- Success state: "Check your email for a reset link" message
- Back to login link

### Reset Password (`reset-password.tsx`)

This screen lives outside the `(auth)` group because it's a deep link target — the user arrives here from an email link, already authenticated via the reset token.

- New password and confirm password fields
- Same password rules as signup (8+ chars, uppercase, lowercase, number)
- "Update Password" button — calls `supabase.auth.updateUser({ password })`
- On success: redirects to `/(tabs)`
- Error display for mismatched passwords or API errors

## Tab Navigator

`(tabs)/_layout.tsx` uses expo-router's `Tabs` component with a bottom tab bar:

| Tab | Icon (lucide-react-native) | Label |
|-----|---------------------------|-------|
| index | `Home` | Home |
| search | `Search` | Search |
| discover | `Users` | Discover |
| messages | `MessageCircle` | Messages |
| profile | `User` | Profile |

- Active tab color: `#3b82f6` (brand blue, matches splash background)
- Inactive tab color: `#9ca3af` (gray-400)
- Tab bar: white background, subtle top border (`#e5e7eb`)

Each tab screen is a placeholder: centered tab name with a short description (e.g., "Search for listings coming soon"). These get replaced with real content in later phases.

## Google OAuth

Uses Supabase's web-based OAuth flow — no native Google Sign-In SDK needed. Works in Expo Go without a custom dev build.

### Implementation

1. **Auth provider** gets a new `signInWithGoogle()` method:
   - Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'nestmatch://', skipBrowserRedirect: true } })`
   - Opens the returned `url` via `expo-linking.openURL()` to launch the system browser
   - Returns the URL for the caller (login/signup screens call this method)

2. **Root layout** handles the OAuth return:
   - Listens for incoming deep link URLs via `expo-linking`
   - When a URL arrives with auth tokens (hash fragment), extracts the session
   - Calls `supabase.auth.setSession()` to complete authentication
   - AuthProvider's existing `onAuthStateChange` listener picks up the new session and redirects to `/(tabs)`

3. **No additional configuration needed:**
   - `app.json` already has `"scheme": "nestmatch"` for deep link handling
   - Google OAuth provider is already configured in Supabase dashboard (used by web app)
   - Supabase handles the provider redirect server-side

### Auth Provider Type Update

```typescript
type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}
```

## Styling Approach

- `StyleSheet.create()` — standard React Native, no external UI library
- Primary color: `#3b82f6` (blue-500)
- Background: `#ffffff` (white)
- Text: `#111827` (gray-900)
- Secondary text: `#6b7280` (gray-500)
- Error text: `#ef4444` (red-500)
- Border: `#e5e7eb` (gray-200)
- Input fields: bordered, rounded corners, consistent padding
- Buttons: full-width, rounded, with disabled/loading states

## Auth Group Layout

`(auth)/_layout.tsx` uses a `Stack` navigator with no header (auth screens render their own titles). Provides a clean full-screen layout for the auth forms.

## Dependencies

No new packages needed — everything required is already in `apps/mobile/package.json`:
- `expo-router` — routing and navigation
- `expo-linking` — deep link handling and OAuth redirect
- `expo-splash-screen` — splash screen control
- `react-native-gesture-handler` — gesture support
- `react-native-screens` — native screen containers
- `react-native-safe-area-context` — safe area insets
- `lucide-react-native` + `react-native-svg` — tab icons
- `@tanstack/react-query` — query client provider
- `@supabase/supabase-js` — auth methods
- `@react-native-async-storage/async-storage` — session persistence

## Out of Scope

- Custom fonts or theme system
- Real content for tab screens (placeholder only)
- Push notifications
- Biometric authentication
- Email verification screen
- Any feature screens beyond navigation skeleton
