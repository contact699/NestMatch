import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const { data, error: fetchError } = await supabase
      .from('agreement_clauses')
      .select('*')
      .order('category')
      .order('display_order')

    if (fetchError) throw fetchError

    return apiResponse(data, 200, requestId)
  }
)

export const POST = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const body = await req.json()

    const { data, error: insertError } = await supabase
      .from('agreement_clauses')
      .insert(body)
      .select()
      .single()

    if (insertError) throw insertError

    return apiResponse(data, 201, requestId)
  },
  {
    audit: {
      action: 'create',
      resourceType: 'agreement_clause',
      getResourceId: (_req, res) => res?.id,
    },
  }
)
