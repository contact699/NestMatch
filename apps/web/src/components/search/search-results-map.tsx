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
// Cap the zoom that fitBounds chooses. Without this, a single listing (or a
// cluster at the same address) zooms to street-level — markers vanish behind
// labels and the user sees a "blank" map.
const MAX_FIT_ZOOM = 14

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
      // Cap zoom on the next idle event — fitBounds re-zooms async, so we
      // can't just call setZoom here. Without the cap, one or two listings
      // produce a street-level zoom where pins overlap labels.
      // addListenerOnce auto-removes itself.
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom()
        if (typeof z === 'number' && z > MAX_FIT_ZOOM) {
          map.setZoom(MAX_FIT_ZOOM)
        }
      })
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
      <div className="flex items-center justify-center h-[500px] bg-surface-container-low rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <MapPin className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-4" />
          <p className="text-on-surface font-medium mb-2">
            {listings.length === 0
              ? 'No listings to map'
              : "We don't have map locations for these listings yet"}
          </p>
          <p className="text-sm text-on-surface-variant">
            {listings.length === 0
              ? 'Try adjusting your filters.'
              : 'Switch to List or Nearby view to see them. Hosts are still adding addresses.'}
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
        {listingsWithCoords.map((listing) => {
          const isSaved = savedIds.has(listing.id)
          // Use a teardrop-pin shape so markers read as map pins from a
          // distance instead of small dots that disappear into the basemap.
          // Path is a standard Material map-pin (top-anchored, 24x24 viewBox).
          const PIN_PATH =
            'M12 0C7.03 0 3 4.03 3 9c0 7.5 9 15 9 15s9-7.5 9-15c0-4.97-4.03-9-9-9z'
          return (
            <Marker
              key={listing.id}
              position={{
                lat: listing.lat!,
                lng: listing.lng!,
              }}
              onClick={() => setSelectedListing(listing)}
              icon={{
                path: PIN_PATH,
                fillColor: isSaved ? '#ef4444' : '#1d4ed8',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 1.6,
                anchor: new google.maps.Point(12, 24),
                labelOrigin: new google.maps.Point(12, 9),
              }}
              label={{
                text: '$',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
              }}
            />
          )
        })}

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
      <div className="bg-surface-container-low px-4 py-2 ghost-border-t flex items-center gap-6 text-sm">
        <span className="text-on-surface-variant">
          Showing {listingsWithCoords.length} of {listings.length} listings with location
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-700"></span>
            <span className="text-on-surface-variant">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-on-surface-variant">Saved</span>
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
