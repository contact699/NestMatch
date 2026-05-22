# SEO Growth — Design Spec

**Date:** 2026-05-22
**Status:** Approved — ready for implementation plan
**Goal:** Increase organic traffic to NestMatch by fixing technical SEO foundations, making listing detail pages publicly indexable with rich metadata, shipping ~5 flagship city landing pages, and producing a content marketing layer of long-form Canada-specific guides.

## Context

NestMatch is a Canadian roommate marketplace built on Next.js (App Router) + Supabase. It is already indexed by Google but receives low organic traffic. Current SEO foundations are partial: the root layout has solid `Metadata` (title, description, keywords, OG, Twitter), `OrganizationJsonLd` is rendered on the homepage, and listing detail pages already use `generateMetadata` and `ListingJsonLd`. However:

- `sitemap.ts` only lists 6 static URLs (no listings, guides, or city pages).
- The homepage (`app/page.tsx`) and guides index (`app/(app)/resources/guides/page.tsx`) are client components — crawlers see empty shells.
- Listing detail pages live under the `(app)/` route group, so anonymous visitors may be redirected away depending on middleware.
- There are no city/location landing pages.
- Inventory is small (< 50 active listings), so programmatic SEO at scale would create thin-content pages.

## Audience & Priority

**Primary:** renters / room seekers searching commercial-intent queries like "roommates in Toronto", "rooms for rent Vancouver", "shared apartment Montreal".
**Secondary:** hosts / landlords with rooms to list.

## Constraints

- **Inventory: < 50 active listings.** This is the single most important constraint. It rules out programmatic city/category page generation. It also means every page must have a clear plan for what it shows when listing inventory is thin.
- **Locale:** `en_CA` only. No French/`fr-CA` localization in this scope (note for future Montreal expansion).
- **Tech stack:** Next.js App Router, Supabase, deployed on Vercel. Production domain `www.nestmatch.app`.
- **Existing analytics:** Google Analytics (`@/components/google-analytics`) and PostHog are already wired. We will not add new analytics vendors.

## Out of Scope

- French / bilingual content (`hreflang fr-CA`).
- Neighborhood-level pages (e.g. `/rooms/toronto/parkdale`).
- Audience-segmented city pages (`/student-roommates/toronto`, `/newcomer-friendly-rooms/toronto`). Revisit when listing inventory exceeds 200 active listings.
- New analytics tooling.
- Backlink outreach / off-page SEO (this spec is on-page + content only).

---

## Page Surface Architecture

The app's URL space splits into three tiers based on SEO intent.

### Public + indexed (SEO surfaces)

| Route | Notes |
|---|---|
| `/` | Convert root from `'use client'` to server component. Client-only hooks (`IntersectionObserver`) move into small client wrapper components. |
| `/search` | Already in sitemap. Convert to SSR so filter-as-URL pages (e.g. `/search?city=toronto`) render with content. Add canonical to drop query params Google should not split rankings across. |
| `/listings/[id]` | Currently under `(app)/`. **Decision: keep route path the same**, but loosen `(app)/layout.tsx` to render correctly for anonymous users (replace authed sidebar with landing nav when `!user`). The page itself is already a server component with `generateMetadata` and `ListingJsonLd`. Gate only the contact / message action behind sign-in. |
| `/resources/guides` and `/resources/guides/[slug]` | Convert index from `'use client'` to server component. Detail page (`[slug]`) — verify it is already server-rendered; if not, convert. |
| `/c/[city]` (new) | Flagship city landing pages. URL pattern: `/c/toronto`, `/c/vancouver`, `/c/montreal`, `/c/ottawa`, `/c/calgary`. **URL chosen for brevity and future neighborhood nesting (`/c/toronto/parkdale`).** Alternative considered: `/rooms/[city]` (keyword in URL, slightly better for SEO) — see "Decisions" section. |
| `/signup`, `/login`, `/terms`, `/privacy` | Already public. Remove `/login` and `/signup` from the sitemap (low SEO value; Codex suggestion adopted). |

### Auth-gated (already covered by `robots.ts` disallow)

`/api/*`, `/admin/*`, `/settings/*`, plus app surfaces like `/dashboard`, `/messages`, `/expenses`, `/groups`, `/profile/edit`, `/onboarding/*`.

### Public but `noindex` (privacy)

- `/profile/[userId]` — public roommate profiles. SEO upside is real but privacy risk is real. Tag with `noindex, follow` for now. Revisit after a per-user "show my profile in search" opt-in is built.
- `/roommates`, `/discover`, `/quiz` — auth-gated matching tools; not on the public path.

