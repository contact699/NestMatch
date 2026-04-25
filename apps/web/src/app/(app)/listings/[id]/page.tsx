import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { formatPrice, formatDate, AMENITIES, HELP_TASKS } from '@/lib/utils'
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
  Users,
  Check,
  Leaf,
  Eye,
  Edit,
  Bath,
  GraduationCap,
  HandHelping,
  PawPrint,
  Car,
  ShieldCheck,
} from 'lucide-react'
import { BATHROOM_TYPES, BATHROOM_SIZES } from '@/lib/utils'
import { ListingActions } from './listing-actions'
import { ListingPhotoGallery } from '@/components/listings/listing-photo-gallery'
import { CompatibilityBadge } from '@/components/ui/compatibility-badge'
import { ListingJsonLd } from '@/components/json-ld'
import { computeMatchedLifestyleFactors } from '@/lib/lifestyle-match'

interface ListingPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
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
  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single() as { data: any; error: any }

  if (error || !listing) {
    logger.error(`Listing fetch error for ID: ${id}`, error instanceof Error ? error : new Error(String(error)))
    notFound()
  }

  // Fetch host profile separately
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, name, bio, profile_photo, verification_level, languages, created_at')
    .eq('user_id', listing.user_id)
    .single() as { data: any }


  // Check if this is the owner's listing
  const isOwner = user?.id === listing.user_id

  // Check if listing is saved by current user
  let isSaved = false
  if (user) {
    const { data: savedListing } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single()
    isSaved = !!savedListing
  }

  // Increment view count via SECURITY DEFINER RPC. A direct UPDATE here is
  // silently blocked by the listings UPDATE policy (`auth.uid() = user_id`),
  // which is why the counter was stuck at 0 for everyone but the owner.
  let displayedViews = listing.views_count || 0
  if (!isOwner) {
    // Cast: this RPC was added in migration 023 — the generated Database type
    // doesn't know about it yet. Regenerate types after applying the migration.
    await (supabase.rpc as any)('increment_listing_views', { p_listing_id: id })
    displayedViews += 1
  }

  // Pull both lifestyle_responses rows so the compatibility card can show
  // the actual matched factors instead of hardcoded copy. Only relevant when
  // there's a logged-in viewer who isn't the host.
  //
  // We track whether each side has a quiz row separately from whether any
  // factors matched, so the empty state can correctly distinguish "no quiz
  // yet" from "both took the quiz but happen to share nothing".
  let matchedFactors: { key: string; label: string }[] = []
  let viewerHasQuiz = false
  let hostHasQuiz = false
  if (user && !isOwner) {
    const lifestyleCols =
      'sleep_schedule, noise_tolerance, cleanliness_level, smoking, pets_preference, communication_style, temperature_preference, guest_frequency, cooking_habits'
    const [myRes, theirRes] = await Promise.all([
      supabase
        .from('lifestyle_responses')
        .select(lifestyleCols)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('lifestyle_responses')
        .select(lifestyleCols)
        .eq('user_id', listing.user_id)
        .maybeSingle(),
    ])
    viewerHasQuiz = myRes.data != null
    hostHasQuiz = theirRes.data != null
    matchedFactors = computeMatchedLifestyleFactors(
      myRes.data as any,
      theirRes.data as any
    )
  }

  const typeLabels: Record<string, string> = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  return (
    <AnimatedPage>
      <ListingJsonLd
        id={id}
        title={listing.title}
        description={listing.description}
        price={listing.price}
        city={listing.city}
        province={listing.province}
        photos={listing.photos}
        type={listing.type}
        available_date={listing.available_date}
        amenities={listing.amenities}
        hostName={profile?.name}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6" data-animate>
          <Link
            href="/search"
            className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to search
          </Link>
        </div>

        {/* Photo Gallery — click any image to open full-screen lightbox */}
        <div className="mb-8" data-animate="scale">
          <ListingPhotoGallery
            photos={listing.photos || []}
            title={listing.title}
            mainPhotoBadges={
              <>
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
                  <Badge variant="default" className="flex items-center gap-1 bg-primary/10 text-primary">
                    <GraduationCap className="h-3 w-3" />
                    Ideal for Students
                  </Badge>
                )}
                {listing.pets_allowed && (
                  <Badge variant="default" className="flex items-center gap-1 bg-secondary-container text-secondary">
                    <PawPrint className="h-3 w-3" />
                    Pets Allowed
                  </Badge>
                )}
                {listing.parking_included && (
                  <Badge variant="default" className="flex items-center gap-1 bg-secondary-container text-secondary">
                    <Car className="h-3 w-3" />
                    Parking Included
                  </Badge>
                )}
                {!listing.is_active && (
                  <Badge variant="warning">Inactive</Badge>
                )}
              </>
            }
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and basic info */}
            <div data-animate className="delay-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-display font-bold text-on-surface">{listing.title}</h1>
                  <div className="flex items-center gap-2 text-on-surface-variant mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {listing.city}, {listing.province}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-display font-bold text-primary">
                    {formatPrice(listing.price)}
                    <span className="text-base font-normal text-on-surface-variant">/mo</span>
                  </p>
                  {listing.utilities_included && (
                    <p className="text-sm text-secondary">Utilities included</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm transition-all hover:bg-surface-container">
                  <Home className="h-4 w-4" />
                  {typeLabels[listing.type]}
                </span>
                {listing.bathroom_type && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-secondary rounded-full text-sm transition-all hover:bg-secondary-container/80">
                    <Bath className="h-4 w-4" />
                    {BATHROOM_TYPES.find(b => b.value === listing.bathroom_type)?.label || listing.bathroom_type}
                    {listing.bathroom_size && (
                      <span className="text-secondary/70">
                        ({BATHROOM_SIZES.find(s => s.value === listing.bathroom_size)?.label})
                      </span>
                    )}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm transition-all hover:bg-surface-container">
                  <Calendar className="h-4 w-4" />
                  Available {formatDate(listing.available_date)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm transition-all hover:bg-surface-container">
                  <Clock className="h-4 w-4" />
                  Min {listing.minimum_stay || 1} {listing.minimum_stay === 1 ? 'month' : 'months'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm transition-all hover:bg-surface-container">
                  <Eye className="h-4 w-4" />
                  {displayedViews} {displayedViews === 1 ? 'view' : 'views'}
                </span>
              </div>
            </div>

            {/* Compatibility Match Card */}
            {user && !isOwner && (
              <Card variant="feature" data-animate className="delay-150 overflow-hidden">
                <CardContent className="py-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <CompatibilityBadge
                        userId={listing.user_id}
                        currentUserId={user.id}
                        size="lg"
                        showLabel={true}
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display font-semibold text-on-surface text-lg">
                        {matchedFactors.length > 0
                          ? `You and ${profile?.name || 'this host'} match on:`
                          : 'Lifestyle Compatibility'}
                      </h2>
                      {matchedFactors.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {matchedFactors.map((f) => (
                            <span
                              key={f.key}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-secondary text-sm font-medium"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {f.label}
                            </span>
                          ))}
                        </div>
                      ) : !viewerHasQuiz ? (
                        <p className="text-sm text-on-surface-variant mt-1">
                          Take the lifestyle quiz on your profile to see specific factors you and {profile?.name || 'this host'} share.
                        </p>
                      ) : !hostHasQuiz ? (
                        <p className="text-sm text-on-surface-variant mt-1">
                          {profile?.name || 'This host'} hasn&apos;t completed the lifestyle quiz yet, so we can&apos;t show specific shared preferences.
                        </p>
                      ) : (
                        <p className="text-sm text-on-surface-variant mt-1">
                          You and {profile?.name || 'this host'} have both completed the lifestyle quiz but don&apos;t share specific preferences yet — message them to learn more.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {listing.description && (
              <Card variant="bordered" data-animate className="delay-200">
                <CardContent className="py-4">
                  <h2 className="font-display font-semibold text-on-surface mb-2">About this place</h2>
                  <p className="text-on-surface-variant whitespace-pre-wrap">{listing.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Meet Your Host — entire card links to the host's profile so
                visitors can read their full bio, lifestyle answers, etc. */}
            <Link href={`/profile/${listing.user_id}`} className="block group">
              <Card variant="bordered" data-animate className="delay-250 transition-all group-hover:border-secondary/40 group-hover:shadow-md">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-on-surface text-lg">
                      Meet Your Host, {profile?.name || 'Anonymous'}
                    </h2>
                    <span className="text-sm text-secondary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View profile →
                    </span>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-secondary-container rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                      {profile?.profile_photo ? (
                        <img
                          src={profile.profile_photo}
                          alt={profile.name || 'Host'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-8 w-8 text-secondary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                          {profile?.name || 'Anonymous'}
                        </h3>
                        <VerificationBadge level={profile?.verification_level || 'basic'} />
                      </div>
                      {profile?.created_at && (
                        <p className="text-xs text-on-surface-variant mb-2">
                          Member since {formatDate(profile.created_at)}
                        </p>
                      )}
                      {profile?.bio && (
                        <p className="text-sm text-on-surface-variant line-clamp-3">
                          {profile.bio}
                        </p>
                      )}
                      {profile?.languages && profile.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {profile.languages.map((lang: string) => (
                            <span key={lang} className="text-xs px-2 py-0.5 bg-surface-container-low text-on-surface-variant rounded-full">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Apartment Features */}
            {listing.amenities && listing.amenities.length > 0 && (
              <Card variant="bordered" data-animate className="delay-300">
                <CardContent className="py-4">
                  <h2 className="font-display font-semibold text-on-surface mb-3">Apartment Features</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity: string, index: number) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 text-on-surface-variant transition-all duration-300 hover:text-on-surface"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Check className="h-4 w-4 text-secondary flex-shrink-0" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Exchange — what kind of assistance the host needs */}
            {listing.help_needed && (
              <Card variant="bordered" data-animate className="delay-350">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HandHelping className="h-5 w-5 text-secondary" />
                    <h2 className="font-display font-semibold text-on-surface">Help Exchange</h2>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-4">
                    The host is offering reduced rent in exchange for help with the
                    tasks below. If this is a fit, mention it when you message them.
                  </p>

                  {listing.help_tasks && listing.help_tasks.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {listing.help_tasks.map((task: string) => {
                        const meta = HELP_TASKS.find((t) => t.value === task)
                        return (
                          <div
                            key={task}
                            className="flex items-center gap-2 text-on-surface-variant transition-all duration-300 hover:text-on-surface"
                          >
                            <Check className="h-4 w-4 text-secondary flex-shrink-0" />
                            <span className="text-sm">{meta?.label ?? task}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {listing.help_details && (
                    <div className="p-3 bg-surface-container-low rounded-xl">
                      <p className="text-xs font-medium text-on-surface-variant mb-1">
                        Details from the host
                      </p>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">
                        {listing.help_details}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Roommate preferences */}
            <Card variant="bordered" data-animate className="delay-400">
              <CardContent className="py-4">
                <h2 className="font-display font-semibold text-on-surface mb-3">Roommate Preferences</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-surface-container-low rounded-xl transition-all duration-300 hover:bg-surface-container">
                    <span className="text-on-surface-variant">Gender preference:</span>
                    <p className="text-on-surface capitalize font-medium">
                      {listing.roommate_gender_preference || 'Any'}
                    </p>
                  </div>
                  {(listing.roommate_age_min || listing.roommate_age_max) && (
                    <div className="p-3 bg-surface-container-low rounded-xl transition-all duration-300 hover:bg-surface-container">
                      <span className="text-on-surface-variant">Age range:</span>
                      <p className="text-on-surface font-medium">
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
            {/* Action card */}
            <Card variant="feature" data-animate className="delay-200 sticky top-24">
              <CardContent className="py-6">
                <ListingActions
                  listingId={id}
                  hostUserId={listing.user_id}
                  isOwner={isOwner}
                  isSaved={isSaved}
                  isLoggedIn={!!user}
                />

                {/* Trust badges — only rendered for actual verification states */}
                {profile?.verification_level && profile.verification_level !== 'basic' && (
                  <div className="mt-6 pt-4 ghost-border-t">
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Trust & Safety</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <ShieldCheck className="h-4 w-4 text-secondary" />
                        <span>Identity verified</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner actions */}
            {isOwner && (
              <Card variant="bordered" data-animate className="delay-300">
                <CardContent className="py-4">
                  <h3 className="font-display font-semibold text-on-surface mb-3">Manage Listing</h3>
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
                <h3 className="font-display font-semibold text-on-surface mb-3">Quick Info</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Listed</dt>
                    <dd className="text-on-surface">{formatDate(listing.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Last updated</dt>
                    <dd className="text-on-surface">{formatDate(listing.updated_at)}</dd>
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
