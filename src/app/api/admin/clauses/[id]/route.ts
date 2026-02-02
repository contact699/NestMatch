import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { data, error: fetchError } = await supabase
      .from('agreement_clauses')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !data) {
      throw new NotFoundError('Clause not found')
    }

    return apiResponse(data, 200, requestId)
  }
)

export const PATCH = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

    const { data, error: updateError } = await supabase
      .from('agreement_clauses')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return apiResponse(data, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'agreement_clause',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { error: deleteError } = await supabase
      .from('agreement_clauses')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    audit: {
      action: 'delete',
      resourceType: 'agreement_clause',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
