// Shared test fixtures for the matching module's unit tests.
// Not a *.test.ts file itself, so vitest won't collect it directly.
import type { Profile, SeekingProfile } from '@/types/database'
import type { MatchingCandidate, VerificationLevel } from '../types'

export function makeSeekingProfile(overrides: Partial<SeekingProfile> = {}): SeekingProfile {
  return {
    id: 'sp-1',
    user_id: 'user-1',
    budget_min: 1000,
    budget_max: 2000,
    move_in_date: '2026-08-01',
    preferred_cities: ['Toronto'],
    preferred_areas: null,
    description: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    bio: null,
    age: null,
    gender: null,
    occupation: null,
    profile_photo: null,
    photos: null,
    phone: null,
    phone_verified: false,
    email_verified: false,
    verification_level: 'basic',
    verified_at: null,
    languages: null,
    city: null,
    province: null,
    household_situation: null,
    number_of_children: null,
    budget_min: null,
    budget_max: null,
    is_admin: false,
    is_online: false,
    last_seen_at: null,
    show_verification_badges: true,
    stripe_customer_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeCandidate(overrides: {
  userId?: string
  verificationLevel?: VerificationLevel
  seekingProfile?: Partial<SeekingProfile>
  profile?: Partial<Profile>
} = {}): MatchingCandidate {
  const userId = overrides.userId ?? 'user-1'
  const verificationLevel = overrides.verificationLevel ?? 'basic'
  return {
    userId,
    verificationLevel,
    seekingProfile: makeSeekingProfile({ user_id: userId, ...overrides.seekingProfile }),
    profile: makeProfile({ user_id: userId, verification_level: verificationLevel, ...overrides.profile }),
  }
}
