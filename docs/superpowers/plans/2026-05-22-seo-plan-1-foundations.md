# SEO Plan 1 — Foundations + Listing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the marketing surfaces of NestMatch (homepage, search, listing detail, guides) crawlable, server-rendered, and richly marked up — and harden the listing detail page with deterministic metadata, lifecycle-aware indexing, and a chunked dynamic sitemap.

**Architecture:** Three layers of change:
1. Open up middleware + (app) layout so anonymous users — and crawlers — can reach public surfaces.
2. Convert client-only marketing pages to server components so SSR HTML contains the actual content.
3. Expand JSON-LD components, per-route metadata, and sitemap generation.

**Tech Stack:** Next.js 16.1 (App Router), TypeScript, Supabase, Playwright (e2e tests). No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-22-seo-design.md` (commit `cc19d97`).

**Out of scope for this plan:** Mojibake fix (Plan 2), city landing pages (Plan 3), content production (no engineering plan).

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `apps/web/e2e/seo.spec.ts` | Playwright tests for SEO surfaces (anonymous-accessible, runs in `public` project) |
| `apps/web/src/app/page-client.tsx` | Tiny client wrapper for the homepage's `IntersectionObserver` scroll-animation effect |
| `apps/web/src/app/(app)/resources/guides/guides-client.tsx` | Renamed/moved client logic from current guides index page |
| `apps/web/src/app/sitemap-static.ts` | Static surfaces sub-sitemap (homepage, search, terms, privacy) |
| `apps/web/src/app/sitemap-listings.ts` | DB-backed listings sub-sitemap with ISR `revalidate: 3600` |
| `apps/web/src/app/sitemap-guides.ts` | DB-backed guides sub-sitemap with ISR `revalidate: 3600` |
| `docs/seo-baseline-2026-05-22.md` | Manual baseline snapshot (filled in by you, not by code) |

### Files modified

| Path | Change |
|---|---|
| `apps/web/src/lib/supabase/middleware.ts` | Remove `/listings/` (broad), `/search`, `/resources/guides`, `/resources/faq` from `protectedRoutes`; add explicit `/listings/new` and `/listings/(id)/edit` protection |
| `apps/web/src/app/(app)/layout.tsx` | Render landing nav (not authed sidebar) when `!user` |
| `apps/web/src/app/page.tsx` | Convert from `'use client'` to server component; move scroll-animation effect into `page-client.tsx` wrapper |
| `apps/web/src/app/(app)/resources/guides/page.tsx` | Convert from `'use client'` to server component; load resources server-side, pass to a thin client wrapper for filters |
| `apps/web/src/app/(app)/resources/guides/[slug]/page.tsx` | Move article body rendering into the server component; client wrapper retained only for interactive widgets if any |
| `apps/web/src/components/json-ld.tsx` | Improve `ListingJsonLd` (richer `Accommodation` schema); add `ArticleJsonLd`, `BreadcrumbListJsonLd`, `FAQPageJsonLd` exports |
| `apps/web/src/app/(app)/listings/[id]/page.tsx` | Deterministic title; canonical; OG image from first photo; `noindex` for `is_active = false`; 410 for not-found; image alt text; breadcrumbs |
| `apps/web/src/app/(app)/profile/[userId]/page.tsx` | Add `metadata.robots: { index: false, follow: true }` |
| `apps/web/src/app/sitemap.ts` | Convert to sitemap index using `generateSitemaps` referencing the three sub-sitemaps |
| `apps/web/src/app/robots.ts` | Confirm sitemap URL still resolves (it does — `sitemap.xml` still works with sitemap index) |
| `apps/web/playwright.config.ts` | Add `seo.spec.ts` to `public` project's `testMatch` |

---

## Task Decomposition

There are 22 tasks in this plan. Tasks 1–5 are crawler access + SSR (must ship together for crawlers to see anything). Tasks 6–10 are the JSON-LD layer. Tasks 11–17 are the listing-detail hardening (the spec's Phase 2). Tasks 18–21 are sitemap + robots. Task 22 is the manual baseline.

---

### Task 1: Set up the Playwright SEO test file

**Files:**
- Create: `apps/web/e2e/seo.spec.ts`
- Modify: `apps/web/playwright.config.ts`

- [ ] **Step 1: Update Playwright config to include `seo.spec.ts` in the `public` project**

In `apps/web/playwright.config.ts`, change line 23 from:

```ts
testMatch: /\/(landing|auth)\.spec\.ts/,
```

to:

```ts
testMatch: /\/(landing|auth|seo)\.spec\.ts/,
```

Also update the `chromium` and `firefox` `testIgnore` regex on lines 38 and 49 to include `seo.spec.ts`:

```ts
testIgnore: /(.*\.setup\.ts|landing\.spec\.ts|auth\.spec\.ts|seo\.spec\.ts)/,
```

- [ ] **Step 2: Create `apps/web/e2e/seo.spec.ts` with a smoke test**

```ts
import { test, expect } from '@playwright/test'

