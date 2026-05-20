'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { detectInAppBrowser, type InAppBrowserName } from '@/lib/in-app-browser'

export function useIsInAppBrowser(): { isInApp: boolean; name: InAppBrowserName | null } {
  const [state, setState] = useState<{ isInApp: boolean; name: InAppBrowserName | null }>({
    isInApp: false,
    name: null,
  })

  useEffect(() => {
    // Run on mount only — navigator is not available during SSR, so initial render
    // returns the safe default and we update once the client takes over.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(detectInAppBrowser(navigator.userAgent))
  }, [])

  return state
}

export function InAppBrowserBanner({ name }: { name: InAppBrowserName | null }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard write can fail in some webviews; ignore silently.
    }
  }

  const appLabel = name && name !== 'Webview' ? name : 'this app'

  return (
    <div
      role="status"
      className="flex items-start gap-3 p-3 rounded-xl border border-tertiary-fixed bg-tertiary-fixed/30 text-sm"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0 text-tertiary-container mt-0.5" />
      <div className="space-y-2 flex-1">
        <p className="text-on-surface font-medium">
          Google Sign-In doesn&apos;t work inside {appLabel}.
        </p>
        <p className="text-on-surface-variant text-xs">
          To continue with Google, open this page in your default browser (Chrome or Safari).
          You can still sign in with email and password here.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Link copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  )
}
