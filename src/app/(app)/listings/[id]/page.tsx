import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDate, AMENITIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import { AnimatedPage } from '@/components/ui/animated-page'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Home,
  DollarSign,
  Users,
  Heart,
  Share2,
  Flag,
  MessageCircle,
  Check,
  Leaf,
  Eye,
  Edit,
  Bath,
} from 'lucide-react'
import { BATHROOM_TYPES, BATHROOM_SIZES } from '@/lib/utils'
import { ListingActions } from './listing-actions'
import { CompatibilityBadge } from '@/components/ui/compatibility-badge'

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await (supabase as any)
    .from('listings')
    .select('title, city, province, price')
    .eq('id', id)
    .single() as { data: any }

  if (!listing) {
    return { title: 'Listing Not Found' }
  }

  return {
    title: `${listing.title} - ${listing.city}, ${listing.province}`,
    description: `${formatPrice(listing.price)}/mo room for rent in ${listing.city}, ${listing.province}`,
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch listing first
  const { data: listing, error } = await (supabase as any)
    .from('listings')
    .select('*')
    .eq('id', id)
    .single() as { data: any; error: any }

  if (error || !listing) {
    console.error('Listing fetch error:', error, 'ID:', id)
    notFound()
  }

  // Fetch host profile separately
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, user_id, name, bio, profile_photo, verification_level, languages, created_at')
    .eq('user_id', listing.user_id)
    .single() as { data: any }


  // Check if this is the owner's listing
  const isOwner = user?.id === listing.user_id

  // Check if listing is saved by current user
  let isSaved = false
  if (user) {
    const { data: savedListing } = await (supabase as any)
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single()
    isSaved = !!savedListing
  }

  // Increment view count
  if (!isOwner) {
    await (supabase as any)
      .from('listings')
      .update({ views_count: (listing.views_count || 0) + 1 })
      .eq('id', id)
  }

  const typeLabels: Record<string, string> = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  return (
    <AnimatedPage>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6" data-animate>
          <Link
            href="/search"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to search
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden animate-scale-in" data-animate="scale">
              {listing.photos && listing.photos.length > 0 ? (
                <img
                  src={listing.photos[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="h-16 w-16 text-gray-300" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {listing.newcomer_friendly && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Leaf className="h-3 w-3" />
                    Newcomer Friendly
                  </Badge>
                )}
                {listing.no_credit_history_ok && (
                  <Badge variant="info">No Credit History OK</Badge>
                )}
                {!listing.is_active && (
                  <Badge variant="warning">Inactive</Badge>
                )}
              </div>

              {/* Photo gallery indicator */}
              {listing.photos && listing.photos.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-sm px-3 py-1 rounded-full">
                  1 / {listing.photos.length}
                </div>
              )}
            </div>

            {/* Title and basic info */}
            <div data-animate className="delay-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {listing.city}, {listing.province}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPrice(listing.price)}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </p>
                  {listing.utilities_included && (
                    <p className="text-sm text-green-600">Utilities included</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm transition-all hover:bg-gray-200">
                  <Home className="h-4 w-4" />
                  {typeLabels[listing.type]}
                </span>
                {listing.bathroom_type && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm transition-all hover:bg-blue-100">
                    <Bath className="h-4 w-4" />
                    {BATHROOM_TYPES.find(b => b.value === listing.bathroom_type)?.label || listing.bathroom_type}
                    {listing.bathroom_size && (
                      <span className="text-blue-500">
                        ({BATHROOM_SIZES.find(s => s.value === listing.bathroom_size)?.label})
                      </span>
                    )}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm transition-all hover:bg-gray-200">
                  <Calendar className="h-4 w-4" />
                  Available {formatDate(listing.available_date)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm transition-all hover:bg-gray-200">
                  <Clock className="h-4 w-4" />
                  Min {listing.minimum_stay || 1} {listing.minimum_stay === 1 ? 'month' : 'months'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm transition-all hover:bg-gray-200">
                  <Eye className="h-4 w-4" />
                  {listing.views_count || 0} views
                </span>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <Card variant="bordered" data-animate className="delay-200">
                <CardContent className="py-4">
                  <h2 className="font-semibold text-gray-900 mb-2">About this place</h2>
                  <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <Card variant="bordered" data-animate className="delay-300">
                <CardContent className="py-4">
                  <h2 className="font-semibold text-gray-900 mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity: string, index: number) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 text-gray-600 transition-all duration-300 hover:text-gray-900"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Roommate preferences */}
            <Card variant="bordered" data-animate className="delay-400">
              <CardContent className="py-4">
                <h2 className="font-semibold text-gray-900 mb-3">Roommate Preferences</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                    <span className="text-gray-500">Gender preference:</span>
                    <p className="text-gray-900 capitalize font-medium">
                      {listing.roommate_gender_preference || 'Any'}
                    </p>
                  </div>
                  {(listing.roommate_age_min || listing.roommate_age_max) && (
                    <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                      <span className="text-gray-500">Age range:</span>
                      <p className="text-gray-900 font-medium">
                        {listing.roommate_age_min || 18} - {listing.roommate_age_max || 'any'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Host card */}
            <Card variant="feature" data-animate className="delay-200">
              <CardContent className="py-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                    {profile?.profile_photo ? (
                      <img
                        src={profile.profile_photo}
                        alt={profile.name || 'Host'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {profile?.name || 'Anonymous'}
                    </h3>
                    <VerificationBadge level={profile?.verification_level || 'basic'} />
                    {profile?.created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Member since {formatDate(profile.created_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Compatibility score */}
                {user && !isOwner && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Your compatibility</p>
                    <CompatibilityBadge
                      userId={listing.user_id}
                      currentUserId={user.id}
                      size="lg"
                      showLabel={true}
                    />
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {profile.bio}
                  </p>
                )}

                {profile?.languages && profile.languages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Languages</p>
                    <p className="text-sm text-gray-700">
                      {profile.languages.join(', ')}
                    </p>
                  </div>
                )}

                <ListingActions
                  listingId={id}
                  hostUserId={listing.user_id}
                  isOwner={isOwner}
                  isSaved={isSaved}
                  isLoggedIn={!!user}
                />
              </CardContent>
            </Card>

            {/* Owner actions */}
            {isOwner && (
              <Card variant="bordered" data-animate className="delay-300">
                <CardContent className="py-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Manage Listing</h3>
                  <div className="space-y-2">
                    <Link href={`/listings/${id}/edit`}>
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Listing
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick info */}
            <Card variant="bordered" data-animate className="delay-400">
              <CardContent className="py-4">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Info</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Listed</dt>
                    <dd className="text-gray-900">{formatDate(listing.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last updated</dt>
                    <dd className="text-gray-900">{formatDate(listing.updated_at)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
