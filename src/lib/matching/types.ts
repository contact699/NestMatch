import type { SeekingProfile, Profile } from '@/types/database'

export type VerificationLevel = 'basic' | 'verified' | 'trusted'

export interface MatchingCandidate {
  userId: string
  seekingProfile: SeekingProfile
  profile: Profile
  verificationLevel: VerificationLevel
}

export interface MatchCriteria {
  budgetOverlap: {
    min: number
    max: number
  }
  commonCities: string[]
  dateRange: {
    earliest: string
    latest: string
  }
}

export interface SuggestedGroup {
  members: string[]
  practicalScore: number
  compatibilityScore: number
  trustScore: number
  combinedScore: number
  matchCriteria: MatchCriteria
}

export interface GroupSuggestionWithProfiles extends SuggestedGroup {
  memberProfiles: Array<{
    userId: string
    name: string | null
    profilePhoto: string | null
    verificationLevel: VerificationLevel
    city: string | null
    province: string | null
  }>
}

export interface MatchingConfig {
  // Weights for scoring (should sum to 1)
  practicalWeight: number
  compatibilityWeight: number
  trustWeight: number

  // Hard filters
  minBudgetOverlapPercent: number
  maxDateDifferencesDays: number

  // Trust boost multipliers
  verifiedBoost: number
  trustedBoost: number
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  practicalWeight: 0.40,
  compatibilityWeight: 0.35,
  trustWeight: 0.25,
  minBudgetOverlapPercent: 20,
  maxDateDifferencesDays: 45,
  verifiedBoost: 1.3,
  trustedBoost: 1.5,
}

export interface PracticalMatchResult {
  passes: boolean
  score: number
  budgetOverlap: { min: number; max: number } | null
  commonCities: string[]
  dateRange: { earliest: string; latest: string } | null
}
