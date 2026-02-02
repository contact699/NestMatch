import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('submitted_questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: questions, error: fetchError } = await query

    if (fetchError) throw fetchError

    return apiResponse({ questions }, 200, requestId)
  }
)
