# Launch QA Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all code-fixable findings from the 2026-08-19 full-app QA (web + mobile) so the mobile apps can pass App Store / Play Store review and the web app's live bugs are closed.

**Architecture:** Four fix clusters with strictly disjoint file ownership: W1 (web frontend), W2 (web API hardening), M1 (mobile store compliance + auth + account-deletion backend), M2 (mobile functional bugs, runs after M1). W1/W2/M1 run in parallel; M2 depends on M1 (shared lib + app.json). A Codex review of the full diff follows, then a verification suite.

**Tech Stack:** Next.js 16 App Router + Supabase + Stripe (apps/web), Expo SDK 54 / RN 0.81 / expo-router 6 (apps/mobile).

**Spec:** The QA findings report (published artifact "NestMatch Launch QA", 2026-08-19). Finding references (file:line) are repeated inline below, so this plan is self-contained.

## Global Constraints

- Do NOT commit anything. Leave all changes in the working tree. The tree already has uncommitted changes (profile hardening, migrations 038/039) — build on top of them, never revert them.
- Do NOT touch files owned by another cluster (ownership lists below are exhaustive).
- Web API routes use the `withApiHandler` pattern (`apps/web/src/lib/api/with-handler.ts`); server logger is `src/lib/logger.ts` (no console.log — ESLint warns).
- Mobile talks to the web API with Bearer auth (Supabase access token) via `apps/mobile/src/lib/api.ts` — reuse that helper for new calls.
- `HandlerContext.userId` is `string | undefined`; assert with `!` only after the auth guard.
- Match existing code style; no drive-by refactors.
- Verification at the end of each cluster: `cd apps/web && npx tsc --noEmit && npm test` (web) or `cd apps/mobile && npx tsc --noEmit` (mobile). All must pass.

---

### Task W1: Web frontend fixes

