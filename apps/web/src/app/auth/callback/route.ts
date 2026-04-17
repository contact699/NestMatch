import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow same-origin relative paths. Rejects `//evil.com`, absolute URLs,
// or any value smuggling a protocol.
function safeRedirect(path: string | null): string {
  if (!path) return '/dashboard'
  if (!path.startsWith('/')) return '/dashboard'
  if (path.startsWith('//') || path.startsWith('/\\')) return '/dashboard'
  if (/[\r\n\t]/.test(path)) return '/dashboard'
  return path
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = safeRedirect(searchParams.get('redirect'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sync email verification status to profiles table
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', user.id)
      }
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
