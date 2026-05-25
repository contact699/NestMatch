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

interface ArticleJsonLdProps {
  url: string
  title: string
  description?: string | null
  image?: string | null
  datePublished: string
  dateModified?: string | null
  authorName?: string | null
}

export function ArticleJsonLd({
  url,
  title,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: title,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      '@type': 'Organization',
      name: authorName ?? 'NestMatch',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NestMatch',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.nestmatch.app/icon.png',
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export function BreadcrumbListJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export interface FaqItem {
  question: string
  answer: string
}

export function FAQPageJsonLd({ items }: { items: FaqItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export interface ItemListEntry {
  url: string
  name: string
}

export function ItemListJsonLd({
  name,
  items,
}: {
  name: string
  items: ItemListEntry[]
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
