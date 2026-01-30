import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params
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

    // Delete saved listing
    const { error } = await (supabase as any)
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId) as { error: any }

    if (error) {
      console.error('Error removing saved listing:', error)
      return NextResponse.json(
        { error: 'Failed to remove saved listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/saved-listings/[listingId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
