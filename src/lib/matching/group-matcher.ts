import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import type { Profile, SeekingProfile } from '@/types/database'
import type {
  MatchingCandidate,
  SuggestedGroup,
  MatchingConfig,
  VerificationLevel,
  GroupSuggestionWithProfiles,
} from './types'
import { DEFAULT_MATCHING_CONFIG } from './types'
import { calculatePracticalScore } from './practical-matcher'

/**
 * Apply trust boost multiplier based on verification level
 */
export function applyTrustBoost(
  score: number,
  level: VerificationLevel,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): number {
  let boost = 1
  if (level === 'verified') {
    boost = config.verifiedBoost
  } else if (level === 'trusted') {
    boost = config.trustedBoost
  }
  return Math.min(100, Math.round(score * boost))
}

/**
 * Calculate combined score from practical, compatibility, and trust scores
 */
export function calculateCombinedScore(
  practicalScore: number,
  compatibilityScore: number,
  trustScore: number,
  averageVerificationLevel: VerificationLevel,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): number {
  const weightedScore =
    practicalScore * config.practicalWeight +
    compatibilityScore * config.compatibilityWeight +
    trustScore * config.trustWeight

  // Apply trust boost based on average verification level
  return applyTrustBoost(weightedScore, averageVerificationLevel, config)
}

/**
 * Determine average verification level for a group
 */
export function getAverageVerificationLevel(candidates: MatchingCandidate[]): VerificationLevel {
  const levels = candidates.map(c => c.verificationLevel)
  const trusted = levels.filter(l => l === 'trusted').length
  const verified = levels.filter(l => l === 'verified').length

  if (trusted >= levels.length / 2) {
    return 'trusted'
  }
  if (verified + trusted >= levels.length / 2) {
    return 'verified'
  }
  return 'basic'
}

/**
 * Calculate trust score in memory (no DB call needed)
 * Uses already-fetched verification levels from candidates
 */
export function calculateTrustScoreLocal(candidates: MatchingCandidate[]): number {
  if (candidates.length === 0) return 0

  let trustSum = 0
  for (const candidate of candidates) {
    switch (candidate.verificationLevel) {
      case 'trusted':
        trustSum += 100
        break
      case 'verified':
        trustSum += 70
        break
      default:
        trustSum += 30
    }
  }
  return Math.round(trustSum / candidates.length)
}

// Constants for performance limits
const MAX_CANDIDATES = 30 // Limit candidates to prevent explosion
const MAX_COMBINATIONS_EVALUATED = 50 // Limit combinations to evaluate

/**
 * Fetch matching candidates for a target user
 * Optimized: Batch fetches preferences to avoid N+1 queries
 */