---

## Technical SEO Foundations

### Sitemap

Replace the static `sitemap.ts` with a chunked sitemap index pattern.

- `app/sitemap.ts` becomes a **sitemap index** referencing per-surface sitemaps. Next.js supports multiple sitemaps via `generateSitemaps`.
- Per-surface sitemaps:
  - `sitemap-static` — homepage, search, terms, privacy. **Remove `/login` and `/signup`.**
  - `sitemap-listings` — all `is_active = true` listings. `lastModified` from `listings.updated_at`. `changeFrequency: 'daily'`, `priority: 0.7`.
  - `sitemap-guides` — all published guides from `resources` table. `lastModified` from `resources.updated_at`. `priority: 0.6`.
  - `sitemap-cities` — the 5 flagship city pages. `priority: 0.8`.
- Generation strategy: **ISR with `revalidate: 3600`** (hourly). DB-backed sitemaps must not re-query on every Googlebot fetch.

### robots.ts

- Keep current disallow list (`/api/`, `/admin/`, `/settings/`, `/onboarding/`).
- Verify sitemap URL points to the new sitemap index.

### Per-route metadata

Every public route gets:

1. `generateMetadata` (or static `metadata` export) with **route-specific title and description**. Title template `%s - NestMatch` already configured in root layout.
2. **Canonical URL** via `metadata.alternates.canonical`. For `/search`, canonical points at `/search` (no params) to avoid duplicate-content splits.
3. **Open Graph** image:
   - Listing pages: first listing photo via `images: [{ url, width, height, alt }]`. Falls back to default OG if no photo.
   - City pages: a city-specific OG (can be generated via Next.js `opengraph-image.tsx` in the route folder using `next/og`).
   - Guides: existing route-level OG or fall back to root.
4. **Twitter card** (`summary_large_image`) mirroring OG.

### Structured data (JSON-LD)

Add to the existing `src/components/json-ld.tsx`:

- **`ArticleJsonLd`** — guide detail pages. Includes `headline`, `author`, `datePublished`, `dateModified`, `image`, `publisher` (NestMatch).
- **`FAQPageJsonLd`** — FAQ page and any guide with FAQ blocks. Must be **server-rendered** (Google does not execute client JS reliably for structured data extraction).
- **`BreadcrumbListJsonLd`** — listings (`Home > Rooms > Toronto > [Listing title]`), guides (`Home > Guides > [Guide title]`), city pages (`Home > Rooms > Toronto`).
- **`ItemListJsonLd`** — city landing pages (list of listing URLs in that city).
- **Existing `ListingJsonLd`** — verify it emits `Accommodation` or `Apartment` schema with `address`, `priceRange`, `numberOfRooms`, `petsAllowed`, `amenityFeature`. Improve if it currently emits a generic `Product`.

### Internal linking

Explicit policy, implemented as components/sections:

- **Homepage** → links to all 5 city pages (existing `FeaturedListingsSection` and `LatestMembersSection` already exist; add a "Browse by city" section).
- **City pages** → link to active listings in that city + 3 related cities + 2 city-relevant guides.
- **Listing detail** → "More rooms in [city]" section linking to 3–6 sibling listings + 1 link back to the city page.
- **Guides** → contextual links into related guides and into the most-relevant city page where geographically appropriate.
- **Footer** → top 5 cities + top 5 guides + main static pages. (Replaces the current minimal footer.)

---

## City Landing Pages — `/c/[city]`

Five flagship cities only, hand-picked: **Toronto, Vancouver, Montreal, Ottawa, Calgary**.

### Page structure

1. **Hero** — `<h1>` "Find a Roommate in [City]" + short city-specific intro (1–2 paragraphs). Intro text is curated, not auto-generated boilerplate.
2. **Active listings grid** — server-rendered list of all `is_active = true` listings where `city ILIKE [city]`. Limit 24 per page; paginate if more.
3. **Local guides** — 2–3 city-relevant guide cards (e.g. "Roommate agreement template Ontario" for Toronto/Ottawa).
4. **City FAQ** — 4–6 city-specific FAQs (rent ranges, popular neighborhoods, etc.) marked up with `FAQPageJsonLd`.
5. **Related cities** — links to the other 4 flagship cities.

### Empty-state policy (critical)

A city page renders **and is added to the sitemap** only if it has **≥ 5 active listings** in that city. Below that:

- The route returns **404** (so it is not indexed).
- It is **omitted from `sitemap-cities`**.
- Internal links to that city (footer, related-cities) are conditionally hidden.

This is enforced inside the city page's data fetch. Below-threshold cities will be reinstated automatically once inventory grows.

