import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reportSchema = z.object({
  reported_user_id: z.string().uuid().optional(),
  reported_listing_id: z.string().uuid().optional(),
  type: z.enum(['scam', 'harassment', 'fake', 'discrimination', 'other']),
  description: z.string().min(10, 'Please provide more details').max(2000),
}).refine(
  (data) => data.reported_user_id || data.reported_listing_id,
  { message: 'Either reported_user_id or reported_listing_id is required' }
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's reports
    const { data: reports, error } = await (supabase as any)
      .from('reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any }

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = reportSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const reportData = validationResult.data

    // Can't report yourself
    if (reportData.reported_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      )
    }

    // Check if user has already reported this target recently (within 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    let existingQuery = (supabase as any)
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .gte('created_at', oneDayAgo.toISOString())

    if (reportData.reported_user_id) {
      existingQuery = existingQuery.eq('reported_user_id', reportData.reported_user_id)
    }
    if (reportData.reported_listing_id) {
      existingQuery = existingQuery.eq('reported_listing_id', reportData.reported_listing_id)
    }

    const { data: existing } = await existingQuery.single() as { data: any; error: any }

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reported this recently' },
        { status: 409 }
      )
    }

    // Create report
    const { data: report, error } = await (supabase as any)
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportData.reported_user_id || null,
        reported_listing_id: reportData.reported_listing_id || null,
        type: reportData.type,
        description: reportData.description,
      })
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
