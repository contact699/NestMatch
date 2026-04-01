# CERTN Verification Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate CERTN API for ID verification, criminal background checks, and credit (Equifax) checks — Canada only — using the PM (Property Management) invite flow.

**Architecture:** Rewrite the existing `certn.ts` service to use CERTN's PM API (`/api/v1/pm/applications/invite/`). Direct Bearer token auth with CertnCentric API key. CERTN emails applicants to complete checks; webhook receives results. Store all results in the existing `verifications` table. Enable the "Coming Soon" UI cards for criminal and credit.

**Tech Stack:** Next.js API routes, Supabase (PostgreSQL), CERTN PM API, TypeScript

---

## Task 1: Add CERTN API Key to Environment

**Files:**
- Modify: `apps/web/.env.local`
- Modify: `apps/web/.env.local.example`

**Step 1: Add the API key to .env.local**

Add after the existing env vars:
```
CERTN_API_KEY=oGhfKqcs.D0D6QKhom5oun2y5u9Mrn4QxixlFirO3
```

**Step 2: Verify .env.local.example already has the placeholder**

It already has `CERTN_API_KEY=your_certn_api_key` — no change needed.

---

## Task 2: Rewrite CERTN Service (`certn.ts`)

**Files:**
- Modify: `apps/web/src/lib/services/certn.ts`

**Step 1: Rewrite the service**

Replace the entire file with a service that supports:
- PM API base URL: `https://api.certn.co/api/v1/pm/`
- Direct Bearer auth with the API key
- `initiateVerification(type, email, firstName?, lastName?)` — unified invite function that sets the right request flags
- `checkApplicationStatus(applicationId)` — poll for status
- `mapCertnStatus()` — existing, kept as-is
- Types for all CERTN responses including PM risk scores

Key request flags:
- ID: `request_identity_verification: true`
- Criminal: `request_criminal_record_check: true`
- Credit: `request_equifax: true`

**Step 2: Run type check**

Run: `cd apps/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/lib/services/certn.ts
git commit -m "feat: rewrite certn service for PM API with criminal + credit support"
```

---

## Task 3: Add Rate Limit Entries for New Check Types

**Files:**
- Modify: `apps/web/src/lib/rate-limit.ts`

**Step 1: Add rate limits**

Add after `idVerify` line:
```typescript
criminalCheck: { maxRequests: 2, windowSeconds: 86400 },  // 2 per day
creditCheck: { maxRequests: 2, windowSeconds: 86400 },     // 2 per day
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/rate-limit.ts
git commit -m "feat: add rate limits for criminal and credit checks"
```

---

## Task 4: Create Criminal Background Check API Route

**Files:**
- Create: `apps/web/src/app/api/verify/criminal/initiate/route.ts`

**Step 1: Create the route**

Pattern matches existing `verify/id/initiate/route.ts`:
- Auth required, rate limited (`criminalCheck`)
- Fetch profile, check for existing pending/completed criminal verification
- Call `initiateVerification('criminal', email, firstName, lastName)`
- Insert into `verifications` table with `type: 'criminal'`
- Audit log with `action: 'verification_start'`, `resourceType: 'criminal_check'`

**Step 2: Commit**

```bash
git add apps/web/src/app/api/verify/criminal/initiate/route.ts
git commit -m "feat: add criminal background check initiation endpoint"
```

---

## Task 5: Create Credit Check API Route

**Files:**
- Create: `apps/web/src/app/api/verify/credit/initiate/route.ts`

**Step 1: Create the route**

Same pattern as criminal:
- Auth required, rate limited (`creditCheck`)
- Fetch profile, check for existing pending/completed credit verification
- Call `initiateVerification('credit', email, firstName, lastName)`
- Insert into `verifications` table with `type: 'credit'`
- Audit log with `action: 'verification_start'`, `resourceType: 'credit_check'`

**Step 2: Commit**

```bash
git add apps/web/src/app/api/verify/credit/initiate/route.ts
git commit -m "feat: add credit check initiation endpoint"
```

---

## Task 6: Update ID Verification Route to Use New Service

**Files:**
- Modify: `apps/web/src/app/api/verify/id/initiate/route.ts`

