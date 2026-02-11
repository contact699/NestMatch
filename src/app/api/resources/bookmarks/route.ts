import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const bookmarkSchema = z.object({
  type: z.enum(['resource', 'faq']),
  itemId: z.string().uuid(),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { data: bookmarks, error } = await supabase
      .from('resource_bookmarks')
      .select(`
        *,
        resource:resources(*),
        faq:faqs(*)
      `)
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ bookmarks }, 200, requestId)
  },
  { rateLimit: 'default' }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof bookmarkSchema>
    try {
      body = await parseBody(req, bookmarkSchema)
    } catch {
      throw new ValidationError('Invalid bookmark data')
    }

    const { type, itemId } = body

    const insertData: any = {
      user_id: userId!,
    }

    if (type === 'resource') {
      insertData.resource_id = itemId
    } else {
      insertData.faq_id = itemId
    }

    const { data: bookmark, error } = await supabase
      .from('resource_bookmarks')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        throw new ValidationError('Already bookmarked')
      }
      throw error
    }

    return apiResponse({ bookmark }, 201, requestId)
  },
  { rateLimit: 'default' }
)
