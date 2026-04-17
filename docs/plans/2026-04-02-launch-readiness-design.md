# NestMatch Launch Readiness Plan

**Goal:** Get NestMatch ready for public launch with all critical, legal, and SEO requirements met.

## Critical — Must Fix Before Launch

1. **Terms of Service + Privacy Policy** — Template-generated pages at `/terms` and `/privacy`, linked from footer and signup flow
2. **Viewport meta tag** — Add to root layout metadata for mobile rendering
3. **robots.txt + sitemap.xml** — Next.js app router `robots.ts` and `sitemap.ts` files
4. **OpenGraph image** — Default `og-image.png` + metadata tag for social sharing
5. **Google Analytics (GA4)** — Basic page views + conversion tracking via Next.js Script component

## Important — Should Fix Before Launch

6. **Security headers** — X-Frame-Options, HSTS, X-Content-Type-Options, basic CSP via next.config.js
7. **Remove "Coming Soon" stubs** — Report button (implement as email to admin), group invite search (basic name filter or remove button)
8. **Error tracking (Sentry)** — Wire up real DSN or replace placeholder
9. **Cookie consent banner** — Dismissable banner with link to privacy policy

## Nice to Have — Post-Launch

10. Structured data (JSON-LD) for listings
11. Email templates (welcome, verification complete, new message)
12. Product analytics upgrade (PostHog/Mixpanel)
13. Mobile app launch (Expo app exists, needs backend connection)
