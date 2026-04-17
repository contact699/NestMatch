/**
 * JSON-LD structured data components for SEO.
 *
 * ListingJsonLd – Renders an Offer + Place schema for a listing detail page.
 * OrganizationJsonLd – Renders an Organization schema (used on the landing page).
 */

interface ListingJsonLdProps {
  id: string
  title: string
  description?: string | null
  price: number
  city: string
  province: string
  photos?: string[] | null
  type: string
  available_date?: string | null
  amenities?: string[] | null
  hostName?: string | null
}

export function ListingJsonLd({
  id,
  title,
  description,
  price,
  city,
  province,
  photos,
  type,
  available_date,
  amenities,
  hostName,
}: ListingJsonLdProps) {
  const typeLabels: Record<string, string> = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: title,
    ...(description ? { description } : {}),
    price: String(price),
    priceCurrency: 'CAD',
    availability: 'https://schema.org/InStock',
    url: `https://www.nestmatch.app/listings/${id}`,
    ...(photos && photos.length > 0 ? { image: photos } : {}),
    ...(available_date ? { availabilityStarts: available_date } : {}),
    ...(amenities && amenities.length > 0
      ? { additionalProperty: amenities.map((a) => ({ '@type': 'PropertyValue', name: a })) }
      : {}),
    itemOffered: {
      '@type': 'Accommodation',
      name: typeLabels[type] || type,
      description: `${typeLabels[type] || type} for rent in ${city}, ${province}`,
    },
    areaServed: {
      '@type': 'Place',
      name: `${city}, ${province}`,
    },
    ...(hostName
      ? {
          seller: {
            '@type': 'Person',
            name: hostName,
          },
        }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NestMatch',
    url: 'https://www.nestmatch.app',
    description: 'Find your perfect roommate in Canada',
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
