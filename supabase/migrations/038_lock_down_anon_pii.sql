-- =============================================================================
-- Deny anonymous access to PII on profiles and lifestyle_responses.
-- =============================================================================
--
-- Confirmed exposure: the browser anon key could read every non-deleted profile
-- row (including email, phone and stripe_customer_id) and every lifestyle row.
--
--   001_initial_schema.sql:396  lifestyle_responses  FOR SELECT USING (true)
--   010b_rate_limiting_audit.sql:400  profiles  FOR SELECT USING (deleted_at IS NULL)
--
-- Both policies pre-date the columns that made them dangerous (034 added
-- stripe_customer_id to profiles). RLS is row-level, so the row filter alone
-- cannot hide a column — column-level GRANTs are the mechanism that can, and
-- PostgREST honours them.
--
-- SCOPE: this migration changes the `anon` role only. `authenticated` keeps its
-- existing table-wide SELECT, so no logged-in page changes behaviour. Narrowing
-- `authenticated` (every logged-in user can currently read every other user's
-- email and phone) requires app-side query changes first — see the note at the
-- bottom. This migration closes the anonymous hole, which is the confirmed one.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles — column-level allowlist for anon
-- -----------------------------------------------------------------------------
--
-- A FIXED POSITIVE ALLOWLIST. An earlier draft computed this as "every column
-- not on a denylist", which has exactly the wrong failure mode: a column added
-- by a future migration would be granted to anon automatically. Anything not
-- named below is unreadable by anon, including columns that do not exist yet.
-- Publishing a new column is therefore a deliberate edit to this list.
--
-- The allowlist is the union of what every anon-reachable read actually needs:
--   api/listings/public/route.ts:54    user_id, name, profile_photo,
--                                      verification_level, show_verification_badges
--   api/listings/route.ts:83           id, user_id, name, profile_photo, verification_level
--   api/listings/[id]/route.ts:59      + bio, languages
--   api/profiles/public/route.ts:15    + city, created_at, deleted_at (filter)
--   api/reviews/[id], api/services/*   user_id, name, profile_photo, bio
--   apps/mobile search/home            + age, occupation (filters on name/city/occupation)
--   (app)/profile/[userId]             + province, languages, email_verified,
--                                        phone_verified, show_verification_badges
--
-- That last one is NOT behind an auth gate: (app)/layout.tsx renders LandingNav
-- and the page for logged-out visitors instead of redirecting, so every page in
-- the (app) group is anon-reachable. Its select('*') was changed to an explicit
-- projection in the same change as this migration — applying 038 without that
-- patch turns every public profile into a 404, because a column-privilege
-- failure surfaces as a hard 403 and the page calls notFound() on any error.
--
-- The other (app) pages that select('*') on profiles — discover:193,
-- roommates:124, profile:91, profile/edit:118 — all return early or redirect
-- when there is no session, so they only ever run as `authenticated`.
--
-- Deliberately NOT granted, though no current reader needs them: is_online and
-- last_seen_at. Presence and last-activity are a movement/behaviour signal that
-- should not be scrapeable by an unauthenticated client.

DO $$
DECLARE
  -- Every column anon may read. Nothing else, now or in future.
  v_allowed text[] := ARRAY[
    'id',
    'user_id',
    'name',
    'bio',
    'age',
    'gender',
    'occupation',
    'profile_photo',
    'photos',
    'languages',
    'city',
    'province',
    'verification_level',
    'verified_at',
    'show_verification_badges',
    'email_verified',
    'phone_verified',
    'created_at',
    'deleted_at'      -- api/profiles/public filters on it; a WHERE needs SELECT
  ];
  v_missing text;
  v_grant   text;
BEGIN
  -- Fail loudly rather than granting a typo'd or dropped column.
  SELECT string_agg(c, ', ')
    INTO v_missing
    FROM unnest(v_allowed) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = c
   );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'profiles allowlist names columns that do not exist: %', v_missing;
  END IF;

  SELECT string_agg(quote_ident(c), ', ' ORDER BY c) INTO v_grant FROM unnest(v_allowed) AS c;

  -- Strip every existing SELECT path before re-granting, so a re-run after
  -- narrowing the allowlist actually narrows it. Column-level grants survive a
  -- table-level REVOKE, so both are revoked explicitly. PUBLIC is included
  -- because a privilege granted to PUBLIC would otherwise let anon read the
  -- table regardless of its own grants.
  EXECUTE 'REVOKE SELECT ON public.profiles FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.profiles FROM anon';

  EXECUTE (
    SELECT coalesce(
      'REVOKE SELECT (' || string_agg(quote_ident(column_name), ', ') || ') ON public.profiles FROM anon',
      'SELECT 1'
    )
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'profiles'
  );

  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon', v_grant);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. lifestyle_responses — no anonymous access at all
-- -----------------------------------------------------------------------------
--
-- Every consumer is behind the (app) auth gate, and cross-user reads are core
-- to the product (listings/[id]/page.tsx compares viewer vs host; the discover,
-- roommates and dashboard pages read other users' rows). So this scopes the
-- policy to `authenticated` rather than to auth.uid() = user_id, which would
-- break compatibility scoring.

-- Repo convention (see _qa_apply/): drop BOTH the old and the new policy name
-- before CREATE POLICY, so a re-run cannot collide with the policy this
-- migration itself created on a previous pass. Dropping only the old name makes
-- the migration a one-shot: the second run fails with 42710 (duplicate object)
-- half-way through, leaving the grants above applied and this policy not.
DROP POLICY IF EXISTS "Users can view lifestyle responses"               ON lifestyle_responses;
DROP POLICY IF EXISTS "Authenticated users can view lifestyle responses" ON lifestyle_responses;

CREATE POLICY "Authenticated users can view lifestyle responses" ON lifestyle_responses
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON public.lifestyle_responses FROM PUBLIC;
REVOKE ALL ON public.lifestyle_responses FROM anon;

-- -----------------------------------------------------------------------------
-- BEFORE APPLYING: confirm `authenticated` holds its own grants
-- -----------------------------------------------------------------------------
-- The REVOKE ... FROM PUBLIC statements above assume Supabase's default setup,
-- where anon/authenticated/service_role are granted explicitly rather than
-- inheriting from PUBLIC. Verify against the target database first — if
-- `authenticated` appears only via a PUBLIC grant, revoking PUBLIC would take
-- the app down for logged-in users too:
--
--   SELECT grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public'
--      AND table_name IN ('profiles', 'lifestyle_responses')
--    ORDER BY table_name, grantee;
--
-- Expect explicit `authenticated` + `service_role` rows. If PUBLIC is the only
-- grantee, add explicit grants for those roles before running this migration.

-- -----------------------------------------------------------------------------
-- FOLLOW-UP (not in this migration — each needs app changes first)
-- -----------------------------------------------------------------------------
-- THIS MIGRATION IS ANONYMOUS CONTAINMENT, NOT RESOLUTION. Do not treat the
-- privacy incident as closed once it is applied. Still outstanding:
--
-- a) `authenticated` still reads every column of every profile — any registered
--    user can bulk-read other users' email, phone, stripe_customer_id and raw
--    lifestyle answers. Narrowing it requires replacing select('*') in
--    profile/edit/page.tsx:118, profile/page.tsx:91, discover/page.tsx:193 and
--    roommates/page.tsx:124 with explicit column lists first.
-- b) lifestyle_responses should return compatibility scores or opted-in labels
--    rather than raw smoking/cannabis/alcohol rows to non-matched users.
-- c) listings still exposes exact street address + coordinates to anon; show an
--    approximate neighbourhood publicly and reveal the address on consent.
-- d) Out of scope here and still open: public-group member budgets and
--    former-member history (037), service-provider insurance/licensing/Stripe
--    fields via api/services select('*'), and review moderation notes/status
--    via the reviews API.
