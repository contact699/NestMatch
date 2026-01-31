'use client'

import Link from 'next/link'
import { formatPrice, formatDate, BATHROOM_TYPES } from '@/lib/utils'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  MapPin,
  Calendar,
  Home,
  Heart,
  Users,
  Leaf,
  Lock,
  Bath,
} from 'lucide-react'

interface PublicListingCardProps {
  listing: {
    id: string
    title: string
    description: string | null
    city: string
    province: string
    price: number
    type: 'room' | 'shared_room' | 'entire_place'
    bathroom_type?: string | null
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
}

export function PublicListingCard({ listing }: PublicListingCardProps) {
  const typeLabels = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  return (
    <Card variant="bordered" className="overflow-hidden feature-card group">
      <Link href={`/signup?redirect=/listings/${listing.id}`}>
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {listing.photos && listing.photos.length > 0 ? (
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {listing.newcomer_friendly && (
              <Badge variant="success" className="flex items-center gap-1">
                <Leaf className="h-3 w-3" />
                Newcomer Friendly
              </Badge>
            )}
            {listing.no_credit_history_ok && (
              <Badge variant="info">No Credit History OK</Badge>
            )}
          </div>

          {/* Compatibility badge - locked for public */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-medium text-gray-600">
              <Lock className="h-3 w-3" />
              <span className="blur-[3px]">85%</span>
            </div>
          </div>

          {/* Save button - disabled for public */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.location.href = '/signup'
            }}
            className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-all duration-300 shadow-sm group/save"
            title="Sign up to save"
          >
            <Heart className="h-5 w-5 text-gray-400 group-hover/save:text-red-400 transition-colors" />
          </button>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/signup?redirect=/listings/${listing.id}`}>
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
          {listing.bathroom_type && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              <Bath className="h-3 w-3" />
              {BATHROOM_TYPES.find(b => b.value === listing.bathroom_type)?.label.split(' ')[0] || listing.bathroom_type}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
            <Calendar className="h-3 w-3" />
            {formatDate(listing.available_date)}
          </span>
          {listing.utilities_included && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Utilities included
            </span>
          )}
        </div>

        {/* Host info */}
        {listing.profiles && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
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
                  level={listing.profiles.verification_level as 'basic' | 'verified' | 'trusted'}
                  size="sm"
                  showLabel={false}
                />
              </div>
            </div>
            <Link
              href={`/signup?redirect=/listings/${listing.id}`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View details
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}
