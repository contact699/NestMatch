'use client'

import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { Home, MapPin, Heart } from 'lucide-react'

interface Listing {
  id: string
  title: string
  city: string
  province: string
  price: number
  type: 'room' | 'shared_room' | 'entire_place'
  photos: string[] | null
  newcomer_friendly: boolean
}

interface MapListingPopupProps {
  listing: Listing
  isSaved: boolean
  onSave: () => void
  onUnsave: () => void
}

const typeLabels = {
  room: 'Private Room',
  shared_room: 'Shared Room',
  entire_place: 'Entire Place',
}

export function MapListingPopup({
  listing,
  isSaved,
  onSave,
  onUnsave,
}: MapListingPopupProps) {
  return (
    <div className="w-64 p-0">
      {/* Image */}
      <div className="relative aspect-[16/10] bg-gray-100 rounded-t-lg overflow-hidden">
        {listing.photos && listing.photos.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            isSaved ? onUnsave() : onSave()
          }}
          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full hover:bg-white hover:scale-110 transition-all shadow-sm"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>

        {/* Price tag */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded-full">
          <span className="font-bold text-blue-600 text-sm">
            {formatPrice(listing.price)}
          </span>
          <span className="text-xs text-gray-500">/mo</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <Link href={`/listings/${listing.id}`}>
          <h3 className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 mb-1">
            {listing.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="h-3 w-3" />
          <span>
            {listing.city}, {listing.province}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            <Home className="h-3 w-3" />
            {typeLabels[listing.type]}
          </span>
          {listing.newcomer_friendly && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Newcomer Friendly
            </span>
          )}
        </div>

        <Link
          href={`/listings/${listing.id}`}
          className="block mt-3 text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
