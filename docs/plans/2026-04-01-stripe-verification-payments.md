# Stripe Verification Payments & Badges Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Stripe Checkout payments for CERTN verification checks and public verification badge pills on profiles/listings.

**Architecture:** Stripe Checkout Sessions for one-time verification purchases. New checkout/complete API routes gate CERTN initiation behind payment. Reusable `<VerificationBadges>` component with full/compact variants rendered on profiles and listing cards. Supabase migration adds `stripe_payment_id`, `paid_by` to verifications and `show_verification_badges` to profiles.

**Tech Stack:** Stripe Checkout (existing SDK v20.2.0), Next.js API routes, Supabase, React

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/015_verification_payments.sql`
- Modify: `apps/web/src/types/database.ts`

**Step 1: Create migration**

```sql
-- Add payment tracking to verifications
ALTER TABLE verifications
  ADD COLUMN stripe_payment_id text,
  ADD COLUMN paid_by uuid REFERENCES auth.users(id);

-- Add badge visibility toggle to profiles
ALTER TABLE profiles
  ADD COLUMN show_verification_badges boolean NOT NULL DEFAULT true;
```

**Step 2: Update database.ts types**

In the `verifications` table Row/Insert/Update types, add:
- `stripe_payment_id: string | null`
- `paid_by: string | null`

In the `profiles` table Row/Insert/Update types, add:
- `show_verification_badges: boolean`

**Step 3: Commit**

---

### Task 2: Verification Pricing Config

**Files:**
- Create: `apps/web/src/lib/verification-pricing.ts`

**Step 1: Create pricing config**

```typescript
export type VerificationCheckType = 'id' | 'criminal' | 'credit'
export type VerificationPackageType = 'standard' | 'complete'
export type VerificationProductType = VerificationCheckType | VerificationPackageType

export const VERIFICATION_CHECKS = {
  id: { name: 'ID Verification', price: 1500, description: 'Government-issued ID verification' },
  criminal: { name: 'Background Check', price: 2500, description: 'Criminal, fraud, and sanctions screening' },
  credit: { name: 'Credit Check', price: 3000, description: 'Canadian credit report via Equifax' },
} as const

export const VERIFICATION_PACKAGES = {
  standard: {
    name: 'Standard Package',
    price: 3500,
    description: 'ID verification + background check',
    includes: ['id', 'criminal'] as VerificationCheckType[],
    savings: 500,
  },
  complete: {
    name: 'Complete Package',
    price: 5500,
    description: 'All three verifications',
    includes: ['id', 'criminal', 'credit'] as VerificationCheckType[],
    savings: 1500,
  },
} as const

export function getProduct(type: VerificationProductType) {
  if (type in VERIFICATION_CHECKS) return VERIFICATION_CHECKS[type as VerificationCheckType]
  if (type in VERIFICATION_PACKAGES) return VERIFICATION_PACKAGES[type as VerificationPackageType]
  return null
}

export function getCheckTypes(type: VerificationProductType): VerificationCheckType[] {
  if (type in VERIFICATION_CHECKS) return [type as VerificationCheckType]
  if (type in VERIFICATION_PACKAGES) return [...VERIFICATION_PACKAGES[type as VerificationPackageType].includes]
  return []
}
```

**Step 2: Commit**

---

### Task 3: Stripe Checkout Session Function

**Files:**
- Modify: `apps/web/src/lib/services/stripe.ts`

**Step 1: Add createCheckoutSession to existing stripe.ts**

Add a new function (don't modify existing functions):

```typescript
export async function createVerificationCheckoutSession({
  customerId,
  productName,
  priceInCents,
  metadata,
  successUrl,
  cancelUrl,
}: {
  customerId: string
  productName: string
  priceInCents: number
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'cad',
        product_data: { name: productName },
        unit_amount: priceInCents,
      },
      quantity: 1,
    }],
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
  return session
}

