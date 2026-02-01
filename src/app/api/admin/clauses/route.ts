import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data, error: fetchError } = await supabase
    .from('agreement_clauses')
    .select('*')
    .order('category')
    .order('display_order')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json()

  const { data, error: insertError } = await supabase
    .from('agreement_clauses')
    .insert(body)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
