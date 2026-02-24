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
  // All routes under (app) group require authentication
  const protectedRoutes = [
    // Core app pages
    '/dashboard',
    '/profile',
    '/discover',
    '/search',
    '/roommates',
    '/quiz',
    '/verify',

    // Listings
    '/listings/new',
    '/listings/', // covers /listings/[id] and /listings/[id]/edit
    '/my-listings',
    '/saved',

    // Messaging
    '/messages',

    // Groups
    '/groups',

    // Financial
    '/payments',
    '/expenses',
    '/reviews',

    // Settings
    '/settings',

    // Resources (protected sections)
    '/resources/bookmarks',
    '/resources/agreement',
    '/resources/submit-question',
    '/resources/tools',
    '/resources/guides',
    '/resources/faq',

    // Admin (all admin routes)
    '/admin',

    // Matching preferences
    '/matching-preferences',

    // Notifications
    '/notifications',

    // Onboarding
    '/onboarding',
  ]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authRoutes = ['/login', '/signup']
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
