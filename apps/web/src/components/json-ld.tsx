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
  petsAllowed?: boolean | null
  numberOfRooms?: number | null
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
  petsAllowed,
  numberOfRooms,
}: ListingJsonLdProps) {
  const typeLabels: Record<string, string> = {
    room: 'Private Room',
    shared_room: 'Shared Room',
    entire_place: 'Entire Place',
  }

  const accommodation = {
    '@type': 'Accommodation',
    name: title,
    ...(description ? { description } : {}),
    ...(photos && photos.length > 0 ? { image: photos } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: province,
      addressCountry: 'CA',
    },
    ...(numberOfRooms ? { numberOfRooms } : {}),
    ...(petsAllowed != null ? { petsAllowed } : {}),
    ...(amenities && amenities.length > 0
      ? {
          amenityFeature: amenities.map((a) => ({
            '@type': 'LocationFeatureSpecification',
            name: a,
            value: true,
          })),
        }
      : {}),
    accommodationCategory: typeLabels[type] || type,
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: title,
    price: String(price),
    priceCurrency: 'CAD',
    availability: 'https://schema.org/InStock',
    url: `https://www.nestmatch.app/listings/${id}`,
    ...(available_date ? { availabilityStarts: available_date } : {}),
    itemOffered: accommodation,
    areaServed: {
      '@type': 'Place',
      name: `${city}, ${province}`,
    },
    ...(hostName
      ? {
          seller: { '@type': 'Person', name: hostName },
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