**Files (exhaustive ownership):**
- Modify: `apps/web/src/components/landing/landing-nav.tsx`
- Modify: `apps/web/src/components/landing/footer.tsx`
- Modify: `apps/web/src/components/landing/hero-section.tsx`
- Delete: `apps/web/src/components/landing/stats-section.tsx`, `apps/web/src/components/landing/newcomer-section.tsx` (and their exports in `components/landing/index.ts`)
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/src/app/(app)/admin/layout.tsx`
- Modify: `apps/web/src/app/(app)/reviews/page.tsx`
- Modify: `apps/web/src/app/(app)/discover/page.tsx`
- Modify: `apps/web/src/app/(app)/settings/page.tsx`
- Modify: `apps/web/src/app/(app)/expenses/page.tsx`
- Modify: `apps/web/src/app/(app)/quiz/page.tsx` (or its step components)
- Modify: `apps/web/src/app/(app)/groups/page.tsx` (or the create-group modal component)
- Modify: toast provider config (wherever the toaster is mounted, likely in a layout/provider file — find `<Toaster`)

**Interfaces:**
- Consumes: `POST /api/account/delete` (created by M1) — authenticated, no body, returns `{ deleted: true }` on 200; sign the user out client-side afterwards.
- Produces: nothing other tasks rely on.

- [ ] **Fix 404 links.** `landing-nav.tsx:53,59`: replace the logged-in IA for anonymous visitors — links become "How it works" → `/#how-it-works` (verify the landing section id; if none, add one to the how-it-works section), "Browse listings" → `/search`, "Find roommates" → `/roommates`, "Messages" removed. Remove the dead bell `<button>` (`:67`) or turn it into a `/login` link with `aria-label`. `footer.tsx:92`: "Trust & Safety" `/trust` → `/verify`. `discover/page.tsx:613`: `/seeking` → `/roommates`.
- [ ] **Camera policy.** `next.config.ts:42`: `camera=()` → `camera=(self)` (leave microphone and geolocation as-is).
- [ ] **Admin layout.** `:48` `/sign-in` → `/login`. Replace the `window.location.pathname` mount-effect + onClick patching (`:71-73,122`) with `usePathname()`. Add responsive classes: sidebar `hidden lg:flex` (match `components/layout/sidebar.tsx:46` pattern), content `lg:ml-64` instead of `ml-64`, and a simple top bar with the nav links on small screens.
- [ ] **Reviews page.** `:136` fetches nonexistent `/api/profile`. Inspect `/api/profile/status` and `/api/profiles/public` to pick whichever returns name + photo (extend the status route ONLY if neither suffices — it is not owned by W2, so it's yours to touch if needed). Aggregate its error into the page error state (`:142`) and remove the hardcoded "Community Verified … 0 background checks … 100% response rate" card copy — derive from real data or drop the card.
- [ ] **Title/meta.** `app/layout.tsx:51` keeps `template: "%s - NestMatch"`; remove the `| NestMatch` / `- NestMatch` suffixes from child pages that double it: `app/c/[city]/page.tsx:29`, `app/(app)/profile/[userId]/page.tsx:45`, `app/(app)/resources/faq/layout.tsx:4`, `app/(app)/resources/guides/[slug]/page.tsx:39`, `app/login/page.tsx:8`, `app/signup/page.tsx:5`. Add `metadataBase: new URL('https://www.nestmatch.app')` and `alternates: { canonical: '/' }` to the root layout metadata. Remove "real listings" from `layout.tsx:38,57,76` descriptions and `hero-section.tsx:80-82` (align with the working tree's honest-copy direction: e.g. "Verified profiles, lifestyle matching…").
- [ ] **Delete dead components.** Remove `stats-section.tsx` (fabricated stats) and `newcomer-section.tsx`; clean `components/landing/index.ts:5,6`. Grep for any other imports first.
- [ ] **Settings page.** Wrap `loadSettings` (`settings/page.tsx:44-78`) body in try/catch/finally so `setIsLoading(false)` always runs and an error state renders with retry. Replace the "deletion not implemented" toast (`:128-144`) with a real call: `POST /api/account/delete` → on 200, `supabase.auth.signOut()` and redirect to `/`; on error, toast the message. Keep the existing confirm UI.
- [ ] **Expenses page.** Fix "Split equally (1 people)" grammar (`1 person` / `N people`). Add a delete affordance for expenses created by the current user, calling `DELETE /api/expenses/[id]` (created by W2; returns 204). Confirm with the existing modal pattern (no `window.confirm`).
- [ ] **Quiz next-button truncation.** The wizard's Next button shows a truncated label ("Next: What is your"). Truncate with CSS ellipsis at a sane max-width or shorten to "Next" + the step title elsewhere — no mid-sentence cutoffs.
- [ ] **Group capacity default.** New groups show "1 / 1 Full" immediately. In the create-group modal, default max members to 4 (keep it user-editable if a field exists; otherwise set the created group's `max_members` to 4).
- [ ] **Toast duration.** Find the `<Toaster>` mount; ensure toasts auto-dismiss (~5s). If it's sonner, `duration={5000}`.
- [ ] **Verify:** `cd apps/web && npx tsc --noEmit && npm test` — all green. `npx next lint` introduces no new errors.

### Task W2: Web API hardening

**Files (exhaustive ownership):**
- Modify: `apps/web/src/lib/api/with-handler.ts`
- Modify: `apps/web/src/app/api/verify/checkout/route.ts`
- Modify: `apps/web/src/app/api/verify/checkout/complete/route.ts`
- Modify: `apps/web/src/app/api/expenses/route.ts`
- Create: `apps/web/src/app/api/expenses/[id]/route.ts` (DELETE handler) — if the file already exists with other methods, add DELETE to it.
- Test: extend existing vitest suites near these files where present.

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `DELETE /api/expenses/[id]` — auth required; only the expense creator may delete; deletes expense + shares (RLS/service as appropriate); 204 on success, 403 otherwise. W1's expenses page calls this.

- [ ] **Rate limiting for anonymous callers.** `with-handler.ts:220`: `if (config.rateLimit !== false && config.rateLimit && userId)` never fires for public/webhook routes. Fall back to an IP key: `const rlKey = userId ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'` and rate-limit on that. Keep per-user behavior unchanged for authenticated routes.
- [ ] **Stop leaking internals.** `with-handler.ts:414-419`: for non-`AppError` errors, log the real message/stack via the structured logger and return a generic `{ error: 'Internal server error' }` 500. Also remove `details: error.message` style leaks in `api/upload/route.ts:115` ONLY if trivial — otherwise leave (not your file).
- [ ] **Webhook event lifecycle.** `with-handler.ts:369,391`: when a webhook handler *returns* a non-2xx response (not throws), call `failWebhookEvent` (or complete-with-failure) so the event doesn't get stuck `processing` and retries aren't dedup-rejected. Add/extend a unit test for: handler returns 400 → event marked failed.
- [ ] **verify/checkout.** Remove the `for_user_id` / `subject_user_id` pass-through entirely (`checkout/route.ts:11`) — checkout is always for the authenticated caller. Wrap `await req.json()` in try/catch → 400 on malformed body.
- [ ] **verify/checkout/complete.** Enforce `metadata.paid_by === userId` before doing anything (`complete/route.ts:9`); guard `JSON.parse(metadata.checks_needed || '[]')` with try/catch → 400; re-enable a rate limit instead of `rateLimit: false` (`:123`).
- [ ] **Expenses query.** `api/expenses/route.ts:31-68`: push the user filter into the query (shares or created_by match) instead of fetching everything and filtering in JS (`:85`), and add `.order('created_at', { ascending: false }).limit(100)`.
- [ ] **Expenses error mapping.** `:256` maps `42501` → 503, but migration 039 raises `42501` for authorization failure → map to 403 with the raised message. Map `22023` (share sum mismatch, duplicate user, non-positive total, empty shares) → 400 surfacing the message. Keep genuine unknown errors at 500 (now sanitized).
- [ ] **DELETE /api/expenses/[id].** New handler via `withApiHandler`: load expense, 404 if missing, 403 unless `created_by === userId!`, delete shares then expense (or rely on FK cascade if defined — check migration 014), return 204.
- [ ] **Verify:** `cd apps/web && npx tsc --noEmit && npm test` — all green, including any tests you added.

### Task M1: Mobile store compliance, auth, account-deletion backend

**Files (exhaustive ownership):**
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/package.json` (new deps via `npx expo install`)
- Modify: `apps/mobile/app/settings.tsx`
- Modify: `apps/mobile/app/verify.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/signup.tsx`, `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/forgot-password.tsx`
- Modify: `apps/mobile/src/providers/auth-provider.tsx`
- Modify: `apps/mobile/src/components/error-boundary.tsx`
- Create: `apps/mobile/src/lib/trust-quotient.ts`
- Create: `apps/web/src/app/api/account/delete/route.ts`
- Modify: `apps/mobile/assets/adaptive-icon.png` (regenerate with safe-zone inset)

**Interfaces:**
- Consumes: nothing.
- Produces: (1) `POST /api/account/delete` — `withApiHandler` auth route; W1 wires the web settings page to it; contract: no body, deletes the user's data + auth user, returns `{ deleted: true }`. (2) `src/lib/trust-quotient.ts` exporting `computeTrustQuotient(input): number` (0–100) — M2 rewires `(tabs)/profile.tsx` to it; define the input shape from what `verify.tsx:130` uses today (id/phone/criminal/credit/email verification states, pending counting 0.5).

- [ ] **app.json.** `ITSAppUsesNonExemptEncryption` → `false`. Remove `ACCESS_FINE_LOCATION` from android.permissions and `NSLocationWhenInUseUsageDescription` from ios.infoPlist. Remove the duplicate `NSPhotoLibraryUsageDescription` from ios.infoPlist (the expo-image-picker plugin's `photosPermission` wins); add `cameraPermission` to the plugin config using the existing camera string. Set `userInterfaceStyle` to `"light"` (the app is light-only). Add `"expo-apple-authentication"` to plugins.
- [ ] **Account deletion backend.** New `apps/web/src/app/api/account/delete/route.ts` using `withApiHandler` (auth required) + service client (`src/lib/supabase/service.ts`): delete the user's owned rows that lack FK cascades (check migrations for `on delete cascade` on profiles/listings/etc; delete profile row explicitly), then `serviceClient.auth.admin.deleteUser(userId!)`. Return `{ deleted: true }`. Log failures with the structured logger.
- [ ] **Mobile settings.** `settings.tsx:120`: replace `supabase.functions.invoke('delete-account')` with a Bearer-auth `POST` to `/api/account/delete` via `src/lib/api.ts`; on success `signOut()` and route to `/(auth)/login`. Remove (don't just hide) the push/email notification toggle rows (`:36-87`) and the local-only `showBadges` toggle if it doesn't persist to the profile — keep only real controls.
- [ ] **Sign in with Apple.** `npx expo install expo-apple-authentication`. On iOS only (`Platform.OS === 'ios'`), render `AppleAuthentication.AppleAuthenticationButton` on login + signup; flow: `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL] })` → `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken! })`. Handle `ERR_REQUEST_CANCELED` silently; surface other errors in the existing error text style.
- [ ] **Signup confirmation dead-end.** `auth-provider.tsx:57-64`: pass `options: { emailRedirectTo: 'https://www.nestmatch.app/login' }` and return `{ error, needsConfirmation: !data.session }`. `signup.tsx:44`: when `needsConfirmation`, render a "Check your inbox — we sent a confirmation link to {email}" state instead of silently stopping.
- [ ] **Forgot password.** New `(auth)/forgot-password.tsx`: email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.nestmatch.app/reset-password' })` → success state. Add "Forgot password?" link on `login.tsx` near the password field. Register the route in `(auth)/_layout.tsx` if screens are explicit there.
- [ ] **Verify screen (iOS payment risk).** `verify.tsx`: when `Platform.OS === 'ios'`, hide the `$15/$25/$30` prices and the paid Start/Buy CTAs (ID/criminal/credit + packages); show the check descriptions with a neutral "Available at nestmatch.app" note (no tappable link to purchase, no price). Android/web behavior unchanged. Extract the trust-quotient formula into `src/lib/trust-quotient.ts` and use it here (single source of truth; keep the verify screen's current semantics — pending = 0.5 weight).
- [ ] **Error boundary.** `error-boundary.tsx:30-46`: in production (`!__DEV__`) render a friendly card — "Something went wrong. Please restart the app." + a "Try again" button that resets the boundary. Keep the stack trace rendering behind `__DEV__`.
- [ ] **Adaptive icon inset.** Regenerate `assets/adaptive-icon.png`: 1024×1024 canvas, background `#f8f9fa`, the current icon artwork scaled to ~66% and centered (safe zone). Use a node one-off script with `sharp` (`npm i -D sharp` inside apps/mobile is acceptable, or use `npx --yes sharp-cli` — whatever works headlessly on Windows). Verify the output is 1024×1024 PNG.
- [ ] **Verify:** `cd apps/mobile && npx tsc --noEmit` green; `npx expo-doctor` reports no new issues (pre-existing warnings acceptable).

### Task M2: Mobile functional bugs, report/block, resilience (AFTER M1)

**Files (exhaustive ownership):**
- Modify: `apps/mobile/app/(tabs)/index.tsx`, `search.tsx`, `messages.tsx`, `groups.tsx`, `profile.tsx`
- Modify: `apps/mobile/app/conversation/[id].tsx`
- Modify: `apps/mobile/app/listing/[id].tsx`
- Modify: `apps/mobile/app/group/[id].tsx`
- Modify: `apps/mobile/app/notifications.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (QueryClient defaults + registering new route)
- Create: `apps/mobile/app/user/[id].tsx` (roommate profile detail)
- Modify: `apps/mobile/src/components/ui/Button.tsx` (accept `testID`)
- Modify: `apps/mobile/.maestro/flows/auth/login-email.yaml`
- Modify: `apps/mobile/src/lib/api.ts` (only to add report/block helpers if a generic helper doesn't already cover POSTs)

**Interfaces:**
- Consumes: `src/lib/trust-quotient.ts` from M1 (`computeTrustQuotient`); existing web endpoints `POST /api/reports` and `POST /api/blocked-users` (inspect their zod/body shape in `apps/web/src/app/api/` before calling).
- Produces: nothing downstream.

- [ ] **Group chat visibility.** `group/[id].tsx:234-240`: insert the conversation with ALL current member ids in `participant_ids`, and update `participant_ids` when members join (find the join/approve path in this file; if membership changes happen server-side only, update on group screen load: reconcile conversation.participant_ids with member list when the creator views).
- [ ] **Messages list group branch.** `(tabs)/messages.tsx:374-390`: when a conversation is a group chat (has `group_id` or >2 participants — inspect the schema in `src/types`), render the group name + people icon instead of "Unknown User". Add `.limit(50)` per-conversation or fetch only latest message per conversation (`:334-339` currently fetches all messages of all conversations — bound it).
- [ ] **Silent send failure.** `conversation/[id].tsx:232-269`: add `onError` to `sendMutation` — restore the composed text into the input and show an inline error; only clear the input in `onSuccess` (or optimistically with restore-on-error). Fix the mark-as-read effect (`:146-176`) to depend on the latest message id, not the array identity, so it stops writing on every render.
- [ ] **Search robustness.** `search.tsx:60,78`: sanitize the query before building the `.or()` filter — strip `,().` or switch to two separate `.ilike` filters combined client-side. Searching `Montréal, ON` must return results, not 400. Add `RefreshControl` to the list; fix the error copy to match ("Pull down to retry" is now true). Make roommate rows navigate to `/user/[id]` (`:177` currently has no onPress).
- [ ] **Roommate profile screen.** New `app/user/[id].tsx`: fetch the public profile (respect migration 038's column allowlist — select only `name, bio, city, province, occupation, languages, profile_photo, verification_level, email_verified, phone_verified, show_verification_badges`), render photo/name/badges/bio/city/languages, plus "Message" (create/find conversation, navigate INTO it) and "Report" / "Block" actions. Register in `_layout.tsx` Stack.
- [ ] **Report + block.** Inspect `apps/web/src/app/api/reports/route.ts` and `api/blocked-users/route.ts` for exact body shapes. Add report/block to: conversation screen (menu on the other participant), listing detail (report listing), and the new user profile screen. After blocking, navigate back and refetch the relevant list. Confirmation via the app's existing dialog pattern (RN `Alert.alert` with buttons is fine and doesn't break store rules).
- [ ] **Listing detail fixes.** `listing/[id].tsx:137-140`: `onSuccess: (conversationId) => router.push(`/conversation/${conversationId}`)`. Add `onError` to `saveMutation` (`:88-105`) with a toast/alert.
- [ ] **Home resilience.** `(tabs)/index.tsx`: add an error branch (distinct from empty state) with retry; add `RefreshControl`; make roommate cards navigate to `/user/[id]` instead of the Search tab (`:114-116`).
- [ ] **Notifications.** `notifications.tsx:99-121`: check errors on the two bare `await supabase...update()` calls; on failure show a toast and don't optimistically flip state.
- [ ] **QueryClient defaults.** `_layout.tsx:11`: `new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } })`.
- [ ] **Trust quotient.** `(tabs)/profile.tsx:99-131`: replace the local formula with `computeTrustQuotient` from `src/lib/trust-quotient.ts`.
- [ ] **Maestro + testIDs.** `Button.tsx`: accept and pass through `testID` (and `accessibilityLabel`). Add `testID="login-email" / "login-password" / "login-submit"` to the login screen inputs/button. Fix `login-email.yaml` to assert "Welcome back" (exact current copy).
- [ ] **Verify:** `cd apps/mobile && npx tsc --noEmit` green; `npx expo lint` introduces no new errors.

### Task R: Codex review + verification suite

- [ ] Dispatch the Codex rescue agent to review the full working-tree diff (all four clusters + the pre-existing uncommitted changes) for correctness, security, and store-compliance regressions.
- [ ] Triage Codex findings with technical rigor (superpowers:receiving-code-review) — fix confirmed issues, push back on incorrect ones.
- [ ] Final gate: `apps/web`: `npx tsc --noEmit`, `npm test`, `npx next lint`; `apps/mobile`: `npx tsc --noEmit`, `npx expo lint`. All green.
- [ ] Report remaining non-code items to the user: purge demo/AI listings from prod DB, fix their own profile bio, confirm `CERTN_WEBHOOK_SECRET` in Vercel before merging, EAS credential setup for Sign in with Apple capability, App Store Connect metadata, and the commit/PR strategy (PR-per-cluster per project convention).

## Explicitly deferred (not in this plan)

- Full expense split-picker UI (product decision needed; API now returns proper errors).
- next/image migration across 30+ call sites (risky sweeping change pre-submission; post-launch).
- Real push notifications (expo-notifications) — toggles removed instead.
- Mobile quiz/payments/reviews/calendar parity — post-1.0 roadmap.
- Dashboard load-time root cause (needs profiling, not a blind fix).
