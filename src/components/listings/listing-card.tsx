'use client'

import Link from 'next/link'
import { formatPrice, formatDate, getRelativeTime, BATHROOM_TYPES } from '@/lib/utils'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import { CompatibilityBadge } from '@/components/ui/compatibility-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Calendar,
  Home,
  Heart,
  Users,
  Leaf,
  Clock,
  Bath,
  HandHelping,
  GraduationCap,
} from 'lucide-react'
import type { Listing, Profile } from '@/types/database'

interface ListingCardProps {
  listing: Listing & {
    profiles?: Profile
  }
  currentUserId?: string | null
  compatibilityScore?: number
  isSaved?: boolean
  onSave?: () => void
  onUnsave?: () => void
}

export function ListingCard({
  listing,
  currentUserId,
  compatibilityScore,
  isSaved,
  onSave,
  onUnsave,
}: ListingCardProps) {
  const typeLabels = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  return (
    <Card variant="bordered" className="overflow-hidden card-hover group">
      <div className="relative">
        <Link href={`/listings/${listing.id}`}>
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
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
          </div>
        </Link>

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
          {listing.newcomer_friendly && (
            <Badge variant="success" className="flex items-center gap-1">
              <Leaf className="h-3 w-3" />
              Newcomer Friendly
            </Badge>
          )}
          {listing.no_credit_history_ok && (
            <Badge variant="info">No Credit History OK</Badge>
          )}
          {listing.help_needed && (
            <Badge variant="warning" className="flex items-center gap-1">
              <HandHelping className="h-3 w-3" />
              Assistance Required
            </Badge>
          )}
          {listing.ideal_for_students && (
            <Badge variant="default" className="flex items-center gap-1 bg-purple-100 text-purple-800">
              <GraduationCap className="h-3 w-3" />
              Ideal for Students
            </Badge>
          )}
        </div>

        {/* Compatibility score */}
        {currentUserId && listing.user_id !== currentUserId && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <CompatibilityBadge
              userId={listing.user_id}
              currentUserId={currentUserId}
              size="sm"
              showLabel={false}
            />
          </div>
        )}

        {/* Save button - outside of Link to prevent navigation interference */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            isSaved ? onUnsave?.() : onSave?.()
          }}
          aria-label={isSaved ? 'Remove from saved listings' : 'Save listing'}
          aria-pressed={isSaved}
          className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full hover:bg-white hover:scale-110 transition-all duration-300 shadow-sm z-10"
        >
          <Heart
            className={`h-5 w-5 transition-colors duration-300 ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover:text-red-400'
            }`}
          />
        </button>
      </div>

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
                  level={listing.profiles.verification_level}
                  size="sm"
                  showLabel={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {getRelativeTime(listing.created_at)}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

interface ListingCardSkeletonProps {
  count?: number
}

export function ListingCardSkeleton({ count = 1 }: ListingCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} variant="bordered" className="overflow-hidden">
          <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </Card>
      ))}
    </>
  )
}
