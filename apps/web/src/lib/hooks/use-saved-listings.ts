'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { createClient } from '@/lib/supabase/client'

interface UseSavedListingsOptions {
  onAuthRequired?: () => void
}

export function useSavedListings(options: UseSavedListingsOptions = {}) {
  const router = useRouter()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Fetch saved listing IDs on mount
  useEffect(() => {
    async function fetchSavedListings() {
      const supabase = createClient()

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      setIsAuthenticated(true)

      try {
        const response = await fetch('/api/saved-listings')

        if (!response.ok) {
          throw new Error('Failed to fetch saved listings')
        }

        const data = await response.json()
        const ids = new Set<string>(data.listings?.map((l: { id: string }) => l.id) || [])
        setSavedIds(ids)
      } catch (err) {
        clientLogger.error('Error fetching saved listings', err)
        setError(err instanceof Error ? err.message : 'Failed to load saved listings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSavedListings()
  }, [])

  const isSaved = useCallback((listingId: string) => {
    return savedIds.has(listingId)
  }, [savedIds])

  const save = useCallback(async (listingId: string) => {
    // If auth check hasn't completed yet, wait for it
    if (isAuthenticated === null) {
      // Re-check auth directly
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (options.onAuthRequired) {
          options.onAuthRequired()
        } else {
          router.push(`/login?redirect=/search`)
        }
        return false
      }
    } else if (isAuthenticated === false) {
      if (options.onAuthRequired) {
        options.onAuthRequired()
      } else {
        router.push(`/login?redirect=/search`)
      }
      return false
    }

    // Optimistic update
    setSavedIds((prev) => new Set([...prev, listingId]))

    try {
      const response = await fetch('/api/saved-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })

      if (!response.ok) {
        // Rollback on error
        setSavedIds((prev) => {
          const updated = new Set(prev)
          updated.delete(listingId)
          return updated
        })

        const data = await response.json()
        // If already saved (409 conflict), treat as success
        if (response.status === 409) {
          setSavedIds((prev) => new Set([...prev, listingId]))
          return true
        }

        throw new Error(data.error || 'Failed to save listing')
      }

      return true
    } catch (err) {
      clientLogger.error('Error saving listing', err)
      // Rollback on error
      setSavedIds((prev) => {
        const updated = new Set(prev)
        updated.delete(listingId)
        return updated
      })
      return false
    }
  }, [isAuthenticated, router, options])

  const unsave = useCallback(async (listingId: string) => {
    if (isAuthenticated === false) {
      return false
    }
    // If auth check hasn't completed, re-check directly
    if (isAuthenticated === null) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
    }

    // Optimistic update
    const previousIds = new Set(savedIds)
    setSavedIds((prev) => {
      const updated = new Set(prev)
      updated.delete(listingId)
      return updated
    })

    try {
      const response = await fetch(`/api/saved-listings/${listingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Rollback on error
        setSavedIds(previousIds)
        throw new Error('Failed to remove saved listing')
      }

      return true
    } catch (err) {
      clientLogger.error('Error unsaving listing', err)
      // Rollback on error
      setSavedIds(previousIds)
      return false
    }
  }, [isAuthenticated, savedIds])

  const toggle = useCallback(async (listingId: string) => {
    if (isSaved(listingId)) {
      return unsave(listingId)
    }
    return save(listingId)
  }, [isSaved, save, unsave])

  return {
    savedIds,
    isLoading,
    error,
    isAuthenticated,
    isSaved,
    save,
    unsave,
    toggle,
  }
}
