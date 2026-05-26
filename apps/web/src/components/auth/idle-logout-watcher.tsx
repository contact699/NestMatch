'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes of no activity
const WARNING_MS = 2 * 60 * 1000        // warn 2 minutes before logout

const WINDOW_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
]

/**
 * Signs the user out after IDLE_TIMEOUT_MS of inactivity.
 *
 * Mounted inside the authenticated branch of (app)/layout.tsx so it runs on
 * every protected page without affecting public routes.
 */
export function IdleLogoutWatcher() {
  const router = useRouter()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Warning visibility tracked in a ref so the activity handler can read it
  // without causing the listener effect to re-run on every flip.
  const warningVisibleRef = useRef(false)
  const armTimersRef = useRef<() => void>(() => {})
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    const clearTimers = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
    }

    const signOutAndRedirect = async () => {
      clearTimers()
      warningVisibleRef.current = false
      setShowWarning(false)
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.info('Signed out due to inactivity')
      router.push('/login')
      router.refresh()
    }

    const armTimers = () => {
      clearTimers()
      warningTimer.current = setTimeout(() => {
        warningVisibleRef.current = true
        setShowWarning(true)
      }, IDLE_TIMEOUT_MS - WARNING_MS)
      idleTimer.current = setTimeout(() => {
        void signOutAndRedirect()
      }, IDLE_TIMEOUT_MS)
    }
    armTimersRef.current = armTimers

    const handleActivity = () => {
      // Ignore activity while the warning is visible — user must explicitly
      // dismiss it. The idle timer continues running so we still sign out
      // if they ignore the warning.
      if (warningVisibleRef.current) return
      armTimers()
    }

    armTimers()

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', handleActivity)

    return () => {
      clearTimers()
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
      document.removeEventListener('visibilitychange', handleActivity)
    }
  }, [router])

  const handleStaySignedIn = () => {
    warningVisibleRef.current = false
    setShowWarning(false)
    armTimersRef.current()
  }

  if (!showWarning) return null

  return (
    <div
      role="alertdialog"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2
          id="idle-warning-title"
          className="text-lg font-display font-semibold text-on-surface mb-2"
        >
          Still there?
        </h2>
        <p id="idle-warning-desc" className="text-sm text-on-surface-variant mb-4">
          You&apos;ll be signed out in 2 minutes due to inactivity.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleStaySignedIn}>
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  )
}
