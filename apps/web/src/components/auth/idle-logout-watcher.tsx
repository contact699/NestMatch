'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes of no activity
const WARNING_MS = 2 * 60 * 1000        // warn 2 minutes before logout
const WRITE_THROTTLE_MS = 5_000         // shared-storage write cadence

// Cross-tab shared state — any open tab's activity bumps this; every tab
// re-arms its local timers when this changes via the `storage` event.
const STORAGE_KEY = 'nestmatch:lastActivityAt'

const WINDOW_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
]

function readSharedLastActivity(): number {
  if (typeof window === 'undefined') return Date.now()
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : Date.now()
  } catch {
    return Date.now()
  }
}

function writeSharedLastActivity(now: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(now))
  } catch {
    // localStorage may be unavailable (private mode, quota). In that case
    // cross-tab coordination degrades to per-tab — same as before this fix.
  }
}

/**
 * Signs the user out after IDLE_TIMEOUT_MS of inactivity across ALL open
 * tabs. Activity in one tab re-arms the idle timer in every other tab via
 * a shared `nestmatch:lastActivityAt` localStorage value + the `storage`
 * event. Sign-out only happens when no tab has reported activity for the
 * full timeout window.
 *
 * Mounted inside the authenticated branch of (app)/layout.tsx so it runs
 * on every protected page without affecting public routes.
 */
export function IdleLogoutWatcher() {
  const router = useRouter()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Warning visibility tracked in a ref so the activity handler can read it
  // without causing the listener effect to re-run on every flip.
  const warningVisibleRef = useRef(false)
  const armTimersRef = useRef<() => void>(() => {})
  // Last time THIS tab wrote to shared storage — used to throttle writes.
  const lastWriteRef = useRef(0)
  const [showWarning, setShowWarning] = useState(false)

  const recordActivity = (now: number) => {
    if (now - lastWriteRef.current < WRITE_THROTTLE_MS) return
    lastWriteRef.current = now
    writeSharedLastActivity(now)
  }

  useEffect(() => {
    // Treat mount as activity so a stale localStorage value from an old
    // session doesn't shrink this tab's first idle window.
    recordActivity(Date.now())

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
      const lastActivity = readSharedLastActivity()
      const elapsed = Math.max(0, Date.now() - lastActivity)
      const remainingUntilIdle = IDLE_TIMEOUT_MS - elapsed

      if (remainingUntilIdle <= 0) {
        void signOutAndRedirect()
        return
      }

      // If another tab just reported activity, dismiss any local warning.
      if (warningVisibleRef.current && remainingUntilIdle > WARNING_MS) {
        warningVisibleRef.current = false
        setShowWarning(false)
      }

      const remainingUntilWarning = Math.max(0, remainingUntilIdle - WARNING_MS)
      warningTimer.current = setTimeout(() => {
        warningVisibleRef.current = true
        setShowWarning(true)
      }, remainingUntilWarning)
      idleTimer.current = setTimeout(() => {
        // Re-check shared state at fire time — a sibling tab may have just
        // recorded activity that didn't bubble through the storage event yet.
        const latest = readSharedLastActivity()
        if (Date.now() - latest >= IDLE_TIMEOUT_MS) {
          void signOutAndRedirect()
        } else {
          armTimers()
        }
      }, remainingUntilIdle)
    }
    armTimersRef.current = armTimers

    const handleActivity = () => {
      // Ignore LOCAL activity while THIS tab's warning is visible — the
      // user must explicitly click "Stay signed in" to dismiss. Cross-tab
      // activity (handleStorage) still dismisses the warning, since the
      // user is genuinely active elsewhere.
      if (warningVisibleRef.current) return
      recordActivity(Date.now())
      armTimers()
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      // A sibling tab reported activity. Re-arm based on the shared value;
      // armTimers will also dismiss our warning if there's now headroom.
      armTimers()
    }

    armTimers()

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', handleActivity)
    window.addEventListener('storage', handleStorage)

    return () => {
      clearTimers()
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
      document.removeEventListener('visibilitychange', handleActivity)
      window.removeEventListener('storage', handleStorage)
    }
  }, [router])

  const handleStaySignedIn = () => {
    warningVisibleRef.current = false
    setShowWarning(false)
    // Treat "Stay signed in" as fresh activity for all tabs, then re-arm.
    const now = Date.now()
    lastWriteRef.current = now
    writeSharedLastActivity(now)
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
