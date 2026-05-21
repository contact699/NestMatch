# Mobile redesign — phase 2

**Date:** 2026-05-21
**Scope:** Native-mobile redesign of all existing mobile screens, adopting the web app's brand identity (navy/teal palette, Manrope/Inter typography), plus critical bug fixes that block usability.

## Problem

The Android preview APK now boots (after the React-dedup fix in the previous phase), but the user-facing app has three classes of problems:

1. **Visual identity drift.** The mobile screens use generic cool-slate-blue Tailwind-ish hex colors and system fonts. The web app uses a distinct brand identity: deep navy primary, teal secondary, mint accents, light gray background, Manrope display font, Inter body font. The two products do not look like the same brand.
2. **Broken core screens.** `Search` shows "Failed to load listings"; `Profile` shows "Failed to load profile"; Home's "Quick Action" cards are inert `<View>`s that don't navigate anywhere.
3. **Sub-screens are scaffolds.** Verify, Settings, Edit Profile, Listing Detail/Create, Conversation, Login/Signup all exist but use the same generic styling and need polish to match the new identity.

## Out of scope

The following were considered for this spec but explicitly deferred to follow-up specs to keep this one shippable:

- **Push notifications** (needs backend infrastructure + Expo push token plumbing)
- **Pull-to-refresh on tabs**
- **Bottom-sheet filters on Search**
- **New tabs/screens** that exist on web but not mobile: Groups, Saved listings, Payments, Resources, Dashboard tools

## Goals

- Single source of truth for design tokens that mirrors `apps/web/src/app/globals.css`
- Reusable typed component library so subsequent screens cost roughly half as much to redesign
- Native-mobile UX patterns (no desktop-density layouts crammed onto a phone)
- All 11 existing screens render in the new identity
- Search/Profile/Home regressions resolved
- Splash screen background updated to match the new identity (currently `#fcf2d9` — cream — wrong)

## Non-goals

- Web parity at the *feature* level (Groups, Saved, etc.)
- Visual parity with any specific web layout (mobile gets mobile-first layouts that share the brand, not a phone-shaped clone of the desktop UI)
- Performance optimization beyond what's needed to ship (lazy loading, image CDN tuning, etc.)
- Refactoring data-layer code beyond what the bug fixes require

## Design system foundation

### Tokens

New file `apps/mobile/src/theme/tokens.ts` exports typed token objects sourced from the web's CSS variables.

```ts
export const colors = {
  primary: '#002045',
  onPrimary: '#ffffff',
  primaryContainer: '#1a365d',
  onPrimaryContainer: '#86a0cd',

  secondary: '#006a60',
  onSecondary: '#ffffff',
  secondaryContainer: '#8cf5e4',
  onSecondaryContainer: '#007166',

  tertiaryContainer: '#562a00',
  tertiaryFixed: '#ffdcc4',

  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',

  onSurface: '#191c1d',
  onSurfaceVariant: '#43474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',

  successContainer: '#8cf5e4',
  onSuccessContainer: '#006a60',
} as const

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const

export const radii = { sm: 8, md: 12, lg: 14, xl: 18, full: 9999 } as const

export const shadows = {
  sm: { shadowColor: '#191c1d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#191c1d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#191c1d', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 6 },
} as const

export const typography = {
  display: { fontFamily: 'Manrope_700Bold' },
  displayMedium: { fontFamily: 'Manrope_600SemiBold' },
  body: { fontFamily: 'Inter_400Regular' },
  bodyMedium: { fontFamily: 'Inter_500Medium' },
  bodyBold: { fontFamily: 'Inter_600SemiBold' },
} as const
```

### Fonts

New file `apps/mobile/src/theme/fonts.ts` uses `expo-font` (already a transitive dep via expo) to load Manrope + Inter and gates the splash screen on load via `expo-splash-screen.preventAutoHideAsync()` until fonts are ready.

We use `@expo-google-fonts/manrope` and `@expo-google-fonts/inter` packages so we don't have to ship font files in the repo.

### Reusable components

