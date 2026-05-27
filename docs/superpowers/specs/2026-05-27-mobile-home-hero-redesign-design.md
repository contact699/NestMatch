# Mobile home hero redesign

**Date:** 2026-05-27
**Scope:** Restructure the post-login mobile home (`apps/mobile/app/(tabs)/index.tsx`) so it carries the same brand voice as the web landing hero — Manrope display headline, mint highlighter accent on a key phrase, ambient gradient wash — while staying useful for an already-authenticated user.

## Problem

Phase 2 ([2026-05-21-mobile-redesign-phase2-design.md](./2026-05-21-mobile-redesign-phase2-design.md)) aligned the mobile design tokens and component primitives with the web brand. The home screen now uses the correct fonts, colors, and shadows — but it reads as utilitarian: a small "Find your nest" title, a generic search pill, four mode chips, and two carousel/stack feeds. Compared to the web landing (display headline with highlighter accent on "actually", ambient bloom, marketing chips for popular neighborhoods), the mobile home has no brand personality and gives the user no immediate sense of *what's new for them today*.

The web hero exists to convert guests, so its copy ("A roommate you can actually live with") doesn't translate directly — the mobile user is already signed up. The redesign needs to deliver the same visual energy as the web hero, but with content that rewards re-opening the app rather than re-pitching the product.

## Out of scope

- A public/guest landing surface inside the mobile app (the web handles guest conversion; mobile traffic is mostly authed).
- Restyling other tabs (search, messages, profile) — this spec is the home screen only.
- New tables or RLS changes — the redesign uses only data we already store.
- New onboarding steps. The hero references profile completion but does not change how completion is calculated or measured.
- Push notifications, deep links, pull-to-refresh — same as phase-2 non-goals.

## Goals

- A single hero component on the home screen with three content variants (signals / onboarding / discovery) chosen by a deterministic priority rule.
- Real personalization driven by data we already have (`group_suggestions`, `co_renter_invitations`, `messages`, `saved_listings`, `listings`).
- The mint highlighter accent (`#8cf5e4`) used on a single phrase in the headline, matching the web hero's signature visual move.
- City chip row replacing the existing 4-mode chip row (`All / Roommates / Listings / Co-living`) — city switching is the only chip-shaped affordance that does meaningful work.
- Empty-state behaviour that never leaves the user staring at a placeholder.

## Non-goals

- 1:1 visual parity with the desktop web hero (no 12-column grid, no photo collage). Mobile gets mobile-shaped composition.
- New data sources, new tables, or new backend endpoints. All five signal queries hit existing tables.
- A "stats dashboard" treatment (the 2×2 signal grid option was rejected in brainstorming).
- Animation polish beyond what the brand already does (no Lottie, no Reanimated choreography). Reserved for a later spec.

## File layout

**New:**

