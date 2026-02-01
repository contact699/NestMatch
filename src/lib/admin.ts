import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      isAdmin: false,
      user: null,
      supabase: supabase as any,
    }
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
      isAdmin: false,
      user,
      supabase: supabase as any,
    }
  }

  return {
    error: null,
    isAdmin: true,
    user,
    supabase: supabase as any,
  }
}