### Data source

Listings have `city` and `province` columns. Use case-insensitive match. Slug → city name mapping lives in a small static config file (`src/lib/cities.ts`) so we control display names ("Montréal" vs "Montreal") and slug aliases.

---

## Listing Detail Page — Hardening

The listing detail page (`app/(app)/listings/[id]/page.tsx`) is already a server component with `generateMetadata` and `ListingJsonLd`. Required improvements:

1. **Public accessibility.** Confirm the route renders for anonymous users. If the `(app)/` layout or middleware redirects unauthenticated visitors, lift the route or relax the gate. The contact / message CTA gates behind sign-up — not the page itself.
2. **Title format.** Always `"Room for Rent in [City] - $[price]/mo | NestMatch"`, deterministic. The listing's user-supplied `title` field is only used as a fallback when `city` or `price` is missing on the row. (Rationale: user-supplied titles are inconsistent — many are short, vague, or untranslated mojibake. A deterministic format is better for SEO consistency and click-through.)
3. **Description.** Generated from `city`, `province`, `price`, `bathroom_type`, top 3 amenities, and a short tail of the listing description. Target 150–160 chars.
4. **Canonical URL** pointing at the listing's own `/listings/[id]`.
5. **Open Graph image** — first listing photo. Width/height set explicitly.
6. **Listing lifecycle:**
   - `is_active = true` → indexed.
   - `is_active = false` (paused by host) → page still renders, but returns `noindex, follow` via `metadata.robots`.
   - **Deleted / non-existent listing** → return **HTTP 410 Gone**, not 404 (signals to Google the URL is intentionally gone and should be deindexed faster). Implement via a custom not-found path that returns 410.
   - **Deferred:** 301 redirect from a deleted listing's slug to its city page. This requires retaining deleted listings' city in a `tombstones` table (or soft-deleting the row). Out of scope for this spec; revisit if Search Console reports crawl-error spikes on deleted listing URLs.
7. **`Accommodation` JSON-LD** — `ListingJsonLd` should emit Schema.org `Accommodation` (or `Apartment`) with `address`, `priceRange`, `numberOfRooms`, `petsAllowed`, `amenityFeature[]`, `availabilityStarts`.
8. **Image alt text** — exact format: `"Room for rent in [City] — $[price] CAD/mo — photo [n] of [total]"`. The `[n] of [total]` suffix avoids identical alt text across photos of the same listing (which Google treats as a weak signal).

---

## Content Strategy

