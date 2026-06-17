# Listing Verification (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each listing earnable trust badges (ID Verified, Live Photo) plus silent stolen/duplicate-photo detection, rolled into a listing verification level that soft-gates search ranking — mirroring the existing user verification system.

**Architecture:** A parallel `listing_verifications` table (keyed to `listing_id`) mirrors the existing `verifications` table. Pure, unit-tested modules handle level derivation, image hashing (difference-hash + Hamming distance), and address normalization. A server-side "silent checks" service runs on listing create/update, writing `verification_flags` and auto-creating system `reports`. The `id_owner` badge is derived from the poster's existing Certn `verification_level`. Live Photo is captured via in-app camera (Expo `expo-image-picker` camera source on mobile; `getUserMedia` on web). Search ranking deprioritizes unverified listings and excludes auto-flagged ones.

**Tech Stack:** Next.js (apps/web), Expo/React Native (apps/mobile), Supabase Postgres + RLS, TypeScript. Tests use the repo's `tsx` + `node:assert` convention (no jest/vitest). New runtime dep: `sharp` (image decode for hashing, apps/web only).

**Spec:** `docs/superpowers/specs/2026-06-17-listing-verification-design.md`

**Conventions discovered (follow these):**
- API routes use `withApiHandler` from `src/lib/api/with-handler.ts`; writes use `createServiceClient()`.
- Server logger: `src/lib/logger.ts`. No `console.*` (ESLint `no-console: warn`).
- Pure-logic tests: a `*.test.ts` run via a `package.json` script using `tsx` (pattern: `apps/mobile/src/lib/home/__tests__/use-home-signals.test.ts`, `apps/web/scripts/test-mojibake-patterns.ts`). Use `import { strict as assert } from 'node:assert'`, count passed/failed, `process.exit(failed ? 1 : 0)`.
- DB types live in BOTH `apps/web/src/types/database.ts` and `packages/shared/src/types/database.ts` — keep them in sync.
- Migrations: `supabase/migrations/NNN_name.sql`, next number is `035`. Existing enum `verification_status` = `('pending','completed','failed')` is reused.

---

## Task 1: Migration — schema for listing verification

**Files:**
- Create: `supabase/migrations/035_listing_verification.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 035_listing_verification.sql
-- Listing verification: per-signal badge rows + aggregate level + silent-check fields.

CREATE TYPE listing_verification_type AS ENUM ('id_owner', 'live_photo', 'mail', 'email', 'phone');
CREATE TYPE listing_verification_level AS ENUM ('unverified', 'verified', 'trusted');

CREATE TABLE listing_verifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    type         listing_verification_type NOT NULL,
    status       verification_status DEFAULT 'pending',
    result       JSONB,
    completed_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (listing_id, type)
);
CREATE INDEX idx_listing_verifications_listing ON listing_verifications(listing_id);

ALTER TABLE listings
    ADD COLUMN listing_verification_level listing_verification_level NOT NULL DEFAULT 'unverified',
    ADD COLUMN verification_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN photo_hashes TEXT[] NOT NULL DEFAULT '{}';

-- is_verified was an unused placeholder; the level enum replaces it.
ALTER TABLE listings DROP COLUMN IF EXISTS is_verified;

CREATE INDEX idx_listings_verification_level ON listings(listing_verification_level);

-- RLS
ALTER TABLE listing_verifications ENABLE ROW LEVEL SECURITY;

-- Public may read COMPLETED badge rows (badges are public).
CREATE POLICY listing_verifications_select_public ON listing_verifications
    FOR SELECT USING (status = 'completed');

-- Listing owner may read all their own rows (incl. pending).
CREATE POLICY listing_verifications_select_owner ON listing_verifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
    );

-- Writes are server-side only (service role bypasses RLS); no INSERT/UPDATE policy for anon/auth.
```

- [ ] **Step 2: Apply locally and verify it parses**

