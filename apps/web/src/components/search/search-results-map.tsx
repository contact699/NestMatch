'use client'

import { useState, useCallback, useMemo } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { GoogleMapsProvider } from '@/components/maps/google-maps-provider'
import { MapListingPopup } from './map-listing-popup'
import { MapPin } from 'lucide-react'

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
}

interface SearchResultsMapProps {
  listings: Listing[]
  savedIds: Set<string>
  onSave: (id: string) => void
  onUnsave: (id: string) => void
}

// Default center (roughly center of Canada)
const DEFAULT_CENTER = { lat: 56.1304, lng: -106.3468 }
const DEFAULT_ZOOM = 4

const mapContainerStyle = {
  width: '100%',
  height: '500px',
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
}

function SearchResultsMapInner({
  listings,
  savedIds,
  onSave,
  onUnsave,
}: SearchResultsMapProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Filter listings with valid coordinates
  const listingsWithCoords = useMemo(() => {
    return listings.filter(
      (l) => l.lat !== null && l.lat !== undefined &&
             l.lng !== null && l.lng !== undefined
    )
  }, [listings])

  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    if (listingsWithCoords.length === 0) return null

    const bounds = new google.maps.LatLngBounds()
    listingsWithCoords.forEach((listing) => {
      if (listing.lat && listing.lng) {
        bounds.extend({ lat: listing.lat, lng: listing.lng })
      }
    })
    return bounds
  }, [listingsWithCoords])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    if (bounds) {
      map.fitBounds(bounds, 50)
    }
  }, [bounds])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Calculate center from listings or use default
  const center = useMemo(() => {
    if (listingsWithCoords.length === 0) return DEFAULT_CENTER

    const sumLat = listingsWithCoords.reduce((sum, l) => sum + (l.lat || 0), 0)
    const sumLng = listingsWithCoords.reduce((sum, l) => sum + (l.lng || 0), 0)

    return {
      lat: sumLat / listingsWithCoords.length,
      lng: sumLng / listingsWithCoords.length,
    }
  }, [listingsWithCoords])

  if (listingsWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-lg">
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">No listings with location data</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or switch to list view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={DEFAULT_ZOOM}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => setSelectedListing(null)}
      >
        {listingsWithCoords.map((listing) => (
          <Marker
            key={listing.id}
            position={{
              lat: listing.lat!,
              lng: listing.lng!,
            }}
            onClick={() => setSelectedListing(listing)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: savedIds.has(listing.id) ? '#ef4444' : '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        ))}

        {selectedListing && selectedListing.lat && selectedListing.lng && (
          <InfoWindow
            position={{
              lat: selectedListing.lat,
              lng: selectedListing.lng,
            }}
            onCloseClick={() => setSelectedListing(null)}
            options={{
              pixelOffset: new google.maps.Size(0, -10),
            }}
          >
            <MapListingPopup
              listing={selectedListing}
              isSaved={savedIds.has(selectedListing.id)}
              onSave={() => onSave(selectedListing.id)}
              onUnsave={() => onUnsave(selectedListing.id)}
            />
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Legend */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center gap-6 text-sm">
        <span className="text-gray-500">
          Showing {listingsWithCoords.length} of {listings.length} listings with location
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Saved</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SearchResultsMap(props: SearchResultsMapProps) {
  return (
    <GoogleMapsProvider>
      <SearchResultsMapInner {...props} />
    </GoogleMapsProvider>
  )
}
