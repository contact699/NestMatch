// Pure helpers for the home hero — no React, no Supabase, no auth. Lives in
// its own file so the table-driven test can import these directly under
// tsx/Node without pulling in Expo/RN-only modules.

import { getFlagshipBySlug } from '@/lib/cities'
import type { HomeSignals, HeroVariant, HeroContent, ProfileSnapshot } from './types'

export const ZERO_SIGNALS: HomeSignals = {
  newMatches: 0,
  pendingInvites: 0,
  unreadMessages: 0,
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
    signals.unreadMessages
  if (attentionSignals > 0) return 'signals'
  if (profileCompletion < 100) return 'onboarding'
  return 'discovery'
}

/**
 * Fields counted toward profile completion. Order matters — the first missing
 * field becomes `nextMissingField` and drives the onboarding CTA label.
 */
export const COMPLETION_FIELDS = [
  'bio',
  'photo',
  'city',
  'household_situation',
  'occupation',
  'age',
  'gender',
] as const

export type CompletionField = (typeof COMPLETION_FIELDS)[number]

export function fieldPresent(profile: Record<string, unknown>, field: CompletionField): boolean {
  if (field === 'photo') return !!profile.profile_photo
  const v = profile[field]
  return v !== null && v !== undefined && v !== ''
}

export function ctaLabelForMissing(field: ProfileSnapshot['nextMissingField']): string {
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

    // Variant was selected because at least one signal is > 0; that signal
    // drives the eyebrow + primary CTA.
    let eyebrow: string
    let primary: HeroContent['primaryCta']
    if (signals.newMatches > 0) {
      eyebrow = `● ${signals.newMatches} NEW MATCH${signals.newMatches === 1 ? '' : 'ES'} TONIGHT`
      primary = { label: 'View matches →', target: { kind: 'route', pathname: '/(tabs)/search' } }
    } else if (signals.pendingInvites > 0) {
      eyebrow = `● ${signals.pendingInvites} GROUP INVITE${signals.pendingInvites === 1 ? '' : 'S'} WAITING`
      primary = { label: 'See invites →', target: { kind: 'route', pathname: '/(tabs)/messages' } }
    } else {
      // unreadMessages > 0 — selectVariant guarantees this is the only
      // remaining attention signal that could be > 0.
      eyebrow = `● ${signals.unreadMessages} UNREAD MESSAGE${signals.unreadMessages === 1 ? '' : 'S'}`
      primary = { label: 'Open messages →', target: { kind: 'route', pathname: '/(tabs)/messages' } }
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
