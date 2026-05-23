import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// Check if Supabase is properly configured (not using placeholder values)
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return false
  if (url.includes('placeholder') || key.includes('placeholder')) return false
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) return false

  return true
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If Supabase isn't configured, just pass through without session management
  if (!isSupabaseConfigured()) {
    return supabaseResponse
  }

  let user = null

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (error) {
    // If Supabase fails, continue without auth
    logger.error('Supabase auth error', error instanceof Error ? error : new Error(String(error)))
    return supabaseResponse
  }

  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = [
    '/dashboard',
    '/profile/edit',
    '/discover',
    '/roommates',
    '/quiz',
    '/verify',

    // Listings — specific protected paths only.
    // `/listings/[id]` is PUBLIC (SEO surface).
    '/listings/new',
    '/my-listings',
    '/saved',

    '/messages',
    '/groups',
    '/payments',
    '/expenses',
    '/reviews',
    '/settings',

    // Resources — bookmarks/tools/agreement/submit-question stay gated.
    // `/resources/guides`, `/resources/guides/[slug]`, `/resources/faq` are PUBLIC.
    '/resources/bookmarks',
    '/resources/agreement',
    '/resources/submit-question',
    '/resources/tools',

    '/admin',
    '/matching-preferences',
    '/onboarding',
  ]

  // Edit route for listings is also protected, matched separately because
  // the listing detail route shares the `/listings/` prefix.
  const editListingPattern = /^\/listings\/[^/]+\/edit\/?$/

  const isProtectedRoute =
    protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) ||
    editListingPattern.test(request.nextUrl.pathname)

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
