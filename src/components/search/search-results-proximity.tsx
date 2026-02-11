'use client'

import { useMemo } from 'react'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/lib/hooks/use-geolocation'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'
import { Navigation, Loader2, MapPinOff, AlertCircle } from 'lucide-react'

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
  help_needed: boolean
  ideal_for_students: boolean
  utilities_included: boolean
  available_date: string
  bathroom_type: string
  created_at: string
  user_id: string
  lat?: number | null
  lng?: number | null
  profiles?: {
    id: string
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: string
  }
}

interface ListingWithDistance extends Listing {
  distance: number | null
}

interface SearchResultsProximityProps {
  listings: Listing[]
  currentUserId: string | null
  savedIds: Set<string>
  onSave: (id: string) => void
  onUnsave: (id: string) => void
}

export function SearchResultsProximity({
  listings,
  currentUserId,
  savedIds,
  onSave,
  onUnsave,
}: SearchResultsProximityProps) {
  const {
    latitude,
    longitude,
    error,
    isLoading,
    permissionState,
    hasLocation,
    requestLocation,
  } = useGeolocation()

  // Sort listings by distance
  const sortedListings = useMemo<ListingWithDistance[]>(() => {
    if (!hasLocation || !latitude || !longitude) {
      return listings.map((l) => ({ ...l, distance: null }))
    }

    return listings
      .map((listing) => {
        let distance: number | null = null

        if (listing.lat && listing.lng) {
          distance = calculateDistance(
            latitude,
            longitude,
            listing.lat,
            listing.lng
          )
        }

        return { ...listing, distance }
      })
      .sort((a, b) => {
        // Items without coordinates go to the end
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
  }, [listings, latitude, longitude, hasLocation])

  // Stagger delay classes for animation
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  // Permission prompt UI
  if (!hasLocation && !isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          {permissionState === 'denied' ? (
            <>
              <MapPinOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Location Access Denied
              </h3>
              <p className="text-gray-600 mb-4">
                To see listings sorted by distance, please enable location access in your browser settings
                and refresh the page.
              </p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Location Error
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={requestLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </>
          ) : (
            <>
              <Navigation className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Find Listings Near You
              </h3>
              <p className="text-gray-600 mb-4">
                Allow location access to see listings sorted by distance from your current location.
              </p>
              <Button onClick={requestLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                Enable Location
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                Your location is only used locally and is never stored on our servers.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Loading UI
  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Getting your location...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Location indicator */}
      {hasLocation && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Navigation className="h-4 w-4 text-blue-500" />
          <span>Showing listings sorted by distance from your location</span>
        </div>
      )}

      {/* Listings grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedListings.map((listing, index) => (
          <div key={listing.id} className={`relative ${getDelayClass(index)}`}>
            {/* Distance badge */}
            {listing.distance !== null && (
              <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-medium text-blue-600 shadow-sm">
                {formatDistance(listing.distance)}
              </div>
            )}
            <ListingCard
              listing={listing as any}
              currentUserId={currentUserId}
              isSaved={savedIds.has(listing.id)}
              onSave={() => onSave(listing.id)}
              onUnsave={() => onUnsave(listing.id)}
            />
          </div>
        ))}
      </div>

      {/* Note about listings without coordinates */}
      {sortedListings.some((l) => l.distance === null) && (
        <p className="mt-6 text-sm text-gray-500 text-center">
          Some listings don't have precise location data and appear at the end.
        </p>
      )}
    </div>
  )
}