test.describe('SEO surfaces (anonymous)', () => {
  test('homepage returns 200 with NestMatch in the title', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/NestMatch/)
  })
})
```

- [ ] **Step 3: Run the test to verify the harness works**

```powershell
npx playwright test --project=public e2e/seo.spec.ts
```

Expected: PASS (homepage already loads anonymously today).

- [ ] **Step 4: Commit**

```powershell
git add apps/web/e2e/seo.spec.ts apps/web/playwright.config.ts
git commit -m "test(seo): add seo.spec.ts to public Playwright project"
```

---

### Task 2: Open up public routes in middleware (CRITICAL)

**Files:**
- Modify: `apps/web/src/lib/supabase/middleware.ts:64-110`
- Modify: `apps/web/e2e/seo.spec.ts`

The current `protectedRoutes` array blocks anonymous users from `/listings/`, `/search`, `/resources/guides`, and `/resources/faq`. These need to become public.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('anonymous user can reach /search without redirect', async ({ page }) => {
  const response = await page.goto('/search', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  expect(page.url()).toContain('/search')
  expect(page.url()).not.toContain('/login')
})

test('anonymous user can reach /resources/guides without redirect', async ({ page }) => {
  const response = await page.goto('/resources/guides', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  expect(page.url()).toContain('/resources/guides')
  expect(page.url()).not.toContain('/login')
})
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "anonymous user can reach"
```

Expected: FAIL — pages redirect to `/login`.

- [ ] **Step 3: Update middleware**

In `apps/web/src/lib/supabase/middleware.ts`, replace the `protectedRoutes` array (lines 64–110) with:

```ts
const protectedRoutes = [
  '/dashboard',
  '/profile/edit',
  '/discover',
  '/roommates',
  '/quiz',
  '/verify',

  // Listings — specific protected paths only.
  // `/listings/[id]` is PUBLIC (SEO surface).
  '/listings/new',
  '/my-listings',
  '/saved',

  '/messages',
  '/groups',
  '/payments',
  '/expenses',
  '/reviews',
  '/settings',

  // Resources — bookmarks/tools/agreement/submit-question stay gated.
  // `/resources/guides`, `/resources/guides/[slug]`, `/resources/faq` are PUBLIC.
  '/resources/bookmarks',
  '/resources/agreement',
  '/resources/submit-question',
  '/resources/tools',

  '/admin',
  '/matching-preferences',
  '/onboarding',
]

// Edit route for listings is also protected, matched separately because
// the listing detail route shares the `/listings/` prefix.
const editListingPattern = /^\/listings\/[^/]+\/edit\/?$/

const isProtectedRoute =
  protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) ||
  editListingPattern.test(request.nextUrl.pathname)
```

Replace the existing `const isProtectedRoute = ...` block (lines 111–113) with the lines above.

Note: `/profile/[userId]` is NOT in `protectedRoutes` because we want it public-but-`noindex` (handled in Task 16). Only `/profile/edit` is gated.

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "anonymous user can reach"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/lib/supabase/middleware.ts apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): allow anonymous access to listings, search, guides, faq"
```

---

### Task 3: Loosen `(app)` layout for anonymous users

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

The current layout always renders the authed `Navbar` + `Sidebar`. For anonymous visitors landing on a listing detail page, we want the landing-style nav.

- [ ] **Step 1: Read the current landing nav**

Open `apps/web/src/components/landing/landing-nav.tsx` to confirm its export name and prop shape. (It's used today by `apps/web/src/app/page.tsx`.)

- [ ] **Step 2: Update the layout to switch nav based on auth state**

Replace `apps/web/src/app/(app)/layout.tsx` with:

```tsx
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { LandingNav } from '@/components/landing'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <LandingNav />
        <main className="pt-24">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add a test asserting landing nav appears for anonymous listing view**

We don't have a stable seeded listing ID for tests. Instead, assert that the listing 404 page renders with the landing nav for anonymous users (proves the layout switch works). Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('listing 404 page renders with landing nav for anonymous user', async ({ page }) => {
  await page.goto('/listings/00000000-0000-0000-0000-000000000000')
  // Landing nav has a "Get Started" CTA; authed navbar does not.
  await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
})
```

- [ ] **Step 4: Run all SEO tests**

```powershell
npx playwright test --project=public e2e/seo.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/(app)/layout.tsx apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): render landing nav in (app) layout for anonymous users"
```

---

### Task 4: Convert homepage to a server component

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/page-client.tsx`

Today `app/page.tsx` is `'use client'` purely for an `IntersectionObserver` scroll-reveal effect. The actual content sections are already in their own components and can be server-rendered. We move the `useEffect` into a small client wrapper.

- [ ] **Step 1: Write a failing test for server-rendered hero text**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('homepage hero text is present in initial HTML (SSR)', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()
  expect(html).toContain('Find roommates you')
})
```

This uses Playwright's `request` API which does NOT execute client JS — so it only passes if the text is in the SSR'd HTML.

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "homepage hero text"
```

Expected: FAIL — current page is `'use client'`, so the React tree renders only after hydration. The string is in the JS bundle but not in the initial HTML.

