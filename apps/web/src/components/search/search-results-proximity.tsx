'use client'

import { useState, useMemo } from 'react'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/lib/hooks/use-geolocation'
import { calculateDistance, formatDistance } from '@/lib/utils/distance'
import { Navigation, Loader2, MapPinOff, AlertCircle, Search, MapPin } from 'lucide-react'

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
    latitude: geoLat,
    longitude: geoLng,
    error: geoError,
    isLoading: geoLoading,
    permissionState,
    hasLocation: hasGeoLocation,
    requestLocation,
  } = useGeolocation()

  // Address search state
  const [addressQuery, setAddressQuery] = useState('')
  const [addressLat, setAddressLat] = useState<number | null>(null)
  const [addressLng, setAddressLng] = useState<number | null>(null)
  const [addressLabel, setAddressLabel] = useState<string | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)

  // Determine which coordinates to use (address takes priority)
  const hasAddress = addressLat !== null && addressLng !== null
  const refLat = hasAddress ? addressLat : geoLat
  const refLng = hasAddress ? addressLng : geoLng
  const hasLocation = hasAddress || hasGeoLocation

  const handleAddressSearch = async () => {
    if (!addressQuery.trim()) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setAddressError('Maps API is not configured')
      return
    }

    setAddressLoading(true)
    setAddressError(null)

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&components=country:CA&key=${apiKey}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0]
        setAddressLat(result.geometry.location.lat)
        setAddressLng(result.geometry.location.lng)
        setAddressLabel(result.formatted_address)
      } else if (data.status === 'ZERO_RESULTS') {
        setAddressError('Address not found. Try a different search.')
      } else {
        setAddressError('Could not geocode address. Please try again.')
      }
    } catch {
      setAddressError('Failed to search address. Please try again.')
    } finally {
      setAddressLoading(false)
    }
  }

  const clearAddress = () => {
    setAddressLat(null)
    setAddressLng(null)
    setAddressLabel(null)
    setAddressQuery('')
    setAddressError(null)
  }

  // Sort listings by distance
  const sortedListings = useMemo<ListingWithDistance[]>(() => {
    if (!hasLocation || !refLat || !refLng) {
      return listings.map((l) => ({ ...l, distance: null }))
    }

    return listings
      .map((listing) => {
        let distance: number | null = null

        if (listing.lat && listing.lng) {
          distance = calculateDistance(
            refLat,
            refLng,
            listing.lat,
            listing.lng
          )
        }

        return { ...listing, distance }
      })
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
  }, [listings, refLat, refLng, hasLocation])

  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  // Address search bar (always shown)
  const addressSearchBar = (
    <div className="mb-6 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAddressSearch()
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            placeholder="Search by address (e.g., 123 Main St, Toronto)"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-sm"
          />
        </div>
        <Button type="submit" disabled={addressLoading || !addressQuery.trim()}>
          {addressLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-1" />
              Search
            </>
          )}
        </Button>
      </form>

      {addressError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {addressError}
        </div>
      )}

      {/* Current reference point indicator */}
      {hasAddress && addressLabel && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <MapPin className="h-4 w-4" />
            <span>Showing distance from: {addressLabel}</span>
          </div>
          <button
            onClick={clearAddress}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )

  // No location at all — show address search + geolocation prompt
  if (!hasLocation && !geoLoading) {
    return (
      <div>
        {addressSearchBar}

        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            {permissionState === 'denied' ? (
              <>
                <MapPinOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Location Access Denied
                </h3>
                <p className="text-gray-600">
                  Search an address above, or enable location access in your browser settings
                  and refresh the page.
                </p>
              </>
            ) : geoError ? (
              <>
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Location Error
                </h3>
                <p className="text-gray-600 mb-4">{geoError}</p>
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
                  Search an address above or allow location access to see listings sorted by distance.
                </p>
                <Button onClick={requestLocation}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Use My Location
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  Your location is only used locally and is never stored on our servers.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading geolocation
  if (geoLoading && !hasAddress) {
    return (
      <div>
        {addressSearchBar}
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {addressSearchBar}

      {/* Location indicator (when using geolocation, not address) */}
      {hasGeoLocation && !hasAddress && (
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