**Step 1: Update import and call**

Change from `initiateIDVerification(email, firstName, lastName)` to `initiateVerification('id', email, firstName, lastName)`.

**Step 2: Commit**

```bash
git add apps/web/src/app/api/verify/id/initiate/route.ts
git commit -m "refactor: update ID verification to use unified certn service"
```

---

## Task 7: Rewrite Webhook Handler for All Check Types

**Files:**
- Modify: `apps/web/src/app/api/webhooks/certn/route.ts`

**Step 1: Rewrite webhook handler**

Key changes:
- Use `withApiHandler` with `webhook` config for idempotency (currently raw handler)
- Determine verification type from the CERTN response data (check which flags were requested)
- Store full result payload in `verifications.result` JSONB
- For completed checks: update `verification_level` on profile
- For credit: store PM risk scores (damage_to_property, eviction_potential, etc.)
- Use service client for writes (webhook has no user auth)

**Step 2: Commit**

```bash
git add apps/web/src/app/api/webhooks/certn/route.ts
git commit -m "feat: rewrite certn webhook to handle all check types with idempotency"
```

---

## Task 8: Update Verify Status Endpoint

**Files:**
- Modify: `apps/web/src/app/api/verify/status/route.ts`

**Step 1: Return profile fields needed by the frontend**

Add `name, profile_photo, city, province, occupation, created_at` to the profile select query (the frontend `VerificationStatus` interface expects these but the API only returns a subset).

**Step 2: Commit**

```bash
git add apps/web/src/app/api/verify/status/route.ts
git commit -m "fix: return full profile fields in verify status endpoint"
```

---

## Task 9: Enable Criminal and Credit in the Frontend

**Files:**
- Modify: `apps/web/src/app/(app)/verify/page.tsx`

**Step 1: Add state and handlers for criminal and credit**

Add:
- `isInitiatingCriminal` / `criminalError` state
- `isInitiatingCredit` / `creditError` state
- `handleInitiateCriminalCheck()` — POST to `/api/verify/criminal/initiate`
- `handleInitiateCreditCheck()` — POST to `/api/verify/credit/initiate`

**Step 2: Update the Credit Standing card**

Replace `<Button disabled>Coming Soon</Button>` with a working button that calls `handleInitiateCreditCheck()`, with pending/error states.

**Step 3: Update the Criminal History card**

Replace `<Button disabled>Coming Soon</Button>` with a working button that calls `handleInitiateCriminalCheck()`, with pending/error states.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/verify/page.tsx
git commit -m "feat: enable criminal and credit verification in Trust Center UI"
```

---

## Task 10: Configure Webhook URL in CERTN Dashboard

**Manual step** — not code. The user needs to:
1. Go to `client.certn.co` → Settings → Integrations → Webhooks tab
2. Add webhook URL: `https://<your-domain>/api/webhooks/certn`
3. Note any webhook secret and add it to `.env.local` as `CERTN_WEBHOOK_SECRET`

---

## Task 11: Verification & Smoke Test

**Step 1: Start dev server**

Run: `cd apps/web && pnpm dev`

**Step 2: Test the verify status endpoint**

```bash
curl http://localhost:3000/api/verify/status
```

Expected: Returns profile + verifications array.

**Step 3: Test ID verification initiate**

Navigate to `/verify` in browser, click "Start Verification" on Government ID card.
Expected: Button changes to "Check Status", CERTN invitation email sent.

**Step 4: Test criminal check initiate**

Click "Start Check" on Criminal History card.
Expected: Button changes to pending state, CERTN invitation sent.

**Step 5: Test credit check initiate**

Click "Start Check" on Credit Standing card.
Expected: Button changes to pending state, CERTN invitation sent.

---

## Notes

- **Canada only**: CERTN's `request_criminal_record_check` is RCMP-based (Canada). `request_equifax` is Equifax Canada. No special geo-fencing needed — these are inherently Canadian checks.
- **Consent**: The invite flow handles consent — CERTN's email includes consent forms.
- **Webhook URL**: Must be configured manually in CERTN dashboard (Task 10).
- **API key expires**: April 1, 2027 — set a reminder.
