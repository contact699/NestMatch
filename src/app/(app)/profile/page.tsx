import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import { AnimatedPage } from '@/components/ui/animated-page'
import {
  User,
  Users,
  Mail,
  Phone,
  Briefcase,
  Edit,
  Shield,
  CheckCircle,
  XCircle,
  Globe,
  Star,
  MapPin,
  Home,
  ChevronRight,
} from 'lucide-react'
import { HOUSEHOLD_SITUATIONS } from '@/lib/utils'

export const metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: any }

  const { data: lifestyleResponses } = await supabase
    .from('lifestyle_responses')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: any }

  // Fetch reviews received
  const { data: reviews } = await (supabase as any)
    .from('reviews')
    .select('overall_rating')
    .eq('reviewee_id', user.id)
    .eq('is_visible', true) as { data: any[] }

  const reviewCount = reviews?.length || 0
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum: number, r: any) => sum + parseFloat(r.overall_rating || 0), 0) / reviewCount
    : null

  // Fetch user's listings count
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, is_active')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3) as { data: any[] | null }

  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', user.id)

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8" data-animate>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <Link href="/profile/edit">
            <Button variant="glow">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 delay-100" data-animate>
            <Card variant="bordered" animate>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden transition-transform duration-500 hover:scale-105">
                    {profile?.profile_photo ? (
                      <img
                        src={profile.profile_photo}
                        alt={profile.name || 'Profile'}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-blue-600" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {profile?.name || 'Add your name'}
                  </h2>
                  {profile?.occupation && (
                    <p className="text-gray-500 mt-1">{profile.occupation}</p>
                  )}
                  <div className="mt-3">
                    <VerificationBadge level={profile?.verification_level || 'basic'} />
                  </div>

                  {/* Rating Display */}
                  {reviewCount > 0 ? (
                    <Link href="/reviews" className="mt-3 flex items-center justify-center gap-1 text-sm hover:opacity-80 transition-opacity">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{averageRating?.toFixed(1)}</span>
                      <span className="text-gray-500">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                    </Link>
                  ) : (
                    <Link href="/reviews" className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                      <Star className="h-4 w-4" />
                      <span>No reviews yet</span>
                    </Link>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{user.email}</span>
                    {profile?.email_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {profile?.phone || 'Add phone number'}
                    </span>
                    {profile?.phone_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300 ml-auto" />
                    )}
                  </div>
                  {profile?.languages && profile.languages.length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {profile.languages.join(', ')}
                      </span>
                    </div>
                  )}
                  {(profile?.city || profile?.province) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {[profile.city, profile.province].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {profile?.household_situation && (
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
                </div>

                {profile?.verification_level === 'basic' && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Get verified
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Verified profiles get 3x more responses. Verify your
                          identity to build trust.
                        </p>
                        <Link href="/verify">
                          <Button variant="glow" size="sm" className="mt-3">
                            Verify Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <Card variant="bordered" data-animate className="delay-200">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.bio ? (
                  <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-gray-400 italic">
                    Add a bio to tell potential roommates about yourself.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Your Listings */}
            <Card variant="bordered" data-animate className="delay-250">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Your Listings
                </CardTitle>
                <Link href="/my-listings">
                  <Button size="sm" variant="outline">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {listings && listings.length > 0 ? (
                  <div className="space-y-3">
                    {listings.map((listing) => (
                      <Link
                        key={listing.id}
                        href={`/listings/${listing.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium text-gray-900 truncate">{listing.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${listing.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {listing.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </Link>
                    ))}
                    {(listingsCount || 0) > 3 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{(listingsCount || 0) - 3} more listings
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">You haven't posted any listings yet.</p>
                    <Link href="/listings/new">
                      <Button variant="glow" size="sm">
                        Create Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lifestyle Preferences */}
            <Card variant="feature" data-animate className="delay-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lifestyle Preferences</CardTitle>
                {!lifestyleResponses && (
                  <Link href="/quiz">
                    <Button size="sm" variant="outline">
                      Take Quiz
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                {lifestyleResponses ? (
                  <div className="grid grid-cols-2 gap-4">
                    {lifestyleResponses.work_schedule && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Work Schedule</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.work_schedule.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.sleep_schedule && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Sleep Schedule</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.sleep_schedule.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.cleanliness_level && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Cleanliness</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.cleanliness_level}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.noise_tolerance && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Noise Tolerance</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.noise_tolerance.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.guest_frequency && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Guests</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.guest_frequency}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.smoking && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Smoking</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.smoking.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.pets_preference && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Pets</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.pets_preference.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {lifestyleResponses.remote_work_frequency && (
                      <div className="p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                        <p className="text-sm text-gray-500">Remote Work</p>
                        <p className="font-medium capitalize">
                          {lifestyleResponses.remote_work_frequency}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">
                      Complete the lifestyle quiz to help us find compatible
                      roommates for you.
                    </p>
                    <Link href="/quiz">
                      <Button variant="glow">Take the Quiz</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
