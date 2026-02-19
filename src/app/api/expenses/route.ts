import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
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

// Get expenses for a listing or user
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const listingId = searchParams.get('listing_id')
    const status = searchParams.get('status')

    // Get expenses where user has a share
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

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

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

    // Filter to only show expenses where user is involved
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

    // If listing_id is provided, verify listing exists
    if (listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', listing_id)
        .single()

      if (!listing) {
        throw new NotFoundError('Listing not found')
      }
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

    // Use service client for writes to avoid RLS issues
    const writeClient = (() => {
      try {
        return createServiceClient()
      } catch {
        return supabase
      }
    })()

    // Try the RPC function first, fall back to direct inserts
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
      p_due_date: due_date || new Date().toISOString(),
      p_shares: JSON.stringify(sharesPayload),
    } as any)

    if (!rpcError) {
      return apiResponse({ expense: (rpcResult as any)?.expense, shares: (rpcResult as any)?.shares }, 201, requestId)
    }

    // RPC doesn't exist or failed — fall back to direct inserts
    logger.warn('create_expense_with_shares RPC failed, falling back to direct inserts', {
      requestId,
      error: rpcError.message,
    })

    const expenseInsert: Record<string, unknown> = {
      created_by: userId!,
      title,
      description: description || null,
      total_amount,
      split_type,
      category: category || null,
      due_date: due_date || null,
      status: 'active',
    }
    if (listing_id) {
      expenseInsert.listing_id = listing_id
    }

    const { data: expense, error: insertError } = await writeClient
      .from('shared_expenses')
      .insert(expenseInsert as any)
      .select()
      .single()

    if (insertError) {
      if (
        insertError.message?.includes('relation') && insertError.message?.includes('does not exist') ||
        insertError.code === '42P01'
      ) {
        return apiResponse(
          { error: 'Expenses feature requires a database migration. Please contact your administrator.' },
          503,
          requestId
        )
      }
      return apiResponse(
        { error: `Failed to create expense: ${insertError.message || 'Unknown error'}` },
        500,
        requestId
      )
    }

    // Insert shares
    const shareRows = calculatedShares.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount || 0,
      percentage: s.percentage || 0,
      status: s.user_id === userId! ? 'paid' : 'pending',
      paid_at: s.user_id === userId! ? new Date().toISOString() : null,
    }))

    const { data: insertedShares, error: sharesError } = await writeClient
      .from('expense_shares')
      .insert(shareRows)
      .select()

    if (sharesError) {
      logger.error('Failed to insert expense shares', new Error(sharesError.message), {
        requestId,
        expenseId: expense.id,
      })
    }

    return apiResponse({ expense, shares: insertedShares || [] }, 201, requestId)
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
