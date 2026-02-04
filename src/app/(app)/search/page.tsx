'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchFilters } from '@/components/search/search-filters'
import { ViewModeTabs, ViewMode } from '@/components/search/view-mode-tabs'
import { SearchResultsList } from '@/components/search/search-results-list'
import { SearchResultsProximity } from '@/components/search/search-results-proximity'
import { useSavedListings } from '@/lib/hooks/use-saved-listings'
import { Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Lazy load the map component to reduce initial bundle size
const SearchResultsMap = dynamic(
  () => import('@/components/search/search-results-map').then((mod) => mod.SearchResultsMap),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-lg animate-pulse">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
)

interface Listing {
  id: string
  title: string
  description: string | null
  city: string
  province: string
  price: number
  type: 'room' | 'shared_room' | 'entire_place'
  photos: string[] | null
  newcomer_friendly: boolean
  no_credit_history_ok: boolean
  utilities_included: boolean
  available_date: string
  bathroom_type: string
  created_at: string
  user_id: string
  latitude?: number | null
  longitude?: number | null
  profiles?: {
    id: string
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: string
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get view mode from URL or default to 'list'
  const viewParam = searchParams.get('view')
  const [viewMode, setViewMode] = useState<ViewMode>(
    (viewParam === 'map' || viewParam === 'proximity') ? viewParam : 'list'
  )

  // Saved listings hook
  const {
    savedIds,
    save,
    unsave,
    isLoading: savedLoading,
  } = useSavedListings()

  // Get current user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [])

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    // Update URL param
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'list') {
      params.delete('view')
    } else {
      params.set('view', mode)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/search'
    router.push(`/search${newUrl}`, { scroll: false })
  }

  // Fetch listings when search params change
  useEffect(() => {
    async function fetchListings() {
      setIsLoading(true)
      setError(null)

      try {
        // Build query string from search params
        const params = new URLSearchParams()

        const city = searchParams.get('city')
        const province = searchParams.get('province')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const type = searchParams.get('type')
        const bathroomType = searchParams.get('bathroomType')
        const newcomerFriendly = searchParams.get('newcomerFriendly')
        const noCreditOk = searchParams.get('noCreditOk')
        const idealForStudents = searchParams.get('idealForStudents')
        const q = searchParams.get('q')

        if (city) params.set('city', city)
        if (province) params.set('province', province)
        if (minPrice) params.set('minPrice', minPrice)
        if (maxPrice) params.set('maxPrice', maxPrice)
        if (type) params.set('type', type)
        if (bathroomType) params.set('bathroomType', bathroomType)
        if (newcomerFriendly) params.set('newcomerFriendly', newcomerFriendly)
        if (noCreditOk) params.set('noCreditOk', noCreditOk)
        if (idealForStudents) params.set('idealForStudents', idealForStudents)
        if (q) params.set('q', q)

        const queryString = params.toString()
        const url = queryString ? `/api/listings?${queryString}` : '/api/listings'

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch listings')
        }

        const data = await response.json()
        setListings(data.listings || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Failed to load listings. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [searchParams])

  // Render the appropriate view
  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading listings</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      )
    }

    if (listings.length === 0) {
      return (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your filters or search in a different area.
          </p>
          <Button variant="outline" onClick={() => router.push('/search')}>
            Clear filters
          </Button>
        </div>
      )
    }

    switch (viewMode) {
      case 'map':
        return (
          <SearchResultsMap
            listings={listings}
            savedIds={savedIds}
            onSave={save}
            onUnsave={unsave}
          />
        )
      case 'proximity':
        return (
          <SearchResultsProximity
            listings={listings}
            currentUserId={currentUserId}
            savedIds={savedIds}
            onSave={save}
            onUnsave={unsave}
          />
        )
      default:
        return (
          <SearchResultsList
            listings={listings}
            currentUserId={currentUserId}
            savedIds={savedIds}
            onSave={save}
            onUnsave={unsave}
          />
        )
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Find a room</h1>
          <p className="text-gray-600">
            Browse verified listings across Canada
          </p>
        </div>
        <ViewModeTabs
          activeMode={viewMode}
          onModeChange={handleViewModeChange}
          disabled={isLoading}
        />
      </div>

      {/* Search & Filters */}
      <Card variant="glass" className="p-4 mb-8">
        <SearchFilters />
      </Card>

      {/* Results count */}
      {!isLoading && !error && listings.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {listings.length} listing{listings.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Results */}
      {renderResults()}
    </div>
  )
}
