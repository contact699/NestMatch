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
  Eye,
  Edit,
  ToggleLeft,
  ToggleRight,
  Leaf,
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-600">
            Manage your room listings
          </p>
        </div>
        <Link href="/listings/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Listings */}
      {!listings || listings.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No listings yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first listing to start finding compatible roommates.
            </p>
            <Link href="/listings/new">
              <Button>
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
                <div className="sm:w-48 sm:h-36 bg-gray-100 flex-shrink-0">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[144px]">
                      <Home className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/listings/${listing.id}`}>
                          <h3 className="font-semibold text-gray-900 hover:text-blue-600 truncate">
                            {listing.title}
                          </h3>
                        </Link>
                        {listing.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {listing.city}, {listing.province}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="h-3.5 w-3.5" />
                          {typeLabels[listing.type as keyof typeof typeLabels]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(listing.available_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {listing.views_count || 0} views
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {listing.newcomer_friendly && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <Leaf className="h-3 w-3" />
                            Newcomer Friendly
                          </span>
                        )}
                        {listing.no_credit_history_ok && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            No Credit OK
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-blue-600">
                        {formatPrice(listing.price)}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </p>
                      {listing.utilities_included && (
                        <p className="text-xs text-green-600">Utils included</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
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
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats summary */}
      {listings && listings.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Card variant="bordered">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
              <p className="text-sm text-gray-500">Total Listings</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {listings.filter((l) => l.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {listings.reduce((sum, l) => sum + (l.views_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Total Views</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
