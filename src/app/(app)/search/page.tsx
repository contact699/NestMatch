'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SearchFilters } from '@/components/search/search-filters'
import { Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [])

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
        const q = searchParams.get('q')

        if (city) params.set('city', city)
        if (province) params.set('province', province)
        if (minPrice) params.set('minPrice', minPrice)
        if (maxPrice) params.set('maxPrice', maxPrice)
        if (type) params.set('type', type)
        if (bathroomType) params.set('bathroomType', bathroomType)
        if (newcomerFriendly) params.set('newcomerFriendly', newcomerFriendly)
        if (noCreditOk) params.set('noCreditOk', noCreditOk)
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

  // Stagger delay classes for animation
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Find a room</h1>
        <p className="text-gray-600">
          Browse verified listings across Canada
        </p>
      </div>

      {/* Search & Filters */}
      <Card variant="glass" className="p-4 mb-8">
        <SearchFilters />
      </Card>

      {/* Results */}
      {isLoading ? (
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
      ) : error ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading listings</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : listings.length === 0 ? (
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
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing, index) => (
            <div key={listing.id} className={getDelayClass(index)}>
              <ListingCard
                listing={listing as any}
                currentUserId={currentUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
