# Mobile Home Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the utilitarian mobile home tab with a variant-aware hero (signals / onboarding / discovery) that carries the web landing's brand voice while serving the authed user.

**Architecture:** One `Hero` component with content driven by `useHomeSignals`. A pure `selectVariant` function decides which content variant renders based on five signal queries against existing Supabase tables. Visual primitives (`HighlightedText`, `AmbientBackground`) wrap the headline and the hero background to match the web's mint-highlighter + ambient-bloom aesthetic.

**Tech Stack:** Expo Router 6 / React Native 0.81 / TanStack Query 5 / Supabase JS client / lucide-react-native / expo-linear-gradient (new) / tsx for table-driven unit test.

**Spec:** `docs/superpowers/specs/2026-05-27-mobile-home-hero-redesign-design.md`

**Branch:** `feat/mobile-home-hero-redesign` (off `main` — see auto-memory `project_master_main_branch_split` for why not `master`)

---

## Pre-work — branch

- [ ] **Step 1: Create the feature branch from main**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app checkout main
git -C c:/Users/computer/Downloads/nestmatch-app pull --ff-only
git -C c:/Users/computer/Downloads/nestmatch-app checkout -b feat/mobile-home-hero-redesign
```

Expected: clean working tree on `feat/mobile-home-hero-redesign`.

---

## Task 1: Add `expo-linear-gradient` + `tsx` devDep

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install runtime + dev deps**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile
npx expo install expo-linear-gradient
npm install --save-dev tsx
```

`npx expo install` is preferred over `npm install` for Expo SDK modules — it pins the version compatible with the installed Expo SDK (54.x).

- [ ] **Step 2: Add a `test:variant` npm script**

In `apps/mobile/package.json`, under `"scripts"`, add:

```json
"test:variant": "tsx src/lib/home/__tests__/use-home-signals.test.ts"
```

Place it alphabetically near the other `maestro:*` scripts.

- [ ] **Step 3: Sanity check the install**

```bash
node -e "require('expo-linear-gradient')"
```

Expected: no output, no error.

- [ ] **Step 4: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/package.json apps/mobile/package-lock.json
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "chore(mobile): add expo-linear-gradient + tsx for home hero work"
```

---

## Task 2: Mobile mirror of flagship-cities config

**Files:**
- Create: `apps/mobile/src/lib/cities.ts`

The web's `apps/web/src/lib/cities.ts` carries a lot of SEO baggage (FAQs, intros) that mobile doesn't need. The mobile mirror keeps just the shape needed by the hero + city chip row.

- [ ] **Step 1: Create `apps/mobile/src/lib/cities.ts`**

```ts
// Mirror of the flagship-cities used by the web app's /c/[city] pages.
// Keep this list in sync with apps/web/src/lib/cities.ts (the web copy carries
// extra SEO fields — slugs and names must match here).

export interface FlagshipCity {
  /** URL/route slug — matches web /c/[slug] */
  slug: string
  /** Display name as shown in UI (with diacritics) */
  displayName: string
  /** Value as stored in listings.city — used by `ilike` filters */
  dbName: string
  /** Two-letter province code */
  province: string
}

export const FLAGSHIP_CITIES: FlagshipCity[] = [
  { slug: 'toronto', displayName: 'Toronto', dbName: 'Toronto', province: 'ON' },
  { slug: 'vancouver', displayName: 'Vancouver', dbName: 'Vancouver', province: 'BC' },
  { slug: 'montreal', displayName: 'Montréal', dbName: 'Montréal', province: 'QC' },
  { slug: 'ottawa', displayName: 'Ottawa', dbName: 'Ottawa', province: 'ON' },
  { slug: 'calgary', displayName: 'Calgary', dbName: 'Calgary', province: 'AB' },
]

export function getFlagshipBySlug(slug: string): FlagshipCity | null {
  return FLAGSHIP_CITIES.find((c) => c.slug === slug) ?? null
}

/**
 * Return the flagship slug whose dbName matches the user's profile city,
 * or null if their city isn't a flagship.
 */
