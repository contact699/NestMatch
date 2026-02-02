import type { SeekingProfile } from '@/types/database'
import type { MatchingCandidate, PracticalMatchResult, MatchingConfig } from './types'
import { DEFAULT_MATCHING_CONFIG } from './types'

/**
 * Calculate budget overlap between two seeking profiles
 * Returns the overlap range or null if no overlap
 */
export function calculateBudgetOverlap(
  profile1: SeekingProfile,
  profile2: SeekingProfile
): { min: number; max: number; overlapPercent: number } | null {
  const overlapMin = Math.max(profile1.budget_min, profile2.budget_min)
  const overlapMax = Math.min(profile1.budget_max, profile2.budget_max)

  if (overlapMin > overlapMax) {
    return null
  }

  // Calculate overlap percentage relative to the smaller budget range
  const range1 = profile1.budget_max - profile1.budget_min
  const range2 = profile2.budget_max - profile2.budget_min
  const overlapRange = overlapMax - overlapMin
  const smallerRange = Math.min(range1, range2)

  // Avoid division by zero
  const overlapPercent = smallerRange > 0
    ? (overlapRange / smallerRange) * 100
    : 100

  return { min: overlapMin, max: overlapMax, overlapPercent }
}

/**
 * Calculate budget overlap for a group of candidates
 */
export function calculateGroupBudgetOverlap(
  candidates: MatchingCandidate[]
): { min: number; max: number; overlapPercent: number } | null {
  if (candidates.length < 2) {
    return null
  }

  let overlapMin = candidates[0].seekingProfile.budget_min
  let overlapMax = candidates[0].seekingProfile.budget_max

  for (let i = 1; i < candidates.length; i++) {
    overlapMin = Math.max(overlapMin, candidates[i].seekingProfile.budget_min)
    overlapMax = Math.min(overlapMax, candidates[i].seekingProfile.budget_max)

    if (overlapMin > overlapMax) {
      return null
    }
  }

  // Calculate overlap percentage
  const ranges = candidates.map(c => c.seekingProfile.budget_max - c.seekingProfile.budget_min)
  const smallestRange = Math.min(...ranges)
  const overlapRange = overlapMax - overlapMin
  const overlapPercent = smallestRange > 0
    ? (overlapRange / smallestRange) * 100
    : 100

  return { min: overlapMin, max: overlapMax, overlapPercent }
}

/**
 * Find common cities between candidates
 */
export function findCommonCities(candidates: MatchingCandidate[]): string[] {
  if (candidates.length === 0) {
    return []
  }

  // Start with the first candidate's cities
  let commonCities = new Set(candidates[0].seekingProfile.preferred_cities)

  // Intersect with each subsequent candidate's cities
  for (let i = 1; i < candidates.length; i++) {
    const candidateCities = new Set(candidates[i].seekingProfile.preferred_cities)
    commonCities = new Set([...commonCities].filter(city => candidateCities.has(city)))
  }

  return Array.from(commonCities)
}

/**
 * Calculate date range and check if dates are compatible
 */
export function calculateDateRange(
  candidates: MatchingCandidate[],
  maxDifferencesDays: number = 45
): { earliest: string; latest: string; isCompatible: boolean } | null {
  if (candidates.length === 0) {
    return null
  }

  const dates = candidates.map(c => new Date(c.seekingProfile.move_in_date))
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
  const latest = new Date(Math.max(...dates.map(d => d.getTime())))

  const daysDifference = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))

  return {
    earliest: earliest.toISOString().split('T')[0],
    latest: latest.toISOString().split('T')[0],
    isCompatible: daysDifference <= maxDifferencesDays
  }
}

/**
 * Calculate practical score for a group of candidates
 * Score is based on budget overlap, city overlap, and date proximity
 */
export function calculatePracticalScore(
  candidates: MatchingCandidate[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): PracticalMatchResult {
  // Check budget overlap
  const budgetOverlap = calculateGroupBudgetOverlap(candidates)
  if (!budgetOverlap || budgetOverlap.overlapPercent < config.minBudgetOverlapPercent) {
    return {
      passes: false,
      score: 0,
      budgetOverlap: null,
      commonCities: [],
      dateRange: null
    }
  }

  // Check common cities
  const commonCities = findCommonCities(candidates)
  if (commonCities.length === 0) {
    return {
      passes: false,
      score: 0,
      budgetOverlap: { min: budgetOverlap.min, max: budgetOverlap.max },
      commonCities: [],
      dateRange: null
    }
  }

  // Check date compatibility
  const dateRange = calculateDateRange(candidates, config.maxDateDifferencesDays)
  if (!dateRange || !dateRange.isCompatible) {
    return {
      passes: false,
      score: 0,
      budgetOverlap: { min: budgetOverlap.min, max: budgetOverlap.max },
      commonCities,
      dateRange: dateRange ? { earliest: dateRange.earliest, latest: dateRange.latest } : null
    }
  }

  // Calculate score components (each 0-100)

  // Budget score: Higher overlap = higher score
  const budgetScore = Math.min(100, budgetOverlap.overlapPercent)

  // City score: More common cities = higher score (max at 3+)
  const cityScore = Math.min(100, (commonCities.length / 3) * 100)

  // Date score: Closer dates = higher score
  const daysDifference = Math.ceil(
    (new Date(dateRange.latest).getTime() - new Date(dateRange.earliest).getTime()) /
    (1000 * 60 * 60 * 24)
  )
  const dateScore = Math.max(0, 100 - (daysDifference / config.maxDateDifferencesDays) * 100)

  // Weighted average of scores
  const score = Math.round((budgetScore * 0.4) + (cityScore * 0.3) + (dateScore * 0.3))

  return {
    passes: true,
    score,
    budgetOverlap: { min: budgetOverlap.min, max: budgetOverlap.max },
    commonCities,
    dateRange: { earliest: dateRange.earliest, latest: dateRange.latest }
  }
}

/**
 * Check if two candidates pass hard filters
 */
export function candidatesMatch(
  candidate1: MatchingCandidate,
  candidate2: MatchingCandidate,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): boolean {
  const result = calculatePracticalScore([candidate1, candidate2], config)
  return result.passes
}