- `apps/mobile/src/components/home/Hero.tsx` — variant-aware hero. Renders the eyebrow / headline / subhead / two CTAs. Pure presentational; no fetching, no priority logic.
- `apps/mobile/src/components/home/CityChipRow.tsx` — horizontal scrollable city selector. Uses the flagship-cities list shared from `apps/web/src/lib/cities.ts`'s structure (but we keep a separate mobile copy to avoid cross-package imports — same five cities, hardcoded).
- `apps/mobile/src/components/ui/HighlightedText.tsx` — primitive that renders a `Text` with a `View` positioned behind it to mimic the web's `linear-gradient(transparent 60%, #8cf5e4 60%)` background. RN cannot do a partial-height background on a text run natively.
- `apps/mobile/src/components/ui/AmbientBackground.tsx` — wraps children with a soft radial bloom using `expo-linear-gradient` (linear gradients only; the web's true radial blooms are approximated with two stacked linear washes from corners). If approximation is unconvincing, fall back to a static `Image` PNG of the gradient.
- `apps/mobile/src/lib/home/use-home-signals.ts` — react-query hook that fans out to all five signal queries in parallel, normalizes them into a `HomeSignals` shape, and computes the `HeroVariant` + content. Single source of truth for hero state.
- `apps/mobile/src/lib/home/types.ts` — shared types (`HomeSignals`, `HeroVariant`, `HeroContent`).

**Modified:**

- `apps/mobile/app/(tabs)/index.tsx` — replace the existing header (title + subtitle + search pill + 4 mode chips) with `<Hero />` + `<CityChipRow />`. Rename section labels to `"Fresh listings in {city}"` and `"Roommates you'll click with"`. Keep the FAB. Modify the two existing data queries (`home-roommates`, `home-listings`) to add a `city.ilike.{flagshipDbName}` filter when a city is selected; queryKey gains the city slug so refetch happens on switch.
- `apps/mobile/app/(tabs)/search.tsx` — read `useLocalSearchParams<{ q?: string }>()` and seed the `query` state from it on mount, so the hero's "Browse {city}" CTA pre-fills the search box. No other changes to search.

**New dep:**

- `expo-linear-gradient` — Expo SDK module, no native build changes. Already commonly used in Expo apps.

## Hero variant state machine

The hero is one component with three content variants. Priority order, highest wins:

| Variant | When | Eyebrow | Headline (highlighted in `[..]`) | Primary CTA |
|---|---|---|---|---|
| `signals` | any of: new matches > 0, pending invites > 0, unread > 0, recently-updated saved listings > 0 | `● {top signal in caps}` (e.g. `● 3 NEW MATCHES TONIGHT`) | `Pick up [where you left off], {firstName}.` | route to top signal's target |
| `onboarding` | all signals = 0 AND profile completion < 100% | `● PROFILE {N}% COMPLETE` | `One quiz from your [first match].` (or photo/verification, whichever's missing) | `Finish quiz →` (or whichever) |
| `discovery` | all signals = 0 AND profile is complete | `● {N} NEW IN {CITY} THIS WEEK` | `New in [{city}] this week.` | `Browse {city}` |

**Selection rule (in `use-home-signals.ts`):**

```ts
type HeroVariant = 'signals' | 'onboarding' | 'discovery'

function selectVariant(s: HomeSignals, profileCompletion: number): HeroVariant {
  if (s.newMatches + s.pendingInvites + s.unreadMessages + s.updatedSavedListings > 0) {
    return 'signals'
  }
  if (profileCompletion < 100) return 'onboarding'
  return 'discovery'
}
```

**Hero props:**

```ts
type HeroProps = {
  variant: HeroVariant
  eyebrow: string                 // already uppercased by the hook
  headline: {
    lead: string                  // e.g. "Pick up "
    highlighted: string           // e.g. "where you left off"
    trail?: string                // e.g. ", Tomas."
  }
  subhead?: string
  primaryCta: { label: string; onPress: () => void }
  secondaryCta?: { label: string; onPress: () => void }
}
```

**Why this shape:** the hook owns priority + copy + routing; the component only renders. Easy to unit-test the hook with table-driven cases ("given these signals, return this content"); easy to visually iterate on Hero in isolation.

## Below-hero layout

```
<Hero ... />                                     // ~280–320 px, ambient bg
<CityChipRow selected={city} onSelect={...} />   // 5 chips, horiz scroll, sticky-ish under hero
<SectionHeader title="Fresh listings in {city}" actionLabel="SEE ALL" .../>
<ListingsStack listings={listings} />            // existing vertical stack
<SectionHeader title="Roommates you'll click with" actionLabel="SEE ALL" .../>
<RoommatesRow roommates={roommates} />           // existing horizontal carousel
<FAB />
```

**Order swap** (listings before roommates) — the redesign prioritizes content the user is most likely to act on first. Tester feedback in the QA report flagged that the app gates a lot behind signup; surfacing fresh listings prominently rewards opening the app.

**City chip data:**

- Source: hardcoded copy of the 5 flagship slugs (`toronto / vancouver / montreal / ottawa / calgary`). A `lib/cities.ts` mirror inside `apps/mobile/src/lib/` (small, no cross-package import).
- Initial selection: user's `profile.city` if it matches a flagship slug; otherwise `toronto`.
- On select: updates a piece of local component state, which feeds both the `listings` and `roommates` queries' `where city = ...` filters, and the hero's `discovery` variant if active.
- No persistence to DB on this PR — selection is per-session. Persistence can be a follow-up.

## Data layer — the five signal queries

All five fetched in parallel via `useQueries` from `@tanstack/react-query`. Cached for 60 s; refetched on focus.

| Query | Table(s) | Filter | Returned shape |
|---|---|---|---|
| `newMatches` | `group_suggestions` left join `suggestion_interactions` | `user_id = me` AND no interaction row exists | `count: number` |
| `pendingInvites` | `co_renter_invitations` | `invitee_user_id = me AND status = 'pending'` | `count: number` |
| `unreadMessages` | combine `/api/groups/unread` (existing) + a new client-side count of 1:1 conversations with `last_read_at < last_message_at` | derived | `count: number` |
| `updatedSavedListings` | `saved_listings` join `listings` | `user_id = me AND listings.updated_at > saved_listings.created_at` | `count: number` |
| `cityNewListings` | `listings` | `is_active AND city ilike {flagship dbName} AND created_at > now() - 7 days` | `count: number` |

Profile completion is computed client-side from the existing `profiles` row (count of non-null fields among `name, bio, age, gender, occupation, city, province, household_situation`; verification status from `verifications` table — already queryable). Threshold checks are pure functions; no new RPC.

**Loading state:** `Hero` renders a skeleton (Manrope-sized empty box, no eyebrow text, two pill placeholders) until `selectVariant` returns. Skeleton uses the same `AmbientBackground` so the layout doesn't jump.

**Error state:** if all signal queries fail, hero falls back to the `discovery` variant with eyebrow `● TONIGHT IN {CITY}` and a generic copy. Individual query failures degrade gracefully (treated as `0`).

## Visual primitives

### HighlightedText

```ts
type HighlightedTextProps = {
  children: string
  color?: string         // defaults to colors.secondaryContainer (#8cf5e4)
  heightPct?: number     // defaults to 0.4 — height of the underline as fraction of text height
  // Standard <Text> props passthrough for typography
}
```

Implementation: a `View` with `position: relative`, containing an absolutely-positioned background `View` (`bottom: 0; left: 0; right: 0; height: heightPct * lineHeight; backgroundColor: color`) under a `Text`. The web's `linear-gradient(transparent 60%, ...)` is exactly this — a hard-edged underline band that sits behind the text baseline.

### AmbientBackground

```ts
type AmbientBackgroundProps = { children: React.ReactNode }
```

Implementation: two `LinearGradient` from `expo-linear-gradient`, stacked diagonally to approximate the web's two radial blooms:

```
top-left bloom:   linear gradient navy 8% → transparent, anchored top-left, rotated
top-right bloom:  linear gradient teal 10% → transparent, anchored top-right
bottom-warm bloom: linear gradient peach 45% → transparent, anchored bottom
```

If the linear approximation looks too "striped", fall back to a single PNG export of the web's hero background, placed as a positioned `Image` behind content. Implementation chooses whichever ships better; both routes preserve the design surface.

## Behaviour: primary/secondary CTA routing

Hero CTAs route to existing screens — no new routes in this PR:

- `signals` variant
  - "View matches" → `/(tabs)/search` (no dedicated matches screen yet — same destination the existing roommate cards use; flagged as follow-up to build a real matches surface)
  - "Open messages" → `/(tabs)/messages`
  - "Invites" → `/(tabs)/messages` with future `?filter=invites` query (filter not wired yet — passes silently for now)
- `onboarding` variant
  - The mobile app has no lifestyle-quiz screen yet (web-only). This spec routes the CTA to `/edit-profile` as the next-best onboarding step and labels the button to match the missing field — `Add your bio →`, `Add a photo →`, `Set your city →`, etc. The literal phrase "Finish quiz" is reserved for when the mobile quiz ships (follow-up).
- `discovery` variant
  - "Browse {city}" → `router.push({ pathname: '/(tabs)/search', params: { q: '{displayName}' } })`. The search screen does not currently read route params — this spec extends `(tabs)/search.tsx` to call `useLocalSearchParams<{ q?: string }>()` and seed the `query` state from it on mount. Small additive change; the existing `title.ilike.%q%,city.ilike.%q%` filter picks it up unchanged.

## Testing

- **Type checking** — `apps/mobile && npm run typecheck` must pass.
- **Maestro** — extend `apps/mobile/.maestro/flows/navigation/tabs.yaml` with an assertion that the hero headline text is visible on the home tab. Snapshot of the home screen is out of scope (Maestro screenshot diffing isn't set up).
- **Unit test for `selectVariant`** — table-driven test in `apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts`. Covers signal precedence, onboarding fallback, discovery fallback, all-error fallback.
- **Manual smoke** — log in as a user with signals, with onboarding incomplete, and with neither; confirm each variant renders.

## Implementation order

1. `tokens` are already in place (phase 2). Add `expo-linear-gradient` to `apps/mobile/package.json` and run install.
2. Build `HighlightedText` + `AmbientBackground` primitives. Render in a throwaway test screen to validate; iterate visual.
3. Build `use-home-signals.ts` against real Supabase queries with hardcoded user. Validate `HomeSignals` shape with a quick log.
4. Write the `selectVariant` unit test alongside.
5. Build `Hero.tsx`. Render with mocked content for each variant.
6. Build `CityChipRow.tsx`.
7. Wire it all into `(tabs)/index.tsx`. Remove the old header / search pill / mode chips. Add the `city.ilike` filter and city slug to the two existing react-query keys.
8. Extend `(tabs)/search.tsx` to seed `query` from `useLocalSearchParams<{ q?: string }>()`.
9. Update Maestro flow.
10. Typecheck + Maestro + manual smoke. Open PR.

## Rollout

- Branch: `feat/mobile-home-hero-redesign`, off `main`.
- One PR.
- No feature flag — the redesign is pure-replacement of the existing home, and the mobile app distribution is preview-only (no GA users to ramp).

## Follow-ups (not this spec)

- Dedicated `/(tabs)/matches` screen, so the "View matches" CTA has a real destination.
- Lifestyle quiz on mobile (currently web-only) — required before the `onboarding` variant's "Finish quiz" CTA can route correctly.
- Persist city selection (per-user, in `user_matching_preferences` or a new column on `profiles`).
- True radial gradient via `react-native-svg` if the stacked linear approximation isn't convincing.
- Pull-to-refresh on the home (re-runs all signal queries).