export function flagshipSlugForProfileCity(profileCity: string | null | undefined): string | null {
  if (!profileCity) return null
  const normalized = profileCity.trim().toLowerCase()
  return (
    FLAGSHIP_CITIES.find((c) => c.dbName.toLowerCase() === normalized)?.slug ?? null
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS (no output beyond the `tsc --noEmit` line).

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/lib/cities.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): add flagship-cities mirror for home hero"
```

---

## Task 3: Home signal types

**Files:**
- Create: `apps/mobile/src/lib/home/types.ts`

- [ ] **Step 1: Create `apps/mobile/src/lib/home/types.ts`**

```ts
// Types shared across the home hero, city chip row, and signal hook.

export type HeroVariant = 'signals' | 'onboarding' | 'discovery' | 'loading'

export interface HomeSignals {
  /** group_suggestions rows targeting me with no suggestion_interactions row yet */
  newMatches: number
  /** co_renter_invitations where invitee_id = me AND status = 'pending' */
  pendingInvites: number
  /** messages where sender_id != me AND read_at IS NULL (RLS scopes to my conversations) */
  unreadMessages: number
  /** saved_listings where listings.updated_at > saved_listings.created_at */
  updatedSavedListings: number
  /** listings created in the last 7 days in the selected city */
  cityNewListings: number
}

export interface ProfileSnapshot {
  /** 0–100, computed client-side from known optional profile fields */
  completion: number
  /** Field whose absence pushes completion below 100 — used for onboarding CTA label */
  nextMissingField: 'bio' | 'photo' | 'city' | 'household_situation' | 'occupation' | 'age' | 'gender' | null
  /** profile.name's first word, fallback 'there' */
  firstName: string
}

export interface HeroContent {
  variant: HeroVariant
  eyebrow: string
  headline: { lead: string; highlighted: string; trail?: string }
  subhead?: string
  primaryCta: { label: string; target: HeroCtaTarget }
  secondaryCta?: { label: string; target: HeroCtaTarget }
}

export type HeroCtaTarget =
  | { kind: 'route'; pathname: string; params?: Record<string, string> }
  | { kind: 'browse-city'; citySlug: string }
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/lib/home/types.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): types for home signals + hero content"
```

---

## Task 4: Failing unit test for `selectVariant`

We want the variant-selection rule tested in isolation since it's the lynchpin of hero behaviour. TDD: write the failing test first, then implement.

**Files:**
- Create: `apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts`
- Create: `apps/mobile/src/lib/home/use-home-signals.ts` (stub — `selectVariant` not yet implemented)

- [ ] **Step 1: Create the empty stub `use-home-signals.ts`**

Just enough to make the import resolve:

```ts
// Hook + pure helpers for the home hero. Queries are built up in Task 6.

import type { HomeSignals, HeroVariant } from './types'

export function selectVariant(_signals: HomeSignals, _profileCompletion: number): HeroVariant {
  // Implemented in Task 5
  return 'discovery'
}
```

- [ ] **Step 2: Write the table-driven test**

Create `apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts`:

```ts
// Run with `npm run test:variant` (uses tsx).
// Mirrors the pattern from apps/web/scripts/test-mojibake-patterns.ts.

import { strict as assert } from 'node:assert'
import { selectVariant } from '../use-home-signals'
import type { HomeSignals, HeroVariant } from '../types'

const zero: HomeSignals = {
  newMatches: 0,
  pendingInvites: 0,
  unreadMessages: 0,
  updatedSavedListings: 0,
  cityNewListings: 0,
}

interface Case {
  name: string
  signals: HomeSignals
  profileCompletion: number
  expected: HeroVariant
}

const CASES: Case[] = [
  // signals variant
  { name: 'new matches → signals', signals: { ...zero, newMatches: 1 }, profileCompletion: 100, expected: 'signals' },
  { name: 'pending invites → signals', signals: { ...zero, pendingInvites: 2 }, profileCompletion: 50, expected: 'signals' },
  { name: 'unread → signals (even when onboarding incomplete)', signals: { ...zero, unreadMessages: 1 }, profileCompletion: 30, expected: 'signals' },
  { name: 'updated saved → signals', signals: { ...zero, updatedSavedListings: 1 }, profileCompletion: 100, expected: 'signals' },

  // onboarding variant
  { name: 'no signals + incomplete profile → onboarding', signals: zero, profileCompletion: 60, expected: 'onboarding' },
  { name: 'no signals + 99% profile → onboarding', signals: zero, profileCompletion: 99, expected: 'onboarding' },

  // discovery variant
  { name: 'no signals + complete profile → discovery', signals: zero, profileCompletion: 100, expected: 'discovery' },

  // cityNewListings alone is NOT a "signal" — it informs the discovery variant only
  { name: 'only cityNewListings + complete profile → discovery', signals: { ...zero, cityNewListings: 12 }, profileCompletion: 100, expected: 'discovery' },
  { name: 'only cityNewListings + incomplete profile → onboarding', signals: { ...zero, cityNewListings: 12 }, profileCompletion: 50, expected: 'onboarding' },
]