export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId)
}
```

**Step 2: Commit**

---

### Task 4: POST /api/verify/checkout Endpoint

**Files:**
- Create: `apps/web/src/app/api/verify/checkout/route.ts`

**Step 1: Create the endpoint**

- Auth required, rate limited
- Body: `{ type: 'id' | 'criminal' | 'credit' | 'standard' | 'complete', for_user_id?: string }`
- Validates the type against pricing config
- Gets/creates Stripe customer for the paying user (using existing `getOrCreateCustomer`)
- Checks for existing completed/pending verifications for the check types — skip any already done
- Creates Stripe Checkout Session with metadata: `{ verification_type, user_id (subject), paid_by }`
- Returns `{ url: session.url }`

**Step 2: Commit**

---

### Task 5: GET /api/verify/checkout/complete Endpoint

**Files:**
- Create: `apps/web/src/app/api/verify/checkout/complete/route.ts`

**Step 1: Create the return handler**

- Auth required
- Query: `?session_id=xxx`
- Retrieves Stripe session, verifies `payment_status === 'paid'`
- Reads `verification_type` and `user_id` from session metadata
- Gets check types from `getCheckTypes(verification_type)`
- For each check type: calls `initiateVerification(type, email)` and inserts verification row with `stripe_payment_id` and `paid_by`
- Redirects to `/verify?payment=success`

**Step 2: Commit**

---

### Task 6: Stripe Webhook — Handle checkout.session.completed

**Files:**
- Modify: `apps/web/src/app/api/webhooks/stripe/route.ts`

**Step 1: Add checkout.session.completed handler**

Add a new case to the existing webhook switch. This is the fallback for when the user closes the browser before the return URL loads:

- Extract metadata from session
- Check if verifications already exist for this session (idempotency via stripe_payment_id)
- If not, initiate CERTN checks and create verification rows (same logic as checkout/complete)

**Step 2: Commit**

---

### Task 7: Update Trust Center UI — Prices & Packages

**Files:**
- Modify: `apps/web/src/app/(app)/verify/page.tsx`

**Step 1: Update check card buttons**

Change the "Start Check" buttons to show prices and redirect to Stripe:
- "Start Check — $15" for ID
- "Start Check — $25" for Background
- "Start Check — $30" for Credit
- On click: POST to `/api/verify/checkout` with the type, then `window.location.href = url`

**Step 2: Add packages section**

Below the individual cards, add two package cards:
- Standard Package ($35, save $5) — includes ID + Background
- Complete Package ($55, save $15) — includes all three
- Each with a "Buy Package" button

**Step 3: Handle `?payment=success` query param**

Show a success toast/banner when redirected back from Stripe.

**Step 4: Commit**

---

### Task 8: VerificationBadges Component

**Files:**
- Create: `apps/web/src/components/verification-badges.tsx`

**Step 1: Create the component**

Two variants:

`variant="full"` — shows individual badge pills in a row:
- Each badge: icon + label (e.g. shield icon + "ID Verified")
- Color: green for CERTN checks, gray for email/phone
- Gold "Trusted" badge when ID + another check

`variant="compact"` — shows just the "Trusted" badge or a shield with verified count:
- If trusted: gold "Trusted" pill
- Otherwise: small shield icon + "3/5 verified" text

Props:
```typescript
interface VerificationBadgesProps {
  emailVerified: boolean
  phoneVerified: boolean
  verifications: Array<{ type: string; status: string }>
  verificationLevel: 'basic' | 'verified' | 'trusted'
  variant: 'full' | 'compact'
  showPublic?: boolean // respects show_verification_badges toggle
}
```

**Step 2: Commit**

---

### Task 9: Add Badges to Profile Pages

**Files:**
- Modify: `apps/web/src/app/(app)/profile/page.tsx`
- Modify: `apps/web/src/app/(app)/profile/[userId]/page.tsx`

**Step 1: Own profile — full badges**

Import `VerificationBadges` and render with `variant="full"` in the profile header area. Always shown on own profile (ignore visibility toggle for self).

**Step 2: Public profile — full badges, respect toggle**

Same component with `variant="full"` but pass `showPublic={profile.show_verification_badges}`. If false, don't render.

**Step 3: Commit**

---

### Task 10: Add Compact Badges to Listing Cards

**Files:**
- Modify: `apps/web/src/components/listings/listing-card.tsx`

**Step 1: Add compact badge**

In the host info section of the listing card, add `VerificationBadges` with `variant="compact"`. This needs the host's verification data — the listing query may need to join verification info or the profile's `verification_level` field is sufficient for the compact display.

For compact, `verification_level` alone is enough (trusted/verified/basic). No need to fetch individual verifications for the card.

**Step 2: Commit**

---

### Task 11: Badge Visibility Toggle in Settings

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

**Step 1: Add toggle**

In the Account section, add a switch: "Show verification badges on my public profile"
- Reads from `profile.show_verification_badges`
- On toggle: PATCH to update the profile
- Default: true

**Step 2: Commit**

---

### Task 12: Stripe Environment Variables

**Manual steps:**

1. Get Stripe keys from Stripe Dashboard (or ask user for them)
2. Add to `apps/web/.env.local`:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Add to Vercel via `vercel env add`

---

### Task 13: Apply Changes to Master & Deploy

Same process as CERTN integration:
1. Copy all new/modified files from `apps/web/src/` to `src/` paths on master
2. Run migration on Supabase
3. Push to master, verify Vercel production deploy
