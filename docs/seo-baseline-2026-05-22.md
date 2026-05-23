# SEO Baseline — 2026-05-22

Captured at the moment SEO Plan 1 (foundations + listing hardening) shipped to prod.
This is the reference point for measuring the impact of the SEO work.

**Fill in this template *before* deploying the `seo/plan-1-foundations` branch to prod**, so we have the
"before" snapshot. The new sitemap will not change what's indexed for several days, so even capturing
this right after merge is fine — but earlier is better.

---

## Google Search Console

- **Verified domain:** www.nestmatch.app *(confirm via GSC dashboard)*
- **Date range used for snapshot:** Last 28 days ending YYYY-MM-DD
- **Total impressions:** ___
- **Total clicks:** ___
- **Average CTR:** ___%
- **Average position:** ___
- **Indexed page count:** ___ *(from Coverage report)*
- **Sitemap submitted:** /sitemap.xml — last read date ___
- **Sitemap chunks visible to GSC after merge:** /sitemap.xml, /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml *(verify after deploy)*

## Top 20 queries by impressions

*(Fill in from GSC > Performance > Queries tab, sorted by impressions descending.)*

| # | Query | Impressions | Clicks | Position |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |
| 4 | ... | ... | ... | ... |
| 5 | ... | ... | ... | ... |

## Top 20 queries by clicks

| # | Query | Clicks | Impressions | Position |
|---|---|---|---|---|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |

## GA4 organic sessions (last 28 days)

- **Organic sessions:** ___
- **Top 5 landing pages:**
  1. ...
  2. ...
  3. ...
  4. ...
  5. ...

## Core Web Vitals — Lighthouse / PageSpeed Insights

Run https://pagespeed.web.dev/ for each surface and record both mobile and desktop.

| Surface | LCP | CLS | INP | Performance score (mobile) |
|---|---|---|---|---|
| / | ___ | ___ | ___ | ___ |
| /listings/<real-id> | ___ | ___ | ___ | ___ |
| /resources/guides | ___ | ___ | ___ | ___ |
| /resources/guides/<real-slug> | ___ | ___ | ___ | ___ |
| /resources/faq | ___ | ___ | ___ | ___ |

Targets: LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Rich Results test

Per Task 18 in the implementation plan, run https://search.google.com/test/rich-results on the
preview deploy of the SEO branch, then again after merging to prod.

- **Listing URL tested:** ...
- **Result:** Eligible / Not eligible
- **Detected schema types:** Offer, Accommodation, BreadcrumbList *(expected)*
- **Errors / warnings:** ...

- **Guide URL tested:** ...
- **Detected schema types:** Article, BreadcrumbList *(expected)*

- **FAQ URL tested:** ...
- **Detected schema types:** FAQPage, BreadcrumbList *(expected)*

## Target keywords to track weekly

10 per surface — the list below is a starting suggestion; replace with what's relevant to NestMatch
and to what we can plausibly rank for. Tracking goes in a separate spreadsheet (or a simple GSC saved
view); this section is just the canonical list.

**Homepage:**
- "roommate finder Canada"
- "find a roommate Canada"
- "verified roommates Canada"
- ...

**Toronto:**
- "roommates Toronto"
- "rooms for rent Toronto"
- "find roommate Toronto"
- ...

**Vancouver:**
- "roommates Vancouver"
- "rooms for rent Vancouver"
- ...

**Montreal:**
- "roommates Montreal"
- "rooms for rent Montreal"
- ...

**Top guides (assuming the 8 initial guides ship):**
- "how to find a roommate in Toronto"
- "roommate agreement template Ontario"
- "tenant rights for roommates Ontario"
- "how to avoid rental scams Canada"

## Re-snapshot date

90 days from baseline → **2026-08-20**.

At that point we measure delta vs this baseline and decide:
- Are the city pages (Plan 3) ranking?
- Are the guides driving traffic?
- Should we kick off the long-tail city/category variants?

## Known caveats / follow-ups captured during Plan 1

- **`notFound()` returns 200 in dev** — see commit `1414525`. The body has `noindex` so SEO is OK, but
  the 404 status would accelerate deindexing. Investigate why status doesn't propagate after Plan 1.
- **3 pre-existing landing.spec.ts failures** unrelated to SEO work (tests look for "Get Started" /
  "find roommates you" — strings not in current copy). Pre-dates this work.
- **Pre-existing lint baseline** of 272 errors / 287 warnings, mostly `@typescript-eslint/no-explicit-any`
  in `lib/jobs.ts`, `lib/matching/group-matcher.ts`, etc. Not in scope for Plan 1.
- **No `next/image` migration** — listing photos still use `<img>`. Plan 1 added `fetchPriority="high"`
  to the LCP image and `loading="lazy"` to the rest. Full `next/image` migration would require
  whitelisting the Supabase storage domain in `next.config.ts` and deciding on widths/heights for
  non-uniform photo aspect ratios. Defer to a follow-up CWV plan.
- **Sitemap chunks must be verified against prod build, not dev server.** The
  Playwright dev-mode tests don't reproduce the static-generation bug. After
  any sitemap-related change, run `npm run build --prefix apps/web` then
  `npm run verify:sitemap --prefix apps/web` to confirm the chunk artifacts
  contain real URLs.
