import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedPage } from '@/components/ui/animated-page'
import {
  User,
  MapPin,
  Calendar,
  Phone,
  Shield,
  ShieldCheck,
  CheckCircle,
  Edit,
  Home,
  ChevronRight,
  Sparkles,
  Brush,
  Volume2,
  Sunrise,
  Zap,
  PawPrint,
  Cigarette,
  Users,
  UtensilsCrossed,
  Briefcase,
  DollarSign,
} from 'lucide-react'
import { HOUSEHOLD_SITUATIONS } from '@/lib/utils'

export const metadata = {
  title: 'Profile',
}

// Helper to derive a lifestyle label from raw quiz values
function formatLifestyleValue(key: string, value: string | null | undefined): string {
  if (!value) return 'Not set'
  const labels: Record<string, Record<string, string>> = {
    cleanliness_level: {
      spotless: 'Tidy Minimalist',
      tidy: 'Organized',
      relaxed: 'Casual',
      messy: 'Flexible',
    },
    communication_style: {
      minimal: 'Selective Introvert',
      occasional: 'Balanced',
      frequent: 'Social Connector',
      very_social: 'Open Extrovert',
    },
    noise_tolerance: {
      quiet: 'Deep Focus Only',
      moderate: 'Moderate',
      loud_ok: 'Lively Atmosphere',
    },
    sleep_schedule: {
      early_bird: 'Morning Bird',
      night_owl: 'Night Owl',
      flexible: 'Flexible Schedule',
    },
  }
  return labels[key]?.[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Progress bar width based on level
function getProgressWidth(key: string, value: string | null | undefined): number {
  if (!value) return 0
  const scales: Record<string, Record<string, number>> = {
    cleanliness_level: { spotless: 100, tidy: 75, relaxed: 50, messy: 25 },
    communication_style: { minimal: 25, occasional: 50, frequent: 75, very_social: 100 },
    noise_tolerance: { quiet: 33, moderate: 66, loud_ok: 100 },
    sleep_schedule: { early_bird: 33, night_owl: 66, flexible: 100 },
  }
  return scales[key]?.[value] || 50
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()) as { data: any }

  const { data: lifestyleResponses } = (await supabase
    .from('lifestyle_responses')
    .select('*')
    .eq('user_id', user.id)
    .single()) as { data: any }

  // Fetch reviews received
  const { data: reviews } = (await supabase
    .from('reviews')
    .select('overall_rating')
    .eq('reviewee_id', user.id)
    .eq('is_visible', true)) as { data: any[] }

  const reviewCount = reviews?.length || 0

  // Fetch user's listings count
  const { data: listings } = (await supabase
    .from('listings')
    .select('id, title, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)) as { data: any[] | null }

  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isFullyVerified = profile?.verification_level === 'trusted'

  return (
    <AnimatedPage>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="grid lg:grid-cols-3 gap-8" data-animate>
          {/* Left: Profile Info */}
          <div className="lg:col-span-2">
            <Card variant="bordered">
              <CardContent className="py-6">
                <div className="flex items-start gap-6">
                  {/* Photo */}
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
                      {profile?.profile_photo ? (
                        <img
                          src={profile.profile_photo}
                          alt={profile.name || 'Profile'}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-on-surface-variant" />
                      )}
                    </div>
                    <Link
                      href="/profile/edit"
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Name & details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-display font-bold text-on-surface">
                        {profile?.name || 'Add your name'}
                      </h1>
                      {isFullyVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-semibold tracking-wide uppercase">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Premium Member
                        </span>
                      )}
                    </div>
                    {profile?.occupation && (
                      <p className="text-on-surface-variant mt-1">{profile.occupation}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm text-on-surface-variant">
                      {(profile?.city || profile?.province) && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-secondary" />
                          {[profile.city, profile.province].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {profile?.move_in_date && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-secondary" />
                          Moving {new Date(profile.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Bio */}
                    {profile?.bio && (
                      <p className="mt-4 text-on-surface-variant leading-relaxed">
                        {profile.bio}
                      </p>
                    )}
                    {!profile?.bio && (
                      <p className="mt-4 text-on-surface-variant/50 italic">
                        Add a bio to tell potential roommates about yourself.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Verification Sidebar */}
          <div className="space-y-3" data-animate>
            <VerificationItem
              icon={<Phone className="h-5 w-5" />}
              label="PHONE"
              status={profile?.phone_verified ? 'Verified' : 'Not Verified'}
              verified={!!profile?.phone_verified}
            />
            <VerificationItem
              icon={<Shield className="h-5 w-5" />}
              label="IDENTITY"
              status={profile?.verification_level !== 'basic' ? 'Verified' : 'Not Verified'}
              verified={profile?.verification_level !== 'basic'}
            />
            <VerificationItem
              icon={<ShieldCheck className="h-5 w-5" />}
              label="CREDIT SCORE"
              status={profile?.verification_level === 'trusted' ? 'Verified' : 'Not Verified'}
              verified={profile?.verification_level === 'trusted'}
            />
            {profile?.verification_level === 'basic' && (
              <Link href="/verify">
                <Button variant="secondary" size="sm" className="w-full mt-2">
                  Verify Now
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lifestyle Compatibility */}
        <div className="mt-10" data-animate>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-on-surface">
                Lifestyle Compatibility
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Insights from your concierge matching quiz
              </p>
            </div>
            <Link
              href="/quiz"
              className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
            >
              Retake Quiz
            </Link>
          </div>

          {lifestyleResponses ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <LifestyleCard
                icon={<Brush className="h-6 w-6 text-secondary" />}
                label="Cleanliness"
                value={formatLifestyleValue('cleanliness_level', lifestyleResponses.cleanliness_level)}
                progress={getProgressWidth('cleanliness_level', lifestyleResponses.cleanliness_level)}
              />
              <LifestyleCard
                icon={<Zap className="h-6 w-6 text-secondary" />}
                label="Social Battery"
                value={formatLifestyleValue('communication_style', lifestyleResponses.communication_style)}
                progress={getProgressWidth('communication_style', lifestyleResponses.communication_style)}
              />
              <LifestyleCard
                icon={<Volume2 className="h-6 w-6 text-secondary" />}
                label="Noise Tolerance"
                value={formatLifestyleValue('noise_tolerance', lifestyleResponses.noise_tolerance)}
                progress={getProgressWidth('noise_tolerance', lifestyleResponses.noise_tolerance)}
              />
              <LifestyleCard
                icon={<Sunrise className="h-6 w-6 text-secondary" />}
                label="Daily Routine"
                value={formatLifestyleValue('sleep_schedule', lifestyleResponses.sleep_schedule)}
                progress={getProgressWidth('sleep_schedule', lifestyleResponses.sleep_schedule)}
              />
            </div>
          ) : (
            <Card variant="bordered">
              <CardContent className="py-8 text-center">
                <p className="text-on-surface-variant mb-4">
                  Complete the lifestyle quiz to help us find compatible roommates for you.
                </p>
                <Link href="/quiz">
                  <Button variant="primary">Take the Quiz</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Living Preferences + Employment & Trust */}
        <div className="grid lg:grid-cols-2 gap-6 mt-10" data-animate>
          {/* Living Preferences */}
          <Card variant="bordered">
            <CardContent className="py-6">
              <h3 className="text-lg font-display font-semibold text-on-surface flex items-center gap-2 mb-5">
                <Sparkles className="h-5 w-5 text-on-surface-variant" />
                Living Preferences
              </h3>
              <div className="space-y-0">
                <PreferenceRow
                  icon={<PawPrint className="h-4 w-4 text-on-surface-variant" />}
                  label="Pet Friendly"
                  value={
                    lifestyleResponses?.pets_preference
                      ? formatLifestyleValue('pets_preference', lifestyleResponses.pets_preference)
                      : 'Not set'
                  }
                  highlight={lifestyleResponses?.pets_preference && lifestyleResponses.pets_preference !== 'no_pets'}
                />
                <PreferenceRow
                  icon={<Cigarette className="h-4 w-4 text-on-surface-variant" />}
                  label="Smoking"
                  value={
                    lifestyleResponses?.smoking
                      ? formatLifestyleValue('smoking', lifestyleResponses.smoking)
                      : 'Not set'
                  }
                  isNegative={lifestyleResponses?.smoking === 'never'}
                />
                <PreferenceRow
                  icon={<Users className="h-4 w-4 text-on-surface-variant" />}
                  label="Guests"
                  value={
                    lifestyleResponses?.guest_frequency
                      ? formatLifestyleValue('guest_frequency', lifestyleResponses.guest_frequency)
                      : 'Not set'
                  }
                />
                <PreferenceRow
                  icon={<UtensilsCrossed className="h-4 w-4 text-on-surface-variant" />}
                  label="Cooking Style"
                  value={
                    lifestyleResponses?.remote_work_frequency
                      ? formatLifestyleValue('remote_work_frequency', lifestyleResponses.remote_work_frequency)
                      : 'Not set'
                  }
                  isLast
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment & Trust */}
          <Card variant="bordered">
            <CardContent className="py-6">
              <h3 className="text-lg font-display font-semibold text-on-surface flex items-center gap-2 mb-5">
                <Briefcase className="h-5 w-5 text-on-surface-variant" />
                Employment & Trust
              </h3>
              <div className="space-y-4">
                {profile?.occupation && (
                  <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl">
                    <Briefcase className="h-5 w-5 text-secondary mt-0.5" />
                    <div>
                      <p className="font-medium text-on-surface">Current Employer</p>
                      <p className="text-sm text-on-surface-variant">{profile.occupation}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl">
                  <DollarSign className="h-5 w-5 text-secondary mt-0.5" />
                  <div>
                    <p className="font-medium text-on-surface">Budget Range</p>
                    <p className="text-sm text-on-surface-variant">
                      {profile?.budget_min && profile?.budget_max
                        ? `$${profile.budget_min.toLocaleString()} - $${profile.budget_max.toLocaleString()} / month`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Listings */}
        {listings && listings.length > 0 && (
          <div className="mt-10" data-animate>
            <Card variant="bordered">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display font-semibold text-on-surface flex items-center gap-2">
                    <Home className="h-5 w-5 text-on-surface-variant" />
                    Your Listings
                  </h3>
                  <Link href="/my-listings">
                    <Button size="sm" variant="ghost">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors"
                    >
                      <span className="font-medium text-on-surface truncate">
                        {listing.title}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          listing.is_active
                            ? 'bg-secondary-container text-secondary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {listing.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </Link>
                  ))}
                  {(listingsCount || 0) > 3 && (
                    <p className="text-sm text-on-surface-variant text-center pt-2">
                      +{(listingsCount || 0) - 3} more listings
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function VerificationItem({
  icon,
  label,
  status,
  verified,
}: {
  icon: React.ReactNode
  label: string
  status: string
  verified: boolean
}) {
  return (
    <Card variant="bordered">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              verified
                ? 'bg-secondary-container text-secondary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
              {label}
            </p>
            <p className={`text-sm font-medium ${verified ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {status}
            </p>
          </div>
          {verified && <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />}
        </div>
      </CardContent>
    </Card>
  )
}

function LifestyleCard({
  icon,
  label,
  value,
  progress,
}: {
  icon: React.ReactNode
  label: string
  value: string
  progress: number
}) {
  return (
    <Card variant="bordered">
      <CardContent className="py-5 px-4">
        <div className="mb-3">{icon}</div>
        <p className="text-xs text-on-surface-variant mb-1">{label}</p>
        <p className="font-semibold text-on-surface text-sm">{value}</p>
        <div className="mt-3 h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function PreferenceRow({
  icon,
  label,
  value,
  highlight,
  isNegative,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  isNegative?: boolean
  isLast?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-3.5 ${
        !isLast ? 'border-b border-surface-container' : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm text-on-surface">{label}</span>
      </div>
      <span
        className={`text-sm font-medium ${
          isNegative
            ? 'text-error'
            : highlight
              ? 'text-secondary'
              : 'text-on-surface-variant'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
