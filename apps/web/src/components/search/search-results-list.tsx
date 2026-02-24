'use client'

import { ListingCard } from '@/components/listings/listing-card'

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

interface SearchResultsListProps {
  listings: Listing[]
  currentUserId: string | null
  savedIds: Set<string>
  onSave: (id: string) => void
  onUnsave: (id: string) => void
}

export function SearchResultsList({
  listings,
  currentUserId,
  savedIds,
  onSave,
  onUnsave,
}: SearchResultsListProps) {
  // Stagger delay classes for animation
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing, index) => (
        <div key={listing.id} className={getDelayClass(index)}>
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
  )
}
