import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PlusCircle,
  Home,
  MapPin,
  Calendar,
  Edit,
  Leaf,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react'

export const metadata = {
  title: 'My Listings',
  description: 'Manage your room listings',
}

export default async function MyListingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/my-listings')
  }

  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: any[]; error: any }

  const typeLabels: Record<string, string> = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  // Compute dynamic stats
  const totalListings = listings?.length || 0
  const activeListings = listings?.filter((l) => l.is_active).length || 0
  const totalViews = listings?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">My Listings</h1>
          <p className="text-on-surface-variant mt-1">
            Manage your properties and roommate postings. Track performance metrics and update listing visibility in real-time.
          </p>
        </div>
      </div>

      {/* Stats row */}
      {listings && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Total Exposure</p>
              <p className="text-3xl font-display font-bold text-on-surface">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Unique profile views across all active listings this month.
              </p>
            </CardContent>
          </Card>
          <Card variant="bordered" className="bg-secondary-container">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Active Status</p>
              <p className="text-3xl font-display font-bold text-secondary">{String(activeListings).padStart(2, '0')}</p>
              <p className="text-xs text-secondary/70 mt-1">
                Published Units
              </p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Pending Reviews</p>
              <p className="text-3xl font-display font-bold text-on-surface">{String(totalListings - activeListings).padStart(2, '0')}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                New inquiries to answer
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs + CTA */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center bg-surface-container-low rounded-xl p-1">
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-surface-container-lowest text-on-surface shadow-sm">
            All Listings
          </button>
          <button className="px-4 py-2 text-sm font-medium rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">
            Drafts {listings ? listings.filter(l => !l.is_active).length : 0}
          </button>
          <button className="px-4 py-2 text-sm font-medium rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">
            Archived
          </button>
        </div>
        <Link href="/listings/new">
          <Button variant="glow">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Listing
          </Button>
        </Link>
      </div>

      {/* Listings */}
      {!listings || listings.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-on-surface-variant/30 mx-auto mb-4" />
            <h3 className="text-lg font-display font-medium text-on-surface mb-2">
              No listings yet
            </h3>
            <p className="text-on-surface-variant mb-4">
              Create your first listing to start finding compatible roommates.
            </p>
            <Link href="/listings/new">
              <Button variant="glow">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card key={listing.id} variant="bordered" className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div className="sm:w-48 sm:h-40 bg-surface-container flex-shrink-0 relative">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[144px]">
                      <Home className="h-10 w-10 text-on-surface-variant/20" />
                    </div>
                  )}
                  {listing.is_active ? (
                    <div className="absolute top-2 left-2">
                      <Badge variant="success">Active</Badge>
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default">Draft</Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${listing.id}`}>
                        <h3 className="font-display font-semibold text-on-surface hover:text-secondary transition-colors text-lg">
                          {listing.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 text-sm text-on-surface-variant mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {listing.city}, {listing.province}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-display font-bold text-primary">
                        {formatPrice(listing.price)}
                        <span className="text-sm font-normal text-on-surface-variant">/mo</span>
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-3 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {listing.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(listing.available_date)}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mt-2">
                    {listing.newcomer_friendly && (
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary-container text-secondary px-2 py-0.5 rounded-full">
                        <Leaf className="h-3 w-3" />
                        Newcomer Friendly
                      </span>
                    )}
                    {listing.no_credit_history_ok && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        No Credit OK
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 ghost-border-t">
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/listings/${listing.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {listing.is_active && (
                      <Link href={`/listings/${listing.id}`} className="ml-auto">
                        <Button variant="outline" size="sm">
                          Promote Listing
                          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
