// Mirror of the flagship-cities used by the web app's /c/[city] pages.
// Keep this list in sync with apps/web/src/lib/cities.ts (the web copy carries
// extra SEO fields — slugs and display names must match here).

export interface FlagshipCity {
  /** URL/route slug — matches web /c/[slug] */
  slug: string
  /** Display name as shown in UI (with diacritics) */
  displayName: string
  /** Primary value as stored in listings.city — used by `ilike` filters */
  dbName: string
  /** Alternate spellings under which listings.city may be stored. e.g.
   *  Montreal listings are sometimes stored as 'Montreal' (no diacritic)
   *  because the listing-creation dropdown in apps/web/src/lib/utils.ts
   *  uses the unaccented form. Filter queries OR over dbName + aliases. */
  dbAliases?: readonly string[]
  /** Two-letter province code */
  province: string
}

export const FLAGSHIP_CITIES: FlagshipCity[] = [
  { slug: 'toronto', displayName: 'Toronto', dbName: 'Toronto', province: 'ON' },
  { slug: 'vancouver', displayName: 'Vancouver', dbName: 'Vancouver', province: 'BC' },
  { slug: 'montreal', displayName: 'Montréal', dbName: 'Montréal', dbAliases: ['Montreal'], province: 'QC' },
  { slug: 'ottawa', displayName: 'Ottawa', dbName: 'Ottawa', province: 'ON' },
  { slug: 'calgary', displayName: 'Calgary', dbName: 'Calgary', province: 'AB' },
]

export function getFlagshipBySlug(slug: string): FlagshipCity | null {
  const normalized = slug.toLowerCase()
  return FLAGSHIP_CITIES.find((c) => c.slug === normalized) ?? null
}

/**
 * Return the flagship slug whose dbName/dbAliases match the user's profile
 * city, or null if their city isn't a flagship. Also matches by slug for
 * permissive input.
 */
export function flagshipSlugForProfileCity(profileCity: string | null | undefined): string | null {
  if (!profileCity) return null
  const normalized = profileCity.trim().toLowerCase()
  return (
    FLAGSHIP_CITIES.find(
      (c) =>
        c.dbName.toLowerCase() === normalized ||
        c.slug === normalized ||
        (c.dbAliases ?? []).some((a) => a.toLowerCase() === normalized),
    )?.slug ?? null
  )
}

/**
 * Build a PostgREST `or` clause that matches a city's dbName plus any
 * known alternate spellings (`dbAliases`), all case-insensitively.
 *
 * Pass the return value to `.or(...)` on a Supabase query:
 *   supabase.from('listings').or(cityFilterOr(city))
 */
export function cityFilterOr(city: FlagshipCity): string {
  const names = [city.dbName, ...(city.dbAliases ?? [])]
  return names.map((n) => `city.ilike.${n}`).join(',')
}