let passed = 0
let failed = 0
for (const c of CASES) {
  try {
    const got = selectVariant(c.signals, c.profileCompletion)
    assert.equal(got, c.expected)
    passed++
  } catch (err) {
    failed++
    console.error(`FAIL: ${c.name}`)
    console.error(`  ${(err as Error).message}`)
  }
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 3: Run test — must FAIL**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run test:variant
```

Expected: FAIL — every case except the discovery cases will fail since stub returns 'discovery' always. Output should show multiple `FAIL:` lines and process exit 1.

- [ ] **Step 4: Commit failing test + stub**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/lib/home/use-home-signals.ts apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "test(mobile): failing table-driven test for selectVariant"
```

---

## Task 5: Implement `selectVariant`

**Files:**
- Modify: `apps/mobile/src/lib/home/use-home-signals.ts`

- [ ] **Step 1: Replace the stub with the real implementation**

```ts
// Hook + pure helpers for the home hero. Queries are built up in Task 6.

import type { HomeSignals, HeroVariant } from './types'

/**
 * Picks which hero content variant to render. Pure — easy to table-test.
 *
 * Priority: in-flight signals (anything to act on) > onboarding (push profile to
 * completion) > discovery (evergreen "what's new in your city").
 *
 * `cityNewListings` does NOT participate in the signal count — it's not a
 * user-attention signal, it's information used to populate the discovery copy.
 */
export function selectVariant(signals: HomeSignals, profileCompletion: number): HeroVariant {
  const attentionSignals =
    signals.newMatches +
    signals.pendingInvites +
    signals.unreadMessages +
    signals.updatedSavedListings
  if (attentionSignals > 0) return 'signals'
  if (profileCompletion < 100) return 'onboarding'
  return 'discovery'
}
```

- [ ] **Step 2: Run test — must PASS**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run test:variant
```

Expected: `9/9 passed`, exit 0.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/lib/home/use-home-signals.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): implement selectVariant"
```

---

## Task 6: Full `useHomeSignals` hook with all five queries + content composer

**Files:**
- Modify: `apps/mobile/src/lib/home/use-home-signals.ts`

This task fleshes out the hook. It fans out to all five signal queries in parallel and composes the final `HeroContent` based on the variant. Substantial code — broken into discrete steps.

- [ ] **Step 1: Write the full hook**

Replace the contents of `apps/mobile/src/lib/home/use-home-signals.ts`:

```ts
// Hook + pure helpers for the home hero. Queries fan out in parallel via
// react-query; the resulting HeroContent drives <Hero />.

import { useQueries } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { getFlagshipBySlug } from '@/lib/cities'
import type { HomeSignals, HeroVariant, HeroContent, ProfileSnapshot } from './types'

const STALE_MS = 60_000 // 60s

const ZERO_SIGNALS: HomeSignals = {
  newMatches: 0,
  pendingInvites: 0,
  unreadMessages: 0,
  updatedSavedListings: 0,
  cityNewListings: 0,
}

/**
 * Picks which hero content variant to render. Pure — easy to table-test.
 *
 * Priority: in-flight signals (anything to act on) > onboarding (push profile to
 * completion) > discovery (evergreen "what's new in your city").
 *
 * `cityNewListings` does NOT participate in the signal count — it's not a
 * user-attention signal, it's information used to populate the discovery copy.
 */
export function selectVariant(signals: HomeSignals, profileCompletion: number): HeroVariant {
  const attentionSignals =
    signals.newMatches +
    signals.pendingInvites +
    signals.unreadMessages +
    signals.updatedSavedListings
  if (attentionSignals > 0) return 'signals'
  if (profileCompletion < 100) return 'onboarding'
  return 'discovery'
}

/**
 * Fields counted toward profile completion. Order matters — the first missing
 * field becomes `nextMissingField` and drives the onboarding CTA label.
 */
const COMPLETION_FIELDS = ['bio', 'photo', 'city', 'household_situation', 'occupation', 'age', 'gender'] as const

type CompletionField = (typeof COMPLETION_FIELDS)[number]

function fieldPresent(profile: Record<string, unknown>, field: CompletionField): boolean {
  if (field === 'photo') return !!profile.profile_photo
  const v = profile[field]
  return v !== null && v !== undefined && v !== ''
}

function ctaLabelForMissing(field: ProfileSnapshot['nextMissingField']): string {
  switch (field) {
    case 'bio': return 'Add your bio →'
    case 'photo': return 'Add a photo →'
    case 'city': return 'Set your city →'
    case 'household_situation': return 'Add household details →'
    case 'occupation': return 'Add your occupation →'
    case 'age': return 'Add your age →'
    case 'gender': return 'Add gender (optional) →'
    case null: return 'Edit profile →'
  }
}

/**
 * Builds HeroContent from raw signals + profile snapshot + the city
 * the user is currently looking at on the home screen.
 */
export function composeHeroContent(
  signals: HomeSignals,
  profile: ProfileSnapshot,
  citySlug: string,
): HeroContent {
  const variant = selectVariant(signals, profile.completion)
  const city = getFlagshipBySlug(citySlug)
  const cityName = city?.displayName ?? 'your city'

  if (variant === 'signals') {
    const parts: string[] = []
    if (signals.newMatches > 0) parts.push(`${signals.newMatches} new match${signals.newMatches === 1 ? '' : 'es'}`)
    if (signals.pendingInvites > 0) parts.push(`${signals.pendingInvites} group invite${signals.pendingInvites === 1 ? '' : 's'}`)
    if (signals.unreadMessages > 0) parts.push(`${signals.unreadMessages} unread message${signals.unreadMessages === 1 ? '' : 's'}`)
    if (signals.updatedSavedListings > 0) parts.push(`${signals.updatedSavedListings} saved listing${signals.updatedSavedListings === 1 ? '' : 's'} updated`)

    // Top signal drives the eyebrow + primary CTA target.
    let eyebrow = ''
    let primary: HeroContent['primaryCta'] = { label: 'See updates', target: { kind: 'route', pathname: '/(tabs)/messages' } }
    if (signals.newMatches > 0) {
      eyebrow = `● ${signals.newMatches} NEW MATCH${signals.newMatches === 1 ? '' : 'ES'} TONIGHT`
      primary = { label: 'View matches →', target: { kind: 'route', pathname: '/(tabs)/search' } }
    } else if (signals.pendingInvites > 0) {
      eyebrow = `● ${signals.pendingInvites} GROUP INVITE${signals.pendingInvites === 1 ? '' : 'S'} WAITING`
      primary = { label: 'See invites →', target: { kind: 'route', pathname: '/(tabs)/messages' } }
    } else if (signals.unreadMessages > 0) {
      eyebrow = `● ${signals.unreadMessages} UNREAD MESSAGE${signals.unreadMessages === 1 ? '' : 'S'}`
      primary = { label: 'Open messages →', target: { kind: 'route', pathname: '/(tabs)/messages' } }
    } else {
      eyebrow = `● ${signals.updatedSavedListings} SAVED LISTING${signals.updatedSavedListings === 1 ? '' : 'S'} UPDATED`
      primary = { label: 'View saved →', target: { kind: 'route', pathname: '/(tabs)/search' } }
    }

    return {
      variant: 'signals',
      eyebrow,
      headline: { lead: 'Pick up ', highlighted: 'where you left off', trail: `, ${profile.firstName}.` },
      subhead: parts.length > 1 ? parts.slice(1).join(' · ') : undefined,
      primaryCta: primary,
    }
  }

  if (variant === 'onboarding') {
    return {
      variant: 'onboarding',
      eyebrow: `● PROFILE ${profile.completion}% COMPLETE`,
      headline: { lead: 'One step from your ', highlighted: 'first match', trail: '.' },
      subhead: `Finish your profile and we'll surface compatible roommates here every time you open the app.`,
      primaryCta: { label: ctaLabelForMissing(profile.nextMissingField), target: { kind: 'route', pathname: '/edit-profile' } },
      secondaryCta:
        signals.cityNewListings > 0
          ? { label: `${signals.cityNewListings} new in ${cityName}`, target: { kind: 'browse-city', citySlug } }
          : undefined,
    }
  }

  // discovery (or 'loading' falls through to a safe default)
  return {
    variant: 'discovery',
    eyebrow: signals.cityNewListings > 0
      ? `● ${signals.cityNewListings} NEW IN ${cityName.toUpperCase()} THIS WEEK`
      : `● TONIGHT IN ${cityName.toUpperCase()}`,
    headline: { lead: 'New in ', highlighted: cityName, trail: ' this week.' },
    subhead: signals.cityNewListings > 0
      ? `Browse this week's listings or check who else just joined.`
      : `Browse listings or check who's looking right now.`,
    primaryCta: { label: `Browse ${cityName}`, target: { kind: 'browse-city', citySlug } },
  }
}

