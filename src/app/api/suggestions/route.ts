import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { generateGroupSuggestions, saveGroupSuggestions, getSuggestionsWithProfiles } from '@/lib/matching/group-matcher'

// GET /api/suggestions - Get user's suggestions
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get suggestions with profile data
    const suggestions = await getSuggestionsWithProfiles(userId)

    // Get user preferences
    const { data: preferences } = await (supabase as any)
      .from('user_matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get count of potential candidates
    const { count: totalCandidates } = await (supabase as any)
      .from('seeking_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .neq('user_id', userId)

    return apiResponse({
      suggestions,
      meta: {
        totalCandidates: totalCandidates || 0,
        preferences: preferences || {
          preferred_group_size: 2,
          budget_flexibility_percent: 20,
          date_flexibility_days: 30,
          verification_preference: 'any',
          is_discoverable: true,
        },
      },
    }, 200, requestId)
  }
)

// POST /api/suggestions/generate - Refresh suggestions (rate limited: 1/day)
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Check rate limit - only allow generating once per day
    const { data: recentSuggestion } = await (supabase as any)
      .from('group_suggestions')
      .select('created_at')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recentSuggestion) {
      const createdAt = new Date(recentSuggestion.created_at)
      const now = new Date()
      const hoursSinceLastGeneration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastGeneration < 24) {
        return apiResponse(
          {
            error: 'Rate limited',
            message: 'You can only refresh suggestions once per day',
            nextRefreshAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          },
          429,
          requestId
        )
      }
    }

    // Get user preferences
    const { data: preferences } = await (supabase as any)
      .from('user_matching_preferences')
      .select('preferred_group_size')
      .eq('user_id', userId)
      .single()

    const groupSize = preferences?.preferred_group_size || 2

    // Generate new suggestions
    const suggestions = await generateGroupSuggestions(userId, groupSize)

    // Save to database
    await saveGroupSuggestions(userId, suggestions)

    return apiResponse({
      generated: suggestions.length,
      message: `Generated ${suggestions.length} group suggestions`,
    }, 200, requestId)
  },
  { rateLimit: 'suggestionsGenerate' }
)
