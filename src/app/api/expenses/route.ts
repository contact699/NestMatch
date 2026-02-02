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
    let query = (supabase as any)
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

    const { data: expenses, error } = await query

    if (error) throw error

    // Filter to only show expenses where user is involved
    const userExpenses = (expenses || []).filter((expense: any) =>
      expense.created_by === userId ||
      expense.shares?.some((share: any) => share.user_id === userId)
    )

    // Calculate user's pending amount
    let totalOwed = 0
    let totalOwing = 0

    for (const expense of userExpenses) {
      const userShare = expense.shares?.find((s: any) => s.user_id === userId)
      if (userShare && userShare.status === 'pending') {
        totalOwed += userShare.amount
      }
      if (expense.created_by === userId) {
        const pendingShares = expense.shares?.filter(
          (s: any) => s.user_id !== userId && s.status === 'pending'
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
  }
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
    const { data: listing } = await (supabase as any)
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

    // Create expense
    const { data: expense, error: expenseError } = await (supabase as any)
      .from('shared_expenses')
      .insert({
        listing_id,
        created_by: userId,
        title,
        description,
        total_amount,
        split_type,
        category,
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single()

    if (expenseError) throw expenseError

    // Create shares
    const shareInserts = calculatedShares.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount,
      percentage: s.percentage || null,
      status: s.user_id === userId ? 'paid' : 'pending',
      paid_at: s.user_id === userId ? new Date().toISOString() : null,
    }))

    const { error: sharesError } = await (supabase as any)
      .from('expense_shares')
      .insert(shareInserts)

    if (sharesError) {
      // Rollback expense
      await (supabase as any)
        .from('shared_expenses')
        .delete()
        .eq('id', expense.id)

      throw sharesError
    }

    // Fetch complete expense with shares
    const { data: completeExpense } = await (supabase as any)
      .from('shared_expenses')
      .select(`
        *,
        shares:expense_shares(
          id,
          user_id,
          amount,
          percentage,
          status,
          user:profiles(name)
        )
      `)
      .eq('id', expense.id)
      .single()

    return apiResponse({ expense: completeExpense }, 201, requestId)
  },
  {
    audit: {
      action: 'create',
      resourceType: 'shared_expense',
      getResourceId: (_req, res) => res?.expense?.id,
    },
  }
)
