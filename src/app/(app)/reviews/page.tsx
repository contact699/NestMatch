'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FetchError } from '@/components/ui/fetch-error'
import { ReviewCard, ReviewSummary, ReviewForm } from '@/components/reviews'
import { useFetch } from '@/lib/hooks/use-fetch'
import { formatDate } from '@/lib/utils'
import {
  Star,
  Home,
  Users,
  Calendar,
  Loader2,
  ChevronRight,
  PenSquare,
} from 'lucide-react'

interface Cohabitation {
  id: string
  listing_id: string
  provider_id: string
  seeker_id: string
  start_date: string
  end_date: string | null
  status: string
  provider: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  seeker: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  listing: {
    id: string
    title: string
    city: string
    photos: string[]
  }
  reviews: any[]
  user_has_reviewed: boolean
  can_review: boolean
  is_provider: boolean
}

interface Review {
  id: string
  rent_payment_rating: number | null
  cleanliness_rating: number | null
  respect_rating: number | null
  communication_rating: number | null
  overall_rating: number | null
  comment: string | null
  created_at: string
  reviewer: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  reviewee: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  cohabitation: {
    id: string
    start_date: string
    end_date: string | null
    listing: {
      id: string
      title: string
      city: string
    }
  }
}

interface ReviewAggregate {
  total_reviews: number
  average_overall: number
  average_rent_payment: number | null
  average_cleanliness: number | null
  average_respect: number | null
  average_communication: number | null
}

interface CohabitationsData {
  cohabitations: Cohabitation[]
}

interface ReviewsData {
  reviews: Review[]
  aggregate: ReviewAggregate | null
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<'cohabitations' | 'received' | 'given'>('cohabitations')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // Fetch cohabitations when on that tab
  const {
    data: cohabitationsData,
    isLoading: cohabLoading,
    error: cohabError,
    refetch: refetchCohabitations,
  } = useFetch<CohabitationsData>(
    '/api/cohabitations',
    { skip: tab !== 'cohabitations', deps: [tab] }
  )

  // Fetch reviews when on received or given tabs
  const reviewsUrl = tab === 'given' ? '/api/reviews?type=given' : '/api/reviews'
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews,
  } = useFetch<ReviewsData>(
    reviewsUrl,
    { skip: tab === 'cohabitations', deps: [tab] }
  )

  const cohabitations = cohabitationsData?.cohabitations ?? []
  const reviews = reviewsData?.reviews ?? []
  const aggregate = reviewsData?.aggregate ?? null
  const isLoading = tab === 'cohabitations' ? cohabLoading : reviewsLoading
  const error = tab === 'cohabitations' ? cohabError : reviewsError
  const refetch = tab === 'cohabitations' ? refetchCohabitations : refetchReviews

  const handleReviewSuccess = () => {
    setReviewingId(null)
    refetchCohabitations()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
            Active
          </span>
        )
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
            Cancelled
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600">Manage your roommate reviews and cohabitations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'cohabitations', label: 'Cohabitations', icon: Users },
          { key: 'received', label: 'Received', icon: Star },
          { key: 'given', label: 'Given', icon: PenSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <FetchError message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : tab === 'cohabitations' ? (
        // Cohabitations List
        cohabitations.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No cohabitations yet
              </h3>
              <p className="text-gray-500">
                Cohabitation records will appear here when you start living with
                other NestMatch users.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cohabitations.map((cohab) => {
              const otherPerson = cohab.is_provider ? cohab.seeker : cohab.provider
              const isReviewing = reviewingId === cohab.id

              return (
                <Card key={cohab.id} variant="bordered">
                  <CardContent className="py-4">
                    {/* Cohabitation Info */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Listing Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {cohab.listing.photos?.[0] ? (
                          <img
                            src={cohab.listing.photos[0]}
                            alt={cohab.listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {cohab.listing.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {cohab.listing.city}
                            </p>
                          </div>
                          {getStatusBadge(cohab.status)}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(cohab.start_date)}
                              {cohab.end_date && ` - ${formatDate(cohab.end_date)}`}
                            </span>
                          </div>
                        </div>

                        {/* Other Person */}
                        <div className="flex items-center gap-2 mt-3">
                          {otherPerson.profile_photo ? (
                            <img
                              src={otherPerson.profile_photo}
                              alt={otherPerson.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {otherPerson.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {cohab.is_provider ? 'Tenant' : 'Landlord'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Section */}
                    {isReviewing ? (
                      <ReviewForm
                        cohabitationId={cohab.id}
                        revieweeId={otherPerson.user_id}
                        revieweeName={otherPerson.name}
                        onSuccess={handleReviewSuccess}
                        onCancel={() => setReviewingId(null)}
                      />
                    ) : cohab.user_has_reviewed ? (
                      <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-800">
                          You have reviewed this cohabitation
                        </span>
                      </div>
                    ) : cohab.can_review ? (
                      <Button
                        onClick={() => setReviewingId(cohab.id)}
                        className="w-full"
                      >
                        <PenSquare className="h-4 w-4 mr-2" />
                        Write a Review
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        // Reviews List
        <div className="space-y-6">
          {/* Aggregate Summary (for received reviews) */}
          {tab === 'received' && (
            <ReviewSummary aggregate={aggregate} />
          )}

          {/* Reviews */}
          {reviews.length === 0 ? (
            <Card variant="bordered">
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reviews yet
                </h3>
                <p className="text-gray-500">
                  {tab === 'received'
                    ? 'Reviews from your roommates will appear here.'
                    : 'Reviews you have written will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showReviewer={tab === 'received'}
                  showReviewee={tab === 'given'}
                  showListing
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1">About Reviews</h4>
        <p className="text-sm text-blue-700">
          Reviews help build trust in the NestMatch community. You can review roommates
          after your cohabitation begins. Reviews are visible to other users and can be
          edited within 7 days of submission.
        </p>
      </div>
    </div>
  )
}
