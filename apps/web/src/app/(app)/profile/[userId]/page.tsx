import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompatibilityBadge } from '@/components/ui/compatibility-badge'
import {
  User,
  MapPin,
  Globe,
  Briefcase,
  MessageCircle,
  ArrowLeft,
  Star,
  Calendar,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  Languages,
} from 'lucide-react'
import { formatDate, HOUSEHOLD_SITUATIONS } from '@/lib/utils'
import { VerificationBadges } from '@/components/verification-badges'

interface ProfilePageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: profile } = (await supabase
    .from('profiles')
    .select('name, city, province')
    .eq('user_id', userId)
    .single()) as { data: any }

  if (!profile) {
    return { title: 'Profile Not Found' }
  }

  return {
    title: `${profile.name || 'User'} - NestMatch`,
    description: profile.city
      ? `${profile.name} from ${profile.city}, ${profile.province}`
      : `View ${profile.name}'s profile on NestMatch`,
  }
}

// Helper to derive lifestyle labels
function formatLifestyleValue(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
        <p className="text-center text-on-surface-variant">Redirecting to your profile...</p>
        <meta httpEquiv="refresh" content="0;url=/profile" />
      </div>
    )
  }

  // Fetch the profile
  const { data: profile, error } = (await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()) as { data: any; error: any }

  if (error || !profile) {
    notFound()
  }

  // Fetch lifestyle responses
  const { data: lifestyleResponses } = (await supabase
    .from('lifestyle_responses')
    .select('*')
    .eq('user_id', userId)
    .single()) as { data: any }

  // Fetch reviews received
  const { data: reviews } = (await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, profile_photo)')
    .eq('reviewee_id', userId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(3)) as { data: any[] }

  const reviewCount = reviews?.length || 0
  const averageRating =
    reviewCount > 0
      ? reviews!.reduce((sum: number, r: any) => sum + parseFloat(r.overall_rating || 0), 0) /
        reviewCount
      : null

  // Fetch user's active listings
  const { data: listings } = (await supabase
    .from('listings')
    .select('id, title, city, province, price, photos, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(3)) as { data: any[] }

  // Fetch completed verifications for badge display
  const { data: verifications } = await supabase
    .from('verifications')
    .select('type, status')
    .eq('user_id', userId)
    .eq('status', 'completed') as { data: Array<{ type: string; status: string }> | null }

  const firstName = profile.name?.split(' ')[0] || 'User'

  // Lifestyle quiz tabs
  const lifestyleTabs = [
    { key: 'cleanliness_level', label: 'CLEANLINESS' },
    { key: 'communication_style', label: 'SOCIAL LEVEL' },
    { key: 'noise_tolerance', label: 'NOISE LEVEL' },
    { key: 'guest_frequency', label: 'GUESTS' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/roommates"
          className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to roommates
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card variant="bordered">
            <CardContent className="py-6">
              <div className="text-center">
                {/* Photo */}
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
                    {profile.profile_photo ? (
                      <img
                        src={profile.profile_photo}
                        alt={profile.name || 'Profile'}
                        className="w-28 h-28 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-14 w-14 text-on-surface-variant" />
                    )}
                  </div>
                  {profile.verification_level !== 'basic' && (
                    <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <h1 className="text-xl font-display font-bold text-on-surface">
                  {profile.name || 'Anonymous'}
                </h1>
                {profile.occupation && (
                  <p className="text-on-surface-variant mt-1">{profile.occupation}</p>
                )}

                <div className="mt-2 flex justify-center">
                  <VerificationBadges
                    emailVerified={profile.email_verified}
                    phoneVerified={profile.phone_verified}
                    verifications={verifications || []}
                    verificationLevel={profile.verification_level}
                    variant="full"
                    showPublic={profile.show_verification_badges}
                  />
                </div>

                {/* Rating Display */}
                {reviewCount > 0 && averageRating ? (
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-sm">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(averageRating)
                              ? 'text-tertiary-fixed fill-tertiary-fixed'
                              : 'text-surface-container-high'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-on-surface">{averageRating.toFixed(1)}</span>
                    <span className="text-on-surface-variant">
                      ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-center gap-1 text-sm text-on-surface-variant">
                    <Star className="h-4 w-4" />
                    <span>No reviews yet</span>
                  </div>
                )}
              </div>

              {/* Message Button */}
              {currentUser && (
                <div className="mt-6">
                  <Link href={`/messages?to=${userId}`}>
                    <Button className="w-full" variant="primary">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message {firstName}
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

          {/* Verifications */}
          <Card variant="bordered">
            <CardContent className="py-5">
              <h3 className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-4">
                Verifications
              </h3>
              <div className="space-y-3">
                <VerificationRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Government ID"
                  verified={profile.verification_level !== 'basic'}
                />
                <VerificationRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone Verified"
                  verified={!!profile.phone_verified}
                />
                <VerificationRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Work Email"
                  verified={!!profile.email_verified}
                  pending={!profile.email_verified}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compatibility Score + Quick Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Compatibility Score */}
            {currentUser && (
              <Card className="bg-primary text-on-primary rounded-xl">
                <CardContent className="py-6">
                  <p className="text-xs font-semibold tracking-wider uppercase text-on-primary/70 mb-2">
                    Compatibility Score
                  </p>
                  <CompatibilityBadge
                    userId={userId}
                    currentUserId={currentUser.id}
                    size="lg"
                    showLabel={true}
                  />
                  <p className="text-sm text-on-primary/70 mt-3">
                    Based on your preferences for quiet evenings and weekend hosting.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <div className="space-y-4">
              {profile.occupation && (
                <Card variant="bordered">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                          Occupation
                        </p>
                        <p className="text-sm font-medium text-on-surface">{profile.occupation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {profile.languages && profile.languages.length > 0 && (
                <Card variant="bordered">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
                        <Languages className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                          Languages
                        </p>
                        <p className="text-sm font-medium text-on-surface">
                          {profile.languages.join(', ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* About */}
          <Card variant="bordered">
            <CardContent className="py-6">
              <h2 className="text-lg font-display font-semibold text-on-surface mb-4">
                About {firstName}
              </h2>
              {profile.bio ? (
                <p className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-on-surface-variant/50 italic">
                  This user hasn't added a bio yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Lifestyle Quiz Results */}
          {lifestyleResponses && (
            <Card variant="bordered">
              <CardContent className="py-6">
                <div className="flex gap-1 mb-6 bg-surface-container-low rounded-xl p-1">
                  {lifestyleTabs.map((tab) => (
                    <div
                      key={tab.key}
                      className="flex-1 text-center py-2.5 px-2 text-xs font-semibold tracking-wider rounded-lg bg-surface-container-lowest text-on-surface ghost-border cursor-default"
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {lifestyleTabs.map((tab) => {
                    const val = lifestyleResponses[tab.key]
                    return (
                      <div key={tab.key} className="text-center">
                        <p className="text-sm font-medium text-on-surface">
                          {val ? formatLifestyleValue(val) : 'Not set'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Reviews */}
          {reviews && reviews.length > 0 && (
            <Card variant="bordered">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-display font-semibold text-on-surface">
                    Recent Reviews
                  </h2>
                  <Link
                    href={`/reviews?user=${userId}`}
                    className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-6">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container flex-shrink-0 flex items-center justify-center">
                        {review.reviewer?.profile_photo ? (
                          <img
                            src={review.reviewer.profile_photo}
                            alt={review.reviewer.name || 'Reviewer'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-on-surface-variant" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-on-surface text-sm">
                            {review.reviewer?.name || 'Anonymous'}
                          </p>
                          <span className="text-xs text-on-surface-variant">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        <div className="flex mt-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= Math.round(parseFloat(review.overall_rating || 0))
                                  ? 'text-tertiary-fixed fill-tertiary-fixed'
                                  : 'text-surface-container-high'
                              }`}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-on-surface-variant italic leading-relaxed">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User's Listings */}
          {listings && listings.length > 0 && (
            <Card variant="bordered">
              <CardContent className="py-6">
                <h2 className="text-lg font-display font-semibold text-on-surface mb-4">
                  Active Listings
                </h2>
                <div className="space-y-3">
                  {listings.map((listing: any) => (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                    >
                      <div className="w-16 h-16 bg-surface-container rounded-xl overflow-hidden flex-shrink-0">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img
                            src={listing.photos[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-6 w-6 text-on-surface-variant" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-on-surface truncate">
                          {listing.title}
                        </h4>
                        <p className="text-sm text-on-surface-variant">
                          {listing.city}, {listing.province}
                        </p>
                        <p className="text-sm font-semibold text-secondary">
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

/* ── Sub-components ──────────────────────────────────────── */

function VerificationRow({
  icon,
  label,
  verified,
  pending,
}: {
  icon: React.ReactNode
  label: string
  verified: boolean
  pending?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          verified ? 'bg-secondary-container text-secondary' : 'bg-surface-container text-on-surface-variant'
        }`}
      >
        {icon}
      </div>
      <span className="text-sm text-on-surface flex-1">{label}</span>
      {verified ? (
        <ShieldCheck className="h-4 w-4 text-secondary" />
      ) : pending ? (
        <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
          Pending
        </span>
      ) : (
        <Clock className="h-4 w-4 text-on-surface-variant/50" />
      )}
    </div>
  )
}