/**
 * Reads everything the hero needs in one hook. Caller passes the currently
 * selected city slug (managed by the parent home screen).
 */
export function useHomeSignals(citySlug: string): {
  content: HeroContent | null
  isLoading: boolean
  refetch: () => void
} {
  const { user } = useAuth()
  const userId = user?.id
  const city = getFlagshipBySlug(citySlug)
  const cityDbName = city?.dbName ?? null

  const queries = useQueries({
    queries: [
      {
        queryKey: ['home-signal', 'new-matches', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const [{ data: suggestions }, { data: interactions }] = await Promise.all([
            supabase
              .from('group_suggestions')
              .select('id')
              .eq('target_user_id', userId!)
              .eq('status', 'active')
              .gt('expires_at', new Date().toISOString()),
            supabase
              .from('suggestion_interactions')
              .select('suggestion_id')
              .eq('user_id', userId!),
          ])
          const seen = new Set((interactions ?? []).map((i: { suggestion_id: string }) => i.suggestion_id))
          return (suggestions ?? []).filter((s: { id: string }) => !seen.has(s.id)).length
        },
      },
      {
        queryKey: ['home-signal', 'pending-invites', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const { count } = await supabase
            .from('co_renter_invitations')
            .select('id', { count: 'exact', head: true })
            .eq('invitee_id', userId!)
            .eq('status', 'pending')
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'unread-messages', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          // RLS scopes messages to conversations the user participates in,
          // so this counts unread across all their threads (1:1 + group).
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .neq('sender_id', userId!)
            .is('read_at', null)
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'updated-saved', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          // Two queries instead of a join: the typed Supabase client requires
          // Relationships:[] entries on every table (see auto-memory) or joins
          // can resolve to `never`. Two simple queries are safer and the
          // dataset is tiny (a user's saved listings).
          const { data: saved } = await supabase
            .from('saved_listings')
            .select('listing_id, created_at')
            .eq('user_id', userId!)
          if (!saved || saved.length === 0) return 0
          const ids = saved.map((s: { listing_id: string; created_at: string }) => s.listing_id)
          const { data: listings } = await supabase
            .from('listings')
            .select('id, updated_at')
            .in('id', ids)
          if (!listings) return 0
          const updatedById = new Map(
            listings.map((l: { id: string; updated_at: string }) => [l.id, new Date(l.updated_at).getTime()]),
          )
          return saved.filter((s: { listing_id: string; created_at: string }) => {
            const updatedAt = updatedById.get(s.listing_id) ?? 0
            return updatedAt > new Date(s.created_at).getTime()
          }).length
        },
      },
      {
        queryKey: ['home-signal', 'city-new', cityDbName],
        enabled: !!cityDbName,
        staleTime: STALE_MS,
        queryFn: async () => {
          const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { count } = await supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .ilike('city', cityDbName!)
            .gt('created_at', since)
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'profile', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('name, bio, age, gender, occupation, city, household_situation, profile_photo')
            .eq('user_id', userId!)
            .single()
          return data ?? {}
        },
      },
    ],
  })

  const isLoading = queries.some((q) => q.isLoading)
  const userMissing = !userId
  if (userMissing) return { content: null, isLoading: true, refetch: () => {} }

  // Treat individual query failures as 0 — the hero degrades to discovery
  // rather than blocking the home tab.
  const signals: HomeSignals = {
    newMatches: (queries[0].data as number | undefined) ?? 0,
    pendingInvites: (queries[1].data as number | undefined) ?? 0,
    unreadMessages: (queries[2].data as number | undefined) ?? 0,
    updatedSavedListings: (queries[3].data as number | undefined) ?? 0,
    cityNewListings: (queries[4].data as number | undefined) ?? 0,
  }

  const profileRaw = (queries[5].data as Record<string, unknown> | undefined) ?? {}
  let completionCount = 0
  let nextMissing: ProfileSnapshot['nextMissingField'] = null
  for (const field of COMPLETION_FIELDS) {
    if (fieldPresent(profileRaw, field)) completionCount++
    else if (nextMissing === null) nextMissing = field
  }
  const completion = Math.round((completionCount / COMPLETION_FIELDS.length) * 100)
  const firstName = ((profileRaw.name as string | undefined) ?? '').split(' ')[0] || 'there'

  const profileSnap: ProfileSnapshot = {
    completion,
    nextMissingField: nextMissing,
    firstName,
  }

  // While loading, show the discovery fallback so the layout doesn't jump.
  // Once loaded, compose the real content.
  if (isLoading) {
    return {
      content: { ...composeHeroContent(ZERO_SIGNALS, { ...profileSnap, completion: 100 }, citySlug), variant: 'loading' },
      isLoading: true,
      refetch: () => queries.forEach((q) => q.refetch()),
    }
  }

  return {
    content: composeHeroContent(signals, profileSnap, citySlug),
    isLoading: false,
    refetch: () => queries.forEach((q) => q.refetch()),
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS. If you get errors about `saved_listings.listings.updated_at`, the typed Supabase client may not infer the join shape — cast that row to `any` at the destructure if needed (`data as Array<...>`). Avoid wider `any`.

- [ ] **Step 3: Run the unit test again**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run test:variant
```

Expected: `9/9 passed` — `selectVariant` is unchanged from Task 5.

- [ ] **Step 4: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/lib/home/use-home-signals.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): wire all five home signal queries + content composer"
```

---

## Task 7: `HighlightedText` primitive

The web hero does `background: linear-gradient(transparent 60%, #8cf5e4 60%)` on an inline span. RN can't do partial-height backgrounds on text natively, so we approximate with a `View` absolutely positioned behind the `Text`.

**Files:**
- Create: `apps/mobile/src/components/ui/HighlightedText.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

- [ ] **Step 1: Create `HighlightedText.tsx`**

```tsx
import React from 'react'
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { colors } from '@/theme/tokens'

interface HighlightedTextProps {
  children: string
  /** Backdrop colour. Default = mint (web's secondaryContainer). */
  color?: string
  /** Fraction of the line height the highlight band covers, measured from the
   *  baseline up. Default 0.4 matches the web's `linear-gradient(transparent 60%, ...)`. */
  heightPct?: number
  textStyle?: TextStyle
  containerStyle?: ViewStyle
}

/**
 * Renders text with a hard-edged colour band behind the baseline — mirrors
 * the web hero's highlighter trick on the word `actually`.
 *
 * Caller passes the highlighted word/phrase as the child. The component sizes
 * the band to the rendered text width by relying on flow layout — the View
 * sits inside the same inline-style container as the Text and stretches via
 * absolute positioning to match width.
 */
export function HighlightedText({
  children,
  color = colors.secondaryContainer,
  heightPct = 0.4,
  textStyle,
  containerStyle,
}: HighlightedTextProps) {
  const fontSize = (textStyle?.fontSize as number | undefined) ?? 32
  const bandHeight = fontSize * heightPct

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View
        pointerEvents="none"
        style={[
          styles.band,
          { backgroundColor: color, height: bandHeight },
        ]}
      />
      <Text style={textStyle}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2, // small offset so the band sits on the baseline, not below descenders
  },
})
```

- [ ] **Step 2: Export from `apps/mobile/src/components/ui/index.ts`**

Add this line to the existing exports:

```ts
export { HighlightedText } from './HighlightedText'
```

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/components/ui/HighlightedText.tsx apps/mobile/src/components/ui/index.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): HighlightedText primitive for hero accent"
```

