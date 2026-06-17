# Listing Verification — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorm) → ready for implementation plan
**Author:** Rob + Claude

## Problem

NestMatch lets anyone post a listing. As we open posting up, two fraud vectors threaten trust:

1. **Ownership/control fraud** — someone advertises a property they don't own or control.
2. **Fake / AI-generated listings** — photos lifted from Zillow/other sites, or a plausible
   description for a unit that doesn't exist.

We already verify *people* well (Certn-backed ID/criminal/credit → `basic`/`verified`/`trusted`
levels, surfaced via `VerificationBadge`). We want an **analogous, low-friction system for
listings**. It must not be intrusive: honest posters should breeze through, and many legitimate
posters are subletters who hold no deed, so we cannot demand ownership documents.

## Goals

- Give each listing independent, earnable **trust badges** (mirrors `verification-badges.tsx`).
- Roll those badges up into an aggregate **listing verification level** (mirrors user levels).
- Run **silent background checks** that catch stolen/duplicate media with zero friction for honest
  posters, feeding moderation rather than blocking.
- **Soft-gate** the marketplace: anyone can post immediately, but unverified/flagged listings are
  marked and deprioritized in search — never hard-blocked from creation.

## Non-Goals

- Hard gating (a listing being invisible until it passes a bar). We chose the soft gate.
- AI-image detection — too unreliable to act on today. Explicitly deferred.
- Mailed-postcard ("Mail Verified") flow — designed in, **built in a later phase** (needs a
  print/mail vendor like Lob; pointless with zero live listings).

## Threat → Signal Map

| Threat | Signal | Phase |
| --- | --- | --- |
| Ownership/control fraud | **ID Verified** (poster is Certn `verified`/`trusted`) | 1 |
| Ownership/control fraud | **Live Photo** (in-app camera capture w/ metadata) | 1 |
| Ownership/control fraud | **Mail Verified** (postcard code to street address) | 2 |
| Fake / stolen media | **Photo originality** (perceptual hash vs other listings; reverse-image vs web) | 1 (internal) / 2 (web) |
| Duplicate scams | **Duplicate-listing detection** (same address / same photos, different accounts) | 1 |

Positive, poster-earned **badges:** ID Verified, Live Photo, (later) Mail Verified, plus carried-over
Email/Phone. Photo-originality and duplicate detection are **silent signals** that feed moderation,
not public badges.

## Architecture Decision — Data Storage

**Chosen: a parallel `listing_verifications` table** keyed to `listing_id`, mirroring the existing
`verifications` table. Rejected alternatives: generalizing `verifications` with a nullable
`listing_id` (muddies RLS/types, entangles user PII with listing rows) and bare boolean columns on
`listings` (lossy — no audit trail, results, or expiry). The parallel table reuses a pattern the
codebase already proves out and keeps listing-verification lifecycle/RLS independent from user-PII
verification.

## Data Model

New enum + table + listings columns. New migration `035_listing_verification.sql`.

```sql
CREATE TYPE listing_verification_type AS ENUM ('id_owner', 'live_photo', 'mail', 'email', 'phone');
CREATE TYPE listing_verification_level AS ENUM ('unverified', 'verified', 'trusted');
-- reuse existing verification_status ENUM ('pending','completed','failed')

CREATE TABLE listing_verifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    type         listing_verification_type NOT NULL,
    status       verification_status DEFAULT 'pending',
    result       JSONB,            -- capture metadata / provider payload / postcard id
    completed_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,      -- set when a material edit invalidates a signal (see §Re-verification)
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (listing_id, type)      -- one active row per signal per listing
);
CREATE INDEX idx_listing_verifications_listing ON listing_verifications(listing_id);

ALTER TABLE listings
    ADD COLUMN listing_verification_level listing_verification_level NOT NULL DEFAULT 'unverified',
    ADD COLUMN verification_flags JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { photo_reuse: [...], duplicate_of: uuid }
    ADD COLUMN photo_hashes TEXT[] NOT NULL DEFAULT '{}';             -- perceptual hashes for dup detection
-- Drop is_verified to avoid two sources of truth; level != 'unverified' replaces it.
ALTER TABLE listings DROP COLUMN is_verified;
```

`is_verified` is currently unused (confirmed by grep), so dropping it is safe. All code paths read
the new `listing_verification_level`.

### RLS

- `listing_verifications`: SELECT allowed to anyone for `completed` rows of active listings (badges
  are public); INSERT/UPDATE only via service role (server-initiated verification flows), plus the
  listing owner may read their own pending rows. Mirror the access shape of `verifications`.
- `verification_flags` / `photo_hashes` on `listings`: written by service role only; `photo_hashes`
  not exposed in public selects.

## Level Derivation

Pure function `deriveListingLevel(verifications): listing_verification_level`, mirroring the
user-side recalculation in the Certn webhook:

- `unverified` — no completed strong signal.
- `verified` — **either** `id_owner` **or** `live_photo` completed (and not expired).
- `trusted` — `id_owner` **and** `live_photo` completed (Mail counts toward trusted once Phase 2
  ships).

