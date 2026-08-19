import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

const createExpenseSchema = z.object({
  listing_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  total_amount: z.number().positive(),
  category: z.enum(['rent', 'utilities', 'groceries', 'internet', 'other']).optional(),
  split_type: z.enum(['equal', 'percentage', 'custom']).default('equal'),
  due_date: z.string().optional(),
  shares: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().positive().optional(),
    percentage: z.number().min(0).max(100).optional(),
  })).min(1),
})

/**
 * Cap on how many of the caller's own expense ids are folded into the GET
 * filter. Keeps the generated PostgREST query string bounded regardless of how
 * many shares the caller accumulates. Matches the row limit on the expense
 * query itself, so it cannot hide a row that would otherwise have been shown.
 */
const MAX_PARTICIPANT_EXPENSE_IDS = 100

// Get expenses for a listing or user
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const listingId = searchParams.get('listing_id')
    const status = searchParams.get('status')

    // Which expenses is this user a participant in? Fetching the share rows
    // first lets the expense query filter server-side. The previous code
    // selected every expense the query returned and filtered in JS, so the
    // response size (and the JSON aggregation cost of the nested selects) grew
    // with the whole table rather than with the caller's own data.
    //
    // BOUNDED. These ids are interpolated into a PostgREST `or=` filter below,
    // which travels in the request URL. Unbounded, a user with thousands of
    // shares produces a multi-hundred-KB query string that PostgREST (and any
    // proxy in front of it) rejects — the page fails outright for exactly the
    // heaviest users. The outer expense query is capped at 100 rows anyway, so
    // taking the 100 most recent share rows costs nothing that was reachable.
    const { data: shareRows, error: shareRowsError } = await supabase
      .from('expense_shares')
      .select('expense_id, created_at')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(MAX_PARTICIPANT_EXPENSE_IDS)

    if (shareRowsError && shareRowsError.code !== '42P01') {
      throw shareRowsError
    }

    const participantExpenseIds = Array.from(
      new Set(
        ((shareRows ?? []) as { expense_id: string | null; created_at?: string | null }[])
          .map((r) => r.expense_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    // Get expenses where the user has a share
    let query = supabase
      .from('shared_expenses')
      .select(`
        *,
        creator:profiles!shared_expenses_created_by_fkey(
          name,
          profile_photo
        ),
        listing:listings(
          id,
          title,
          city
        ),
        shares:expense_shares(
          id,
          user_id,
          amount,
          percentage,
          status,
          paid_at,
          user:profiles(
            name,
            profile_photo
          )
        )
      `)

    // The caller's own expenses: created by them, or containing a share of
    // theirs. `.or()` with an empty `in.()` list is a syntax error, so the
    // no-shares case degrades to the creator-only filter.
    if (participantExpenseIds.length > 0) {
      query = query.or(
        `created_by.eq.${userId!},id.in.(${participantExpenseIds.join(',')})`
      )
    } else {
      query = query.eq('created_by', userId!)
    }

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false }).limit(100)

    const { data: expenses, error } = await query as { data: any[]; error: any }

    if (error) {
      // If the table doesn't exist yet (migration not applied), return empty data
      if (
        error.message?.includes('relation') && error.message?.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return apiResponse({
          expenses: [],
          summary: { total_owed: 0, total_owing: 0 },
        }, 200, requestId)
      }
      throw error
    }

    // Already filtered server-side; this is a defence-in-depth pass, not the
    // boundary (RLS is), and it is now a no-op on well-formed results.
    const userExpenses = (expenses || []).filter((expense: any) =>
      expense.created_by === userId! ||
      expense.shares?.some((share: any) => share.user_id === userId!)
    )

    // Calculate user's pending amount
    let totalOwed = 0
    let totalOwing = 0

    for (const expense of userExpenses) {
      const userShare = expense.shares?.find((s: any) => s.user_id === userId!)
      if (userShare && userShare.status === 'pending') {
        totalOwed += userShare.amount
      }
      if (expense.created_by === userId!) {
        const pendingShares = expense.shares?.filter(
          (s: any) => s.user_id !== userId! && s.status === 'pending'
        )
        totalOwing += pendingShares?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0
      }
    }

    return apiResponse({
      expenses: userExpenses,
      summary: {
        total_owed: totalOwed,
        total_owing: totalOwing,
      },
    }, 200, requestId)
  },
  { rateLimit: 'api' }
)

