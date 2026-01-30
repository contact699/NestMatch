import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const otherUserId = searchParams.get('userId')

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'userId parameter required' },
        { status: 400 }
      )
    }

    // Call the database function to calculate compatibility
    const { data, error } = await (supabase as any).rpc('calculate_compatibility', {
      user_id_1: user.id,
      user_id_2: otherUserId,
    })

    if (error) {
      console.error('Error calculating compatibility:', error)
      return NextResponse.json(
        { error: 'Failed to calculate compatibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({ score: data || 0 })
  } catch (error) {
    console.error('Error in GET /api/compatibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Batch compatibility scores for multiple users
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds array required' },
        { status: 400 }
      )
    }

    // Calculate compatibility for each user
    const scores: Record<string, number> = {}

    for (const otherUserId of userIds) {
      if (otherUserId === user.id) {
        scores[otherUserId] = 100 // Perfect match with yourself
        continue
      }

      const { data, error } = await (supabase as any).rpc('calculate_compatibility', {
        user_id_1: user.id,
        user_id_2: otherUserId,
      })

      if (!error) {
        scores[otherUserId] = data || 0
      }
    }

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Error in POST /api/compatibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
