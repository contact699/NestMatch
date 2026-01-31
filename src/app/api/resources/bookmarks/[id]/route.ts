import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

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

    let query = (supabase as any)
      .from('resource_bookmarks')
      .delete()
      .eq('user_id', user.id)

    if (type === 'resource') {
      query = query.eq('resource_id', id)
    } else if (type === 'faq') {
      query = query.eq('faq_id', id)
    } else {
      // Try to delete by bookmark ID
      query = query.eq('id', id)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting bookmark:', error)
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/resources/bookmarks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
