import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VerificationBadge } from '@/components/ui/badge'
import { CompatibilityBadge } from '@/components/ui/compatibility-badge'
import {
  User,
  Users,
  MapPin,
  Globe,
  Briefcase,
  MessageCircle,
  ArrowLeft,
  Star,
  Calendar,
} from 'lucide-react'
import { formatDate, HOUSEHOLD_SITUATIONS } from '@/lib/utils'

interface ProfilePageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, city, province')
    .eq('user_id', userId)
    .single() as { data: any }

  if (!profile) {
    return { title: 'Profile Not Found' }
  }

  return {
    title: `${profile.name || 'User'} - NestMatch`,
    description: profile.city ? `${profile.name} from ${profile.city}, ${profile.province}` : `View ${profile.name}'s profile on NestMatch`,
  }
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Redirect to own profile page if viewing self
  if (currentUser?.id === userId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600">Redirecting to your profile...</p>
        <meta httpEquiv="refresh" content="0;url=/profile" />
      </div>
    )
  }

  // Fetch the profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single() as { data: any; error: any }

  if (error || !profile) {
    notFound()
  }

  // Fetch lifestyle responses
  const { data: lifestyleResponses } = await supabase
    .from('lifestyle_responses')
    .select('*')
    .eq('user_id', userId)
    .single() as { data: any }

  // Fetch reviews received
  const { data: reviews } = await supabase
    .from('reviews')
    .select('overall_rating')
    .eq('reviewee_id', userId)
    .eq('is_visible', true) as { data: any[] }

  const reviewCount = reviews?.length || 0
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum: number, r: any) => sum + parseFloat(r.overall_rating || 0), 0) / reviewCount
    : null

  // Fetch user's active listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, province, price, photos, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(3) as { data: any[] }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/roommates"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to roommates
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card variant="bordered">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {profile.profile_photo ? (
                    <img
                      src={profile.profile_photo}
                      alt={profile.name || 'Profile'}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-blue-600" />
                  )}
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {profile.name || 'Anonymous'}
                </h1>
                {profile.occupation && (
                  <p className="text-gray-500 mt-1">{profile.occupation}</p>
                )}
                <div className="mt-3">
                  <VerificationBadge level={profile.verification_level || 'basic'} />
                </div>

                {/* Rating Display */}
                {reviewCount > 0 ? (
                  <div className="mt-3 flex items-center justify-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{averageRating?.toFixed(1)}</span>
                    <span className="text-gray-500">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Star className="h-4 w-4" />
                    <span>No reviews yet</span>
                  </div>
                )}

                {/* Compatibility */}
                {currentUser && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Your compatibility</p>
                    <CompatibilityBadge
                      userId={userId}
                      currentUserId={currentUser.id}
                      size="lg"
                      showLabel={true}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {(profile.city || profile.province) && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {[profile.city, profile.province].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {profile.household_situation && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {HOUSEHOLD_SITUATIONS.find(h => h.value === profile.household_situation)?.label || profile.household_situation}
                      {profile.number_of_children && profile.number_of_children > 0 && (
                        <span className="text-gray-400"> ({profile.number_of_children} {profile.number_of_children === 1 ? 'child' : 'children'})</span>
                      )}
                    </span>
                  </div>
                )}
                {profile.languages && profile.languages.length > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {profile.languages.join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Member since {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>

              {/* Message Button */}
              {currentUser && (
                <div className="mt-6">
                  <Link href={`/messages?to=${userId}`}>
                    <Button className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </Link>
                </div>
              )}

              {!currentUser && (
                <div className="mt-6">
                  <Link href="/login">
                    <Button className="w-full" variant="outline">
                      Sign in to message
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.bio ? (
                <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
              ) : (
                <p className="text-gray-400 italic">
                  This user hasn't added a bio yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Lifestyle Preferences */}
          {lifestyleResponses && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Lifestyle Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {lifestyleResponses.work_schedule && (
                    <div>
                      <p className="text-sm text-gray-500">Work Schedule</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.work_schedule.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.sleep_schedule && (
                    <div>
                      <p className="text-sm text-gray-500">Sleep Schedule</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.sleep_schedule.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.cleanliness_level && (
                    <div>
                      <p className="text-sm text-gray-500">Cleanliness</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.cleanliness_level}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.noise_tolerance && (
                    <div>
                      <p className="text-sm text-gray-500">Noise Tolerance</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.noise_tolerance.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.guest_frequency && (
                    <div>
                      <p className="text-sm text-gray-500">Guests</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.guest_frequency}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.smoking && (
                    <div>
                      <p className="text-sm text-gray-500">Smoking</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.smoking.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.pets_preference && (
                    <div>
                      <p className="text-sm text-gray-500">Pets</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.pets_preference.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {lifestyleResponses.remote_work_frequency && (
                    <div>
                      <p className="text-sm text-gray-500">Remote Work</p>
                      <p className="font-medium capitalize">
                        {lifestyleResponses.remote_work_frequency}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User's Listings */}
          {listings && listings.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Active Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {listings.map((listing: any) => (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img
                            src={listing.photos[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {listing.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {listing.city}, {listing.province}
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          ${listing.price}/mo
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
