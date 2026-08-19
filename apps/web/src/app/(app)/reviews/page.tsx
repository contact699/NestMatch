'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
  Shield,
  Clock,
  Sparkles,
  BarChart3,
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

interface ProfileData {
  profile: {
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: 'basic' | 'verified' | 'trusted'
    created_at: string
  } | null
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<'all' | 'roommates' | 'hosts'>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // Fetch cohabitations for "awaiting feedback" section
  const {
    data: cohabitationsData,
    isLoading: cohabLoading,
    error: cohabError,
    refetch: refetchCohabitations,
  } = useFetch<CohabitationsData>('/api/cohabitations')

  // Fetch the signed-in user's own profile summary for the sidebar. This runs
  // first because it is also where the current user's id comes from, and the
  // reviews query below is scoped to it.
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useFetch<ProfileData>('/api/profile/status')

  const profile = profileData?.profile ?? null
  const currentUserId = profile?.user_id ?? null

  // Fetch reviews RECEIVED by the signed-in user.
  //
  // GET /api/reviews applies a user predicate only when `user_id` is present
  // (it filters on `reviewee_id`, or `reviewer_id` with type=given) — calling
  // it bare returned every visible review on the platform, and left `aggregate`
  // null because the route only computes it for a target user. Passing the id
  // explicitly fixes both the leak and the always-empty sidebar rating.
  const reviewsUrl = currentUserId
    ? `/api/reviews?user_id=${encodeURIComponent(currentUserId)}`
    : null
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews,
  } = useFetch<ReviewsData>(reviewsUrl, { deps: [currentUserId] })

  const cohabitations = cohabitationsData?.cohabitations ?? []
  const reviews = reviewsData?.reviews ?? []
  const aggregate = reviewsData?.aggregate ?? null

  // The reviews request can only start once the profile resolves, so there is a
  // render between the two where nothing is in flight yet. Count that gap as
  // loading, otherwise the "No reviews yet" empty state flashes.
  const reviewsPending = !!currentUserId && !reviewsData && !reviewsError
  const isLoading = cohabLoading || profileLoading || reviewsLoading || reviewsPending
  const error = cohabError || reviewsError || profileError

  const retryAll = () => {
    refetchCohabitations()
    refetchReviews()
    refetchProfile()
  }

  const pendingReviews = cohabitations.filter((c) => c.can_review && !c.user_has_reviewed)

  // Tab filtering. A received review's author is the *other* participant in the
  // cohabitation, so the author's role is the inverse of ours: if we hosted
  // (is_provider), they stayed with us — a roommate; if we were the seeker, they
  // were our host. The reviews endpoint doesn't join provider_id/seeker_id onto
  // the cohabitation, so the role is looked up from /api/cohabitations, which
  // returns every period the user participates in (no pagination).
  const currentUserIsProviderByCohabId = useMemo(() => {
    const map = new Map<string, boolean>()
    cohabitations.forEach((c) => map.set(c.id, c.is_provider))
    return map
  }, [cohabitations])

  const filteredReviews = useMemo(() => {
    if (tab === 'all') return reviews
    return reviews.filter((review) => {
      const cohabId = review.cohabitation?.id
      if (!cohabId) return false
      const weHosted = currentUserIsProviderByCohabId.get(cohabId)
      if (weHosted === undefined) return false
      return tab === 'roommates' ? weHosted : !weHosted
    })
  }, [reviews, tab, currentUserIsProviderByCohabId])

  const handleReviewSuccess = () => {
    setReviewingId(null)
    refetchCohabitations()
    refetchReviews()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary-container text-secondary font-medium">
            Active
          </span>
        )
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant font-medium">
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-error-container text-error font-medium">
            Cancelled
          </span>
        )
      default:
        return null
    }
  }

  // Stars helper
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < Math.round(rating) ? 'text-secondary fill-secondary' : 'text-on-surface-variant/20'}`}
          />
        ))}
      </div>
    )
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
    : null

  const isVerified =
    profile?.verification_level === 'verified' || profile?.verification_level === 'trusted'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FetchError message={error} onRetry={retryAll} />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface">Reviews & Ratings</h1>
        <p className="text-on-surface-variant mt-1">
          Build trust within the community. Your cohabitation history and feedback help ensure a safe, high-quality experience for everyone.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Left Sidebar */}
        <div className="space-y-6">
          {/* Profile Summary Card */}
          <Card variant="bordered">
            <CardContent className="py-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-surface-container overflow-hidden mb-3">
                {profile?.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt={profile.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-10 w-10 text-on-surface-variant" />
                  </div>
                )}
              </div>
              <h3 className="font-display font-semibold text-on-surface">
                {profile?.name || 'User'}
              </h3>
              {memberSince && (
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Member since {memberSince}
                </p>
              )}

              {/* Overall Rating */}
              {aggregate && aggregate.total_reviews > 0 && (
                <div className="mt-4">
                  <div className="text-4xl font-bold text-on-surface">
                    {aggregate.average_overall.toFixed(1)}
                  </div>
                  <div className="flex justify-center mt-1">
                    {renderStars(aggregate.average_overall)}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-sm text-on-surface-variant">
                    <div className="text-center">
                      <div className="font-semibold text-on-surface">{aggregate.total_reviews}</div>
                      <div className="text-xs uppercase tracking-wide">Reviews</div>
                    </div>
                    <div className="w-px h-8 bg-on-surface-variant/10" />
                    <div className="text-center">
                      <div className="font-semibold text-on-surface">{cohabitations.length}</div>
                      <div className="text-xs uppercase tracking-wide">Stays</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification status — derived from the profile's real level */}
          <div className="bg-secondary-container/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-secondary text-sm">
                {isVerified ? 'Verified member' : 'Not verified yet'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              {isVerified
                ? 'Your identity checks are complete, so your profile carries a verification badge.'
                : 'Complete your verification checks to earn a badge on your profile and listings.'}
            </p>
            {!isVerified && (
              <Link
                href="/verify"
                className="inline-block mt-2 text-xs font-medium text-secondary hover:underline"
              >
                Go to Trust Center
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Awaiting Your Feedback */}
          {pendingReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-on-surface-variant" />
                <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
                  Awaiting Your Feedback
                </h2>
              </div>
              <div className="space-y-3">
                {pendingReviews.map((cohab) => {
                  const otherPerson = cohab.is_provider ? cohab.seeker : cohab.provider
                  const isReviewing = reviewingId === cohab.id

                  if (isReviewing) {
                    return (
                      <ReviewForm
                        key={cohab.id}
                        cohabitationId={cohab.id}
                        revieweeId={otherPerson.user_id}
                        revieweeName={otherPerson.name}
                        onSuccess={handleReviewSuccess}
                        onCancel={() => setReviewingId(null)}
                      />
                    )
                  }

                  return (
                    <Card key={cohab.id} variant="bordered">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
                              {cohab.listing.photos?.[0] ? (
                                <img
                                  src={cohab.listing.photos[0]}
                                  alt={cohab.listing.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="h-5 w-5 text-on-surface-variant/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-on-surface truncate">
                                {cohab.listing.title}
                              </h4>
                              <p className="text-sm text-on-surface-variant">
                                Stay ended {cohab.end_date ? formatDate(cohab.end_date) : 'recently'}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                Host: {otherPerson.name}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setReviewingId(cohab.id)}
                            variant="outline"
                            className="flex-shrink-0"
                          >
                            <PenSquare className="h-4 w-4 mr-2" />
                            Leave a Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-on-surface-variant" />
                <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
                  Recent Reviews
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
                {(['all', 'roommates', 'hosts'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      tab === t
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filteredReviews.length === 0 ? (
              <Card variant="bordered">
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 text-on-surface-variant/20 mx-auto mb-4" />
                  <h3 className="text-lg font-display font-semibold text-on-surface mb-2">
                    {reviews.length === 0 ? 'No reviews yet' : 'No reviews in this view'}
                  </h3>
                  <p className="text-on-surface-variant">
                    {reviews.length === 0
                      ? 'Reviews from your roommates will appear here.'
                      : tab === 'roommates'
                        ? 'None of your reviews were written by a roommate who stayed with you.'
                        : 'None of your reviews were written by a host you stayed with.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showReviewer
                    showListing
                  />
                ))}
              </div>
            )}
          </div>

          {/* Trait Highlights */}
          {aggregate && aggregate.total_reviews > 0 && (
            <div>
              <h2 className="text-xl font-display font-semibold text-on-surface mb-4">
                Trait Highlights
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Cleanliness', value: aggregate.average_cleanliness, icon: Sparkles },
                  { label: 'Reliability', value: aggregate.average_rent_payment, icon: Shield },
                  { label: 'Communication', value: aggregate.average_communication, icon: BarChart3 },
                  { label: 'Noise Level', value: aggregate.average_respect, icon: Users },
                ].map((trait) => (
                  <Card key={trait.label} variant="bordered">
                    <CardContent className="py-4 text-center">
                      <trait.icon className="h-6 w-6 text-on-surface-variant mx-auto mb-2" />
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">
                        {trait.label}
                      </p>
                      <p className="text-2xl font-bold text-on-surface">
                        {trait.value != null ? trait.value.toFixed(1) : '--'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