Run (psql against the local/dev Supabase DB, or via the project's existing apply path):
```bash
# from repo root, using the same env the other migrations use
psql "$DATABASE_URL" -f supabase/migrations/035_listing_verification.sql
```
Expected: `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY` all succeed, no error.
If no local DB is available, at minimum validate SQL syntax: `psql "$DATABASE_URL" -c "BEGIN; \i supabase/migrations/035_listing_verification.sql; ROLLBACK;"`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/035_listing_verification.sql
git commit -m "feat(listings): migration for listing verification table + level"
```

---

## Task 2: Extend database TypeScript types

**Files:**
- Modify: `apps/web/src/types/database.ts`
- Modify: `packages/shared/src/types/database.ts`

- [ ] **Step 1: Add the `listing_verifications` table type**

In BOTH files, inside the `Tables` object of the `Database` type, add an entry mirroring the existing `verifications` table shape. Per project memory, EVERY table needs a `Relationships: []` (or real relationships) or operations resolve to `never`:

```ts
listing_verifications: {
  Row: {
    id: string
    listing_id: string
    type: 'id_owner' | 'live_photo' | 'mail' | 'email' | 'phone'
    status: 'pending' | 'completed' | 'failed'
    result: Json | null
    completed_at: string | null
    expires_at: string | null
    created_at: string
  }
  Insert: {
    id?: string
    listing_id: string
    type: 'id_owner' | 'live_photo' | 'mail' | 'email' | 'phone'
    status?: 'pending' | 'completed' | 'failed'
    result?: Json | null
    completed_at?: string | null
    expires_at?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    listing_id?: string
    type?: 'id_owner' | 'live_photo' | 'mail' | 'email' | 'phone'
    status?: 'pending' | 'completed' | 'failed'
    result?: Json | null
    completed_at?: string | null
    expires_at?: string | null
    created_at?: string
  }
  Relationships: []
}
```

- [ ] **Step 2: Add the new columns to the `listings` table type**

In BOTH files, in the `listings` table `Row`/`Insert`/`Update`, add (and REMOVE the now-dropped `is_verified`):
```ts
// Row:
listing_verification_level: 'unverified' | 'verified' | 'trusted'
verification_flags: Json
photo_hashes: string[]
// Insert/Update: same keys, all optional (?:)
```
Search both files for `is_verified` and delete those three lines.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors referencing `listing_verifications`, `listing_verification_level`, or `is_verified`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/database.ts packages/shared/src/types/database.ts
git commit -m "feat(listings): add listing_verifications + level to Database types"
```

---

## Task 3: Level-derivation pure module (TDD)

**Files:**
- Create: `apps/web/src/lib/listings/verification-level.ts`
- Test: `apps/web/src/lib/listings/__tests__/verification-level.test.ts`
- Modify: `apps/web/package.json` (add test script)

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/listings/__tests__/verification-level.test.ts
// Run with `npm run test:listing-verification` (uses tsx).
import { strict as assert } from 'node:assert'
import { deriveListingLevel, type LVRow } from '../verification-level'

const done = (type: LVRow['type']): LVRow => ({ type, status: 'completed', expires_at: null })
const expired = (type: LVRow['type']): LVRow =>
  ({ type, status: 'completed', expires_at: '2000-01-01T00:00:00Z' })

interface Case { name: string; rows: LVRow[]; expected: string }
const NOW = '2026-06-17T00:00:00Z'
const CASES: Case[] = [
  { name: 'no rows → unverified', rows: [], expected: 'unverified' },
  { name: 'only email → unverified', rows: [done('email')], expected: 'unverified' },
  { name: 'id_owner → verified', rows: [done('id_owner')], expected: 'verified' },
  { name: 'live_photo → verified', rows: [done('live_photo')], expected: 'verified' },
  { name: 'id_owner + live_photo → trusted', rows: [done('id_owner'), done('live_photo')], expected: 'trusted' },
  { name: 'pending id_owner → unverified', rows: [{ type: 'id_owner', status: 'pending', expires_at: null }], expected: 'unverified' },
  { name: 'expired live_photo ignored', rows: [done('id_owner'), expired('live_photo')], expected: 'verified' },
]

let passed = 0, failed = 0
for (const c of CASES) {
  try {
    assert.equal(deriveListingLevel(c.rows, NOW), c.expected)
    passed++
  } catch (e) {
    failed++
    console.error(`FAIL: ${c.name} — ${(e as Error).message}`)
  }
}
console.log(`verification-level: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Add the test script and run it to confirm it fails**

In `apps/web/package.json` `scripts`, add:
```json
"test:listing-verification": "tsx src/lib/listings/__tests__/verification-level.test.ts"
```
Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: FAIL — `Cannot find module '../verification-level'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/src/lib/listings/verification-level.ts
export type ListingVerificationLevel = 'unverified' | 'verified' | 'trusted'
export type ListingVerificationType = 'id_owner' | 'live_photo' | 'mail' | 'email' | 'phone'

export interface LVRow {
  type: ListingVerificationType
  status: 'pending' | 'completed' | 'failed'
  expires_at: string | null
}

const STRONG: ListingVerificationType[] = ['id_owner', 'live_photo', 'mail']

function activeStrongTypes(rows: LVRow[], nowIso: string): Set<ListingVerificationType> {
  const now = new Date(nowIso).getTime()
  const set = new Set<ListingVerificationType>()
  for (const r of rows) {
    if (r.status !== 'completed') continue
    if (!STRONG.includes(r.type)) continue
    if (r.expires_at && new Date(r.expires_at).getTime() <= now) continue
    set.add(r.type)
  }
  return set
}

/** Derive a listing's aggregate verification level from its signal rows. */
export function deriveListingLevel(rows: LVRow[], nowIso: string): ListingVerificationLevel {
  const strong = activeStrongTypes(rows, nowIso)
  if (strong.size >= 2) return 'trusted'
  if (strong.size === 1) return 'verified'
  return 'unverified'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: `verification-level: 7 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/listings/verification-level.ts apps/web/src/lib/listings/__tests__/verification-level.test.ts apps/web/package.json
git commit -m "feat(listings): add deriveListingLevel pure module + tests"
```

---

## Task 4: Image difference-hash + Hamming distance (TDD)

**Files:**
- Create: `apps/web/src/lib/listings/image-hash.ts`
- Test: `apps/web/src/lib/listings/__tests__/image-hash.test.ts`
- Modify: `apps/web/package.json` (extend test script)

The perceptual hash is split into a PURE core (`dHashFromGray`, `hammingDistance`, `isNearDuplicate`) that takes a grayscale pixel array — fully unit-testable with no image library — and a separate sharp-backed loader added in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/listings/__tests__/image-hash.test.ts
import { strict as assert } from 'node:assert'
import { dHashFromGray, hammingDistance, isNearDuplicate } from '../image-hash'

// dHash compares each pixel to its right neighbor on a (w+1) x h grid.
// Build a 9x8 gradient (left→right increasing): every row yields 8 "left<right" → all 1 bits.
const W = 9, H = 8
const gradient: number[] = []
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gradient.push(x * 28)

let passed = 0, failed = 0
function check(name: string, fn: () => void) {
  try { fn(); passed++ } catch (e) { failed++; console.error(`FAIL: ${name} — ${(e as Error).message}`) }
}

check('gradient → all-ones hex (64 bits set)', () => {
  const h = dHashFromGray(gradient, W, H)
  assert.equal(h, 'ffffffffffffffff')
})
check('identical hashes → distance 0', () => {
  assert.equal(hammingDistance('ffffffffffffffff', 'ffffffffffffffff'), 0)
})
check('one nibble differs → distance counts differing bits', () => {
  // ...e vs ...f differ in 1 bit
  assert.equal(hammingDistance('fffffffffffffffe', 'ffffffffffffffff'), 1)
})
check('near-duplicate within threshold', () => {
  assert.equal(isNearDuplicate('fffffffffffffffe', 'ffffffffffffffff', 10), true)
})
check('different beyond threshold', () => {
  assert.equal(isNearDuplicate('0000000000000000', 'ffffffffffffffff', 10), false)
})

console.log(`image-hash: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Extend the test script and confirm failure**

Change the `test:listing-verification` script in `apps/web/package.json` to run both:
```json
"test:listing-verification": "tsx src/lib/listings/__tests__/verification-level.test.ts && tsx src/lib/listings/__tests__/image-hash.test.ts"
```
Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: FAIL — `Cannot find module '../image-hash'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/src/lib/listings/image-hash.ts
// Difference hash (dHash): downscale to (size+1) x size grayscale, compare each
// pixel to its right neighbor → size*size bits, serialized as hex.

export const DHASH_SIZE = 8 // → 64-bit hash
export const NEAR_DUPLICATE_THRESHOLD = 10 // Hamming distance; <= is "near duplicate"

/** Pure core: build a hex dHash from a grayscale pixel grid of width w=(size+1), height h=size. */
export function dHashFromGray(gray: number[], w: number, h: number): string {
  let bits = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      const left = gray[y * w + x]
      const right = gray[y * w + x + 1]
      bits += left < right ? '1' : '0'
    }
  }
  // bits.length === h * (w-1); pad to nibble and hex-encode.
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2).toString(16)
  }
  return hex
}

