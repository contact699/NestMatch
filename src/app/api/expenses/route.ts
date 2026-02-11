import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createExpenseSchema = z.object({
  listing_id: z.string().uuid(),
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

    if (error) throw error

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
  { rateLimit: 'paymentCreate' }
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

    // Verify listing exists
    const { data: listing } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single()

    if (!listing) {
      throw new NotFoundError('Listing not found')
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

    // Atomically create expense and shares (auto-rollback on failure)
    const sharesPayload = calculatedShares.map((s) => ({
      user_id: s.user_id,
      amount: s.amount || 0,
      percentage: s.percentage || 0,
    }))

    const { data: result, error: rpcError } = await supabase.rpc('create_expense_with_shares', {
      p_listing_id: listing_id,
      p_created_by: userId!,
      p_title: title,
      p_description: description || '',
      p_total_amount: total_amount,
      p_split_type: split_type,
      p_category: category || '',
      p_due_date: due_date || new Date().toISOString(),
      p_shares: JSON.stringify(sharesPayload) as any,
    })

    if (rpcError) throw rpcError

    return apiResponse({ expense: (result as any)?.expense, shares: (result as any)?.shares }, 201, requestId)
  },
  {
    rateLimit: 'paymentCreate',
    audit: {
      action: 'create',
      resourceType: 'shared_expense',
      getResourceId: (_req, res) => res?.expense?.id,
    },
  }
)
