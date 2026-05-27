// Mirror of the flagship-cities used by the web app's /c/[city] pages.
// Keep this list in sync with apps/web/src/lib/cities.ts (the web copy carries
// extra SEO fields — slugs and names must match here).

export interface FlagshipCity {
  /** URL/route slug — matches web /c/[slug] */
  slug: string
  /** Display name as shown in UI (with diacritics) */
  displayName: string
  /** Value as stored in listings.city — used by `ilike` filters */
  dbName: string
  /** Two-letter province code */
  province: string
}

export const FLAGSHIP_CITIES: FlagshipCity[] = [
  { slug: 'toronto', displayName: 'Toronto', dbName: 'Toronto', province: 'ON' },
  { slug: 'vancouver', displayName: 'Vancouver', dbName: 'Vancouver', province: 'BC' },
  { slug: 'montreal', displayName: 'Montréal', dbName: 'Montréal', province: 'QC' },
  { slug: 'ottawa', displayName: 'Ottawa', dbName: 'Ottawa', province: 'ON' },
  { slug: 'calgary', displayName: 'Calgary', dbName: 'Calgary', province: 'AB' },
]

export function getFlagshipBySlug(slug: string): FlagshipCity | null {
  const normalized = slug.toLowerCase()
  return FLAGSHIP_CITIES.find((c) => c.slug === normalized) ?? null
}

/**
 * Return the flagship slug whose dbName matches the user's profile city,
 * or null if their city isn't a flagship.
 */
export function flagshipSlugForProfileCity(profileCity: string | null | undefined): string | null {
  if (!profileCity) return null
  const normalized = profileCity.trim().toLowerCase()
  return (
    FLAGSHIP_CITIES.find(
      (c) => c.dbName.toLowerCase() === normalized || c.slug === normalized,
    )?.slug ?? null
  )
}