// Create a new shared expense
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof createExpenseSchema>
    try {
      body = await parseBody(req, createExpenseSchema)
    } catch {
      throw new ValidationError('Invalid expense data')
    }

    const { listing_id, title, description, total_amount, category, split_type, due_date, shares } = body

    // Use the service client for the authorization lookup as well as the write,
    // so an RLS rule that hides a cohabitation row cannot produce a false denial.
    const writeClient = (() => {
      try {
        return createServiceClient()
      } catch (e) {
        logger.warn('Service client creation failed, falling back to authenticated client', {
          requestId,
          error: e instanceof Error ? e.message : String(e),
        })
        return supabase
      }
    })()

    // ------------------------------------------------------------------------
    // Authorization: who may be billed
    // ------------------------------------------------------------------------
    // This endpoint writes with the service client, so RLS is NOT the boundary
    // here — this check is. Without it any logged-in user could POST arbitrary
    // profile UUIDs as `shares` and create debts owed to them by strangers.
    //
    // A recipient must share an actual living arrangement with the creator:
    // the listing's owner, or a party to an active cohabitation period on that
    // listing. With no listing_id there is no relationship to verify, so the
    // creator may only bill themselves — which is exactly what the one caller
    // (app)/expenses/page.tsx sends.
    //
    // `members` is the arrangement's membership, derived ONLY from the database.
    // It deliberately does NOT start seeded with the caller: an earlier version
    // wrote `new Set([userId!])`, which made the "is the caller a participant?"
    // test below unfalsifiable, so any authenticated user could attach any
    // listing_id and bill that listing's owner and cohabitants. The caller is
    // added to the recipient allowlist only AFTER their own membership is
    // proven (or, with no listing, because they are the only permitted target).
    const members = new Set<string>()

    if (listing_id) {
      const { data: listing } = await writeClient
        .from('listings')
        .select('user_id')
        .eq('id', listing_id)
        .single()

      if (!listing) {
        throw new NotFoundError('Listing not found')
      }

      const { data: cohabitations } = await writeClient
        .from('cohabitation_periods')
        .select('provider_id, seeker_id')
        .eq('listing_id', listing_id)
        .eq('status', 'active')

      members.add((listing as { user_id: string }).user_id)
      for (const c of (cohabitations ?? []) as { provider_id: string | null; seeker_id: string | null }[]) {
        if (c.provider_id) members.add(c.provider_id)
        if (c.seeker_id) members.add(c.seeker_id)
      }

      // The creator must belong to the arrangement too, not merely name a
      // listing that exists. This is the check the pre-seeded set defeated.
      if (!members.has(userId!)) {
        logger.warn('Rejected expense for a listing the caller does not belong to', {
          requestId,
          listingId: listing_id,
        })
        throw new AuthorizationError('You are not a participant in this listing')
      }
    }

    // Membership established (or vacuous, with no listing): the caller may
    // always bill themselves.
    const authorized = new Set<string>(members)
    authorized.add(userId!)

    const unauthorized = shares.filter((s) => !authorized.has(s.user_id))
    if (unauthorized.length > 0) {
      logger.warn('Rejected expense with unauthorized share recipients', {
        requestId,
        listingId: listing_id ?? null,
        rejectedCount: unauthorized.length,
      })
      throw new AuthorizationError(
        listing_id
          ? 'Every person billed must be a participant in this listing'
          : 'An expense with no listing can only bill you'
      )
    }

    if (new Set(shares.map((s) => s.user_id)).size !== shares.length) {
      throw new ValidationError('Duplicate share recipients')
    }

    // Calculate shares based on split type
    let calculatedShares = shares
    if (split_type === 'equal') {
      const equalAmount = Math.round((total_amount / shares.length) * 100) / 100
      calculatedShares = shares.map((s) => ({
        ...s,
        amount: equalAmount,
        percentage: Math.round((100 / shares.length) * 100) / 100,
      }))
    } else if (split_type === 'percentage') {
      calculatedShares = shares.map((s) => ({
        ...s,
        amount: Math.round((total_amount * (s.percentage || 0) / 100) * 100) / 100,
      }))
    }

    // The RPC is the ONLY write path. It previously fell back to direct
    // service-role inserts on any RPC error, which (a) was not atomic — a failed
    // share insert only logged and the route still returned 201 with an expense
    // and no shares — and (b) bypassed every validation in the function itself,
    // making migration 039's guards decorative. An error here is now an error.
    const sharesPayload = calculatedShares.map((s) => ({
      user_id: s.user_id,
      amount: s.amount || 0,
      percentage: s.percentage || 0,
    }))

    const { data: rpcResult, error: rpcError } = await writeClient.rpc('create_expense_with_shares', {
      p_listing_id: listing_id || null,
      p_created_by: userId!,
      p_title: title,
      p_description: description || '',
      p_total_amount: total_amount,
      p_split_type: split_type,
      p_category: category || '',
      // Null, not "now". `shared_expenses.due_date` is a nullable DATE (002:78)
      // and migration 039 never dereferences p_due_date, so null passes straight
      // through. Defaulting an omitted due date to the current timestamp made
      // every such expense instantly due — the UI then renders it as overdue,
      // which is a fact the user never asserted.
      p_due_date: due_date || null,
      // Pass the array itself. This previously sent JSON.stringify(...), which
      // arrives as a jsonb string scalar — jsonb_array_elements then raises and
      // every request silently took the fallback path that no longer exists.
      p_shares: sharesPayload,
    } as any)

    if (!rpcError) {
      return apiResponse({ expense: (rpcResult as any)?.expense, shares: (rpcResult as any)?.shares }, 201, requestId)
    }

    // Migration 039 raises 22023 for every money invariant it enforces (share
    // sum vs total, duplicate recipients, non-positive total, empty shares).
    // These are caller errors and the raised message names the specific one, so
    // surface it — the function's message text is authored by us, not by
    // Postgres internals, and leaks nothing.
    if (rpcError.code === '22023' || rpcError.code === '22004') {
      logger.warn('create_expense_with_shares rejected invalid input', {
        requestId,
        code: rpcError.code,
        error: rpcError.message,
      })
      return apiResponse({ error: rpcError.message }, 400, requestId)
    }

    // 42501 is overloaded: migration 039 raises it for "p_created_by must match
    // the authenticated user" (an authorization failure → 403), while Postgres
    // itself uses it for "permission denied for function …" when EXECUTE was
    // revoked and this process is not the service role (a deployment fault →
    // 503). Only the latter says "permission denied".
    if (rpcError.code === '42501' && !/permission denied/i.test(rpcError.message || '')) {
      logger.warn('create_expense_with_shares authorization failure', {
        requestId,
        error: rpcError.message,
      })
      return apiResponse({ error: rpcError.message }, 403, requestId)
    }

    // 42883 undefined_function / 42P01 undefined_table: migration not applied.
    // 42501 with "permission denied": EXECUTE revoked, service role unavailable.
    if (rpcError.code === '42883' || rpcError.code === '42P01' || rpcError.code === '42501') {
      logger.error('create_expense_with_shares unavailable', new Error(rpcError.message), {
        requestId,
        code: rpcError.code,
      })
      return apiResponse(
        { error: 'Expenses are temporarily unavailable. Please try again later.' },
        503,
        requestId
      )
    }

    logger.error('create_expense_with_shares failed', new Error(rpcError.message), {
      requestId,
      code: rpcError.code,
    })
    return apiResponse({ error: 'Failed to create expense' }, 500, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'create',
      resourceType: 'shared_expense',
      getResourceId: (_req, res) => res?.expense?.id,
    },
  }
)
