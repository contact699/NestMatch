import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bookmarkSchema = z.object({
  type: z.enum(['resource', 'faq']),
  itemId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    const { data: bookmarks, error } = await (supabase as any)
      .from('resource_bookmarks')
      .select(`
        *,
        resource:resources(*),
        faq:faqs(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookmarks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error('Error in GET /api/resources/bookmarks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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
    const validationResult = bookmarkSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { type, itemId } = validationResult.data

    const insertData: any = {
      user_id: user.id,
    }

    if (type === 'resource') {
      insertData.resource_id = itemId
    } else {
      insertData.faq_id = itemId
    }

    const { data: bookmark, error } = await (supabase as any)
      .from('resource_bookmarks')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Already bookmarked' },
          { status: 409 }
        )
      }
      console.error('Error creating bookmark:', error)
      return NextResponse.json(
        { error: 'Failed to create bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookmark }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/resources/bookmarks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
