import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const reportSchema = z.object({
  reported_user_id: z.string().uuid().optional(),
  reported_listing_id: z.string().uuid().optional(),
  type: z.enum(['scam', 'harassment', 'fake', 'discrimination', 'other']),
  description: z.string().min(10, 'Please provide more details').max(2000),
}).refine(
  (data) => data.reported_user_id || data.reported_listing_id,
  { message: 'Either reported_user_id or reported_listing_id is required' }
)

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get user's reports
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ reports: reports || [] }, 200, requestId)
  }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let reportData: z.infer<typeof reportSchema>
    try {
      reportData = await parseBody(req, reportSchema)
    } catch {
      throw new ValidationError('Invalid report data')
    }

    // Can't report yourself
    if (reportData.reported_user_id === userId) {
      return apiResponse({ error: 'Cannot report yourself' }, 400, requestId)
    }

    // Check if user has already reported this target recently (within 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    let existingQuery = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', userId!)
      .gte('created_at', oneDayAgo.toISOString())

    if (reportData.reported_user_id) {
      existingQuery = existingQuery.eq('reported_user_id', reportData.reported_user_id)
    }
    if (reportData.reported_listing_id) {
      existingQuery = existingQuery.eq('reported_listing_id', reportData.reported_listing_id)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      return apiResponse({ error: 'You have already reported this recently' }, 409, requestId)
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: userId!,
        reported_user_id: reportData.reported_user_id || null,
        reported_listing_id: reportData.reported_listing_id || null,
        type: reportData.type,
        description: reportData.description,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ report }, 201, requestId)
  },
  {
    rateLimit: 'reportCreate',
    audit: {
      action: 'create',
      resourceType: 'report',
      getResourceId: (_req, res) => res?.report?.id,
    },
  }
)
