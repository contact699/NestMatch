// apps/web/src/app/c/[city]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import {
  ItemListJsonLd,
  BreadcrumbListJsonLd,
  FAQPageJsonLd,
} from '@/components/json-ld'
import { LandingNav, Footer } from '@/components/landing'
import { formatPrice } from '@/lib/utils'
import { FLAGSHIP_CITIES, getCityBySlug } from '@/lib/cities'

const THRESHOLD = 5

interface CityPageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params
  const config = getCityBySlug(city)
  if (!config) {
    return { title: 'City Not Found', robots: { index: false, follow: false } }
  }
  const canonical = `https://www.nestmatch.app/c/${config.slug}`
  const title = `Find a Roommate in ${config.displayName} | NestMatch`
  const description = `Browse current rooms for rent in ${config.displayName}, ${config.province}. Lifestyle-based matching, verified hosts, and a free way to find a roommate in ${config.displayName}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export async function generateStaticParams() {
  return FLAGSHIP_CITIES.map((c) => ({ city: c.slug }))
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params
  const config = getCityBySlug(city)

  if (!config) notFound()

  // Use service client (synchronous, no await) — bypasses cookies and RLS.
  // This keeps the page statically generatable (no dynamic cookie access).
  const supabase = createServiceClient()
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, price, photos, city, province, type, updated_at')
    .eq('is_active', true)
    .ilike('city', config!.dbName)
    .order('updated_at', { ascending: false })
    .limit(24)

  if (error) {
    logger.error(
      `city page fetch failed for ${city}`,
      error instanceof Error ? error : new Error(String(error))
    )
    notFound()
  }

  const activeCount = listings?.length ?? 0

  // Threshold: below 5 → not-found (so the page isn't indexed)
  if (activeCount < THRESHOLD) {
    notFound()
  }

  const baseUrl = 'https://www.nestmatch.app'
  const canonical = `${baseUrl}/c/${config!.slug}`
  const relatedCities = FLAGSHIP_CITIES.filter((c) => c.slug !== config!.slug)

  return (
    <div className="min-h-screen bg-background">
      <ItemListJsonLd
        name={`Rooms for rent in ${config!.displayName}`}
        items={(listings ?? []).map((l) => ({
          url: `${baseUrl}/listings/${l.id}`,
          name: l.title ?? '',
        }))}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: baseUrl },
          { name: 'Rooms', url: `${baseUrl}/search` },
          { name: config!.displayName, url: canonical },
        ]}
      />
      <FAQPageJsonLd items={config!.faqs} />

      <LandingNav />

      <main className="pt-24">
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-display font-bold text-on-surface mb-4">
            Find a Roommate in {config!.displayName}
          </h1>
          <p className="text-on-surface-variant text-lg whitespace-pre-wrap">
            {config!.intro}
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-display font-semibold text-on-surface mb-6">
            Current rooms in {config!.displayName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(listings ?? []).map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="block rounded-2xl overflow-hidden border border-outline-variant transition-shadow hover:shadow-lg"
              >
                {l.photos?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photos[0]}
                    alt={`Room for rent in ${config!.displayName} — ${formatPrice(l.price ?? 0)}/mo`}
                    className="w-full h-48 object-cover"
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

        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-display font-semibold text-on-surface mb-6">
            Frequently asked questions about renting a room in {config!.displayName}
          </h2>
          <div className="space-y-6">
            {config!.faqs.map((f) => (
              <div key={f.question}>
                <h3 className="text-lg font-semibold text-on-surface mb-2">
                  {f.question}
                </h3>
                <p className="text-on-surface-variant">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-display font-semibold text-on-surface mb-6">
            Other cities
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedCities.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface"
              >
                Rooms in {c.displayName}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