Recomputed and written to `listings.listing_verification_level` whenever a `listing_verifications`
row changes status or expires, and on listing edit. Email/Phone are minor badges and do not by
themselves raise the level above `unverified`.

## Signals — Phase 1

### ID Verified (`id_owner`)
Derived from the poster's existing user verification. When a listing is created/updated, if the
owner's `profiles.verification_level` is `verified` or `trusted`, upsert a `listing_verifications`
row `type='id_owner', status='completed'`. If the user later gets ID-verified, a backfill on their
verification completion (hook into the existing Certn webhook level recalculation) marks their
active listings. No new poster friction — it's a derivation.

### Live Photo (`live_photo`)
Poster captures one or more photos through an **in-app camera** (no gallery upload) at listing
creation/edit:
- **Mobile** (`apps/native` / Expo): `expo-camera` / `expo-image-picker` with camera source only.
- **Web** (`apps/web`): `getUserMedia` capture component.

The capture records metadata (client timestamp, optional coarse geolocation, capture flag) into
`result`. We **do not** claim cryptographic anti-spoofing — the friction + metadata + "must be on
site" is the signal. On success, upsert `live_photo, status='completed'`, store the captured image
among the listing photos (tagged as live-captured).

### Photo Originality — internal (silent)
On listing create / photo change, compute a **perceptual hash (pHash)** per photo server-side, store
in `listings.photo_hashes`. Compare against all other active listings' hashes (Hamming distance
threshold). A near-match on a *different* owner's listing → write
`verification_flags.photo_reuse = [{matched_listing_id, distance}]` and auto-create a system report.

### Duplicate-listing detection (silent)
Normalize address (lowercase, strip punctuation, canonical postal code) and compare against active
listings. Same normalized address under a **different account**, or pHash photo overlap → set
`verification_flags.duplicate_of = <listing_id>` and auto-create a system report.

### Moderation wiring
Silent flags reuse the existing `reports` table: insert a system-generated report
(`reported_listing_id` set, `type='fake'` or `'scam'`, `reporter_id` = a system/service principal,
`description` = machine summary, `status='pending'`). This drops flagged listings into the same
review queue humans already use. Flagged listings are deprioritized/hidden in search pending review.

## Soft-Gate Ranking

`GET /api/listings` (and mobile equivalent) ordering changes from pure `created_at DESC` to:

1. Listings with non-empty `verification_flags` (auto-flagged) are **excluded** from public results
   until a report is resolved (owner still sees their own).
2. Remaining sorted by `listing_verification_level` rank (`trusted` > `verified` > `unverified`),
   then `created_at DESC`.

Each card/detail shows the listing's badges (or an explicit "Unverified" marker), parallel to the
user `VerificationBadge`.

## Re-verification on Edit

Material edits invalidate the signals they affect (set `expires_at = now()`, status effectively
stale, level recomputed):
- Editing **photos** → invalidates `live_photo` (must re-capture) and recomputes `photo_hashes` +
  re-runs originality/duplicate checks.
- Editing **address** → invalidates `mail` (Phase 2) and re-runs duplicate detection.
- `id_owner` is tied to the user, not listing content — never invalidated by listing edits.

## UI

- New `ListingVerificationBadges` component mirroring `components/verification-badges.tsx`: renders
  earned badges (ID Verified / Live Photo / Mail / Email / Phone) + aggregate level chip.
- Listing detail page: a "Listing Trust & Safety" block analogous to the host one.
- Listing cards: compact level chip or "Unverified" marker.
- Listing create/edit flow: Live Photo capture step + an explainer of how to earn badges.

## Phasing

**Phase 1 (this effort, all software):**
migration `035` · `id_owner` derivation (+ Certn-webhook backfill hook) · Live Photo capture
(mobile + web) + badge · internal pHash photo-originality + address/photo duplicate detection ·
auto-flag into `reports` · level derivation · soft-gate ranking · badge UI.

**Phase 2 (later):**
Mail Verified postcard flow (Lob) · external reverse-image search provider (TinEye/Google Vision
web detection) behind an env-gated adapter · revisit AI-image detection.

## Testing

- Unit: `deriveListingLevel` truth table; pHash compare / Hamming threshold; address normalization;
  edit-invalidation rules.
- API: create-listing triggers id_owner derivation; photo-reuse across owners produces a flag +
  report; duplicate address flags; ranking order; RLS (public can read completed badges, cannot read
  `photo_hashes`).
- Component: `ListingVerificationBadges` renders correct badges per fixture; "Unverified" marker.
- Integration: edit photos → live_photo invalidated + re-hash; soft-gate excludes flagged listings.

## Open Questions / Assumptions

- pHash library choice for Node (e.g. `sharp` + a pHash impl, or `image-hash`) — decide in plan.
- Live Photo on web depends on HTTPS `getUserMedia`; acceptable.
- System/service principal for auto-generated reports — reuse service role + a sentinel reporter id;
  confirm `reports.reporter_id` FK allows it or relax constraint in migration `035`.
