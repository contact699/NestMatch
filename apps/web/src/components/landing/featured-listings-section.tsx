'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { PublicListingCard } from '@/components/listings/public-listing-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Home, ArrowRight, Loader2 } from 'lucide-react'

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
  created_at: string
  user_id: string
  profiles: {
    name: string | null
    verification_level: string
    profile_photo: string | null
  } | null
}

export function FeaturedListingsSection() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch('/api/listings/public')
        if (response.ok) {
          const data = await response.json()
          setListings(data.listings || [])
        } else {
          setError(true)
        }
      } catch (err) {
        clientLogger.error('Error fetching featured listings', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  // Get stagger delay class based on index
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400']
    return delays[index % delays.length]
  }

  // Don't render section if no listings and not loading
  if (!loading && listings.length === 0) {
    return null
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12" data-animate>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Featured Listings
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse rooms available right now across Canada. Sign up to see your compatibility score and contact hosts.
          </p>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Unable to load listings. Please try again later.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {listings.slice(0, 8).map((listing, index) => (
                <div
                  key={listing.id}
                  data-animate
                  className={getDelayClass(index)}
                >
                  <PublicListingCard listing={listing} />
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 delay-500" data-animate>
              <Link href="/search">
                <Button variant="outline" size="lg" className="group">
                  Browse all listings
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="glow" size="lg">
                  Sign up to contact hosts
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
