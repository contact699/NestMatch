import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

// Delete a shared expense (creator only).
//
// 204 on success, 403 when the caller is a participant but not the creator,
// 404 when the expense doesn't exist or the caller can't see it at all — the
// lookup runs on the caller's RLS-scoped client, so a stranger gets 404 rather
// than a 403 that would confirm the id exists — and 409 when another
// participant has already paid (or is mid-payment for) their share.
export const DELETE = withApiHandler(
  async (_req, { userId, supabase, requestId, params }) => {
    const expenseId = params.id

    if (!expenseId) {
      throw new NotFoundError('Expense not found')
    }

    const { data: expense, error: lookupError } = await supabase
      .from('shared_expenses')
      .select('id, created_by')
      .eq('id', expenseId)
      .maybeSingle()

    if (lookupError) {
      // 22P02 invalid_text_representation: the path segment isn't a uuid, so no
      // such expense exists. 42P01: the expenses migration isn't applied here.
      if (lookupError.code === '22P02' || lookupError.code === '42P01') {
        throw new NotFoundError('Expense not found')
      }
      throw lookupError
    }

    if (!expense) {
      throw new NotFoundError('Expense not found')
    }

    if ((expense as { created_by: string | null }).created_by !== userId!) {
      throw new AuthorizationError('Only the person who created this expense can delete it')
    }

    // There is no DELETE policy on shared_expenses (migrations 002/022/030 grant
    // SELECT/INSERT/UPDATE only), so a delete on the caller's client would match
    // zero rows and report success. The authorization decision above is the
    // boundary; the write goes through the service client.
    let serviceClient: ReturnType<typeof createServiceClient>
    try {
      serviceClient = createServiceClient()
    } catch (e) {
      logger.error(
        'Service client unavailable for expense delete',
        e instanceof Error ? e : new Error(String(e)),
        { requestId, expenseId }
      )
      return apiResponse(
        { error: 'Expenses are temporarily unavailable. Please try again later.' },
        503,
        requestId
      )
    }

    // Deleting an expense whose shares are settled destroys the record of what
    // those payments were for: expense_shares cascades away with the parent, so
    // the surviving `payments` rows lose their link and the person who paid has
    // no way to show what they paid for. That is financial history belonging to
    // someone other than the creator, so the creator does not get to erase it —
    // this is now a hard 409, not a log line.
    //
    // 'processing' counts too: a Stripe payment intent is already in flight, and
    // the webhook that settles it looks the share up by id.
    //
    // The creator's OWN share is excluded: migration 039 stamps it 'paid' at
    // creation time as a bookkeeping convenience (no money moved), so counting
    // it would make every expense undeletable.
    const SETTLED_SHARE_STATUSES = ['paid', 'processing']

    const { data: settledShares } = await serviceClient
      .from('expense_shares')
      .select('id')
      .eq('expense_id', expenseId)
      .in('status', SETTLED_SHARE_STATUSES)
      .neq('user_id', userId!)

    if ((settledShares?.length ?? 0) > 0) {
      logger.warn('Refused to delete an expense with recorded payments', {
        requestId,
        expenseId,
        settledShareCount: settledShares?.length ?? 0,
      })
      return apiResponse(
        { error: "This expense has recorded payments and can't be deleted." },
        409,
        requestId
      )
    }

    // expense_shares.expense_id is ON DELETE CASCADE (migration 002), so the
    // shares go with the parent row.
    const { error: deleteError } = await serviceClient
      .from('shared_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('created_by', userId!)

    if (deleteError) {
      logger.error('Failed to delete expense', new Error(deleteError.message), {
        requestId,
        expenseId,
        code: deleteError.code,
      })
      return apiResponse({ error: 'Failed to delete expense' }, 500, requestId)
    }

    return new Response(null, {
      status: 204,
      headers: { 'X-Request-ID': requestId },
    })
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'delete',
      resourceType: 'shared_expense',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
