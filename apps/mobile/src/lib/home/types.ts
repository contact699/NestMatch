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
