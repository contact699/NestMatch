'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const COOKIE_CONSENT_KEY = 'nestmatch_cookie_consent'
const COOKIE_CONSENT_EVENT = 'nestmatch:cookie-consent'

function subscribeToConsent(callback: () => void) {
  // Same-tab changes fire the custom event; other tabs arrive via 'storage'.
  window.addEventListener(COOKIE_CONSENT_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function readConsent(): string | null {
  // localStorage access throws when the browser blocks site data; treat that
  // as "no consent" rather than crashing the render tree.
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY)
  } catch {
    return null
  }
}

/**
 * Current consent value ('accepted' | 'declined' | null), reactive to changes
 * in this tab and other tabs. Analytics loaders gate on 'accepted'.
 */
export function useCookieConsent(): string | null {
  return useSyncExternalStore(subscribeToConsent, readConsent, () => null)
}

function recordConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value)
  } catch {
    // Storage unavailable — the choice can't persist, but don't crash.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT))
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = readConsent()
    // 'dismissed' is the legacy pre-Decline value: those users never actually
    // answered, so re-prompt them once.
    if (!consent || consent === 'dismissed') {
      setVisible(true)
    }
  }, [])

  const handleAccept = () => {
    recordConsent('accepted')
    setVisible(false)
  }

  const handleDecline = () => {
    recordConsent('declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-surface-container border border-outline-variant rounded-xl shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-on-surface-variant">
          We use cookies to improve your experience and analyze site traffic. You can accept or decline
          — see our{' '}
          <Link href="/privacy" className="text-primary hover:underline font-medium">
            Privacy Policy
          </Link>{' '}
          for details.
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button onClick={handleDecline} size="sm" variant="outline">
            Decline
          </Button>
          <Button onClick={handleAccept} size="sm" variant="primary">
            Accept
          </Button>
          <button
            onClick={handleDecline}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Decline cookies and close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
