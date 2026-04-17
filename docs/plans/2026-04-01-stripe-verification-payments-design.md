# Stripe Verification Payments & Badges Design

**Goal:** Add Stripe payments for CERTN verification checks and public verification badges on user profiles.

## Payment Flow

1. User clicks "Start Check" (or "Buy Package") on a verification card
2. Payment modal shows check name, price, Stripe checkout button
3. Server creates Stripe Checkout Session with check type in metadata
4. User completes payment on Stripe hosted checkout
5. Stripe redirects to `/verify?session_id=xxx`
6. Return handler verifies session, initiates CERTN check(s), creates verification record(s)
7. Stripe webhook `checkout.session.completed` as fallback if browser closes before redirect

### Who Pays

- **Tenant:** Clicks "Start Check" on their own Trust Center
- **Landlord:** Clicks "Request Verification" on an applicant's profile, pays for the check on their behalf

### Pricing (hardcoded config, not DB)

| Item | Price |
|------|-------|
| ID Verification | $15 |
| Background Check | $25 |
| Credit Check | $30 |
| Standard Package (ID + Background) | $35 |
| Complete Package (all three) | $55 |

## Verification Badges

| Badge | Source | Paid? |
|-------|--------|-------|
| Email Verified | Supabase auth | Free |
| Phone Verified | Twilio | Free |
| ID Verified | CERTN IDENTITY_VERIFICATION_1 | $15 |
| Background Checked | CERTN CRIMINAL_RECORD_REPORT_1 | $25 |
| Credit Checked | CERTN CREDIT_REPORT_1 | $30 |
| Trusted (composite) | ID + at least one other CERTN check | N/A |

### Visibility

- Default: public (shown on profile, listings, search)
- Single toggle in Settings: "Show verification badges on my public profile"
- No per-badge granularity

### Display

- **Profile pages:** Full badge row with labels
- **Listing cards / search / groups:** Compact — "Trusted" badge or shield + count
- **Trust Center:** Already shows status, add badge styling

## Database Changes

`profiles` table — add:
- `show_verification_badges` (boolean, default true)

`verifications` table — add:
- `stripe_payment_id` (text, nullable)
- `paid_by` (uuid, nullable) — landlord's user_id when they pay for an applicant

## API Endpoints

### New

`POST /api/verify/checkout`
- Body: `{ type: 'id' | 'criminal' | 'credit' | 'standard' | 'complete', for_user_id?: string }`
- Returns: `{ url: 'https://checkout.stripe.com/...' }`

`GET /api/verify/checkout/complete`
- Query: `?session_id=xxx`
- Verifies payment, initiates CERTN check(s), creates verification record(s)
- Redirects to `/verify`

### Modified

`/api/verify/{type}/initiate` — becomes internal (called by checkout complete, not frontend directly)

### Existing

Stripe webhook at `/api/webhooks/stripe` handles `checkout.session.completed` as fallback

## Frontend Changes

- Trust Center: "Start Check — $15" buttons → Stripe checkout redirect
- Packages section below individual cards (Standard $35, Complete $55)
- `<VerificationBadges />` component: `variant="full"` and `variant="compact"`
- Used on: profile pages, listing cards, search results, group cards
- Settings page: toggle for badge visibility
