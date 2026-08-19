# Listing Flow UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the second-pass QA findings (2026-08-19) in the web listing flow: silent photo-validation dead-end, missing pre-publish review step, unusable My Listings management, extremely slow edit page, fabricated stats in wizard tips, wizard/navbar z-index overlap, cookie banner with no decline, and the Next 16 middleware deprecation.

**Architecture:** Three clusters with disjoint file ownership on branch `fix/listing-flow-ux` (based on `main`, deliberately NOT overlapping PR #64's files). A1 owns the create-listing wizard, A2 owns My Listings + the edit page, A3 owns the cookie banner + middleware. Codex reviews the branch diff afterwards.

**Tech Stack:** Next.js 16 App Router, Supabase, Tailwind.

**Spec:** Second-pass QA findings reported in-session 2026-08-19 (summarized per task below; this plan is self-contained).

## Global Constraints

- Do NOT commit or stage anything; work in the working tree on `fix/listing-flow-ux`.
- Do NOT touch files owned by another cluster; do NOT touch any file changed by PR #64 (`git diff main origin/fix/launch-qa-web --name-only` lists them — avoid all of them so the PRs stay conflict-free).
- Match existing patterns (custom modals, toast usage, structured client logging via `src/lib/client-logger.ts`, no console.log).
- Verification per cluster: `cd apps/web && npx tsc --noEmit && npm test` green; `npm run lint` no NEW errors.

---

### Task A1: Create-listing wizard

**Files (exhaustive):** `apps/web/src/app/(app)/listings/new/page.tsx`, `apps/web/src/app/(app)/listings/new/steps/*`, `apps/web/src/app/(app)/listings/new/types.ts`

- [ ] **Photo requirement feedback.** Reproduced live: on the Photos step, Continue with 0 photos silently does nothing. Find the guard that blocks advancement; render an inline error ("Add at least 1 photo to publish your listing.") when Continue is clicked with no photos, styled like the wizard's other validation errors. If photos were actually meant to be optional, make Continue advance instead — decide from the code's intent (the guard's existence suggests required).
- [ ] **Pre-publish review step.** Reproduced live: the wizard header says "STEP N OF 7" but publishing happens directly from the Preferences step — no review screen ever appears. Investigate the steps/ directory: if a review step exists but is unreachable, wire it back in; if it doesn't exist, add a final Review step that summarizes title, type, location, price, availability, photos count/thumbnails, amenities, preferences, with Edit links back to each step and an explicit "Publish Listing" primary button. Publishing must only fire from this step.
- [ ] **Remove fabricated stats.** "Accurate neighborhood tags increase listing visibility by up to 45%" (Location step tip) and "Listings with 5+ photos get 3x more views" (Photos step tip): reword to honest guidance without invented numbers (e.g. "Accurate neighborhood tags help the right people find your listing", "Photos of the room, common areas, and bathroom help your listing stand out").
- [ ] **Header overlap.** When the page scrolls, the wizard's step header ("STEP N OF 7", progress %) slides under the app's sticky top navbar and collides with it. Fix with appropriate z-index/top offset or make the wizard header non-sticky — match however other pages coexist with the navbar.
- [ ] **Verify** per Global Constraints.

### Task A2: My Listings management + edit-page performance

**Files (exhaustive):** `apps/web/src/app/(app)/my-listings/page.tsx` (+ its child components if any), `apps/web/src/app/(app)/listings/[id]/edit/page.tsx` (+ its child components), and READ-ONLY inspection anywhere else.

- [ ] **Row actions.** My Listings rows currently offer only Edit / View / Promote; the Archived tab exists but nothing populates it and Delete is buried in the edit page. Add to each row (owner-only, matching the existing button style): "Archive" (sets `is_active=false`; label "Unarchive" restoring `is_active=true` on the Archived tab) and "Delete" reusing the edit page's existing delete flow (same endpoint/mutation + custom confirm modal — read the edit page first and extract/reuse rather than duplicating). The Archived tab must list `is_active=false` listings. Keep the active/archived counts coherent after actions (optimistic update or refetch).
- [ ] **Edit page slowness — investigate root cause first (systematic-debugging), then fix.** Reproduced live on prod: `/listings/[id]/edit` took ~40s to render and froze the tab twice. Read the page + its data flow and find the actual cause — candidates: pathological client work (e.g. image processing on load), heavyweight imports pulled into the client bundle, unbounded queries, blocking waterfalls. State the diagnosis in your report with evidence from the code; apply the fix if the cause is clear and contained (e.g. lazy-load a heavy dependency, bound a query, remove redundant work). If the cause can't be established from code alone, say so explicitly rather than guessing — do NOT ship a speculative fix.
- [ ] **Verify** per Global Constraints.

### Task A3: Cookie consent + middleware deprecation

**Files (exhaustive):** `apps/web/src/components/cookie-consent.tsx` (+ wherever consent state is read), `apps/web/src/middleware.ts` → rename per Next convention.

- [ ] **Decline option.** The banner currently offers only "Accept" and a dismiss X. Add a "Decline" button of equal visual weight; investigate what consent actually gates (grep for the consent storage key) — if consent gates nothing yet, Decline simply records the declined preference and hides the banner (and the X should record decline, not act as accept). Do not add any new tracking.
- [ ] **middleware → proxy.** Next 16 warns: `The "middleware" file convention is deprecated. Please use "proxy" instead.` Follow the official migration (nextjs.org/docs/messages/middleware-to-proxy — fetch it): rename the file and export as required. Verify the session-refresh behavior still runs (dev server boots without the deprecation warning; auth'd pages still get cookies refreshed — check the updateSession import still resolves).
- [ ] **Verify** per Global Constraints.

### Task R: Codex review + gate

- [ ] Codex reviews `git diff main` on this branch; triage with technical rigor; fix confirmed findings.
- [ ] Final gate: tsc, vitest, lint. Then commit (single commit, cluster branch) and open PR.