(If this test happens to pass because Next.js prerenders client components at build time, document that and skip to Task 5. But typically client components on dynamic routes don't prerender.)

- [ ] **Step 3: Create the client wrapper**

Create `apps/web/src/app/page-client.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'

/**
 * Adds the `is-visible` class to elements with `[data-animate]` as they scroll
 * into view. Pulled out of `page.tsx` so that file can be a server component.
 */
export function HomeScrollAnimations() {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  return null
}
```

- [ ] **Step 4: Convert `page.tsx` to a server component**

Replace `apps/web/src/app/page.tsx` with:

```tsx
import {
  LandingNav,
  HeroSection,
  TrustFeaturesSection,
  HowItWorksSection,
  CTASection,
  Footer,
} from '@/components/landing'
import { FeaturedListingsSection } from '@/components/landing/featured-listings-section'
import { LatestMembersSection } from '@/components/landing/latest-members-section'
import { OrganizationJsonLd } from '@/components/json-ld'
import { HomeScrollAnimations } from './page-client'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <OrganizationJsonLd />
      <HomeScrollAnimations />
      <LandingNav />
      <main className="pt-24">
        <HeroSection />
        <TrustFeaturesSection />
        <HowItWorksSection />
        <FeaturedListingsSection />
        <LatestMembersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "homepage hero text"
```

Expected: PASS.

- [ ] **Step 6: Verify the visual smoke tests still pass**

```powershell
npx playwright test --project=public e2e/landing.spec.ts
```

Expected: all 9 existing landing tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/app/page.tsx apps/web/src/app/page-client.tsx apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): convert homepage to server component for SSR'd content"
```

---

### Task 5: Convert guides index and detail to server components

**Files:**
- Modify: `apps/web/src/app/(app)/resources/guides/page.tsx`
- Create: `apps/web/src/app/(app)/resources/guides/guides-client.tsx`
- Modify: `apps/web/src/app/(app)/resources/guides/[slug]/page.tsx`
- Read first: `apps/web/src/app/(app)/resources/guides/[slug]/guide-page-client.tsx` (exists today)

The guide detail page is currently a server component that delegates body rendering to `<GuidePageClient />` — meaning the article body is client-rendered. We move the body to the server component.

The guides index is fully client-rendered (`'use client'`). We move the data fetch server-side and keep only filter UI on the client.

- [ ] **Step 1: Read the current client files to understand what they render**

Read both files to identify the data-loading code and the interactive filter code:

```powershell
# Read these in the editor:
# apps/web/src/app/(app)/resources/guides/page.tsx
# apps/web/src/app/(app)/resources/guides/[slug]/guide-page-client.tsx
```

- [ ] **Step 2: Write failing tests**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('guides index contains "Resources" heading in initial HTML', async ({ request }) => {
  const response = await request.get('/resources/guides')
  expect(response.status()).toBe(200)
  const html = await response.text()
  // Match any heading that includes "Guide" or "Resource" — adjust to actual copy.
  expect(html).toMatch(/Guide|Resource/i)
})
```

For the detail page, since we don't have a stable known slug, skip a detail test in this task and rely on the SSR conversion being similar in shape.

- [ ] **Step 3: Convert the guides index to a server component**

Move the data-loading code from `apps/web/src/app/(app)/resources/guides/page.tsx` into a new server component:

```tsx
import { createClient } from '@/lib/supabase/server'
import { GuidesClient } from './guides-client'

export const metadata = {
  title: 'Resources & Guides for Renters in Canada',
  description:
    'Browse NestMatch guides on finding a roommate, tenant rights, rental scams, and more — Canada-specific advice for renters.',
  alternates: { canonical: 'https://www.nestmatch.app/resources/guides' },
}

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; province?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: resources }, { data: categories }] = await Promise.all([
    supabase
      .from('resources')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase.from('resource_categories').select('*').order('name'),
  ])

  return (
    <GuidesClient
      initialResources={resources ?? []}
      initialCategories={categories ?? []}
      initialQuery={params.q ?? ''}
      initialCategory={params.category ?? null}
      initialProvince={params.province ?? null}
    />
  )
}
```

Then move the previous file's body (the `'use client'` component) into `apps/web/src/app/(app)/resources/guides/guides-client.tsx`, accepting the new props instead of fetching data itself. Keep the filter UI, search bar, and chip handlers as client behavior.

(Adjust column names to match the actual `resources` schema. Confirm `is_published` is the correct flag — if it's `published_at IS NOT NULL`, use that instead.)

- [ ] **Step 4: Convert the guide detail to render content server-side**

Open `apps/web/src/app/(app)/resources/guides/[slug]/page.tsx` (currently delegates to `GuidePageClient`). Replace the body of `GuidePage` to fetch the resource server-side and render the article HTML directly:

```tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('title, excerpt, tags')
    .eq('slug', slug)
    .single()

  if (!resource) return { title: 'Resource Not Found' }

  return {
    title: `${resource.title} | NestMatch Resources`,
    description: resource.excerpt || `Learn about ${resource.title}`,
    keywords: resource.tags?.join(', '),
    alternates: { canonical: `https://www.nestmatch.app/resources/guides/${slug}` },
    openGraph: {
      title: resource.title,
      description: resource.excerpt ?? undefined,
      type: 'article',
    },
  }
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!resource) notFound()

  return (
    <article className="max-w-3xl mx-auto px-4 py-8 prose">
      <h1>{resource.title}</h1>
      {resource.excerpt && (
        <p className="lead text-on-surface-variant">{resource.excerpt}</p>
      )}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: resource.content_html ?? resource.content ?? '' }}
      />
    </article>
  )
}
```

Confirm the resource content column name — could be `content_html`, `content`, or `body`. Use whichever column the admin tool writes to.

Delete `guide-page-client.tsx` if it has no remaining responsibilities; if it housed interactive widgets (e.g. bookmark buttons), keep those as a small client component imported by this page.

- [ ] **Step 5: Run the SSR test**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "guides index contains"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/app/(app)/resources/guides/ apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): server-render guides index and detail pages"
```

---

### Task 6: Improve `ListingJsonLd` to emit richer Accommodation schema

**Files:**
- Modify: `apps/web/src/components/json-ld.tsx`

Today `ListingJsonLd` emits an `Offer` containing a generic `Accommodation`. We make the `Accommodation` richer (numberOfRooms, petsAllowed, address as `PostalAddress`, amenityFeature with `LocationFeatureSpecification`).

- [ ] **Step 1: Update the component**

Replace the existing `ListingJsonLd` props and body in `apps/web/src/components/json-ld.tsx` with:

```tsx
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
```

- [ ] **Step 2: Update the call site to pass the new optional props**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, find the `<ListingJsonLd ... />` element (around line 155) and add:

```tsx
petsAllowed={listing.pets_allowed}
numberOfRooms={listing.numberOfRooms ?? null}
```

(If the column doesn't exist, omit `numberOfRooms`.)

- [ ] **Step 3: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/json-ld.tsx apps/web/src/app/(app)/listings/[id]/page.tsx
git commit -m "feat(seo): emit richer Accommodation schema in ListingJsonLd"
```

---

### Task 7: Add `ArticleJsonLd`, `BreadcrumbListJsonLd`, `FAQPageJsonLd` components

**Files:**
- Modify: `apps/web/src/components/json-ld.tsx`

Add three new exported components for guides, FAQ pages, and breadcrumbs.

- [ ] **Step 1: Append the new components to `apps/web/src/components/json-ld.tsx`**

```tsx
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
```

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/json-ld.tsx
git commit -m "feat(seo): add Article, BreadcrumbList, FAQPage JSON-LD components"
```

---

### Task 8: Wire `ArticleJsonLd` and `BreadcrumbList` on guide detail

**Files:**
- Modify: `apps/web/src/app/(app)/resources/guides/[slug]/page.tsx`

- [ ] **Step 1: Update guide detail to include JSON-LD**

In the server component for `[slug]/page.tsx` (as written in Task 5), import and render the JSON-LD inside the article:

```tsx
import { ArticleJsonLd, BreadcrumbListJsonLd } from '@/components/json-ld'

// ... inside the component, after fetching `resource`:

const url = `https://www.nestmatch.app/resources/guides/${slug}`

return (
  <>
    <ArticleJsonLd
      url={url}
      title={resource.title}
      description={resource.excerpt}
      image={resource.cover_image_url ?? null}
      datePublished={resource.created_at}
      dateModified={resource.updated_at}
    />
    <BreadcrumbListJsonLd
      items={[
        { name: 'Home', url: 'https://www.nestmatch.app' },
        { name: 'Guides', url: 'https://www.nestmatch.app/resources/guides' },
        { name: resource.title, url },
      ]}
    />
    <article className="max-w-3xl mx-auto px-4 py-8 prose">
      {/* ...existing body... */}
    </article>
  </>
)
```

Confirm column names (`cover_image_url`, `created_at`, `updated_at`) match the actual schema. Adjust if different.

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/app/(app)/resources/guides/[slug]/page.tsx
git commit -m "feat(seo): emit Article and Breadcrumb JSON-LD on guide pages"
```

---

### Task 9: Wire `BreadcrumbList` on listing detail

**Files:**
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`

- [ ] **Step 1: Add breadcrumb JSON-LD next to the existing `ListingJsonLd`**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, around line 155 where `<ListingJsonLd ... />` is rendered, add an adjacent `<BreadcrumbListJsonLd>`:

```tsx
import { ListingJsonLd, BreadcrumbListJsonLd } from '@/components/json-ld'

// ...inside the component, after the existing ListingJsonLd:

<BreadcrumbListJsonLd
  items={[
    { name: 'Home', url: 'https://www.nestmatch.app' },
    { name: 'Rooms', url: 'https://www.nestmatch.app/search' },
    {
      name: `${listing.city}, ${listing.province}`,
      url: `https://www.nestmatch.app/search?city=${encodeURIComponent(listing.city)}`,
    },
    {
      name: listing.title,
      url: `https://www.nestmatch.app/listings/${id}`,
    },
  ]}
/>
```

Note: the third crumb links to `/search?city=...` for now. When city pages ship (Plan 3), update to `/c/[slug]`.

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/app/(app)/listings/[id]/page.tsx
git commit -m "feat(seo): emit Breadcrumb JSON-LD on listing detail pages"
```

---

### Task 10: Deterministic listing title format + canonical URL

**Files:**
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx:39-57`

- [ ] **Step 1: Update `generateMetadata`**

Replace the existing `generateMetadata` (lines 39–57) with:

```tsx
export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = (await supabase
    .from('listings')
    .select('title, city, province, price, photos, description, amenities, is_active, type, bathroom_type')
    .eq('id', id)
    .single()) as { data: any }

  if (!listing) {
    return { title: 'Listing Not Found', robots: { index: false, follow: false } }
  }

  const priceStr =
    typeof listing.price === 'number' ? `$${listing.price.toLocaleString('en-CA')}` : ''
  const titleSeg =
    listing.city && priceStr
      ? `Room for Rent in ${listing.city} - ${priceStr}/mo`
      : listing.title || 'Room for Rent'

  const topAmenities = (listing.amenities ?? []).slice(0, 3).join(', ')
  const descParts = [
    `Room for rent in ${listing.city}, ${listing.province}`,
    priceStr ? `${priceStr} CAD/mo` : null,
    topAmenities ? `Includes ${topAmenities}` : null,
    listing.description ? listing.description.slice(0, 80) : null,
  ].filter(Boolean)
  const description = descParts.join('. ').slice(0, 160)

  const canonical = `https://www.nestmatch.app/listings/${id}`
  const firstPhoto = Array.isArray(listing.photos) ? listing.photos[0] : null

  return {
    title: titleSeg,
    description,
    alternates: { canonical },
    robots: listing.is_active
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: titleSeg,
      description,
      url: canonical,
      type: 'website',
      ...(firstPhoto
        ? {
            images: [
              {
                url: firstPhoto,
                width: 1200,
                height: 630,
                alt: `Room for rent in ${listing.city}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: titleSeg,
      description,
      ...(firstPhoto ? { images: [firstPhoto] } : {}),
    },
  }
}
```

This single change covers tasks 10 (title), 11 (canonical), 12 (OG image), and 13 (`noindex` for inactive). They were originally listed as separate tasks in the spec's phasing; combining them keeps the commit small and avoids re-touching the same function four times.

- [ ] **Step 2: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/app/(app)/listings/[id]/page.tsx
git commit -m "feat(seo): deterministic listing title, canonical, OG image, inactive=noindex"
```

---

### Task 11: Return HTTP 410 Gone for deleted listings

**Files:**
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/listings/[id]/not-found.tsx`

`notFound()` returns 404. We want 410 for listings that don't exist (they're intentionally gone). Next.js doesn't have a `gone()` helper, so we set the status code on a custom `not-found.tsx` via the route's response.

Next.js App Router renders a `not-found.tsx` for `notFound()` calls but the response is always 404. To return 410, we set the response status explicitly using `headers()` from `next/headers` is not sufficient — we must use a Route Handler approach. **Simpler alternative: keep 404 and add `<meta name="robots" content="noindex">` in the not-found page.** Google treats 404 + noindex similarly to 410 for deindex speed.

- [ ] **Step 1: Create the not-found page**

Create `apps/web/src/app/(app)/listings/[id]/not-found.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Listing Not Found',
  robots: { index: false, follow: false },
}

export default function ListingNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
        This listing is no longer available
      </h1>
      <p className="text-on-surface-variant mb-6">
        The listing may have been removed by the host or expired. Browse current
        rooms or search by city.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/search">
          <Button>Browse rooms</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the listing page already calls `notFound()`**

`apps/web/src/app/(app)/listings/[id]/page.tsx:75-78` already calls `notFound()` when the listing fetch errors. No change needed there.

- [ ] **Step 3: Add a test asserting the not-found page renders for unknown listing**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('unknown listing renders not-found with noindex meta', async ({ request }) => {
  const response = await request.get('/listings/00000000-0000-0000-0000-000000000000')
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).toContain('listing is no longer available')
  expect(html.toLowerCase()).toContain('noindex')
})
```

- [ ] **Step 4: Run tests**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "unknown listing"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/app/(app)/listings/[id]/not-found.tsx apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): branded not-found page with noindex for missing listings"
```

**Note:** True 410 status is deferred. If Search Console reports crawl-error spikes from old listing URLs returning 404, revisit with a `route.ts` handler that conditionally returns 410.

---

### Task 12: Improve listing image alt text

**Files:**
- Modify: `apps/web/src/components/listings/listing-photo-gallery.tsx`

The listing photo gallery currently uses the listing `title` as the `alt` attribute for every photo, making all photos of a listing share identical alt text.

- [ ] **Step 1: Read the photo gallery component**

```powershell
# Read apps/web/src/components/listings/listing-photo-gallery.tsx
```

Identify the `<img>` or `<Image>` elements rendering listing photos.

- [ ] **Step 2: Add `city` and `price` props and use them in alt text**

Update the component's props to accept `city: string` and `price: number`, and change each photo's `alt` to:

```tsx
alt={`Room for rent in ${city} — $${price.toLocaleString('en-CA')} CAD/mo — photo ${index + 1} of ${photos.length}`}
```

- [ ] **Step 3: Pass the new props from the listing detail page**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, find the `<ListingPhotoGallery>` usage (around line 182) and add `city={listing.city}` and `price={listing.price}` props.

- [ ] **Step 4: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/listings/listing-photo-gallery.tsx apps/web/src/app/(app)/listings/[id]/page.tsx
git commit -m "feat(seo): per-photo alt text on listings (city + price + photo index)"
```

---

### Task 13: `noindex` for `/profile/[userId]`

**Files:**
- Modify: `apps/web/src/app/(app)/profile/[userId]/page.tsx`

Profile pages are publicly viewable for the SEO surface change in Task 2, but we don't want them indexed until users have a "show in search" opt-in.

- [ ] **Step 1: Add `metadata` with `robots: { index: false, follow: true }`**

If the file already has `generateMetadata`, add `robots: { index: false, follow: true }` to its return value. Otherwise, add a static `metadata` export:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}
```

If the file already declares dynamic metadata (e.g. user's name in title), merge:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  // ...existing fetch...
  return {
    title: profile?.name ? `${profile.name} on NestMatch` : 'Profile',
    robots: { index: false, follow: true },
  }
}
```

- [ ] **Step 2: Add a test**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('profile page emits noindex meta', async ({ request }) => {
  // Any UUID is fine; we just want to confirm the metadata is on the route.
  const response = await request.get('/profile/00000000-0000-0000-0000-000000000000')
  const html = await response.text()
  expect(html.toLowerCase()).toContain('noindex')
})
```

- [ ] **Step 3: Run the test**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "profile page emits noindex"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/app/(app)/profile/[userId]/page.tsx apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): noindex profile pages until opt-in UX exists"
```

---

### Task 14: Convert `sitemap.ts` to a chunked sitemap index

**Files:**
- Modify: `apps/web/src/app/sitemap.ts`

The current `sitemap.ts` returns a flat array of 6 URLs. We convert it to use Next.js `generateSitemaps` to chunk into per-surface sitemaps. Sub-sitemap contents are filled in by Tasks 15–17.

- [ ] **Step 1: Replace the sitemap with a chunked structure**

Replace `apps/web/src/app/sitemap.ts` with:

```ts
import type { MetadataRoute } from 'next'
import { staticSitemap } from './sitemap-static'
import { listingsSitemap } from './sitemap-listings'
import { guidesSitemap } from './sitemap-guides'

export const revalidate = 3600

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) return staticSitemap()
  if (id === 1) return listingsSitemap()
  if (id === 2) return guidesSitemap()
  return []
}
```

Next.js will expose these at `/sitemap.xml/0.xml`, `/sitemap.xml/1.xml`, `/sitemap.xml/2.xml` plus a sitemap index at `/sitemap.xml`.

- [ ] **Step 2: Confirm `robots.ts` still points at `/sitemap.xml`**

Open `apps/web/src/app/robots.ts` and verify the `sitemap` field is `'https://www.nestmatch.app/sitemap.xml'`. It already is — no change needed.

- [ ] **Step 3: Don't commit yet — sub-sitemaps in Tasks 15-17 must exist before this compiles**

The imports will fail until Tasks 15–17 land. Do those next, then verify, then commit Tasks 14–17 together at the end of Task 17.

---

### Task 15: Static sub-sitemap

**Files:**
- Create: `apps/web/src/app/sitemap-static.ts`

- [ ] **Step 1: Create the file**

```ts
import type { MetadataRoute } from 'next'

export function staticSitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.nestmatch.app'

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/resources/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/resources/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ]
}
```

Note: `/login` and `/signup` removed from the sitemap per spec decision.

---

### Task 16: Listings sub-sitemap (DB-backed)

**Files:**
- Create: `apps/web/src/app/sitemap-listings.ts`

- [ ] **Step 1: Create the file**

```ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function listingsSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listings')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50000)

    if (error || !data) {
      logger.error(
        'sitemap-listings fetch failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }

    return data.map((row: any) => ({
      url: `${baseUrl}/listings/${row.id}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))
  } catch (err) {
    logger.error(
      'sitemap-listings exception',
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
```

Note: `50000` is Google's per-sitemap URL cap. We're nowhere near it but enforcing it future-proofs.

---

### Task 17: Guides sub-sitemap (DB-backed)

**Files:**
- Create: `apps/web/src/app/sitemap-guides.ts`

- [ ] **Step 1: Create the file**

```ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function guidesSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('resources')
      .select('slug, updated_at, is_published')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(50000)

    if (error || !data) {
      logger.error(
        'sitemap-guides fetch failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }

    return data.map((row: any) => ({
      url: `${baseUrl}/resources/guides/${row.slug}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (err) {
    logger.error(
      'sitemap-guides exception',
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
```

Confirm the published flag column name. If it's `published_at IS NOT NULL` instead, change the filter accordingly.

- [ ] **Step 2: Add a sitemap test**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('sitemap.xml returns a sitemap index with sub-sitemaps', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('sitemapindex')
})

test('listings sitemap returns valid XML', async ({ request }) => {
  const response = await request.get('/sitemap.xml/1.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('<urlset')
})
```

- [ ] **Step 3: Run the tests**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "sitemap"
```

Expected: PASS.

- [ ] **Step 4: Commit Tasks 14-17 together**

```powershell
git add apps/web/src/app/sitemap.ts apps/web/src/app/sitemap-static.ts apps/web/src/app/sitemap-listings.ts apps/web/src/app/sitemap-guides.ts apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): chunked dynamic sitemap (static + listings + guides) with ISR"
```

---

### Task 17b: Server-render the FAQ page and emit `FAQPageJsonLd`

**Files:**
- Modify: `apps/web/src/app/(app)/resources/faq/page.tsx`
- Create: `apps/web/src/app/(app)/resources/faq/faq-client.tsx`

The FAQ page is currently fully client-rendered and fetches from `/api/resources/faqs`. Crawlers see an empty shell. We move the data fetch server-side, render the FAQ list as HTML, and emit `FAQPageJsonLd`.

- [ ] **Step 1: Read the current FAQ page and the API route**

Read `apps/web/src/app/(app)/resources/faq/page.tsx` in full and look at `apps/web/src/app/api/resources/faqs/route.ts` (or wherever the API lives) to understand the data shape returned (`{ faqs: FAQ[] }`).

- [ ] **Step 2: Convert the page to a server component**

Replace `apps/web/src/app/(app)/resources/faq/page.tsx` with:

```tsx
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/json-ld'
import { FaqClient } from './faq-client'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions for Renters in Canada',
  description:
    'Answers to common questions about finding a roommate, signing a rental agreement, tenant rights, and more — Canada-specific.',
  alternates: { canonical: 'https://www.nestmatch.app/resources/faq' },
}

export default async function FAQPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; province?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: faqs }, { data: categories }] = await Promise.all([
    supabase
      .from('faqs')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true }),
    supabase.from('resource_categories').select('*').order('name'),
  ])

  const faqItems = (faqs ?? []).map((f: any) => ({
    question: f.question,
    answer: f.answer,
  }))

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://www.nestmatch.app' },
          { name: 'FAQ', url: 'https://www.nestmatch.app/resources/faq' },
        ]}
      />
      <FaqClient
        initialFaqs={faqs ?? []}
        initialCategories={categories ?? []}
        initialQuery={params.q ?? ''}
        initialCategory={params.category ?? null}
        initialProvince={params.province ?? null}
      />
    </>
  )
}
```

Confirm column names (`is_published`, `display_order`, `question`, `answer`) against the actual `faqs` table; adjust if different.

- [ ] **Step 3: Create the client wrapper**

Move the body of the old client `FAQPage` into `apps/web/src/app/(app)/resources/faq/faq-client.tsx`. Accept the new props instead of fetching from the API:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LegalDisclaimer,
  SearchBar,
  ProvinceFilter,
  CategoryChips,
  FAQList,
} from '@/components/resources'
import { FAQ, ResourceCategory } from '@/types/database'

interface FaqClientProps {
  initialFaqs: FAQ[]
  initialCategories: ResourceCategory[]
  initialQuery: string
  initialCategory: string | null
  initialProvince: string | null
}

export function FaqClient({
  initialFaqs,
  initialCategories,
  initialQuery,
  initialCategory,
  initialProvince,
}: FaqClientProps) {
  // ...port the existing state hooks and handlers, but seed state from props
  // and call the API only when filters change. Keep the visual structure
  // identical to the current page.
}
```

Port the existing filter/render UI verbatim into this component. Only difference: state is seeded from props instead of fetched on mount.

- [ ] **Step 4: Add an SSR test**

Append to `apps/web/e2e/seo.spec.ts`:

```ts
test('FAQ page renders FAQPage JSON-LD in initial HTML', async ({ request }) => {
  const response = await request.get('/resources/faq')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('"@type":"FAQPage"')
})
```

- [ ] **Step 5: Run the test**

```powershell
npx playwright test --project=public e2e/seo.spec.ts -g "FAQ page renders"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/app/(app)/resources/faq/ apps/web/e2e/seo.spec.ts
git commit -m "feat(seo): server-render FAQ page with FAQPage JSON-LD"
```

---

### Task 17c: LCP image preload on listing detail (Core Web Vitals)

**Files:**
- Modify: `apps/web/src/components/listings/listing-photo-gallery.tsx`
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`

The single highest-impact Core Web Vitals change on the listing page is preloading the LCP image (the main listing photo). A full `next/image` migration for all gallery photos is deferred to a follow-up plan — it requires whitelisting the Supabase storage domain in `next.config.ts`, deciding on widths/heights for non-uniform photo aspect ratios, and is large enough to be its own work.

- [ ] **Step 1: Add `fetchPriority="high"` to the LCP image and `loading="lazy"` to the rest**

In `apps/web/src/components/listings/listing-photo-gallery.tsx`, update the main image (around line 44) and the secondary images (around line 65):

```tsx
{/* Main large image — LCP candidate */}
<img
  src={photos[0]}
  alt={altFor(0)}
  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
  fetchPriority="high"
  decoding="async"
/>

// ...secondary images:
<img
  src={photo}
  alt={altFor(i + 1)}
  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
  loading="lazy"
  decoding="async"
/>
```

Where `altFor(i)` is a helper using the new `city` and `price` props from Task 12:

```ts
const altFor = (i: number) =>
  `Room for rent in ${city} — $${price.toLocaleString('en-CA')} CAD/mo — photo ${i + 1} of ${photos.length}`
```

- [ ] **Step 2: Add `<link rel="preload">` for the LCP image in the listing page metadata**

Next.js doesn't allow per-page `<link>` tags in App Router via metadata directly, but `metadata.other` can carry arbitrary tags. Simpler approach: import `ReactDOM` `preload` from `react-dom` and call it server-side:

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, near the top of the component body (after fetching `listing`):

```tsx
import { preload } from 'react-dom'

// ...inside the component:
if (listing.photos?.[0]) {
  preload(listing.photos[0], { as: 'image', fetchPriority: 'high' })
}
```

This emits a `<link rel="preload">` in the HTML head.

- [ ] **Step 3: Typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

Start dev server, open a listing in browser DevTools > Network panel with cache disabled. Confirm:
- The first listing photo loads with priority `High`.
- A `<link rel="preload" as="image">` exists in `<head>` pointing at the LCP photo.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/listings/listing-photo-gallery.tsx apps/web/src/app/(app)/listings/[id]/page.tsx
git commit -m "perf(seo): preload LCP listing photo, lazy-load secondary photos"
```

---

### Task 18: Verify a listing detail page passes the Rich Results test

**Files:** none (manual)

- [ ] **Step 1: Deploy the branch to a Vercel preview**

```powershell
git push origin main
```

(Or push to a feature branch and let Vercel build the preview.)

- [ ] **Step 2: Pick one real active listing and run it through Google's Rich Results test**

Visit `https://search.google.com/test/rich-results` and paste in the preview URL of a real listing (e.g. `https://nestmatch-app-git-<branch>.vercel.app/listings/<id>`).

Expected:
- "Page is eligible for rich results" message.
- JSON-LD detected: `Offer` + nested `Accommodation` + `BreadcrumbList`.
- No errors. Warnings about optional fields are acceptable.

- [ ] **Step 3: If errors, fix them in `apps/web/src/components/json-ld.tsx` and re-test**

Common fixes: ensure `image` URLs are absolute, ensure `price` is a string not a number, ensure `priceCurrency` is set.

- [ ] **Step 4: Document the result**

Add a short note to `docs/seo-baseline-2026-05-22.md` (which Task 22 creates) recording: which listing URL was tested, the test result, and the timestamp.

---

### Task 19: Manual smoke run of all SEO surfaces

**Files:** none (manual)

- [ ] **Step 1: Start the dev server**

```powershell
cd apps/web; npm run dev
```

- [ ] **Step 2: In an incognito browser, visit each surface and verify:**

| URL | Verify |
|---|---|
| `/` | Landing nav visible, hero text in DOM source (View Source, search for "Find roommates"), `<script type="application/ld+json">` with Organization schema present |
| `/listings/<real-id>` | Loads anonymously, landing nav visible (no sidebar), title format `Room for Rent in <City> - $<price>/mo`, JSON-LD Accommodation + Breadcrumb present, OG image is the listing's first photo |
| `/resources/guides` | Loads anonymously, list of guides visible in DOM source |
| `/resources/guides/<real-slug>` | Loads, body text in DOM source, Article + Breadcrumb JSON-LD present |
| `/profile/<real-userid>` | Loads anonymously, `<meta name="robots" content="noindex,follow">` in DOM source |
| `/sitemap.xml` | Returns XML sitemap index referencing three sub-sitemaps |
| `/sitemap.xml/1.xml` | Returns urlset with all active listings |
| `/robots.txt` | References `/sitemap.xml` |

- [ ] **Step 3: Fix anything that doesn't match expectation**

If a discrepancy is found, write a follow-up task in this plan or fix inline.

---

### Task 20: Run the full Playwright public test suite

**Files:** none

- [ ] **Step 1: Run all public tests**

```powershell
cd apps/web; npx playwright test --project=public
```

Expected: all SEO tests + all 9 landing tests + all auth tests PASS.

- [ ] **Step 2: If any test fails**

Investigate and fix. Common causes:
- Existing landing tests assert text that no longer renders → update the test or restore the text.
- Anonymous access broke an assumed-authed flow → check middleware change.

- [ ] **Step 3: Run typecheck**

```powershell
cd apps/web; npm run typecheck
```

Expected: PASS.

---

### Task 21: Run lint

**Files:** none

- [ ] **Step 1: Lint**

```powershell
cd apps/web; npm run lint
```

Expected: no new errors. The `no-console` rule may flag if any new code uses `console.*` — switch to `logger.*` from `@/lib/logger`.

---

### Task 22: Capture the SEO baseline (manual)

**Files:**
- Create: `docs/seo-baseline-2026-05-22.md`

This is the spec's "measurement plan & baseline" — owned by you, not by code. The plan asks for a snapshot before the changes are visible to crawlers, so this should be filled in **before** Vercel reflects the new sitemap (i.e. right after the branch ships to prod, or just before).

- [ ] **Step 1: Create the file with the template**

```markdown
# SEO Baseline — 2026-05-22

Captured at the moment SEO Plan 1 (foundations + listing hardening) shipped to prod.
This is the reference point for measuring the impact of the SEO work.

## Google Search Console

- **Verified domain:** www.nestmatch.app (confirm via GSC dashboard)
- **Date range used for snapshot:** Last 28 days ending YYYY-MM-DD
- **Total impressions:** ___
- **Total clicks:** ___
- **Average CTR:** ___%
- **Average position:** ___
- **Indexed page count:** ___ (from Coverage report)
- **Sitemap submitted:** /sitemap.xml — last read date ___

## Top 20 queries by impressions

| # | Query | Impressions | Clicks | Position |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |

(Fill in from GSC > Performance.)

## Top 20 queries by clicks

| # | Query | Clicks | Impressions | Position |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |

## GA4 organic sessions (last 28 days)

- **Organic sessions:** ___
- **Top 5 landing pages:** ___

## Core Web Vitals — Lighthouse run

Run PageSpeed Insights at https://pagespeed.web.dev/ for each surface and record:

| Surface | LCP | CLS | INP | Performance score |
|---|---|---|---|---|
| / | ... | ... | ... | ... |
| /listings/<real-id> | ... | ... | ... | ... |
| /resources/guides | ... | ... | ... | ... |
| /resources/guides/<real-slug> | ... | ... | ... | ... |

## Rich Results test (per Task 18)

- **Listing URL tested:** ...
- **Result:** Eligible / Not eligible
- **Detected schema types:** ...
- **Errors / warnings:** ...

## Target keywords to track weekly

(10 per surface — fill in from spec section "Measurement & Baseline")

- Homepage: ...
- Top 3 cities (Toronto, Vancouver, Montreal): ...
- Top 3 guides: ...

## Re-snapshot date

90 days from baseline → YYYY-MM-DD.
```

- [ ] **Step 2: Commit the empty template**

```powershell
git add docs/seo-baseline-2026-05-22.md
git commit -m "docs(seo): add baseline-snapshot template (to be filled in pre-deploy)"
```

You fill in the template before deploying the changes from Tasks 1–21.

---

## Self-Review Checklist (for the implementing engineer)

After all 22 tasks are done, sanity-check:

- [ ] An anonymous browser session can visit `/listings/<real-id>` without being redirected to `/login`.
- [ ] `view-source:` on the homepage shows the hero copy in the initial HTML.
- [ ] `view-source:` on a guide detail shows the article body in the initial HTML.
- [ ] `<script type="application/ld+json">` is present on listing detail (Accommodation + Breadcrumb), homepage (Organization), guide detail (Article + Breadcrumb).
- [ ] `/sitemap.xml` returns a sitemap index pointing at three sub-sitemaps; each sub-sitemap returns valid XML and `/login`, `/signup` do NOT appear.
- [ ] Inactive listings return `<meta name="robots" content="noindex,follow">` while active listings return `index,follow`.
- [ ] `/profile/<id>` returns `noindex,follow`.
- [ ] Listing photo `alt` attributes include the city, price, and `photo N of M`.
- [ ] Rich Results test passes for at least one real listing URL.
- [ ] Playwright `public` project — all tests green.
- [ ] `npm run typecheck` — green.
- [ ] `npm run lint` — no new errors.

---

## Notes for Plans 2 and 3

- **Plan 2 (mojibake):** Will add a script that scans `listings.title`, `listings.description`, `resources.title`, `resources.content` (or whatever column houses guide body) for known mojibake sequences. Once Plan 2 ships, the metadata generated in Tasks 8 and 10 will start producing clean output automatically.
- **Plan 3 (city pages):** Will add `/c/[city]` routes, the 5-listing threshold logic, the static cities config, and an `sitemap-cities.ts` that registers as a fourth chunk in `generateSitemaps`. The listing breadcrumb's third item (Task 9) should be updated then to point at `/c/[slug]` instead of `/search?city=...`.