15–25 long-form Canada-specific guides, published over the course of the implementation. **Initial 8 priority guides** (this spec's scope):

1. **How to find a roommate in Toronto** (city-targeted commercial intent)
2. **How to find a roommate in Vancouver**
3. **Roommate agreement template — Ontario** (downloadable, high commercial intent)
4. **Roommate agreement template — BC**
5. **Tenant rights for roommates in Ontario**
6. **How to avoid rental scams in Canada**
7. **Average rent for shared apartments in Toronto** (data-driven; cite CMHC)
8. **Newcomer's guide to renting a room in Canada**

Each guide:

- Lives at `/resources/guides/[slug]`.
- Server-rendered.
- 1,500–2,500 words, with a table of contents, structured headings, and 3+ internal links (to city pages, listings, or related guides).
- Emits `ArticleJsonLd` (and `FAQPageJsonLd` if it has an FAQ section).
- Has its own OG image.
- Cites authoritative sources (CMHC, provincial tenancy boards, Statistics Canada) for E-E-A-T trust signals.

### Content production workflow

The existing admin tooling at `apps/web/src/app/(app)/admin/resources/` already supports creating/editing guides via the database. **Workflow:**

1. Draft in markdown locally (one `.md` per guide in `docs/seo-content/drafts/` — not committed to public repo, just for review).
2. Human review (yours).
3. Paste into admin UI → publish.

Volume: target **1 guide per week** post-launch. The initial 8 are part of the implementation; subsequent guides are a recurring task, not part of this spec's deliverables.

---

## Mojibake / Encoding Fix

User-generated content (listing titles, descriptions, possibly resources) contains mojibake patterns like `â€"` (from em-dash) and `RÃ©gie` (from `Régie`). These were verified to **not exist in source code** — they live in the database.

### Scope

1. **Root-cause investigation.** Identify which form submission path is double-encoding UTF-8 (suspect: a server action or API route that re-encodes a string that's already UTF-8). Fix the encoding bug.
2. **Backfill migration.** A one-shot SQL migration that runs a controlled `REPLACE` over known mojibake sequences in `listings.title`, `listings.description`, `resources.title`, `resources.content`, and any other text columns surfaced in metadata/OG. **The migration must be reversible and dry-runnable** — produce a "would-fix" report first.
3. **Validation.** Add a CI/script check (`apps/web/scripts/check-encoding.ts`) that scans live DB content for known mojibake sequences and fails if found.

This work runs **in parallel** with the SEO surface work — it's not a blocker but it does need to ship before the metadata improvements are visible to crawlers (otherwise the new metadata will inherit the broken encoding).

---

## Core Web Vitals

Explicit targets, verified per surface before/after:

- **LCP** < 2.5s (Largest Contentful Paint)
- **CLS** < 0.1 (Cumulative Layout Shift)
- **INP** < 200ms (Interaction to Next Paint)

### Required changes

- **`next/image`** for every listing photo, city hero, and guide hero. Set explicit `width` / `height` to prevent CLS.
- **Preload the LCP image** on listing pages (the first photo) and city pages (the city hero image).
- **Fonts:** already loaded via `next/font` (Inter, Manrope, Geist) with `variable` strategy — good. No change.
- **Bundle size:** the homepage being converted from client to server eliminates a chunk of client JS. Audit other landing surfaces for client-only components that could be server-rendered.

Measurement: Lighthouse CI against the deployed preview, or PageSpeed Insights run manually on each priority surface (homepage, top city page, top listing, top guide) before and after rollout.

---

## Measurement & Baseline

**Must happen before any code lands.**

1. **Verify Google Search Console** is connected to `www.nestmatch.app`. Confirm sitemap is being read (currently the minimal one); we will resubmit the new sitemap index once shipped.
2. **Baseline snapshot (last 28 days):**
   - Total indexed page count.
   - Top 20 queries by impressions.
   - Top 20 queries by clicks.
   - Organic sessions (GA4).
   - Core Web Vitals per surface (Lighthouse run).
3. **Target keywords** to track weekly (10 per surface): homepage, top 3 city pages, top 3 guides. Tracked in a simple spreadsheet — no new tooling.
4. **Success metrics** (re-evaluated 90 days post-launch):
   - +50% indexed page count.
   - +100% organic sessions vs. baseline.
   - At least 3 city pages ranking in top 20 for "[city] roommate" / "[city] room for rent" queries.
   - At least 2 guides ranking in top 20 for their target keyword.

Numbers are deliberately conservative — small-marketplace SEO compounds slowly. Treat as a 3-month checkpoint, not a 30-day one.

---

## Decisions Made

These are decisions reached during brainstorming, captured here so they don't get re-litigated during planning.

1. **City URL pattern: `/c/[city]`** (not `/rooms/[city]`). Trade-off: `rooms/` is slightly stronger for keyword-in-URL, but `c/` is cleaner for future neighborhood nesting (`/c/toronto/parkdale`) and avoids cluttering the root URL space with a category prefix. SEO impact of URL keyword is modest compared to on-page signals.
2. **Empty-state threshold: 5 active listings** for a city page to be rendered + indexed.
3. **Listing lifecycle: 410 for deleted, `noindex` for inactive.**
4. **Sitemap: chunked sitemap index with ISR `revalidate: 3600`.**
5. **No long-tail city/category variants** (`/student-roommates/[city]`, etc.) in this scope. Deferred until listing inventory > 200.
6. **No French/`hreflang fr-CA`** in this scope.
7. **`/profile/[userId]` stays `noindex`** until an opt-in UX exists.

---

## Implementation Phases (preview)

The detailed implementation plan will live in `docs/superpowers/plans/`. Phase shape:

1. **Phase 0 — Measurement.** Baseline snapshot, Search Console verification.
2. **Phase 1 — Foundations.** SSR conversions (homepage, guides index), chunked sitemap, canonical URLs, per-route metadata, expanded JSON-LD components.
3. **Phase 2 — Listing detail hardening.** Public access, lifecycle states (active/inactive/deleted → index/noindex/410), improved metadata + OG images, image alt text.
4. **Phase 3 — Mojibake fix.** Root-cause + backfill migration + CI check. Runs in parallel with Phases 1–2; must complete before metadata is fully trusted by crawlers.
5. **Phase 4 — City landing pages.** Build the route, ship the 5 flagship cities, threshold enforcement, internal linking sections.
6. **Phase 5 — Content.** Produce 8 priority guides via the admin tooling.
7. **Phase 6 — Measurement re-snap.** 90 days after Phase 4 ships, re-snap metrics and decide what to scale.

Phases 1–4 are engineering. Phase 5 is content production. They can overlap.