---

## Task 8: `AmbientBackground` primitive

Approximates the web hero's two radial blooms with two stacked diagonal linear gradients from `expo-linear-gradient`. If this looks too "striped" during visual smoke (Task 13), the fallback noted in the spec is to swap in a static PNG.

**Files:**
- Create: `apps/mobile/src/components/ui/AmbientBackground.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

- [ ] **Step 1: Create `AmbientBackground.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface AmbientBackgroundProps {
  children: React.ReactNode
  style?: ViewStyle
}

/**
 * Background wash that mimics the web hero's two soft radial blooms.
 * Layered linear gradients from corners (top-left navy tint, top-right teal
 * tint, bottom warm peach tint). The web uses true radial gradients; RN's
 * built-in gradients are linear-only, but the perceived effect is similar
 * enough at hero size on a phone screen.
 */
export function AmbientBackground({ children, style }: AmbientBackgroundProps) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        // Top-left bloom: navy 8% → transparent, anchored top-left
        colors={['rgba(0,32,69,0.10)', 'rgba(0,32,69,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        // Top-right bloom: teal 10% → transparent, anchored top-right
        colors={['rgba(0,106,96,0.10)', 'rgba(0,106,96,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        // Bottom warm bloom: peach 45% → transparent, anchored bottom
        colors={['rgba(255,220,196,0)', 'rgba(255,220,196,0.45)']}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
})
```

- [ ] **Step 2: Export from `apps/mobile/src/components/ui/index.ts`**

Add this line:

```ts
export { AmbientBackground } from './AmbientBackground'
```

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/components/ui/AmbientBackground.tsx apps/mobile/src/components/ui/index.ts
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): AmbientBackground primitive (stacked linear gradients)"
```

---

## Task 9: `Hero` component

**Files:**
- Create: `apps/mobile/src/components/home/Hero.tsx`

- [ ] **Step 1: Create `Hero.tsx`**

```tsx
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { AmbientBackground, HighlightedText } from '@/components/ui'
import { colors, radii, spacing, typography } from '@/theme/tokens'
import type { HeroContent, HeroCtaTarget } from '@/lib/home/types'

interface HeroProps {
  content: HeroContent
  onBrowseCity: (citySlug: string) => void
}

export function Hero({ content, onBrowseCity }: HeroProps) {
  const router = useRouter()

  const handlePress = (target: HeroCtaTarget) => {
    if (target.kind === 'route') {
      // expo-router accepts a string path or a Href object.
      router.push({ pathname: target.pathname as any, params: target.params })
    } else {
      onBrowseCity(target.citySlug)
    }
  }

  const isLoading = content.variant === 'loading'

  return (
    <AmbientBackground style={styles.wrap}>
      <Text style={[styles.eyebrow, isLoading && styles.skeletonText]}>
        {content.eyebrow}
      </Text>

      <View style={styles.headlineRow}>
        <Text style={styles.headlineLead}>
          {content.headline.lead}
        </Text>
        <HighlightedText textStyle={styles.headlineHighlight}>
          {content.headline.highlighted}
        </HighlightedText>
        {content.headline.trail ? (
          <Text style={styles.headlineLead}>{content.headline.trail}</Text>
        ) : null}
      </View>

      {content.subhead ? (
        <Text style={styles.subhead}>{content.subhead}</Text>
      ) : null}

      <View style={styles.ctaRow}>
        <Pressable
          style={[styles.primaryCta, isLoading && styles.disabledCta]}
          onPress={() => !isLoading && handlePress(content.primaryCta.target)}
          disabled={isLoading}
          accessibilityRole="button"
        >
          <Text style={styles.primaryCtaText}>{content.primaryCta.label}</Text>
        </Pressable>
        {content.secondaryCta ? (
          <Pressable
            style={styles.secondaryCta}
            onPress={() => handlePress(content.secondaryCta!.target)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryCtaText}>{content.secondaryCta.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </AmbientBackground>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
    borderRadius: radii.xl,
    marginBottom: spacing[3],
  },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xs,
    color: colors.secondary,
    letterSpacing: 1.5,
    marginBottom: spacing[2],
  },
  skeletonText: {
    color: colors.surfaceContainer, // hide while loading
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  headlineLead: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
  },
  headlineHighlight: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
  },
  subhead: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.onSurfaceVariant,
    marginTop: spacing[3],
    lineHeight: typography.size.base * typography.lineHeight.normal,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  primaryCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
  },
  disabledCta: {
    opacity: 0.6,
  },
  primaryCtaText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    color: colors.onPrimary,
  },
  secondaryCta: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
})
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/components/home/Hero.tsx
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): Hero component for variant-aware home header"
```

---

## Task 10: `CityChipRow` component

**Files:**
- Create: `apps/mobile/src/components/home/CityChipRow.tsx`

- [ ] **Step 1: Create `CityChipRow.tsx`**

```tsx
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Chip } from '@/components/ui'
import { FLAGSHIP_CITIES } from '@/lib/cities'
import { spacing } from '@/theme/tokens'

interface CityChipRowProps {
  selectedSlug: string
  onSelect: (slug: string) => void
}

/**
 * Horizontal scrollable row of the 5 flagship-city chips. Replaces the
 * pre-redesign 4-mode chip row (All / Roommates / Listings / Co-living)
 * which duplicated tab-bar destinations.
 */
export function CityChipRow({ selectedSlug, onSelect }: CityChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FLAGSHIP_CITIES.map((c) => (
        <Chip
          key={c.slug}
          active={c.slug === selectedSlug}
          onPress={() => onSelect(c.slug)}
        >
          {c.displayName}
        </Chip>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing[2],
    paddingRight: spacing[4],
    paddingBottom: spacing[2],
  },
})
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/src/components/home/CityChipRow.tsx
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): CityChipRow component"
```

---

## Task 11: Wire it into `(tabs)/index.tsx`

This is the big integration. Replace the old header (title + subtitle + search pill + 4 mode chips) with `<Hero />` and `<CityChipRow />`. Reorder the feed (listings first, roommates second). Parametrize the two existing react-query keys by city slug so switching cities triggers a refetch.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `apps/mobile/app/(tabs)/index.tsx`:

```tsx
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { Plus, Heart } from 'lucide-react-native'
import { Screen, Card, Badge, Avatar, SectionHeader } from '@/components/ui'
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens'
import { Hero } from '@/components/home/Hero'
import { CityChipRow } from '@/components/home/CityChipRow'
import { useHomeSignals } from '@/lib/home/use-home-signals'
import {
  FLAGSHIP_CITIES,
  flagshipSlugForProfileCity,
  getFlagshipBySlug,
} from '@/lib/cities'

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

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  // City selection: try the user's profile city if it's a flagship, else
  // default to Toronto. Per-session only — persistence is a follow-up.
  const profileCityFromMetadata = (user?.user_metadata?.city as string | undefined) ?? null
  const initialSlug = flagshipSlugForProfileCity(profileCityFromMetadata) ?? 'toronto'
  const [citySlug, setCitySlug] = useState<string>(initialSlug)
  const city = getFlagshipBySlug(citySlug) ?? FLAGSHIP_CITIES[0]

  const { content: heroContent, isLoading: heroLoading } = useHomeSignals(citySlug)

  const { data: roommates, isLoading: roommatesLoading } = useQuery({
    queryKey: ['home-roommates', user?.id, city.dbName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, age, occupation, city, profile_photo')
        .neq('user_id', user!.id)
        .ilike('city', city.dbName)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as RoommateCard[]
    },
    enabled: !!user,
  })

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['home-listings', user?.id, city.dbName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, photos')
        .eq('is_active', true)
        .ilike('city', city.dbName)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as ListingCard[]
    },
    enabled: !!user,
  })

  const matchOf = useMemo(() => {
    const cache = new Map<string, number>()
    return (id: string) => {
      if (cache.has(id)) return cache.get(id)!
      let h = 0
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
      const pct = 85 + (h % 15)
      cache.set(id, pct)
      return pct
    }
  }, [])

  const renderRoommate = ({ item }: { item: RoommateCard }) => (
    <Pressable
      style={styles.roommateCard}
      onPress={() => router.push('/(tabs)/search')}
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

  const browseCity = (slug: string) => {
    const target = getFlagshipBySlug(slug)
    if (!target) return
    router.push({ pathname: '/(tabs)/search', params: { q: target.displayName } })
  }

  return (
    <Screen testID="screen-home" edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {heroContent ? (
          <Hero content={heroContent} onBrowseCity={browseCity} />
        ) : null}

        <CityChipRow selectedSlug={citySlug} onSelect={setCitySlug} />

        <SectionHeader
          title={`Fresh listings in ${city.displayName}`}
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
                {l.photos && l.photos[0] ? (
                  <Image source={{ uri: l.photos[0] }} style={styles.listingPhoto} />
                ) : null}
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

        <SectionHeader
          title="Roommates you'll click with"
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
  scroll: { padding: spacing[5], paddingBottom: 100 },
  hList: { gap: spacing[2], paddingRight: spacing[4] },
  roommateCard: {
    width: 150,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: spacing[3],
    ...shadows.sm,
  },
  roommateAvatar: { alignSelf: 'center', marginBottom: spacing[2] },
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
    marginBottom: spacing[2],
  },
  roommateMatch: { alignSelf: 'center' },
  listing: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing[2],
    ...shadows.sm,
  },
  listingImg: {
    height: 120,
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
  listingPhoto: { width: '100%', height: '100%' },
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
  listingInfo: { padding: spacing[3] },
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
  empty: { width: 240, padding: spacing[4] },
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
    right: spacing[5],
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

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS. If you see errors about `Chip` import being unused (we no longer use the category-mode chips), that's a sign you missed the import-removal step — verify the imports at top of the file include `Screen, Card, Badge, Avatar, SectionHeader` and NOT `Chip` or `Search as SearchIcon`.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/app/\(tabs\)/index.tsx
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): wire Hero + CityChipRow into the home tab"
```

---

## Task 12: Extend `(tabs)/search.tsx` to seed `query` from route params

**Files:**
- Modify: `apps/mobile/app/(tabs)/search.tsx`

The hero's "Browse {city}" CTA does `router.push({ pathname: '/(tabs)/search', params: { q: 'Toronto' } })`. The search screen needs to honour that.

- [ ] **Step 1: Add the route-param read at the top of the component**

In `apps/mobile/app/(tabs)/search.tsx`, change the imports:

```ts
// Existing first line:
import { useState } from 'react'
// Change to:
import { useEffect, useState } from 'react'
```

Add to the existing `expo-router` import:

```ts
// Existing:
import { useRouter } from 'expo-router'
// Change to:
import { useLocalSearchParams, useRouter } from 'expo-router'
```

Inside `SearchScreen`, just after `const router = useRouter()`, add:

```ts
const { q: initialQuery } = useLocalSearchParams<{ q?: string }>()
```

Then change the existing `const [query, setQuery] = useState('')` to:

```ts
const [query, setQuery] = useState<string>(initialQuery ?? '')

// If the user lands here from the hero with a new q param while the screen
// is already mounted, sync state. Cheap; no-op once initialQuery stabilizes.
useEffect(() => {
  if (initialQuery !== undefined) setQuery(initialQuery)
}, [initialQuery])
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/app/\(tabs\)/search.tsx
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "feat(mobile): seed search query from route params"
```

---

## Task 13: Maestro flow assertion + manual smoke

**Files:**
- Modify: `apps/mobile/.maestro/flows/navigation/tabs.yaml`

The existing tabs flow already asserts `id: "screen-home"` is visible. Add an assertion that the new hero headline ("Pick up", "One step from your", or "New in" — whichever variant the test user lands in) renders.

- [ ] **Step 1: Add the hero-visibility check at the end of the tabs flow**

Edit `apps/mobile/.maestro/flows/navigation/tabs.yaml` and append (before EOF):

```yaml
# Verify the redesigned home hero rendered something — any of the three
# variant headlines starts with a fixed lead string.
- assertVisible:
    text: ".*(Pick up|One step from your|New in).*"
    timeout: 5000
```

- [ ] **Step 2: Manual smoke (best-effort — Maestro requires a device/emulator)**

If you have a device or emulator available:

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile
npm run dev    # start Expo
# in another shell:
npm run maestro:tabs
```

Expected: flow passes, screenshots in `~/.maestro/tests/...` show the hero headline.

If no device/emulator is available, skip the Maestro run — the typecheck + unit test + visual code review on the PR are sufficient. Note this in the PR description.

- [ ] **Step 3: Commit**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app add apps/mobile/.maestro/flows/navigation/tabs.yaml
git -C c:/Users/computer/Downloads/nestmatch-app commit -m "test(mobile): assert hero headline renders in tabs flow"
```

---

## Task 14: Final verification + PR

- [ ] **Step 1: Full typecheck pass**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Variant unit test pass**

```bash
cd c:/Users/computer/Downloads/nestmatch-app/apps/mobile && npm run test:variant
```

Expected: `9/9 passed`.

- [ ] **Step 3: Push branch**

```bash
git -C c:/Users/computer/Downloads/nestmatch-app push -u origin feat/mobile-home-hero-redesign
```

- [ ] **Step 4: Open PR against `main`**

```bash
gh pr create --repo contact699/NestMatch --head feat/mobile-home-hero-redesign --base main \
  --title "feat(mobile): variant-aware home hero with brand voice from web landing" \
  --body "$(cat <<'EOF'
## Summary

Replaces the utilitarian mobile home tab with a variant-aware hero that carries the web landing's brand voice (Manrope display, mint highlighter accent, ambient gradient wash) while serving the authed user. One \`Hero\` component renders three content variants chosen by a deterministic priority rule:

- **signals** — any of: new matches, pending invites, unread messages, recently-updated saved listings
- **onboarding** — no signals AND profile < 100% complete
- **discovery** — no signals AND profile complete (fallback)

Below the hero: city chip row (replacing the redundant 4-mode chips) → "Fresh listings in {city}" → "Roommates you'll click with" → FAB. Both feeds now filter by selected city.

Backed only by existing tables (\`group_suggestions\`, \`suggestion_interactions\`, \`co_renter_invitations\`, \`messages\`, \`saved_listings\`, \`listings\`) — no schema changes.

## Spec
\`docs/superpowers/specs/2026-05-27-mobile-home-hero-redesign-design.md\`

## Test plan
- [x] \`npm run typecheck\` in apps/mobile passes
- [x] \`npm run test:variant\` — 9/9 cases pass (table-driven test for variant selection rule)
- [ ] Maestro \`tabs.yaml\` flow passes on emulator (manual; flagged in PR if not run)
- [ ] Manual smoke: hero renders 3 variants
  - [ ] User with signals → "Pick up where you left off, {firstName}." with eyebrow showing top signal
  - [ ] New user, no signals, incomplete profile → "One step from your first match." with CTA labeled per missing field
  - [ ] Complete profile, no signals → "New in {city} this week."
- [ ] City chips switch listings + roommates feeds
- [ ] Browse {city} CTA pre-seeds Search tab's query

## Out of scope (follow-ups)
- Dedicated \`/(tabs)/matches\` screen — "View matches" CTA still routes to Search
- Lifestyle quiz on mobile — onboarding CTA routes to \`/edit-profile\` instead
- Persist city selection beyond session
- True radial gradient via react-native-svg if the stacked-linear approximation isn't convincing
- Pull-to-refresh on the home tab

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned. Note the PR number for follow-up.

- [ ] **Step 5: Final task — mark done**

Report back in the conversation:

```
Mobile home hero redesign PR opened: <PR URL>
- Typecheck: pass
- Variant unit test: 9/9 pass
- Maestro: <ran / not run>
- Follow-ups flagged in PR body
```

---

## File summary

**Created (8 files):**
- `apps/mobile/src/lib/cities.ts`
- `apps/mobile/src/lib/home/types.ts`
- `apps/mobile/src/lib/home/use-home-signals.ts`
- `apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts`
- `apps/mobile/src/components/ui/HighlightedText.tsx`
- `apps/mobile/src/components/ui/AmbientBackground.tsx`
- `apps/mobile/src/components/home/Hero.tsx`
- `apps/mobile/src/components/home/CityChipRow.tsx`

**Modified (4 files):**
- `apps/mobile/package.json` (add expo-linear-gradient + tsx + test:variant script)
- `apps/mobile/src/components/ui/index.ts` (export new primitives)
- `apps/mobile/app/(tabs)/index.tsx` (replace header, wire Hero + CityChipRow, parametrize queries by city)
- `apps/mobile/app/(tabs)/search.tsx` (seed query from route params)
- `apps/mobile/.maestro/flows/navigation/tabs.yaml` (hero visibility assertion)
