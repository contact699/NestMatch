import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

    const { searchParams } = new URL(request.url)
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

    const { data: expenses, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      )
    }

    // Filter to only show expenses where user is involved
    const userExpenses = (expenses || []).filter((expense: any) =>
      expense.created_by === user.id ||
      expense.shares?.some((share: any) => share.user_id === user.id)
    )

    // Calculate user's pending amount
    let totalOwed = 0
    let totalOwing = 0

    for (const expense of userExpenses) {
      const userShare = expense.shares?.find((s: any) => s.user_id === user.id)
      if (userShare && userShare.status === 'pending') {
        totalOwed += userShare.amount
      }
      if (expense.created_by === user.id) {
        const pendingShares = expense.shares?.filter(
          (s: any) => s.user_id !== user.id && s.status === 'pending'
        )
        totalOwing += pendingShares?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0
      }
    }

    return NextResponse.json({
      expenses: userExpenses,
      summary: {
        total_owed: totalOwed, // What user owes others
        total_owing: totalOwing, // What others owe user
      },
    })
  } catch (error) {
    console.error('Error in GET /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new shared expense
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

    const validationResult = createExpenseSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { listing_id, title, description, total_amount, category, split_type, due_date, shares } = validationResult.data

    // Verify user is associated with this listing (owner or has a cohabitation)
    const { data: listing } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single() as { data: any }

    // For now, just verify the listing exists
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
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
        created_by: user.id,
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

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return NextResponse.json(
        { error: 'Failed to create expense' },
        { status: 500 }
      )
    }

    // Create shares
    const shareInserts = calculatedShares.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount,
      percentage: s.percentage || null,
      status: s.user_id === user.id ? 'paid' : 'pending', // Creator's share is auto-paid
      paid_at: s.user_id === user.id ? new Date().toISOString() : null,
    }))

    const { error: sharesError } = await (supabase as any)
      .from('expense_shares')
      .insert(shareInserts)

    if (sharesError) {
      console.error('Error creating shares:', sharesError)
      // Rollback expense
      await (supabase as any)
        .from('shared_expenses')
        .delete()
        .eq('id', expense.id)

      return NextResponse.json(
        { error: 'Failed to create expense shares' },
        { status: 500 }
      )
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

    return NextResponse.json({ expense: completeExpense }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
