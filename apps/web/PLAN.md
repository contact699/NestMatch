# NestMatch Issue Resolution Plan

## Source: Nestmatch feb 17th.xlsx — 13 Issues

---

## Issue Overview & Triage

| # | Issue | Severity | Effort | API Key Needed? |
|---|-------|----------|--------|-----------------|
| 1 | Listings need list/map/proximity views + address search | Medium | Medium | Google Maps (already integrated) |
| 2 | Create group doesn't work; discovery confusing | High | Small | No |
| 3 | Search filters for pets, smoking, parking | Medium | Medium | No |
| 4 | Publishing new posts not working | High | Small-Med | No |
| 5 | Email verification not working | Critical | Small | Supabase (already configured) |
| 6 | Phone verification not working | High | Small | Twilio (user adds later) |
| 7 | ID verification not working | High | Small | Certn (user adds later) |
| 8 | Messaging not working | High | Small-Med | No |
| 9 | Dashboard quick actions: add "Find a Roommate" | Low | Tiny | No |
| 10 | Discover "Preferences" links to account settings | Medium | Tiny | No |
| 11 | Create listing page traps user (can't go back/leave) | High | Small | No |
| 12 | Create co-renter group doesn't work | High | Small | No |
| 13 | Agreement generator traps user (stuck in page) | High | Small | No |

---

## Phase 1: Critical Navigation Fixes (User-Trapping Bugs)

These are the highest-priority UX blockers — users literally get stuck.

### 1.1 — Fix "Create Listing" page trapping (Issue #11)

**Problem:** The listing creation page at `/listings/new` is a `'use client'` page with a multi-step form. The existing "Back to dashboard" link at the top works, but the browser back button behavior may be broken, and there's no way to exit mid-form without the back link. The `Back` button on step 1 is disabled, which is correct for the form wizard, but there may be a layout issue hiding the "Back to dashboard" link or a missing navbar.

**Root Cause Analysis Needed:** Check if the `(app)/layout.tsx` renders the Navbar on this page. If the page uses a full-page card layout that covers the navbar or back link on mobile, that would explain the trapping.

**Fix:**
- **File:** `src/app/(app)/listings/new/page.tsx`
- Ensure the "Back to dashboard" link is always visible (not scrolled out of view)
- Add a close/cancel button in the card header area (X icon or "Cancel" link)
- Ensure the navbar is visible on this page
- Consider adding a browser `beforeunload` warning if form has data, but don't prevent navigation

### 1.2 — Fix Agreement Generator trapping (Issue #13)

**Problem:** Same pattern as listing page. The agreement generator at `/resources/agreement` has a "Back to Resources" link at line 430, but users report getting stuck.

**Fix:**
- **File:** `src/app/(app)/resources/agreement/page.tsx`
- Add a visible cancel/close button in the card header
- Ensure the back link and navbar remain accessible on mobile
- The `Back` button on step 1 is disabled (correct for wizard), but add alternative exit

### 1.3 — Fix navigation for both pages (shared approach)

**Implementation for both pages:**
1. Add an `X` (close) icon button in the top-right of the Card header that navigates to the parent page
2. Ensure the existing back link has `sticky` or prominent positioning on mobile
3. Verify the `(app)/layout.tsx` navbar renders on these routes

---

## Phase 2: Core Feature Fixes

### 2.1 — Fix Email Verification (Issue #5) — CRITICAL

**Problem:** The auth callback at `src/app/auth/callback/route.ts` exchanges the code for a session but never updates `profiles.email_verified = true`. The database trigger `handle_new_user()` creates profiles with `email_verified = false`, and nothing ever flips it to `true`.

**Fix:**
- **File:** `src/app/auth/callback/route.ts`
- After successful `exchangeCodeForSession`, get the user and update their profile:

```typescript
if (!error) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email_confirmed_at) {
    await supabase
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', user.id)
  }
  return NextResponse.redirect(`${origin}${redirect}`)
}
```

**Also check:** The verify status API at `src/app/api/verify/status/route.ts` should also check `auth.users.email_confirmed_at` as a fallback and sync the profile if out of date.

### 2.2 — Fix Phone Verification (Issue #6)

**Problem:** The code is fully implemented but requires Twilio API keys. The Twilio service at `src/lib/services/twilio.ts` needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.

**Fix:**
- **No code changes needed** — implementation is complete
- User needs to add environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_VERIFY_SERVICE_SID`
- **Optional improvement:** Add a user-friendly message on the verify page when the API returns a config error (e.g., "Phone verification is not yet configured") instead of a generic error

### 2.3 — Fix ID Verification (Issue #7)

**Problem:** Same as phone — code is implemented but requires Certn API key.

**Fix:**
- **No code changes needed** — implementation is complete
- User needs to add: `CERTN_API_KEY`
- **Optional improvement:** Add user-friendly fallback message when API key is missing

### 2.4 — Fix Messaging (Issue #8)

**Problem:** Messaging code exists and is comprehensive (conversations, real-time, read receipts). Need to investigate why it's "not working."

**Likely causes:**
1. **RLS policies** on `conversations` or `messages` tables may be too restrictive
2. **Missing Supabase Realtime** configuration (needs to be enabled for the messages table)
3. **Database tables** may not have been created (check migrations)

**Investigation & Fix:**
- **File:** `src/app/(app)/messages/page.tsx` — Check for client-side errors
- **File:** `src/app/api/conversations/route.ts` — Check API response
- Verify Supabase RLS policies allow users to read/write their own conversations
- Verify Supabase Realtime is enabled for the `messages` table
- Test the API endpoints directly to isolate frontend vs backend issues

### 2.5 — Fix Listing Publishing (Issue #4)

**Problem:** Creating/publishing listings "not working." The form at `/listings/new` submits to `POST /api/listings`.

**Likely causes:**
1. **Validation errors** not surfacing properly (Zod schema might reject valid input)
2. **API error** from Supabase insert (RLS policies, missing columns, type mismatches)
3. **Photo upload** not working (listings require photos but upload may be broken)

**Investigation & Fix:**
- **File:** `src/app/api/listings/route.ts` — Check POST handler for errors
- **File:** `src/app/(app)/listings/new/types.ts` — Check Zod schema requirements
- Check if `photos` field is required in schema but upload isn't working
- Make `photos` optional in schema if upload isn't fully implemented yet
- Test API directly with minimal payload to isolate the issue
- Check Supabase RLS policies on `listings` table

### 2.6 — Fix Create Group (Issues #2, #12)

**Problem:** "Create group does not work." The create group modal on `/groups` calls `POST /api/groups`.

**Likely causes:**
1. **API error** from Supabase (RLS, missing table, type mismatch)
2. **Form validation** rejecting input
3. **Modal not opening** or submit not firing

**Investigation & Fix:**
- **File:** `src/app/(app)/groups/page.tsx` — Check create group modal logic
- **File:** `src/app/api/groups/route.ts` — Check POST handler
- Test API directly with minimal payload
- Check Supabase RLS policies on `co_renter_groups` and `co_renter_members` tables
- Verify the modal open/close state management works

---

## Phase 3: Feature Enhancements

### 3.1 — Add Search Filters for Pets, Smoking, Parking (Issue #3)

**Problem:** Search filters only include: province, city, price, room type, bathroom type, and 4 quick filters (newcomer friendly, no credit OK, students, assistance). Missing: pets, smoking, parking.

**Analysis:** The listing database schema doesn't currently have explicit `pets_allowed`, `smoking_allowed`, or `parking_included` columns on the `listings` table. However:
- The agreement generator has these concepts
- Listings have `amenities` (array) which could include parking
- The `help_needed` field is a proxy for assistance, not pets/smoking

**Fix — Two approaches:**

**Option A (Simpler — filter on existing amenities):**
- Add "Parking" as a quick filter checkbox that checks if `amenities` array contains parking-related items
- Add "Pets Allowed" and "No Smoking" as quick filter checkboxes
- These filter client-side against the amenities array or description

**Option B (Proper — add DB columns, recommended):**
1. **New migration** adding to `listings` table:
   - `pets_allowed boolean DEFAULT false`
   - `smoking_allowed boolean DEFAULT false`
   - `parking_included boolean DEFAULT false`
2. **Update listing creation form** (`StepPreferences` or new step) to include these toggles
3. **Update search filters** to add 3 new quick filter checkboxes:
   - Pets Allowed (with PawPrint icon)
   - No Smoking (with Ban/Cigarette icon)
   - Parking Available (with Car icon)
4. **Update API** `GET /api/listings` to filter on these new columns
5. **Update listing detail page** to show these attributes

**Files to modify:**
- `supabase/migrations/015_add_lifestyle_filters.sql` (new)
- `src/types/database.ts` — Add new columns to Listings type
- `src/components/search/search-filters.tsx` — Add 3 new quick filter checkboxes
- `src/app/api/listings/route.ts` — Add filter conditions to GET query
- `src/app/(app)/listings/new/types.ts` — Add to Zod schema
- `src/app/(app)/listings/new/steps/StepPreferences.tsx` — Add toggles
- `src/app/(app)/listings/[id]/page.tsx` — Display new attributes

### 3.2 — Add "Find a Roommate" Quick Action (Issue #9)

**Problem:** Dashboard quick actions don't include "Find a Roommate." There are currently 5 quick action cards.

**Fix:**
- **File:** `src/app/(app)/dashboard/page.tsx`
- Add a 6th quick action card linking to `/roommates` or `/discover`:
  ```
  Title: "Find a Roommate"
  Icon: Users (teal)
  Link: /roommates
  Subtitle: "Browse compatible profiles"
  ```
- Reorder grid to be 3x2 (it's already `lg:grid-cols-3`)

### 3.3 — Fix Discover "Preferences" Link (Issue #10)

**Problem:** The "Preferences" button on the Discover page links to `/settings` (general account settings) instead of matching/discovery preferences.

**Current code** (line 367 of discover/page.tsx):
```tsx
<Link href="/settings">
  <Button variant="outline" size="sm">
    <Settings className="h-4 w-4 mr-2" />
    Preferences
  </Button>
</Link>
```

**Fix options:**
1. **Link to `/quiz`** — The lifestyle quiz IS the matching preferences mechanism
2. **Link to `/profile/edit`** — Where users set their seeking profile (budget, location, etc.)
3. **Create a dedicated preferences page** — Overkill for now

**Recommended fix:**
- **File:** `src/app/(app)/discover/page.tsx`
- Change the link to `/quiz` since the lifestyle quiz directly affects matching scores
- Update button text to "Matching Preferences" for clarity
- Or create a dropdown with two links: "Lifestyle Quiz" and "Seeking Profile"

### 3.4 — Improve Listings View Modes (Issue #1)

**Problem:** "Listings need to be viewable in a list, or by map or by proximity search to an address."

**Current state:** The search page already has all 3 view modes (List, Map, Proximity). The issue may be:
1. The view mode tabs aren't obvious enough
2. The proximity search doesn't have an address input (it uses browser geolocation)
3. Listings on the landing page or other pages don't have these view options

**Fix:**
- **File:** `src/components/search/search-results-proximity.tsx`
- Add an address input field for proximity search (currently uses only browser geolocation)
- Use Google Maps Geocoding API to convert address → lat/lng
- Calculate distances from the entered address to each listing
- Ensure view mode tabs are clearly visible and labeled

---

## Phase 4: Discovery/Group UX Improvements (Issue #2)

### 4.1 — Clarify Discovery Feature

**Problem:** "I don't understand how discovery works."

**Fix:**
- **File:** `src/app/(app)/discover/page.tsx`
- Add an info/help section at the top of the Discover page explaining:
  - "Suggestions" tab: AI-generated group matches based on your profile
  - "People" tab: Browse compatible individuals
  - "Groups" tab: Join existing public groups
- Add empty state messages that guide users to complete prerequisites (profile, quiz)
- Improve tab descriptions

---

## Implementation Order (Recommended)

### Sprint 1 — Critical Blockers (Do First)
1. **1.1** Fix listing page navigation trapping
2. **1.2** Fix agreement generator navigation trapping
3. **2.1** Fix email verification (1 file, ~5 lines)
4. **3.2** Add "Find a Roommate" quick action (1 file, ~15 lines)
5. **3.3** Fix Discover preferences link (1 file, 1 line change)

### Sprint 2 — Core Feature Investigation & Fixes
6. **2.5** Investigate & fix listing publishing
7. **2.6** Investigate & fix create group
8. **2.4** Investigate & fix messaging
9. **2.2** Verify phone verification works (env vars needed)
10. **2.3** Verify ID verification works (env var needed)

### Sprint 3 — Feature Enhancements
11. **3.1** Add pet/smoking/parking search filters (migration + multi-file)
12. **3.4** Add address-based proximity search
13. **4.1** Improve discovery page UX/clarity

---

## Environment Variables Needed (User Provides Later)

```env
# Phone Verification (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=

# ID Verification (Certn)
CERTN_API_KEY=

# Google Maps (may already be set)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Files Summary (All files that will be modified)

### Sprint 1:
- `src/app/(app)/listings/new/page.tsx` — Add cancel/close navigation
- `src/app/(app)/resources/agreement/page.tsx` — Add cancel/close navigation
- `src/app/auth/callback/route.ts` — Fix email verification update
- `src/app/api/verify/status/route.ts` — Add email_verified sync fallback
- `src/app/(app)/dashboard/page.tsx` — Add "Find a Roommate" quick action
- `src/app/(app)/discover/page.tsx` — Fix Preferences link target

### Sprint 2:
- `src/app/api/listings/route.ts` — Debug/fix POST handler
- `src/app/(app)/listings/new/types.ts` — Relax schema if needed
- `src/app/api/groups/route.ts` — Debug/fix POST handler
- `src/app/(app)/groups/page.tsx` — Debug/fix create modal
- `src/app/api/conversations/route.ts` — Debug/fix messaging
- `src/app/(app)/messages/page.tsx` — Debug/fix messaging UI
- `src/app/api/verify/phone/send/route.ts` — Add missing-config UX
- `src/app/api/verify/id/initiate/route.ts` — Add missing-config UX

### Sprint 3:
- `supabase/migrations/015_add_lifestyle_filters.sql` — New migration
- `src/types/database.ts` — Update types
- `src/components/search/search-filters.tsx` — Add 3 new filters
- `src/app/api/listings/route.ts` — Add filter query params
- `src/app/(app)/listings/new/types.ts` — Add new fields to schema
- `src/app/(app)/listings/new/steps/StepPreferences.tsx` — Add toggles
- `src/app/(app)/listings/[id]/page.tsx` — Display new attributes
- `src/components/search/search-results-proximity.tsx` — Add address search
- `src/app/(app)/discover/page.tsx` — Add help/info section
