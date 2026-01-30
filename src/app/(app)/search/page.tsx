import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard, ListingCardSkeleton } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedPage } from '@/components/ui/animated-page'
import { MAJOR_CITIES, CANADIAN_PROVINCES } from '@/lib/utils'
import {
  Search,
  MapPin,
  DollarSign,
  Home,
  Leaf,
} from 'lucide-react'

export const metadata = {
  title: 'Search Rooms',
  description: 'Find your perfect room in Canada',
}

interface SearchPageProps {
  searchParams: Promise<{
    city?: string
    province?: string
    minPrice?: string
    maxPrice?: string
    type?: string
    newcomerFriendly?: string
    noCreditOk?: string
    q?: string
  }>
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Awaited<SearchPageProps['searchParams']>
}) {
  const supabase = await createClient()

  // Get current user for compatibility scoring
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Apply filters
  if (searchParams.city) {
    query = query.ilike('city', `%${searchParams.city}%`)
  }
  if (searchParams.province) {
    query = query.eq('province', searchParams.province)
  }
  if (searchParams.minPrice) {
    query = query.gte('price', parseInt(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    query = query.lte('price', parseInt(searchParams.maxPrice))
  }
  if (searchParams.type) {
    query = query.eq('type', searchParams.type)
  }
  if (searchParams.newcomerFriendly === 'true') {
    query = query.eq('newcomer_friendly', true)
  }
  if (searchParams.noCreditOk === 'true') {
    query = query.eq('no_credit_history_ok', true)
  }
  if (searchParams.q) {
    query = query.or(
      `title.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%`
    )
  }

  const { data: listings, error } = await query.limit(24) as { data: any[] | null; error: any }

  if (error) {
    console.error('Error fetching listings:', error)
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Error loading listings. Please try again.</p>
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12" data-animate>
        <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
        <p className="text-gray-500 mb-4">
          Try adjusting your filters or search in a different area.
        </p>
        <a href="/search">
          <Button variant="outline">Clear filters</Button>
        </a>
      </div>
    )
  }

  // Stagger delay classes
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing, index) => (
        <div key={listing.id} data-animate className={getDelayClass(index)}>
          <ListingCard
            listing={listing as any}
            currentUserId={user?.id}
          />
        </div>
      ))}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams

  return (
    <AnimatedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8" data-animate>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Find a room</h1>
          <p className="text-gray-600">
            Browse verified listings across Canada
          </p>
        </div>

        {/* Search & Filters */}
        <Card variant="glass" className="p-4 mb-8 animate-fade-in-down" data-animate>
          <form className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                placeholder="Search by keyword..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
              />
            </div>

            {/* Filter row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* City */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  name="city"
                  defaultValue={params.city}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
                >
                  <option value="">All Cities</option>
                  {MAJOR_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Province */}
              <select
                name="province"
                defaultValue={params.province}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
              >
                <option value="">All Provinces</option>
                {CANADIAN_PROVINCES.map((province) => (
                  <option key={province.value} value={province.value}>
                    {province.label}
                  </option>
                ))}
              </select>

              {/* Min Price */}
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={params.minPrice}
                  placeholder="Min $"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
                />
              </div>

              {/* Max Price */}
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={params.maxPrice}
                  placeholder="Max $"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
                />
              </div>

              {/* Room Type */}
              <select
                name="type"
                defaultValue={params.type}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
              >
                <option value="">All Types</option>
                <option value="room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="entire_place">Entire Place</option>
              </select>

              {/* Search Button */}
              <Button type="submit" variant="glow" className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 pt-2">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-all">
                <input
                  type="checkbox"
                  name="newcomerFriendly"
                  value="true"
                  defaultChecked={params.newcomerFriendly === 'true'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Leaf className="h-4 w-4 text-green-600" />
                Newcomer Friendly
              </label>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-all">
                <input
                  type="checkbox"
                  name="noCreditOk"
                  value="true"
                  defaultChecked={params.noCreditOk === 'true'}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                No Credit History OK
              </label>
            </div>
          </form>
        </Card>

        {/* Results */}
        <Suspense
          fallback={
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ListingCardSkeleton count={6} />
            </div>
          }
        >
          <SearchResults searchParams={params} />
        </Suspense>
      </div>
    </AnimatedPage>
  )
}
