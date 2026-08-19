'use client'

import posthog from 'posthog-js'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCookieConsent } from '@/components/cookie-consent'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Analytics cookies are opt-in: PostHog must not initialize (or persist
  // anything) until the visitor accepts. Pre-consent capture calls no-op.
  const consent = useCookieConsent()
  const initialized = useRef(false)

  useEffect(() => {
    if (!POSTHOG_KEY || consent !== 'accepted' || initialized.current) return
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // We handle this manually
      capture_pageleave: true,
      persistence: 'localStorage',
    })
    initialized.current = true
  }, [consent])

  useEffect(() => {
    if (!initialized.current || !pathname) return
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, consent])

  return null
}

// Export for use in event tracking throughout the app
export { posthog }
