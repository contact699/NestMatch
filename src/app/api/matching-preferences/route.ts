import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const updatePreferencesSchema = z.object({
  preferred_group_size: z.number().min(2).max(4).optional(),
  budget_flexibility_percent: z.number().min(0).max(100).optional(),
  date_flexibility_days: z.number().min(0).max(365).optional(),
  verification_preference: z.enum(['any', 'verified_only', 'trusted_only']).optional(),
  is_discoverable: z.boolean().optional(),
})

// GET /api/matching-preferences - Get current preferences
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { data: preferences, error } = await (supabase as any)
      .from('user_matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found", which is fine
      throw error
    }

    // Return preferences or defaults
    return apiResponse({
      preferences: preferences || {
        user_id: userId,
        preferred_group_size: 2,
        budget_flexibility_percent: 20,
        date_flexibility_days: 30,
        verification_preference: 'any',
        is_discoverable: true,
      },
    }, 200, requestId)
  }
)

// PUT /api/matching-preferences - Update preferences
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let updates: z.infer<typeof updatePreferencesSchema>
    try {
      updates = await parseBody(req, updatePreferencesSchema)
    } catch {
      throw new ValidationError('Invalid preferences data')
    }

    // Upsert preferences
    const { data: preferences, error } = await (supabase as any)
      .from('user_matching_preferences')
      .upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    return apiResponse({ preferences }, 200, requestId)
  }
)

// POST /api/matching-preferences - Create preferences (if not exists)
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let data: z.infer<typeof updatePreferencesSchema>
    try {
      data = await parseBody(req, updatePreferencesSchema)
    } catch {
      throw new ValidationError('Invalid preferences data')
    }

    // Check if preferences already exist
    const { data: existing } = await (supabase as any)
      .from('user_matching_preferences')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return apiResponse(
        { error: 'Preferences already exist. Use PUT to update.' },
        409,
        requestId
      )
    }

    // Insert new preferences
    const { data: preferences, error } = await (supabase as any)
      .from('user_matching_preferences')
      .insert({
        user_id: userId,
        preferred_group_size: data.preferred_group_size || 2,
        budget_flexibility_percent: data.budget_flexibility_percent || 20,
        date_flexibility_days: data.date_flexibility_days || 30,
        verification_preference: data.verification_preference || 'any',
        is_discoverable: data.is_discoverable ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ preferences }, 201, requestId)
  }
)
