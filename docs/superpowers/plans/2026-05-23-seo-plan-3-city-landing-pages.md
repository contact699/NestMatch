# SEO Plan 3 — City Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five flagship city landing pages (Toronto, Vancouver, Montreal, Ottawa, Calgary) at `/c/[city]` with strict 5-listing threshold enforcement, hand-written intros + FAQs, full JSON-LD coverage, internal linking from listing/footer, and integration into the chunked sitemap.

**Architecture:** A static config file owns the 5 cities (slug, display name, hero copy, FAQs). A single dynamic route at `/c/[city]/page.tsx` reads the config, fetches active listings for that city, enforces the 5-listing threshold (returns `notFound()` below threshold so the page isn't indexed), and renders the page with ItemList + BreadcrumbList + FAQPage JSON-LD. A new `sitemap-cities.ts` sub-sitemap registers as the 4th chunk in the existing `generateSitemaps`.

**Tech Stack:** Next.js 16 (App Router), Supabase, TypeScript. No new dependencies. Uses JSON-LD components from Plan 1's `apps/web/src/components/json-ld.tsx`.

**Spec reference:** `docs/superpowers/specs/2026-05-22-seo-design.md` — section "City Landing Pages — `/c/[city]`".

**Out of scope:** Audience-segmented variants (`/student-roommates/[city]`, `/newcomer-friendly-rooms/[city]`), neighborhood pages, French locale, paginated overflow for cities with > 24 listings.

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `apps/web/src/lib/cities.ts` | Static config: 5 cities with slug, display name, province, hero copy, FAQs |
| `apps/web/src/app/c/[city]/page.tsx` | Server component for `/c/[city]` — fetches listings, enforces threshold, emits JSON-LD, renders page |
| `apps/web/src/app/c/[city]/not-found.tsx` | Branded not-found used both for unknown city slugs and below-threshold cities |
| `apps/web/src/app/sitemap-cities.ts` | DB-aware sub-sitemap — only emits city URLs that pass the 5-listing threshold |
| `apps/web/src/components/listings/more-in-city.tsx` | "More rooms in [city]" section for the listing detail page |
| `apps/web/src/components/landing/footer-with-cities.tsx` | Expanded footer with top cities + top guides (replaces or augments existing Footer) |

### Files modified

| Path | Change |
|---|---|
| `apps/web/src/components/json-ld.tsx` | Add `ItemListJsonLd` component (referenced in plan but not built in Plan 1) |
| `apps/web/src/app/sitemap.ts` | Register a 4th sitemap chunk (`id === 3` → cities) |
| `apps/web/src/app/(app)/listings/[id]/page.tsx` | Update the breadcrumb's 3rd item from `/search?city=...` to `/c/[slug]` when the listing's city is a known flagship; render `<MoreInCity>` near the bottom of the page |
| `apps/web/src/components/landing/footer.tsx` (existing) | Either replace contents OR re-export the new footer-with-cities component — implementer's call after reading the current footer |
| `apps/web/e2e/seo.spec.ts` | Add tests for city pages |
| `apps/web/src/lib/supabase/middleware.ts` | Confirm `/c/` is NOT in `protectedRoutes` (it shouldn't be — public by design) |

---

## Decisions captured up-front

1. **5 flagship cities, hand-curated.** No programmatic generation from listing data. Cities = Toronto, Vancouver, Montreal, Ottawa, Calgary.
2. **Threshold: 5 active listings.** Below threshold → `notFound()` (which hits `not-found.tsx`) and the URL is omitted from the sitemap. This prevents Google from indexing thin-content pages.
3. **URL pattern: `/c/[slug]`** (not `/rooms/[slug]`). Decided in the spec.
4. **City names in config use ASCII slugs**: `montreal` not `montréal`. Display name in the config retains the accent: `Montréal`.
5. **City match is case-insensitive `ILIKE`** against `listings.city`. The config has a `dbName` field that's the canonical form stored in listings rows (e.g. `Toronto`, `Montréal`).
6. **Pagination: deferred.** Cities with > 24 listings just show the 24 most recent. Pagination becomes a follow-up only if inventory grows past that across multiple cities.
7. **Listings → city page linking** uses the existing `listing.city` field with a flagship-city lookup. If the listing's city isn't in the flagship config, the breadcrumb keeps the `/search?city=...` fallback. Don't refactor `listing.city` storage.

---

## Task Decomposition

12 tasks. Tasks 1–2 are config and JSON-LD. Tasks 3–5 build the route. Task 6 wires the sitemap. Tasks 7–8 wire internal linking. Tasks 9–10 tests + verification. Tasks 11–12 are footer + manual smoke.

---

### Task 1: Cities config

**Files:**
- Create: `apps/web/src/lib/cities.ts`

- [ ] **Step 1: Create the config**

```ts
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
```

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/lib/cities.ts
git commit -m "feat(seo): add flagship city config (5 cities with intros + FAQs)"
```

---

### Task 2: Add `ItemListJsonLd` component

**Files:**
- Modify: `apps/web/src/components/json-ld.tsx`

- [ ] **Step 1: Append the new component**

```tsx
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
```

- [ ] **Step 2: Typecheck + commit**

```powershell
cd apps/web; npm run typecheck
git add apps/web/src/components/json-ld.tsx
git commit -m "feat(seo): add ItemListJsonLd component for city listing pages"
```

---

### Task 3: City page route — server component

**Files:**
- Create: `apps/web/src/app/c/[city]/page.tsx`
- Create: `apps/web/src/app/c/[city]/not-found.tsx`

The page lives outside the `(app)/` group to keep its layout independent. It's a public marketing surface; it doesn't need the authed sidebar.

- [ ] **Step 1: Create the not-found page**

```tsx
// apps/web/src/app/c/[city]/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'City Not Found',
  robots: { index: false, follow: false },
}

export default function CityNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
        We don\'t have a page for this city yet
      </h1>
      <p className="text-on-surface-variant mb-6">
        Try one of our flagship cities below, or browse all available rooms.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/c/toronto"><Button variant="outline">Toronto</Button></Link>
        <Link href="/c/vancouver"><Button variant="outline">Vancouver</Button></Link>
        <Link href="/c/montreal"><Button variant="outline">Montréal</Button></Link>
        <Link href="/c/ottawa"><Button variant="outline">Ottawa</Button></Link>
        <Link href="/c/calgary"><Button variant="outline">Calgary</Button></Link>
      </div>
      <div className="mt-6">
        <Link href="/search"><Button>Browse all rooms</Button></Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the page**

```tsx
// apps/web/src/app/c/[city]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, price, photos, city, province, type, updated_at')
    .eq('is_active', true)
    .ilike('city', config.dbName)
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
  const canonical = `${baseUrl}/c/${config.slug}`
  const relatedCities = FLAGSHIP_CITIES.filter((c) => c.slug !== config.slug)

  return (
    <div className="min-h-screen bg-background">
      <ItemListJsonLd
        name={`Rooms for rent in ${config.displayName}`}
        items={(listings ?? []).map((l: any) => ({
          url: `${baseUrl}/listings/${l.id}`,
          name: l.title,
        }))}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: baseUrl },
          { name: 'Rooms', url: `${baseUrl}/search` },
          { name: config.displayName, url: canonical },
        ]}
      />
      <FAQPageJsonLd items={config.faqs} />

      <LandingNav />

      <main className="pt-24">
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-display font-bold text-on-surface mb-4">
            Find a Roommate in {config.displayName}
          </h1>
          <p className="text-on-surface-variant text-lg whitespace-pre-wrap">
            {config.intro}
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-display font-semibold text-on-surface mb-6">
            Current rooms in {config.displayName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(listings ?? []).map((l: any) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="block rounded-2xl overflow-hidden border border-outline-variant transition-shadow hover:shadow-lg"
              >
                {l.photos?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photos[0]}
                    alt={`Room for rent in ${config.displayName} — ${formatPrice(l.price)}/mo`}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="p-4">
                  <p className="font-semibold text-on-surface">
                    {formatPrice(l.price)}/mo
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
            Frequently asked questions about renting a room in {config.displayName}
          </h2>
          <div className="space-y-6">
            {config.faqs.map((f) => (
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
```

- [ ] **Step 3: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test in dev**

```powershell
cd apps/web; npm run dev
```

Then visit `http://localhost:3000/c/toronto`. Confirm:
- Renders if Toronto has ≥ 5 active listings, OR hits the not-found page if below threshold.
- If renders: hero copy, listings grid, FAQs, related cities, footer all present.
- View source: confirm `<script type="application/ld+json">` for ItemList, BreadcrumbList, and FAQPage.

If Toronto is below the threshold in your dev DB, try one of the other cities. If ALL flagship cities are below threshold, that's expected — the threshold logic is doing its job.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/c
git commit -m "feat(seo): add /c/[city] flagship city landing pages with threshold"
```

---

### Task 4: Middleware sanity check

**Files:**
- Modify (probably no-op): `apps/web/src/lib/supabase/middleware.ts`

- [ ] **Step 1: Read the current `protectedRoutes`**

After Plan 1 (commit `b026ac6`), `protectedRoutes` shouldn't contain `/c/` or `/c`. Confirm by reading the file.

- [ ] **Step 2: If `/c` accidentally got added:** remove it.

If `/c` is NOT in the array (expected): no commit needed. Move on.

If it IS in the array: remove the entry and commit:

```powershell
git add apps/web/src/lib/supabase/middleware.ts
git commit -m "fix(seo): ensure /c/[city] city pages are public"
```

This is mostly a defensive check.

---

### Task 5: Cities sub-sitemap

**Files:**
- Create: `apps/web/src/app/sitemap-cities.ts`
- Modify: `apps/web/src/app/sitemap.ts`

- [ ] **Step 1: Create the sub-sitemap**

```ts
// apps/web/src/app/sitemap-cities.ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { FLAGSHIP_CITIES } from '@/lib/cities'

const THRESHOLD = 5

export async function citiesSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  try {
    const supabase = await createClient()

    // For each flagship city, check listing count; only emit if >= threshold.
    const entries: MetadataRoute.Sitemap = []
    for (const city of FLAGSHIP_CITIES) {
      const { count, error } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .ilike('city', city.dbName)

      if (error) {
        logger.error(
          `sitemap-cities count failed for ${city.slug}`,
          error instanceof Error ? error : new Error(String(error))
        )
        continue
      }

      if ((count ?? 0) >= THRESHOLD) {
        entries.push({
          url: `${baseUrl}/c/${city.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }

    return entries
  } catch (err) {
    logger.error(
      'sitemap-cities exception',
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
```

- [ ] **Step 2: Register the 4th chunk in `sitemap.ts`**

Replace the current `sitemap.ts` body (the part that dispatches by id):

```ts
import type { MetadataRoute } from 'next'
import { staticSitemap } from './sitemap-static'
import { listingsSitemap } from './sitemap-listings'
import { guidesSitemap } from './sitemap-guides'
import { citiesSitemap } from './sitemap-cities'

export const revalidate = 3600

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) return staticSitemap()
  if (id === 1) return listingsSitemap()
  if (id === 2) return guidesSitemap()
  if (id === 3) return citiesSitemap()
  return []
}
```

- [ ] **Step 3: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/app/sitemap-cities.ts apps/web/src/app/sitemap.ts
git commit -m "feat(seo): add cities sub-sitemap with 5-listing threshold"
```

---

### Task 6: Update listing breadcrumb to use flagship city slug

**Files:**
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`

In Plan 1, the listing's BreadcrumbList sets the 3rd item to `/search?city=...`. We upgrade it to `/c/[slug]` when the listing's city is a flagship.

- [ ] **Step 1: Update the breadcrumb**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, find the `<BreadcrumbListJsonLd ... />` element. Replace the 3rd item:

```tsx
import { flagshipSlugForCity } from '@/lib/cities'

// Inside the component body, after fetching `listing`:
const cityFlagshipSlug = flagshipSlugForCity(listing.city)
const cityCrumbUrl = cityFlagshipSlug
  ? `https://www.nestmatch.app/c/${cityFlagshipSlug}`
  : `https://www.nestmatch.app/search?city=${encodeURIComponent(listing.city)}`

// Then in the JSX:
<BreadcrumbListJsonLd
  items={[
    { name: 'Home', url: 'https://www.nestmatch.app' },
    { name: 'Rooms', url: 'https://www.nestmatch.app/search' },
    { name: `${listing.city}, ${listing.province}`, url: cityCrumbUrl },
    { name: listing.title, url: `https://www.nestmatch.app/listings/${id}` },
  ]}
/>
```

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add "apps/web/src/app/(app)/listings/[id]/page.tsx"
git commit -m "feat(seo): point listing breadcrumb at flagship city page when applicable"
```

---

### Task 7: "More rooms in [city]" section on listing detail

**Files:**
- Create: `apps/web/src/components/listings/more-in-city.tsx`
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`

This is the listing detail → city internal link the spec calls for.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/listings/more-in-city.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { flagshipSlugForCity } from '@/lib/cities'

interface MoreInCityProps {
  city: string
  excludeListingId: string
}

export async function MoreInCity({ city, excludeListingId }: MoreInCityProps) {
  const supabase = await createClient()
  const { data: siblings } = await supabase
    .from('listings')
    .select('id, title, price, photos, city')
    .eq('is_active', true)
    .ilike('city', city)
    .neq('id', excludeListingId)
    .order('updated_at', { ascending: false })
    .limit(6)

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
        {siblings.map((l: any) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            className="block rounded-2xl overflow-hidden border border-outline-variant transition-shadow hover:shadow-lg"
          >
            {l.photos?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.photos[0]}
                alt={`Room for rent in ${l.city} — ${formatPrice(l.price)}/mo`}
                className="w-full h-40 object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
            <div className="p-4">
              <p className="font-semibold text-on-surface">
                {formatPrice(l.price)}/mo
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
```

- [ ] **Step 2: Render on listing detail**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, import `MoreInCity` and render it just before the closing `</AnimatedPage>` (or wherever the page's main content ends):

```tsx
import { MoreInCity } from '@/components/listings/more-in-city'

// At the end of the page JSX, before the closing wrapper:
<MoreInCity city={listing.city} excludeListingId={id} />
```

- [ ] **Step 3: Typecheck + manual smoke**

```powershell
cd apps/web; npm run typecheck
```

Then open a listing in dev. Confirm the "More rooms in [city]" section renders with sibling listings (if there are any).

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/listings/more-in-city.tsx "apps/web/src/app/(app)/listings/[id]/page.tsx"
git commit -m "feat(seo): add 'More rooms in city' section linking from listing → city"
```

---

### Task 8: Expanded footer with top cities + top guides

**Files:**
- Read: `apps/web/src/components/landing/footer.tsx`
- Modify: `apps/web/src/components/landing/footer.tsx` (or create a new one + update barrel)

- [ ] **Step 1: Read the current footer**

Read `apps/web/src/components/landing/footer.tsx` and `apps/web/src/components/landing/index.ts` (the barrel). Identify what the current footer renders and how it's imported.

- [ ] **Step 2: Decide approach**

If the current footer is a small static component (likely <50 lines), modify it in place: add a "Cities" column and a "Guides" column.

If it's already complex, create a new `footer-with-cities.tsx` and update the barrel to re-export it as `Footer`.

- [ ] **Step 3: Implement**

Add a "Cities" link group:

```tsx
import Link from 'next/link'
import { FLAGSHIP_CITIES } from '@/lib/cities'

// Inside Footer:
<div>
  <h4 className="font-semibold mb-3">Cities</h4>
  <ul className="space-y-2">
    {FLAGSHIP_CITIES.map((c) => (
      <li key={c.slug}>
        <Link
          href={`/c/${c.slug}`}
          className="text-sm text-on-surface-variant hover:text-on-surface"
        >
          Rooms in {c.displayName}
        </Link>
      </li>
    ))}
  </ul>
</div>
```

And a "Guides" link group with 3-5 hand-picked guide slugs (or a single link to the guides index, if specific slugs aren't yet stable):

```tsx
<div>
  <h4 className="font-semibold mb-3">Guides</h4>
  <ul className="space-y-2">
    <li>
      <Link href="/resources/guides" className="text-sm text-on-surface-variant hover:text-on-surface">
        All guides
      </Link>
    </li>
    {/* Add specific guide slugs here once the 8 priority guides are published — leave as the index link for now. */}
  </ul>
</div>
```

Keep the existing footer columns (privacy, terms, etc.) — this is additive.

- [ ] **Step 4: Visual check in dev**

Open the homepage in dev. Confirm the footer shows the 5 city links and the guides link without breaking layout.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/landing/footer.tsx
# also if barrel was touched:
git add apps/web/src/components/landing/index.ts
git commit -m "feat(seo): expand footer with top cities and guides links"
```

---

### Task 9: Playwright tests for city pages

**Files:**
- Modify: `apps/web/e2e/seo.spec.ts`

- [ ] **Step 1: Append city tests**

```ts
test('flagship city page renders ItemList + FAQPage JSON-LD when above threshold', async ({ request }) => {
  // Try Toronto; if below threshold, the page 404s — accept either outcome and check whichever is true.
  const response = await request.get('/c/toronto')
  if (response.status() === 200) {
    const html = await response.text()
    expect(html).toContain('"@type":"ItemList"')
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain('Find a Roommate in Toronto')
  } else {
    expect(response.status()).toBe(404)
  }
})

test('unknown city slug renders not-found with noindex', async ({ request }) => {
  const response = await request.get('/c/this-is-not-a-real-city')
  expect([200, 404]).toContain(response.status()) // same notFound() status caveat as Plan 1
  const html = await response.text()
  expect(html.toLowerCase()).toContain('noindex')
})

test('cities sitemap chunk returns valid XML', async ({ request }) => {
  const response = await request.get('/sitemap/3.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('<urlset')
})
```

- [ ] **Step 2: Run tests**

```powershell
cd apps/web; npx playwright test --project=public e2e/seo.spec.ts -g "city|cities sitemap"
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/e2e/seo.spec.ts
git commit -m "test(seo): add Playwright coverage for city landing pages and cities sitemap"
```

---

### Task 10: Run full SEO suite + typecheck + lint

**Files:** none

- [ ] **Step 1: SEO tests**

```powershell
cd apps/web; npx playwright test --project=public e2e/seo.spec.ts --reporter=list
```

Expected: all pass.

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint (just our new files)**

```powershell
cd apps/web; npm run lint 2>&1 | Select-String "c/\[city\]|more-in-city|sitemap-cities|cities\.ts|footer"
```

Expected: no new errors in our files. Pre-existing `<img>` warnings (from `more-in-city.tsx` and city `page.tsx` if you used `<img>` for grid thumbnails) are acceptable — they have inline `eslint-disable-next-line` comments.

---

### Task 11: Update baseline / known issues

**Files:**
- Modify: `docs/seo-baseline-2026-05-22.md`

- [ ] **Step 1: Add a Plan 3 section to the baseline doc**

Append a new section to `docs/seo-baseline-2026-05-22.md`:

```markdown
## Plan 3 — City landing pages (shipped YYYY-MM-DD)

Five flagship cities at `/c/[slug]` with 5-listing threshold. The cities chunk is
sitemap id 3 (`/sitemap/3.xml`).

At ship time:
- Cities above threshold (in sitemap): ___ (list slugs)
- Cities below threshold (NOT in sitemap, 404 on direct visit): ___

The cities below threshold will become indexed automatically once their inventory grows past 5 active listings (sitemap regenerates hourly via ISR).
```

- [ ] **Step 2: Commit**

```powershell
git add docs/seo-baseline-2026-05-22.md
git commit -m "docs(seo): record Plan 3 city threshold state at ship time"
```

---

### Task 12: Manual smoke (deferred to operator)

**Files:** none — manual checklist for the human operator.

After all commits land:

- [ ] Open `http://localhost:3000/c/toronto` in incognito. Confirm:
  - Page renders (or 404s with branded not-found if below threshold).
  - View Source shows ItemList, BreadcrumbList, FAQPage JSON-LD in initial HTML.
  - Listings grid links to `/listings/<id>`.
  - "Other cities" section links to the four other slugs.
  - Footer includes Cities column with 5 links.
- [ ] Open a real listing in incognito. Confirm:
  - "More rooms in [city]" section appears (if siblings exist).
  - "View all →" links to `/c/<slug>` when the city is a flagship.
- [ ] Visit `/sitemap/3.xml` — confirm cities listed (or empty `<urlset>` if all below threshold).
- [ ] Visit `/sitemap.xml` — confirm 4 sub-sitemap entries.
- [ ] Re-run Google's Rich Results test against `/c/toronto` (preview deploy).

---

## Self-Review Checklist

- [ ] `apps/web/src/lib/cities.ts` has 5 cities, each with intro + 4-6 FAQs.
- [ ] `/c/[city]` route enforces `THRESHOLD = 5` and returns `notFound()` below threshold.
- [ ] Cities sub-sitemap respects the same threshold (omits below-threshold cities).
- [ ] Listing breadcrumb uses `/c/[slug]` when the listing's city is a flagship.
- [ ] "More rooms in [city]" section renders on listing detail.
- [ ] Footer links to all 5 cities.
- [ ] Playwright tests cover above-threshold and unknown-slug cases.
- [ ] Typecheck + lint clean for new files.
- [ ] Baseline doc updated with city-by-city threshold state.

---

## Notes for downstream

- **When inventory grows past 200 listings**, revisit the spec's deferred-scope items: audience-segmented variants (`/student-roommates/[city]`, `/newcomer-friendly-rooms/[city]`), neighborhood pages.
- **If `notFound()` 404-status issue (Plan 1 follow-up) gets fixed**, the city-below-threshold and unknown-slug paths will start returning proper 404, which speeds up deindexing of any city pages that drop below threshold.
- **Pagination becomes necessary** if any flagship city's inventory exceeds 24 listings. Today no city does — defer.
