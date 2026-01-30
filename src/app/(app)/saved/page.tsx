'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, VerificationBadge } from '@/components/ui/badge'
import {
  Heart,
  Home,
  MapPin,
  Calendar,
  Users,
  Trash2,
  Loader2,
  Search,
  Leaf,
} from 'lucide-react'

interface SavedListing {
  id: string
  title: string
  type: 'room' | 'shared_room' | 'entire_place'
  price: number
  city: string
  province: string
  available_date: string
  photos: string[]
  newcomer_friendly: boolean
  no_credit_history_ok: boolean
  utilities_included: boolean
  is_active: boolean
  profiles: {
    id: string
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: 'basic' | 'verified' | 'trusted'
  } | null
  saved_at: string
  saved_id: string
}

export default function SavedListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<SavedListing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadSavedListings() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/saved')
        return
      }

      const response = await fetch('/api/saved-listings')
      const data = await response.json()

      if (response.ok) {
        setListings(data.listings)
      }

      setIsLoading(false)
    }

    loadSavedListings()
  }, [router])

  const handleRemove = async (listingId: string) => {
    setRemovingId(listingId)

    const response = await fetch(`/api/saved-listings/${listingId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setListings((prev) => prev.filter((l) => l.id !== listingId))
    }

    setRemovingId(null)
  }

  const typeLabels = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Saved Listings</h1>
        <p className="text-gray-600">
          {listings.length} listing{listings.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No saved listings
            </h3>
            <p className="text-gray-500 mb-4">
              Save listings you like to easily find them later.
            </p>
            <Link href="/search">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Browse Listings
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} variant="bordered" className="overflow-hidden group">
              <Link href={`/listings/${listing.id}`}>
                <div className="relative aspect-[4/3] bg-gray-100">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  {/* Status badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {!listing.is_active && (
                      <Badge variant="warning">Inactive</Badge>
                    )}
                    {listing.newcomer_friendly && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Leaf className="h-3 w-3" />
                        Newcomer Friendly
                      </Badge>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemove(listing.id)
                    }}
                    disabled={removingId === listing.id}
                    className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {removingId === listing.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    ) : (
                      <Trash2 className="h-5 w-5 text-red-500" />
                    )}
                  </button>
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link href={`/listings/${listing.id}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                      {listing.title}
                    </h3>
                  </Link>
                  <p className="font-bold text-blue-600 whitespace-nowrap">
                    {formatPrice(listing.price)}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {listing.city}, {listing.province}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    <Home className="h-3 w-3" />
                    {typeLabels[listing.type]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    <Calendar className="h-3 w-3" />
                    {formatDate(listing.available_date)}
                  </span>
                </div>

                {/* Host info */}
                {listing.profiles && (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {listing.profiles.profile_photo ? (
                          <img
                            src={listing.profiles.profile_photo}
                            alt={listing.profiles.name || 'Host'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {listing.profiles.name || 'Anonymous'}
                        </p>
                        <VerificationBadge
                          level={listing.profiles.verification_level}
                          size="sm"
                          showLabel={false}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500 fill-current" />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
