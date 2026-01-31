import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const voteSchema = z.object({
  type: z.enum(['resource', 'faq']),
  itemId: z.string().uuid(),
  voteType: z.enum(['helpful', 'not_helpful']).nullable(),
})

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
    const validationResult = voteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { type, itemId, voteType } = validationResult.data

    const columnName = type === 'resource' ? 'resource_id' : 'faq_id'
    const tableName = type === 'resource' ? 'resources' : 'faqs'

    // Check for existing vote
    const { data: existingVote } = await (supabase as any)
      .from('resource_votes')
      .select('*')
      .eq('user_id', user.id)
      .eq(columnName, itemId)
      .single()

    if (voteType === null) {
      // Remove vote
      if (existingVote) {
        await (supabase as any)
          .from('resource_votes')
          .delete()
          .eq('id', existingVote.id)

        // Update count
        const decrementField = existingVote.vote_type === 'helpful' ? 'helpful_count' : 'not_helpful_count'
        const { data: item } = await (supabase as any)
          .from(tableName)
          .select(decrementField)
          .eq('id', itemId)
          .single()

        if (item) {
          await (supabase as any)
            .from(tableName)
            .update({ [decrementField]: Math.max(0, item[decrementField] - 1) })
            .eq('id', itemId)
        }
      }

      return NextResponse.json({ vote: null })
    }

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote, do nothing
        return NextResponse.json({ vote: existingVote })
      }

      // Change vote
      const { data: vote, error } = await (supabase as any)
        .from('resource_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating vote:', error)
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        )
      }

      // Update counts
      const { data: item } = await (supabase as any)
        .from(tableName)
        .select('helpful_count, not_helpful_count')
        .eq('id', itemId)
        .single()

      if (item) {
        const updates: any = {}
        if (voteType === 'helpful') {
          updates.helpful_count = item.helpful_count + 1
          updates.not_helpful_count = Math.max(0, item.not_helpful_count - 1)
        } else {
          updates.helpful_count = Math.max(0, item.helpful_count - 1)
          updates.not_helpful_count = item.not_helpful_count + 1
        }
        await (supabase as any)
          .from(tableName)
          .update(updates)
          .eq('id', itemId)
      }

      return NextResponse.json({ vote })
    }

    // Create new vote
    const insertData: any = {
      user_id: user.id,
      vote_type: voteType,
      [columnName]: itemId,
    }

    const { data: vote, error } = await (supabase as any)
      .from('resource_votes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating vote:', error)
      return NextResponse.json(
        { error: 'Failed to create vote' },
        { status: 500 }
      )
    }

    // Update count
    const incrementField = voteType === 'helpful' ? 'helpful_count' : 'not_helpful_count'
    const { data: item } = await (supabase as any)
      .from(tableName)
      .select(incrementField)
      .eq('id', itemId)
      .single()

    if (item) {
      await (supabase as any)
        .from(tableName)
        .update({ [incrementField]: item[incrementField] + 1 })
        .eq('id', itemId)
    }

    return NextResponse.json({ vote }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/resources/votes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
