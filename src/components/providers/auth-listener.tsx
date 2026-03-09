'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthListener() {
  const router = useRouter()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
          router.refresh()
        }
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          clearTimeout(refreshTimeoutRef.current)
          refreshTimeoutRef.current = setTimeout(() => {
            router.refresh()
          }, 1000)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(refreshTimeoutRef.current)
    }
  }, [router])

  return null
}