const POPCOUNT: number[] = Array.from({ length: 16 }, (_, n) =>
  ((n >> 0) & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1)
)

/** Hamming distance between two equal-length hex hashes. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)]
  }
  return d
}

export function isNearDuplicate(a: string, b: string, threshold = NEAR_DUPLICATE_THRESHOLD): boolean {
  return hammingDistance(a, b) <= threshold
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: both suites pass, `image-hash: 5 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/listings/image-hash.ts apps/web/src/lib/listings/__tests__/image-hash.test.ts apps/web/package.json
git commit -m "feat(listings): add dHash + hamming pure image-hash core + tests"
```

---

## Task 5: sharp-backed image loader

**Files:**
- Modify: `apps/web/package.json` (add `sharp` dependency)
- Modify: `apps/web/src/lib/listings/image-hash.ts` (add `hashImageUrl`)

- [ ] **Step 1: Add sharp**

Run: `npm install sharp --workspace=@nestmatch/web`
Expected: `sharp` appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Add the loader to image-hash.ts**

Append to `apps/web/src/lib/listings/image-hash.ts`:
```ts
import sharp from 'sharp'

/** Fetch an image URL and return its dHash, or null on failure (never throws). */
export async function hashImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const w = DHASH_SIZE + 1
    const h = DHASH_SIZE
    const gray = await sharp(buf)
      .resize(w, h, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer()
    return dHashFromGray(Array.from(gray), w, h)
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/lib/listings/image-hash.ts
git commit -m "feat(listings): add sharp-backed hashImageUrl loader"
```

---

## Task 6: Address normalization (TDD)

**Files:**
- Create: `apps/web/src/lib/listings/normalize-address.ts`
- Test: `apps/web/src/lib/listings/__tests__/normalize-address.test.ts`
- Modify: `apps/web/package.json` (extend test script)

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/listings/__tests__/normalize-address.test.ts
import { strict as assert } from 'node:assert'
import { normalizeAddressKey } from '../normalize-address'

let passed = 0, failed = 0
function eq(name: string, a: string, b: string) {
  try { assert.equal(a, b); passed++ } catch (e) { failed++; console.error(`FAIL: ${name} — ${(e as Error).message}`) }
}

const k = (addr: string, city: string, postal: string) => normalizeAddressKey({ address: addr, city, postal_code: postal })

eq('case + punctuation insensitive',
  k('123 Main St.', 'Toronto', 'M5V 2T6'),
  k('123 MAIN ST', 'toronto', 'm5v2t6'))
eq('whitespace collapsed',
  k('  456   Oak   Ave  ', 'Laval', 'H7N 1A1'),
  k('456 Oak Ave', 'Laval', 'h7n1a1'))
eq('different street → different key is NOT asserted equal',
  k('1 A St', 'X', 'A1A1A1') === k('2 B St', 'X', 'A1A1A1') ? 'same' : 'diff',
  'diff')
eq('null address yields stable empty-ish key without throwing',
  k('', 'Montreal', '') === k('', 'montreal', '') ? 'same' : 'diff',
  'same')

console.log(`normalize-address: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Extend the test script and confirm failure**

Append ` && tsx src/lib/listings/__tests__/normalize-address.test.ts` to the `test:listing-verification` script.
Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: FAIL — `Cannot find module '../normalize-address'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/src/lib/listings/normalize-address.ts
export interface AddressParts {
  address: string | null
  city: string | null
  postal_code: string | null
}

/** Canonical key for duplicate-address detection: lowercase, strip punctuation, collapse spaces. */
export function normalizeAddressKey(parts: AddressParts): string {
  const norm = (s: string | null) =>
    (s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const postal = (parts.postal_code ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  return [norm(parts.address), norm(parts.city), postal].join('|')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: all three suites pass; `normalize-address: 4 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/listings/normalize-address.ts apps/web/src/lib/listings/__tests__/normalize-address.test.ts apps/web/package.json
git commit -m "feat(listings): add normalizeAddressKey pure module + tests"
```

---

## Task 7: id_owner derivation helper

**Files:**
- Create: `apps/web/src/lib/listings/sync-verification.ts`

This module recomputes a listing's `listing_verifications` rows and aggregate level using a service-role client. Task 8 wires it into create; the Certn webhook hook (Task 11) reuses it.

- [ ] **Step 1: Write the module**

```ts
// apps/web/src/lib/listings/sync-verification.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { deriveListingLevel, type LVRow } from './verification-level'
import { logger } from '@/lib/logger'

type Client = SupabaseClient<Database>

/**
 * Upsert the id_owner signal for a listing based on the owner's user-level
 * verification, then recompute and persist the aggregate listing level.
 * Service-role client required (writes bypass RLS). Never throws.
 */
export async function syncListingIdOwner(
  supabase: Client,
  listingId: string,
  ownerVerificationLevel: 'basic' | 'verified' | 'trusted' | null | undefined,
  nowIso: string,
): Promise<void> {
  try {
    const ownerVerified = ownerVerificationLevel === 'verified' || ownerVerificationLevel === 'trusted'
    if (ownerVerified) {
      await supabase
        .from('listing_verifications')
        .upsert(
          { listing_id: listingId, type: 'id_owner', status: 'completed', completed_at: nowIso, expires_at: null },
          { onConflict: 'listing_id,type' },
        )
    } else {
      await supabase
        .from('listing_verifications')
        .delete()
        .eq('listing_id', listingId)
        .eq('type', 'id_owner')
    }
    await recomputeListingLevel(supabase, listingId, nowIso)
  } catch (err) {
    logger.error('syncListingIdOwner failed', { listingId, err: String(err) })
  }
}

/** Read all signal rows for a listing, derive the level, and persist it. */
export async function recomputeListingLevel(supabase: Client, listingId: string, nowIso: string): Promise<void> {
  const { data, error } = await supabase
    .from('listing_verifications')
    .select('type, status, expires_at')
    .eq('listing_id', listingId)
  if (error) {
    logger.error('recomputeListingLevel read failed', { listingId, err: error.message })
    return
  }
  const level = deriveListingLevel((data ?? []) as LVRow[], nowIso)
  await supabase.from('listings').update({ listing_verification_level: level }).eq('id', listingId)
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/listings/sync-verification.ts
git commit -m "feat(listings): add id_owner sync + level recompute helper"
```

---

## Task 8: Silent checks service (photo reuse + duplicate address)

**Files:**
- Create: `apps/web/src/lib/listings/silent-checks.ts`

- [ ] **Step 1: Write the module**

```ts
// apps/web/src/lib/listings/silent-checks.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { hashImageUrl, isNearDuplicate } from './image-hash'
import { normalizeAddressKey, type AddressParts } from './normalize-address'
import { logger } from '@/lib/logger'

type Client = SupabaseClient<Database>

// A sentinel system user id for auto-generated reports. Set SYSTEM_REPORTER_ID in env
// to a real auth.users row owned by the platform; if absent, auto-reports are skipped.
const SYSTEM_REPORTER_ID = process.env.SYSTEM_REPORTER_ID || ''

export interface SilentCheckResult {
  photoHashes: string[]
  flags: { photo_reuse?: Array<{ matched_listing_id: string; distance: number }>; duplicate_of?: string }
}

/**
 * Compute photo hashes, detect cross-owner photo reuse + duplicate addresses,
 * persist photo_hashes + verification_flags on the listing, and auto-file system
 * reports for any flags. Service-role client required. Never throws.
 */
export async function runSilentChecks(
  supabase: Client,
  listing: { id: string; user_id: string; photos: string[]; address: string | null; city: string | null; postal_code: string | null },
  nowIso: string,
): Promise<SilentCheckResult> {
  const result: SilentCheckResult = { photoHashes: [], flags: {} }
  try {
    // 1. Hash this listing's photos.
    const hashes = (await Promise.all((listing.photos ?? []).map((u) => hashImageUrl(u)))).filter(
      (h): h is string => !!h,
    )
    result.photoHashes = hashes

    // 2. Pull other active listings (different owner) for comparison.
    const { data: others } = await supabase
      .from('listings')
      .select('id, user_id, photo_hashes, address, city, postal_code')
      .neq('id', listing.id)
      .neq('user_id', listing.user_id)
      .eq('is_active', true)

    const reuse: Array<{ matched_listing_id: string; distance: number }> = []
    let duplicateOf: string | undefined
    const myKey = normalizeAddressKey(listing as AddressParts)

    for (const o of others ?? []) {
      // Photo reuse: any near-duplicate hash pair.
      for (const mine of hashes) {
        for (const theirs of (o.photo_hashes ?? []) as string[]) {
          if (isNearDuplicate(mine, theirs)) {
            reuse.push({ matched_listing_id: o.id, distance: 0 })
            break
          }
        }
      }
      // Duplicate address under a different account.
      if (!duplicateOf && listing.address && normalizeAddressKey(o as AddressParts) === myKey) {
        duplicateOf = o.id
      }
    }

    if (reuse.length) result.flags.photo_reuse = dedupeByListing(reuse)
    if (duplicateOf) result.flags.duplicate_of = duplicateOf

    // 3. Persist hashes + flags.
    await supabase
      .from('listings')
      .update({ photo_hashes: hashes, verification_flags: result.flags })
      .eq('id', listing.id)

    // 4. Auto-file a system report if anything was flagged.
    if ((result.flags.photo_reuse || result.flags.duplicate_of) && SYSTEM_REPORTER_ID) {
      const summary = buildSummary(result.flags)
      await supabase.from('reports').insert({
        reporter_id: SYSTEM_REPORTER_ID,
        reported_listing_id: listing.id,
        type: result.flags.duplicate_of ? 'scam' : 'fake',
        description: `[auto] ${summary}`,
        status: 'pending',
      })
    } else if (result.flags.photo_reuse || result.flags.duplicate_of) {
      logger.warn('listing auto-flagged but SYSTEM_REPORTER_ID unset; report skipped', {
        listingId: listing.id,
        flags: result.flags,
      })
    }
  } catch (err) {
    logger.error('runSilentChecks failed', { listingId: listing.id, err: String(err) })
  }
  return result
}

function dedupeByListing(items: Array<{ matched_listing_id: string; distance: number }>) {
  const seen = new Map<string, { matched_listing_id: string; distance: number }>()
  for (const i of items) if (!seen.has(i.matched_listing_id)) seen.set(i.matched_listing_id, i)
  return [...seen.values()]
}

function buildSummary(flags: SilentCheckResult['flags']): string {
  const parts: string[] = []
  if (flags.photo_reuse?.length) parts.push(`photo reuse vs ${flags.photo_reuse.map((r) => r.matched_listing_id).join(', ')}`)
  if (flags.duplicate_of) parts.push(`duplicate address of ${flags.duplicate_of}`)
  return parts.join('; ')
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors. (If `reports.type` union complains, confirm the `reports` Insert type allows `'scam'|'fake'` — it does per `report_type` enum.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/listings/silent-checks.ts
git commit -m "feat(listings): add silent photo-reuse + duplicate-address checks"
```

---

## Task 9: Wire verification into listing create

**Files:**
- Modify: `apps/web/src/app/api/listings/route.ts` (POST handler, after insert ~line 229)

- [ ] **Step 1: Import the helpers**

At the top of `route.ts` add:
```ts
import { syncListingIdOwner } from '@/lib/listings/sync-verification'
import { runSilentChecks } from '@/lib/listings/silent-checks'
```

- [ ] **Step 2: After the listing insert succeeds, run verification**

Immediately before `return apiResponse({ listing }, 201, requestId)`, insert:
```ts
// Listing verification (best-effort; never blocks listing creation).
const nowIso = new Date().toISOString()
const { data: ownerProfile } = await writeClient
  .from('profiles')
  .select('verification_level')
  .eq('user_id', userId!)
  .single()
await syncListingIdOwner(writeClient, listing.id, ownerProfile?.verification_level ?? null, nowIso)
await runSilentChecks(
  writeClient,
  { id: listing.id, user_id: userId!, photos: listingData.photos, address: listingData.address ?? null, city: listingData.city, postal_code: listingData.postal_code ?? null },
  nowIso,
)
// Re-read so the response reflects level + flags.
const { data: finalListing } = await writeClient.from('listings').select('*').eq('id', listing.id).single()
return apiResponse({ listing: finalListing ?? listing }, 201, requestId)
```
Remove the now-duplicate trailing `return apiResponse({ listing }, 201, requestId)`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck --workspace=@nestmatch/web && npm run lint --workspace=@nestmatch/web`
Expected: no errors; no new `no-console` warnings (we use `logger`).

- [ ] **Step 4: Manual verification**

Start dev (`npm run dev:web`), create a listing as an ID-verified user, and confirm via DB that:
- a `listing_verifications` row `type='id_owner', status='completed'` exists, and
- `listings.listing_verification_level = 'verified'`.
Create a second listing (different account) reusing the first's photo → confirm `verification_flags.photo_reuse` is set and (if `SYSTEM_REPORTER_ID` set) a `reports` row exists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/listings/route.ts
git commit -m "feat(listings): run id_owner + silent checks on listing create"
```

---

## Task 10: Soft-gate search ranking + exclude flagged

**Files:**
- Modify: `apps/web/src/app/api/listings/route.ts` (GET handler, ~lines 76-94 and result return)
- Modify: `apps/web/src/app/api/listings/public/route.ts` (apply the same ordering/exclusion if it serves public results)

- [ ] **Step 1: Change ordering and exclude auto-flagged listings**

In the GET handler, replace `.order('created_at', { ascending: false })` with verification-aware ordering, and exclude flagged listings from public (non-owner) results. After the `select(...)`:
```ts
// Rank verified listings higher; newest first within a level.
query = query
  .order('listing_verification_level', { ascending: false }) // trusted > verified > unverified (enum text sort)
  .order('created_at', { ascending: false })
```
NOTE: enum text ordering is `trusted` > `unverified` > `verified` alphabetically — WRONG. Instead select an explicit rank. Add a generated rank via a computed column is overkill; sort in JS after fetch:

Replace the JS-side: after `const { data: listings, error } = await query`, before returning:
```ts
const RANK: Record<string, number> = { trusted: 2, verified: 1, unverified: 0 }
const visible = (listings || []).filter((l: any) => {
  if (userId && l.user_id === userId) return true // owner sees own, even if flagged
  const flags = l.verification_flags || {}
  return !flags.photo_reuse && !flags.duplicate_of
})
visible.sort((a: any, b: any) => {
  const r = (RANK[b.listing_verification_level] ?? 0) - (RANK[a.listing_verification_level] ?? 0)
  return r !== 0 ? r : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
})
return apiResponse({ listings: visible }, 200, requestId)
```
And revert the `.order('listing_verification_level' ...)` line — keep only `.order('created_at', { ascending: false })` on the query (JS sort is authoritative). Do NOT expose `photo_hashes` in the public payload: after filtering, map each listing to omit `photo_hashes`:
```ts
const sanitized = visible.map(({ photo_hashes, ...rest }: any) => rest)
return apiResponse({ listings: sanitized }, 200, requestId)
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With ≥3 listings at mixed levels and one flagged: GET `/api/listings` returns trusted→verified→unverified order, the flagged one absent for non-owners, present for the owner, and no `photo_hashes` field in any item.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/listings/route.ts apps/web/src/app/api/listings/public/route.ts
git commit -m "feat(listings): soft-gate ranking + hide auto-flagged from public"
```

---

## Task 11: Hook id_owner backfill into Certn webhook

**Files:**
- Modify: `apps/web/src/app/api/webhooks/certn/route.ts` (after user verification_level is recalculated)

- [ ] **Step 1: Locate the level-update point**

Find where the webhook sets the user's `profiles.verification_level` after a completed check (per the explore notes, this is the level-recalculation block).

- [ ] **Step 2: Backfill the user's listings**

After the profile level is updated, add:
```ts
import { syncListingIdOwner } from '@/lib/listings/sync-verification'
// ...after newLevel is computed and written to profiles:
const nowIso = new Date().toISOString()
const { data: userListings } = await serviceClient
  .from('listings')
  .select('id')
  .eq('user_id', verifiedUserId) // the user id resolved earlier in the handler
for (const l of userListings ?? []) {
  await syncListingIdOwner(serviceClient, l.id, newLevel, nowIso)
}
```
Use the handler's existing service client + resolved user id variable names (adjust `serviceClient`/`verifiedUserId`/`newLevel` to match the file).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/webhooks/certn/route.ts
git commit -m "feat(listings): backfill listing id_owner when user gets verified"
```

---

## Task 12: Live Photo — record endpoint

**Files:**
- Create: `apps/web/src/app/api/listings/[id]/live-photo/route.ts`

A POST endpoint the client calls after an in-app camera capture is uploaded. It marks the `live_photo` signal completed and recomputes the level. (The image upload itself reuses the existing listing-photo upload path; this endpoint records the verification + capture metadata.)

- [ ] **Step 1: Write the route**

```ts
// apps/web/src/app/api/listings/[id]/live-photo/route.ts
import { withApiHandler } from '@/lib/api/with-handler'
import { apiResponse } from '@/lib/api/response'
import { createServiceClient } from '@/lib/supabase/service'
import { recomputeListingLevel } from '@/lib/listings/sync-verification'
import { parseBody } from '@/lib/api/parse'
import { z } from 'zod'

const bodySchema = z.object({
  photoUrl: z.string().url(),
  capturedAt: z.string(),
  source: z.literal('camera'),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const POST = withApiHandler(
  async (req, { userId, params, requestId }) => {
    const listingId = params!.id as string
    const body = await parseBody(req, bodySchema)
    const supabase = createServiceClient()

    // Ownership check.
    const { data: listing } = await supabase.from('listings').select('id, user_id').eq('id', listingId).single()
    if (!listing || listing.user_id !== userId) {
      return apiResponse({ error: 'Not found' }, 404, requestId)
    }

    const nowIso = new Date().toISOString()
    await supabase.from('listing_verifications').upsert(
      {
        listing_id: listingId,
        type: 'live_photo',
        status: 'completed',
        completed_at: nowIso,
        expires_at: null,
        result: { photoUrl: body.photoUrl, capturedAt: body.capturedAt, source: body.source, lat: body.lat ?? null, lng: body.lng ?? null },
      },
      { onConflict: 'listing_id,type' },
    )
    await recomputeListingLevel(supabase, listingId, nowIso)
    return apiResponse({ ok: true }, 200, requestId)
  },
  { rateLimit: 'listingCreate' },
)
```
Confirm `params` is available on the handler context; if the project passes route params differently (e.g. second arg), match the sibling `apps/web/src/app/api/listings/[id]/route.ts` signature exactly.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 3: Manual verification**

POST a valid body for an owned listing → `listing_verifications` gets a completed `live_photo` row and the level rises (to `trusted` if already `id_owner`).

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/api/listings/[id]/live-photo/route.ts"
git commit -m "feat(listings): add live-photo verification record endpoint"
```

---

## Task 13: Listing verification badges UI (web)

**Files:**
- Create: `apps/web/src/components/listing-verification-badges.tsx`
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx` (add the block near the existing host Trust & Safety section)

- [ ] **Step 1: Write the component (mirrors verification-badges.tsx)**

```tsx
// apps/web/src/components/listing-verification-badges.tsx
'use client'

import { Shield, Camera, Mail, Phone, Award, ShieldCheck } from 'lucide-react'

interface ListingVerificationBadgesProps {
  level?: 'unverified' | 'verified' | 'trusted'
  verifications?: Array<{ type: string; status: string }>
  variant?: 'full' | 'compact'
}

const BADGE_CONFIG = [
  { key: 'id_owner', label: 'ID Verified', icon: Shield, color: 'text-secondary bg-secondary/10' },
  { key: 'live_photo', label: 'Live Photo', icon: Camera, color: 'text-secondary bg-secondary/10' },
  { key: 'mail', label: 'Address Verified', icon: Mail, color: 'text-secondary bg-secondary/10' },
  { key: 'phone', label: 'Phone', icon: Phone, color: 'text-on-surface-variant bg-surface-container' },
] as const

export function ListingVerificationBadges({
  level = 'unverified',
  verifications = [],
  variant = 'full',
}: ListingVerificationBadgesProps) {
  const completed = new Set(verifications.filter((v) => v.status === 'completed').map((v) => v.type))
  const badges = BADGE_CONFIG.filter((b) => completed.has(b.key))
  const isTrusted = level === 'trusted'

  if (variant === 'compact') {
    if (level === 'unverified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
          Unverified
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isTrusted ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
        {isTrusted ? <Award className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
        {isTrusted ? 'Trusted' : 'Verified'}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {isTrusted && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Award className="h-3.5 w-3.5" />
          Trusted Listing
        </span>
      )}
      {badges.map((b) => {
        const Icon = b.icon
        return (
          <span key={b.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}>
            <Icon className="h-3 w-3" />
            {b.label}
          </span>
        )
      })}
      {level === 'unverified' && badges.length === 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
          Unverified
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Surface it on the listing detail page**

In `apps/web/src/app/(app)/listings/[id]/page.tsx`, fetch the listing's `listing_verification_level` and its `listing_verifications` rows (add to the existing listing query/select), then render near the Trust & Safety section:
```tsx
<ListingVerificationBadges level={listing.listing_verification_level} verifications={listingVerifications} />
```
Add the import: `import { ListingVerificationBadges } from '@/components/listing-verification-badges'`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck --workspace=@nestmatch/web && npm run lint --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Open a verified listing's detail page → see "ID Verified"/"Live Photo"/"Trusted Listing" chips; open an unverified one → see "Unverified".

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listing-verification-badges.tsx "apps/web/src/app/(app)/listings/[id]/page.tsx"
git commit -m "feat(listings): listing verification badges on detail page"
```

---

## Task 14: Compact badge on listing cards (web)

**Files:**
- Modify: the listing card component (find via `grep -rl "listing" apps/web/src/components | xargs grep -l "price"`, likely `apps/web/src/components/listing-card.tsx`)

- [ ] **Step 1: Render the compact badge**

Import `ListingVerificationBadges` and render `<ListingVerificationBadges level={listing.listing_verification_level} verifications={listing.listing_verifications ?? []} variant="compact" />` in the card header/footer. Ensure the listing list query includes `listing_verification_level` (it does via `select('*')`).

- [ ] **Step 2: Typecheck + manual check**

Run: `npm run typecheck --workspace=@nestmatch/web`. Then view the search/listing grid → verified cards show a "Verified"/"Trusted" chip, others "Unverified".

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/listing-card.tsx
git commit -m "feat(listings): compact verification chip on listing cards"
```

---

## Task 15: Live Photo capture (mobile)

**Files:**
- Modify: the mobile listing create/edit screen (find via `grep -rl "createListing\|photos" apps/mobile/src/app apps/mobile/src/features 2>/dev/null`)
- Possibly create: `apps/mobile/src/lib/listings/live-photo.ts` (capture helper)

- [ ] **Step 1: Add a camera-only capture helper using expo-image-picker**

```ts
// apps/mobile/src/lib/listings/live-photo.ts
import * as ImagePicker from 'expo-image-picker'

export interface LiveCapture { uri: string; capturedAt: string }

/** Launch the camera (no gallery) for a Live Photo capture. Returns null if cancelled/denied. */
export async function captureLivePhoto(nowIso: string): Promise<LiveCapture | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return null
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7, exif: true })
  if (res.canceled || !res.assets?.[0]) return null
  return { uri: res.assets[0].uri, capturedAt: nowIso }
}
```
Note: `nowIso` is passed in (the workflow/test harness avoids `Date.now()` in shared libs; in the screen, compute `new Date().toISOString()` at the call site).

- [ ] **Step 2: Wire into the create/edit screen**

Add a "Take Live Photo (boosts trust)" button that calls `captureLivePhoto`, uploads the resulting image via the existing photo-upload path, then POSTs to `/api/listings/[id]/live-photo` with `{ photoUrl, capturedAt, source: 'camera' }`. Use the app's existing API client (find via `grep -rl "fetch\|apiClient" apps/mobile/src/lib`).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=@nestmatch/mobile`
Expected: no errors.

- [ ] **Step 4: Manual verification (Expo)**

In the running app, create a listing, tap "Take Live Photo", capture → confirm the listing's level becomes `trusted` (if ID-verified) and the Live Photo badge shows.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/listings/live-photo.ts <screen-file>
git commit -m "feat(mobile): live photo capture for listing verification"
```

---

## Task 16: Edit re-verification (invalidate signals on material edit)

**Files:**
- Modify: `apps/web/src/app/api/listings/[id]/route.ts` (PUT/PATCH handler)

- [ ] **Step 1: On photo or address change, invalidate + re-run**

In the update handler, after the listing row is updated, compare incoming vs previous:
```ts
import { runSilentChecks } from '@/lib/listings/silent-checks'
import { recomputeListingLevel } from '@/lib/listings/sync-verification'
// ...
const nowIso = new Date().toISOString()
const photosChanged = JSON.stringify(prev.photos) !== JSON.stringify(updated.photos)
const addressChanged = prev.address !== updated.address || prev.postal_code !== updated.postal_code
if (photosChanged) {
  // Live photo must be recaptured; expire it.
  await writeClient.from('listing_verifications').update({ expires_at: nowIso })
    .eq('listing_id', updated.id).eq('type', 'live_photo')
  await runSilentChecks(writeClient, { id: updated.id, user_id: updated.user_id, photos: updated.photos, address: updated.address, city: updated.city, postal_code: updated.postal_code }, nowIso)
}
if (addressChanged) {
  await writeClient.from('listing_verifications').update({ expires_at: nowIso })
    .eq('listing_id', updated.id).eq('type', 'mail')
}
await recomputeListingLevel(writeClient, updated.id, nowIso)
```
(`prev` = the listing row before update; fetch it at the top of the handler if not already available.)

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck --workspace=@nestmatch/web && npm run lint --workspace=@nestmatch/web`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Edit a `trusted` listing's photos → `live_photo` row gets `expires_at` set, level drops to `verified`; silent checks re-run on the new photos.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/api/listings/[id]/route.ts"
git commit -m "feat(listings): invalidate live_photo/mail on material edits"
```

---

## Task 17: Full verification pass + run all unit tests

- [ ] **Step 1: Run the pure-logic test suite**

Run: `npm run test:listing-verification --workspace=@nestmatch/web`
Expected: all three suites pass (verification-level, image-hash, normalize-address), 0 failed.

- [ ] **Step 2: Typecheck + lint both workspaces**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit any fixes, then summarize**

Confirm every spec requirement is implemented: badges (ID/Live Photo), silent photo-reuse + duplicate detection, auto-flag reports, soft-gate ranking, badge UI (web detail + cards), mobile live-photo capture, edit invalidation. Mail Verified + external reverse-image search remain Phase 2 (intentionally out of scope).

---

## Phase 2 (NOT in this plan — future)

- Mail Verified postcard flow (Lob integration, `type='mail'`).
- External reverse-image search adapter (TinEye / Google Vision web detection) behind `process.env`, feeding the same `verification_flags.photo_reuse`.
- Revisit AI-image detection.
- Mobile badge display parity on listing cards/detail.
