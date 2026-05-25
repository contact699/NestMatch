import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { formatPrice } from '@/lib/utils'
import { flagshipSlugForCity } from '@/lib/cities'

interface MoreInCityProps {
  city: string
  excludeListingId: string
}

export async function MoreInCity({ city, excludeListingId }: MoreInCityProps) {
  const supabase = createServiceClient()
  const { data: siblings, error } = await supabase
    .from('listings')
    .select('id, title, price, photos, city')
    .eq('is_active', true)
    .ilike('city', city)
    .neq('id', excludeListingId)
    .order('updated_at', { ascending: false })
    .limit(6)

  if (error) {
    // Don't crash the listing page if siblings fetch fails — just hide the
    // section. The main listing render is the critical path.
    return null
  }

  if (!siblings || siblings.length === 0) return null

  const flagshipSlug = flagshipSlugForCity(city)

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-semibold text-on-surface">
          More rooms in {city}
        </h2>
        {flagshipSlug && (
          <Link
            href={`/c/${flagshipSlug}`}
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {siblings.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            className="block rounded-2xl overflow-hidden border border-outline-variant transition-shadow hover:shadow-lg"
          >
            {l.photos?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.photos[0]}
                alt={`Room for rent in ${l.city ?? city} — ${formatPrice(l.price ?? 0)}/mo`}
                className="w-full h-40 object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="p-4">
              <p className="font-semibold text-on-surface">
                {formatPrice(l.price ?? 0)}/mo
              </p>
              <p className="text-sm text-on-surface-variant line-clamp-1">
                {l.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
