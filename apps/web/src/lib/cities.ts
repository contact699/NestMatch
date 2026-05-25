export interface CityFaq {
  question: string
  answer: string
}

export interface CityConfig {
  /** URL slug — `/c/${slug}`. ASCII only. */
  slug: string
  /** Display name shown to users, may include accents. */
  displayName: string
  /** Canonical form stored in `listings.city` rows (case-sensitive match used for ILIKE). */
  dbName: string
  /** 2-letter province code. */
  province: string
  /** 1-2 paragraph hero intro, plain text. */
  intro: string
  /** 4-6 FAQs surfaced on the page and in FAQPage JSON-LD. */
  faqs: CityFaq[]
}

export const FLAGSHIP_CITIES: CityConfig[] = [
  {
    slug: 'toronto',
    displayName: 'Toronto',
    dbName: 'Toronto',
    province: 'ON',
    intro:
      'Toronto is Canada\'s largest city, with a renters market spread across downtown high-rises, the Annex, Parkdale, Leslieville, and dozens of other neighborhoods. NestMatch helps you find a roommate in Toronto by matching lifestyle, not just budget. Browse current rooms, message verified hosts, and lock in a place that actually fits how you live.',
    faqs: [
      {
        question: 'What is the average rent for a room in Toronto?',
        answer:
          'As of 2026, a private room in a shared apartment in Toronto typically rents for $900–$1,500 per month, depending on the neighborhood, whether utilities are included, and the size of the room. Downtown and midtown command the highest prices.',
      },
      {
        question: 'Which Toronto neighborhoods are best for roommates?',
        answer:
          'The Annex, Kensington Market, Little Italy, Leslieville, and Junction are popular for shared-housing renters. They balance access to transit, walkability, and a reasonable supply of multi-bedroom apartments suitable for roommates.',
      },
      {
        question: 'Do I need a roommate agreement in Ontario?',
        answer:
          'A written roommate agreement isn\'t legally required in Ontario, but it\'s strongly recommended. The Residential Tenancies Act covers leases between tenants and landlords, but agreements between co-tenants are governed by what you write down (rent split, chore expectations, guests, notice to move out, etc.).',
      },
      {
        question: 'How do I verify a Toronto host on NestMatch?',
        answer:
          'NestMatch offers optional ID verification — hosts who complete it carry a verified badge on their profile and listing. Always also message back-and-forth before sending money, and visit the place in person when possible.',
      },
    ],
  },
  {
    slug: 'vancouver',
    displayName: 'Vancouver',
    dbName: 'Vancouver',
    province: 'BC',
    intro:
      'Vancouver\'s rental market is one of the tightest in Canada — and the most competitive for shared housing. NestMatch surfaces current rooms across the West End, Mount Pleasant, Kitsilano, East Vancouver, and beyond, with verified hosts and lifestyle-based matching so you don\'t waste time on misfits.',
    faqs: [
      {
        question: 'What does a room in Vancouver cost?',
        answer:
          'Private rooms in shared apartments in Vancouver typically rent for $1,000–$1,800/month. West End and downtown carry a premium; East Vancouver and Mount Pleasant are more affordable.',
      },
      {
        question: 'Best Vancouver neighborhoods for shared housing?',
        answer:
          'Mount Pleasant, Commercial Drive, Kitsilano, and the West End all have good roommate-friendly housing stock and transit access.',
      },
      {
        question: 'Are there tenant protections specific to BC?',
        answer:
          'Yes — the BC Residential Tenancy Branch covers rental agreements in the province. Co-tenancy arrangements between roommates aren\'t directly covered, so a written agreement between roommates is recommended.',
      },
      {
        question: 'What does newcomer-friendly mean on NestMatch?',
        answer:
          'A "newcomer friendly" listing on NestMatch is one where the host has explicitly opted into welcoming people new to Canada — typically waiving credit history requirements or being flexible with paperwork. Many Vancouver hosts mark this on their listings.',
      },
    ],
  },
  {
    slug: 'montreal',
    displayName: 'Montréal',
    dbName: 'Montréal',
    province: 'QC',
    intro:
      'Montréal\'s rental market is more accessible than Toronto or Vancouver, with vibrant roommate-friendly neighborhoods like the Plateau, Mile End, Verdun, and Rosemont. NestMatch helps English-speaking renters find a roommate in Montréal with lifestyle compatibility and verified hosts.',
    faqs: [
      {
        question: 'How much is a room in Montréal?',
        answer:
          'Private rooms in shared apartments typically rent for $600–$1,100/month — significantly less than Toronto or Vancouver. The Plateau and Mile End sit at the higher end of that range.',
      },
      {
        question: 'Is Montréal a good city for shared housing?',
        answer:
          'Yes — Montréal\'s housing stock has a high proportion of multi-bedroom apartments designed for roommate or family use, especially in the Plateau, Mile End, and Côte-des-Neiges areas.',
      },
      {
        question: 'What\'s the Régie du logement?',
        answer:
          'The Tribunal administratif du logement (formerly the Régie du logement) is Québec\'s housing tribunal — it handles disputes between tenants and landlords. As with other provinces, co-tenant disputes are not covered.',
      },
      {
        question: 'Are listings in Montréal in English or French?',
        answer:
          'Both. NestMatch supports both languages in user-generated content, though the platform itself is currently English-only. Many Montréal listings are written in English.',
      },
    ],
  },
  {
    slug: 'ottawa',
    displayName: 'Ottawa',
    dbName: 'Ottawa',
    province: 'ON',
    intro:
      'Ottawa is a city of government workers, university students, and young professionals — with a steady demand for shared housing in the Glebe, Centretown, Sandy Hill, and Westboro. NestMatch helps you find a roommate in Ottawa by matching lifestyle, schedule, and budget.',
    faqs: [
      {
        question: 'What does a room in Ottawa cost?',
        answer:
          'Private rooms in shared apartments in Ottawa typically rent for $700–$1,200/month. Sandy Hill (near uOttawa) and the Glebe carry a slight premium.',
      },
      {
        question: 'Where do students live in Ottawa?',
        answer:
          'Sandy Hill is the de-facto uOttawa student neighborhood. Carleton students tend toward Old Ottawa South and the Glebe. Both areas have a strong shared-housing supply.',
      },
      {
        question: 'Is Ottawa good for newcomers to Canada?',
        answer:
          'Ottawa has one of the highest rates of new-Canadian settlement per capita in the country, supported by federal services. Many landlords are familiar with newcomer documentation. Look for "newcomer friendly" listings on NestMatch.',
      },
      {
        question: 'Are roommate rights in Ottawa the same as Toronto?',
        answer:
          'Yes — Ottawa is in Ontario, so the same Residential Tenancies Act applies as in Toronto. Co-tenant agreements are still recommended.',
      },
    ],
  },
  {
    slug: 'calgary',
    displayName: 'Calgary',
    dbName: 'Calgary',
    province: 'AB',
    intro:
      'Calgary has a younger and more transient rental population than most Canadian cities, driven by energy-sector relocations and the universities. NestMatch makes it easier to find a roommate in Calgary — Beltline, Bridgeland, Mission, and Sunnyside all have strong shared-housing supply.',
    faqs: [
      {
        question: 'What\'s the rent for a room in Calgary?',
        answer:
          'Private rooms in shared apartments in Calgary typically rent for $700–$1,100/month. The Beltline carries the highest prices; Bridgeland and Bowness are more affordable.',
      },
      {
        question: 'Which Calgary neighborhoods are best for roommates?',
        answer:
          'Beltline, Mission, Bridgeland, and Sunnyside are the most popular shared-housing neighborhoods, all close to downtown and the C-Train.',
      },
      {
        question: 'Is Calgary tenant-friendly?',
        answer:
          'Alberta\'s Residential Tenancies Act is generally landlord-friendlier than Ontario or BC. Co-tenant agreements between roommates carry extra weight as a result.',
      },
      {
        question: 'How do I find a roommate near a C-Train station?',
        answer:
          'Use the search filters on NestMatch to narrow by neighborhood. Beltline, Bridgeland, and Sunnyside are all C-Train accessible.',
      },
    ],
  },
]

/**
 * Returns the city config for a given slug, or null. Slugs are case-insensitive.
 */
export function getCityBySlug(slug: string): CityConfig | null {
  const normalized = slug.toLowerCase()
  return FLAGSHIP_CITIES.find((c) => c.slug === normalized) ?? null
}

/**
 * Returns the flagship-city slug for a given listing's `listing.city` value, if any.
 * Used to upgrade breadcrumb links from `/search?city=...` to `/c/[slug]`.
 */
export function flagshipSlugForCity(cityFromListing: string | null | undefined): string | null {
  if (!cityFromListing) return null
  const normalized = cityFromListing.trim().toLowerCase()
  const hit = FLAGSHIP_CITIES.find(
    (c) => c.dbName.toLowerCase() === normalized || c.slug === normalized
  )
  return hit?.slug ?? null
}

export const FLAGSHIP_CITY_SLUGS = FLAGSHIP_CITIES.map((c) => c.slug)