async function fetchMatchingCandidates(
  supabase: any,
  targetUserId: string,
  verificationPreference: 'any' | 'verified_only' | 'trusted_only' = 'any'
): Promise<MatchingCandidate[]> {
  // Get target user's seeking profile
  const { data: targetSeeking } = await supabase
    .from('seeking_profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .single()

  if (!targetSeeking) {
    return []
  }

  // Fetch other active seeking profiles with limit
  let query = supabase
    .from('seeking_profiles')
    .select(`
      *,
      profile:profiles!seeking_profiles_user_id_fkey(*)
    `)
    .eq('is_active', true)
    .neq('user_id', targetUserId)
    .limit(MAX_CANDIDATES * 2) // Fetch extra to account for filtering

  const { data: seekingProfiles, error } = await query

  if (error || !seekingProfiles) {
    logger.error('Error fetching seeking profiles', error instanceof Error ? error : new Error(String(error)))
    return []
  }

  // Get all user IDs for batch preference lookup
  const userIds = seekingProfiles.map((sp: any) => sp.user_id)

  // Batch fetch all matching preferences in one query (fixes N+1)
  const { data: allPreferences } = await supabase
    .from('user_matching_preferences')
    .select('user_id, is_discoverable')
    .in('user_id', userIds)

  // Create lookup map for preferences
  const preferencesMap = new Map<string, { is_discoverable: boolean }>()
  if (allPreferences) {
    for (const pref of allPreferences) {
      preferencesMap.set(pref.user_id, pref)
    }
  }

  // Filter by verification preference and discoverability
  const candidates: MatchingCandidate[] = []

  for (const sp of seekingProfiles) {
    // Enforce candidate limit
    if (candidates.length >= MAX_CANDIDATES) break

    const profile = sp.profile as Profile
    if (!profile) continue

    const verificationLevel = (profile.verification_level || 'basic') as VerificationLevel

    // Filter by verification preference
    if (verificationPreference === 'verified_only' && verificationLevel === 'basic') {
      continue
    }
    if (verificationPreference === 'trusted_only' && verificationLevel !== 'trusted') {
      continue
    }

    // Check discoverability from batch-fetched preferences
    const preferences = preferencesMap.get(sp.user_id)
    if (preferences && !preferences.is_discoverable) {
      continue
    }

    candidates.push({
      userId: sp.user_id,
      seekingProfile: sp,
      profile,
      verificationLevel,
    })
  }

  return candidates
}

/**
 * Generate group combinations of specified size
 */
function* generateCombinations<T>(arr: T[], size: number): Generator<T[]> {
  if (size > arr.length) return
  if (size <= 0) return

  function* combine(start: number, combo: T[]): Generator<T[]> {
    if (combo.length === size) {
      yield [...combo]
      return
    }

    for (let i = start; i <= arr.length - (size - combo.length); i++) {
      combo.push(arr[i])
      yield* combine(i + 1, combo)
      combo.pop()
    }
  }

  yield* combine(0, [])
}

/**
 * Generate group suggestions for a target user
 * Optimized: Limits combinations, calculates trust locally, batches compatibility
 */
export async function generateGroupSuggestions(
  targetUserId: string,
  groupSize: number = 2,
  maxSuggestions: number = 10,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): Promise<SuggestedGroup[]> {
  const supabase = await createClient()

  // Get user's matching preferences
  const { data: userPreferences } = await supabase
    .from('user_matching_preferences')
    .select('*')
    .eq('user_id', targetUserId)
    .single()

  const verificationPreference = userPreferences?.verification_preference || 'any'
  const preferredGroupSize = userPreferences?.preferred_group_size || groupSize

  // Get target user's info
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .single()

  const { data: targetSeeking } = await supabase
    .from('seeking_profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .single()

  if (!targetProfile || !targetSeeking) {
    return []
  }

  const targetCandidate: MatchingCandidate = {
    userId: targetUserId,
    seekingProfile: targetSeeking,
    profile: targetProfile,
    verificationLevel: (targetProfile.verification_level || 'basic') as VerificationLevel,
  }

  // Fetch other candidates (already limited by MAX_CANDIDATES)
  const candidates = await fetchMatchingCandidates(
    supabase,
    targetUserId,
    verificationPreference
  )

  if (candidates.length === 0) {
    return []
  }

  // First pass: Filter combinations by practical score (no DB calls)
  // Also calculate trust scores locally since we have verification levels
  const otherMembersNeeded = preferredGroupSize - 1
  const passingCombinations: {
    groupCandidates: MatchingCandidate[]
    practicalResult: ReturnType<typeof calculatePracticalScore>
    trustScore: number
  }[] = []
  let combinationsChecked = 0

  for (const combination of generateCombinations(candidates, otherMembersNeeded)) {
    // Enforce combination limit to prevent explosion
    combinationsChecked++
    if (combinationsChecked > MAX_COMBINATIONS_EVALUATED) break

    const groupCandidates = [targetCandidate, ...combination]

    // Calculate practical score (no DB call, pure computation)
    const practicalResult = calculatePracticalScore(groupCandidates, config)
    if (!practicalResult.passes) {
      continue
    }

    // Calculate trust score locally (no DB call needed - we have profiles)
    const trustScore = calculateTrustScoreLocal(groupCandidates)

    passingCombinations.push({ groupCandidates, practicalResult, trustScore })

    // Early exit if we have enough passing combinations
    if (passingCombinations.length >= maxSuggestions * 2) break
  }

  if (passingCombinations.length === 0) {
    return []
  }

  // Second pass: Single batch RPC call for ALL compatibility scores
  // This eliminates N+1 - one DB call instead of N calls
  const groupMemberArrays = passingCombinations.map(({ groupCandidates }) =>
    groupCandidates.map(c => c.userId)
  )

  const { data: batchResults, error: batchError } = await supabase.rpc(
    'batch_calculate_group_compatibilities' as any,
    { group_member_arrays: groupMemberArrays }
  ) as { data: any; error: any }

  // Create lookup map for compatibility scores by index
  const compatibilityByIndex = new Map<number, number>()
  if (batchResults && !batchError) {
    for (const row of batchResults as any[]) {
      compatibilityByIndex.set(row.group_index, row.compatibility_score)
    }
  }

  // Build suggestions with all scores
  const suggestions: SuggestedGroup[] = passingCombinations.map(
    ({ groupCandidates, practicalResult, trustScore }, index) => {
      const memberIds = groupCandidates.map(c => c.userId)
      const compatibilityScore = compatibilityByIndex.get(index) || 0
      const avgVerificationLevel = getAverageVerificationLevel(groupCandidates)

      const combinedScore = calculateCombinedScore(
        practicalResult.score,
        compatibilityScore,
        trustScore,
        avgVerificationLevel,
        config
      )

      return {
        members: memberIds,
        practicalScore: practicalResult.score,
        compatibilityScore,
        trustScore,
        combinedScore,
        matchCriteria: {
          budgetOverlap: practicalResult.budgetOverlap!,
          commonCities: practicalResult.commonCities,
          dateRange: practicalResult.dateRange!,
        },
      }
    }
  )

  // Sort by combined score (descending) and return top suggestions
  suggestions.sort((a, b) => b.combinedScore - a.combinedScore)
  return suggestions.slice(0, maxSuggestions)
}

/**
 * Save generated suggestions to database
 * Uses service role client to bypass RLS (inserts are restricted to service role only)
 */
export async function saveGroupSuggestions(
  targetUserId: string,
  suggestions: SuggestedGroup[]
): Promise<void> {
  // Use service role to bypass RLS - inserts are not allowed for regular users
  const supabase = createServiceClient()

  // Delete old active suggestions for this user
  await supabase
    .from('group_suggestions')
    .delete()
    .eq('target_user_id', targetUserId)
    .eq('status', 'active')

  // Insert new suggestions
  const records = suggestions.map(s => ({
    target_user_id: targetUserId,
    suggested_users: s.members.filter(id => id !== targetUserId),
    practical_score: s.practicalScore,
    compatibility_score: s.compatibilityScore,
    trust_score: s.trustScore,
    combined_score: s.combinedScore,
    match_criteria: s.matchCriteria,
    status: 'active' as const,
  }))

  if (records.length > 0) {
    await supabase.from('group_suggestions').insert(records as any)
  }
}

/**
 * Get suggestions with full profile data for display
 * Optimized: Batch fetches all profiles in a single query
 */
export async function getSuggestionsWithProfiles(
  targetUserId: string
): Promise<GroupSuggestionWithProfiles[]> {
  const supabase = await createClient()

  const { data: suggestions, error } = await supabase
    .from('group_suggestions')
    .select('*')
    .eq('target_user_id', targetUserId)
    .eq('status', 'active')
    .order('combined_score', { ascending: false })
    .limit(20) // Limit suggestions fetched

  if (error || !suggestions || suggestions.length === 0) {
    return []
  }

  // Collect ALL unique user IDs across all suggestions (batch approach)
  const allUserIds = new Set<string>([targetUserId])
  for (const suggestion of suggestions) {
    for (const userId of suggestion.suggested_users) {
      allUserIds.add(userId)
    }
  }

  // Single query to fetch ALL profiles needed
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('user_id, name, profile_photo, verification_level, city, province')
    .in('user_id', Array.from(allUserIds))

  // Create lookup map for O(1) access
  const profilesMap = new Map<string, any>()
  if (allProfiles) {
    for (const p of allProfiles) {
      profilesMap.set(p.user_id, {
        userId: p.user_id,
        name: p.name,
        profilePhoto: p.profile_photo,
        verificationLevel: (p.verification_level || 'basic') as VerificationLevel,
        city: p.city,
        province: p.province,
      })
    }
  }

  // Build results using the lookup map (no additional queries)
  return suggestions.map((suggestion: any) => {
    const memberIds = [targetUserId, ...suggestion.suggested_users]
    const memberProfiles = memberIds
      .map(id => profilesMap.get(id))
      .filter(Boolean)

    return {
      members: memberIds,
      practicalScore: suggestion.practical_score,
      compatibilityScore: suggestion.compatibility_score,
      trustScore: suggestion.trust_score,
      combinedScore: suggestion.combined_score,
      matchCriteria: suggestion.match_criteria,
      memberProfiles,
    }
  })
}