New folder `apps/mobile/src/components/ui/` with:

- `Screen.tsx` — `SafeAreaView` + background color + optional `scroll` prop wrapping a `ScrollView`
- `Card.tsx` — white surface, `radii.lg`, `shadows.sm`, optional `interactive` prop using `Pressable`
- `Badge.tsx` — variants: `success` (mint bg, teal text), `info` (light navy bg, navy text), `warning` (peach bg, dark brown text), `neutral` (gray)
- `Button.tsx` — variants: `primary` (navy bg, white text), `secondary` (mint bg, teal text), `outline` (navy border, navy text), `ghost`. Sizes: `sm`, `md`, `lg`. Uses `Pressable` with `android_ripple` for tactile feedback.
- `Input.tsx` — rounded, `outlineVariant` border, `primary` focus border, optional left icon + error text
- `Avatar.tsx` — circular `Image` with initials fallback (mint gradient + onSecondaryContainer text)
- `Chip.tsx` — pressable, two states (active = navy bg/white text, inactive = white bg/navy text + outline border)
- `SectionHeader.tsx` — `View` with display-bold title left, optional "SEE ALL ›" link right

All components accept `style` prop for one-off overrides; tokens are imported from `@/theme/tokens`. (We'll add an alias to `tsconfig.json` for `@/` → `apps/mobile/src/`.)

### Splash

Update `apps/mobile/app.json`:
- `expo.splash.backgroundColor` `#fcf2d9` → `#f8f9fa`
- `expo.android.adaptiveIcon.backgroundColor` `#fcf2d9` → `#f8f9fa`
- (icon image itself stays — it's the wordmark, not background)

## Bug fixes

Each is a 1-line change but blocks usability:

1. **`apps/mobile/app/(tabs)/profile.tsx:41`** — change `.eq('id', user!.id)` to `.eq('user_id', user!.id)`. Profile rows are keyed by `user_id` (the auth UUID); `id` is the row PK. The query currently never matches.

2. **`apps/mobile/app/(tabs)/search.tsx`** — the query filters on `.eq('status', 'active')` then `.order('created_at')`. Two suspects:
   - The `listings.status` column may not exist on the deployed schema (the web app's listings use a different status column or value).
   - RLS on `listings` may require authed access via a service role rather than anon key.
   - **Diagnostic step in implementation:** add a `console.error` log of the actual Supabase error message during the first iteration; investigate based on what we see.

3. **`apps/mobile/app/(tabs)/index.tsx`** — the two "Quick Action" cards are bare `<View>`s. Wrap each in `Pressable` and navigate:
   - "Browse Listings" → `router.push('/(tabs)/search')`
   - "Complete Your Profile" → `router.push('/edit-profile')`
   - When the redesign lands, these specific cards are replaced by the feed sections (which become the new entry points), so the fix and the redesign land together.

## Screen-by-screen design

### Home tab (`app/(tabs)/index.tsx`)

**Layout** (sectioned feed, validated in brainstorm):

```
Screen
├── Header
│   ├── Display title: "Find your nest"
│   └── Subtitle: "Roommates and listings curated for you, {firstName}"
├── Search bar (collapsed, taps → /(tabs)/search)
├── Category chips (horizontal scroll): All · Roommates · Listings · Co-living
├── SectionHeader "Roommates near you" + "SEE ALL ›" → /(tabs)/search?type=roommates
├── Horizontal FlatList of profile cards (height ~ 160px)
│   └── Each card: Avatar (gradient bg) · name+age · occupation+neighborhood · "X% match" badge
├── SectionHeader "Listings near you" + "SEE ALL ›" → /(tabs)/search?type=listings
├── Vertical list of listing cards
│   └── Each card: 90px photo header (with heart icon top-right) · title · meta · price (teal)
└── FAB (bottom right): "+" → /listing/create
```

**Data sources:**
- Roommates: `profiles` table, filtered by `verification_level != 'basic'` and `user_id != current_user`, ordered by created_at desc, limit 10. Match % is mocked at 90-99% for now (real matching algorithm out of scope; see follow-up spec).
- Listings: existing `listings` query (once bug-fixed).

**Empty state:** if no roommates or no listings, show a friendly message + CTA: "Be among the first — complete your profile and start matching." Card variant of empty state.

### Search tab (`app/(tabs)/search.tsx`)

**Layout:**

```
Screen
├── Header: "Discover"
├── Segmented control: [ Listings | Roommates ]
├── Input (search by title/city/name)
├── Filter chip row (city, price range, lifestyle) — taps a chip toggles an inline filter editor
└── FlatList of results (listing card OR profile card depending on segment)
```

**State:** segment, query string, active filters (start empty). Query is keyed on the tuple `(segment, query, filters)`.

**Bug-fix gate:** the diagnostic mentioned in §"Bug fixes" runs here. Once we know the error, we either correct the column/filter, add the missing RLS-friendly query, or pivot to using a server endpoint.

### Messages tab (`app/(tabs)/messages.tsx`)

Existing data logic (lines 24-101 of current file) stays. Only visuals change:
- Conversation row: Avatar + (name, last message preview, time) + unread count Badge if > 0
- Empty state when no conversations: "No conversations yet. Start one by tapping a listing or profile." with CTA
- Use `Card` for each row with rounded corners and subtle shadow; rows separated by 8px gap (no dividers).

### Profile tab (`app/(tabs)/profile.tsx`)

**Layout:**

```
Screen
├── Header card (white)
│   ├── Avatar (large, 80px)
│   ├── Name (display)
│   ├── Email (variant text)
│   └── Verification Badge (mint variant if verified)
├── Trust Quotient mini-card (compact version of web's hero)
│   ├── Label "TRUST QUOTIENT"
│   ├── % (large display)
│   └── Progress bar (mint fill on outlineVariant track)
├── Nav rows in a single Card:
│   ├── My Listings → /my-listings (or filter the search by current user — defer if no screen yet)
│   ├── Saved → /saved (placeholder if screen doesn't exist yet)
│   ├── Trust Center → /verify
│   └── Settings → /settings
└── Sign Out button (outline danger variant)
```

After the bug fix, `profile` data will load; the rest is presentational.

### Verify (`app/verify.tsx`) — Trust Center

Mirror the web's Trust Center mobile-first:

```
Screen (scrollable)
├── Back link "← Profile"
├── "SECURE PROFILE" badge (info variant)
├── Display title "Trust Center"
├── Subtitle (matches web copy)
├── Identity card (compact): photo + name + member since + city/occupation
├── Trust Quotient hero card (full width, navy bg, mint progress)
├── Stacked check cards (one per check):
│   ├── Government ID (with current status: PENDING/VERIFIED/CTA)
│   ├── Phone Number
│   ├── Credit Standing
│   └── Background Check
└── Packages section (Save $5 / Save $15) — same UI shape as web's
```

Reuses the existing data-fetch logic in current `verify.tsx`. CTAs (`Start Verification — $25`, etc.) call existing `/api/verify/checkout`.

### Listing Detail (`app/listing/[id].tsx`)

```
Screen
├── Photo carousel (full-bleed, swipeable, dots indicator)
├── Back chevron + Heart toggle (absolute overlay on photos)
├── Title (display)
├── Price (teal display medium) + "/mo"
├── City + "·" + listing type
├── Quick facts row (icons + values): Bed · Bath · Furnished · Available date
├── Description
├── Amenities chips
├── Host card: Avatar + name + verification badge + match % (if applicable) + "Message" button
└── Sticky bottom bar: "Message host" primary button
```

Most components already exist in current file; the redesign is restyling using new tokens + components.

### Listing Create (`app/listing/create.tsx`)

Multi-step form using the new `Input`, `Button`, `Chip` components:

1. **Basics** — title, type (chip group), price, city
2. **Details** — bed/bath count, available date, description (textarea)
3. **Photos** — up to N images via `expo-image-picker`, with reorder
4. **Review** — show summary, primary "Publish" button

Progress dots at top.

### Edit Profile (`app/edit-profile.tsx`)

Sectioned form:

- **Basics** — name, age, occupation
- **Lifestyle** — cleanliness, schedule, smoking/cannabis/alcohol, pets (chip groups for each)
- **About** — bio (textarea), languages
- **Location** — city, province
- **Budget** — budget_min, budget_max

Sticky "Save" button at bottom. Optimistic UI on save.

### Settings (`app/settings.tsx`)

Single-card list of rows:

- **Account** — email, change password, sign out
- **Notifications** — placeholder (push not in this spec)
- **Privacy** — toggle for `show_verification_badges`
- **About** — version, terms, privacy policy
- **Danger zone** — delete account (with confirmation modal)

### Conversation (`app/conversation/[id].tsx`)

Standard chat UI:

- Header bar (Back + Avatar + name)
- Message list (inverted FlatList for chronological reverse)
  - Sent: navy bg, white text, right-aligned, max 80% width
  - Received: white bg with subtle border, dark text, left-aligned
  - Sender avatar shown on first message of a sequence only
  - Relative timestamp shown on group breaks (>5min gap)
- Input bar (sticky bottom): text input + send button (teal when text present)

### Auth (`app/(auth)/login.tsx` + `signup.tsx`)

Clean centered form:

- NestMatch wordmark (logo font — see typography section)
- Display title ("Welcome back" / "Create your account")
- Email + password inputs
- Primary CTA
- "Forgot password?" / "Already have an account?" link
- Divider "or continue with"
- "Continue with Google" outline button — uses `expo-auth-session` + `expo-web-browser` (already deps), which handles the OAuth flow via a system browser / Custom Tab. No in-app-browser detection needed on native mobile (that's a web-only problem).

### Navigation (`app/(tabs)/_layout.tsx`)

4 tabs. Update colors:
- Active tint = `colors.primary` (`#002045`)
- Inactive tint = `colors.outline` (`#74777f`)
- Tab bar background = `colors.surfaceContainerLowest` (`#ffffff`)
- Top border = `colors.outlineVariant` (`#c4c6cf`), 0.5px width

Tab labels use `typography.bodyMedium` at 11px.

## Implementation order

1. **Foundation** — `tokens.ts`, `fonts.ts`, all UI components, splash background fix, tsconfig path alias. Compiles + builds clean APK but visually identical to today.
2. **Bug fixes** — Profile `.eq` fix; Search error diagnostic + fix; Home Quick Action links. Visible win, fast.
3. **Tab screens** — Home → Search → Messages → Profile, in that order. Each compiles + ships independently.
4. **Sub-screens** — Verify → Listing Detail → Edit Profile → Settings → Conversation → Listing Create → Auth. Each compiles + ships independently.

The plan generated by `writing-plans` will break each phase into smaller TDD-friendly steps with checkpoints.

## Open risks

- **Manrope/Inter font load** — has to gate splash. If `useFonts` fails, app falls back to system fonts; we accept that gracefully rather than hard-crash. Verified by writing a fallback in `fonts.ts`.
- **Match % is mocked.** Real roommate matching needs the lifestyle responses table + scoring algorithm. Out of scope for this spec; placeholder until the matching spec lands.
- ~~In-app browser detection on React Native.~~ Removed from scope — `expo-web-browser` already opens the system browser/Custom Tab for OAuth, so the FB Messenger webview problem doesn't apply on native.
- **Existing screens currently use raw hex colors.** Some screens will need fairly heavy edit churn just to replace colors. To keep diffs reviewable, each screen's redesign should be a single commit so the diff is "old styles → new styles + small layout updates" cleanly.

## Success criteria

- 17/17 `expo-doctor` checks pass after foundation lands
- Mobile `tsc --noEmit` clean across the whole redesign
- Preview APK boots without crashing, lands on Home with the new identity, and all 4 tabs render their screens (no "Failed to load" errors)
- Visiting every sub-screen renders in the new tokens (no orphan blue colors)
- The web's brand recognition test: a user looking at any mobile screen can tell it's the same product as the web app
