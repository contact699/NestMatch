-- =============================================================================
-- 040 — Harden privileges: self-escalation, RPC grants, direct-DML bypass,
--       and data-layer block enforcement.
-- =============================================================================
--
-- Four independent hardening passes, grouped because each one closes a path
-- that the API layer already guards but the database does not. Every one of
-- these is reachable by pointing supabase-js at PostgREST with a normal user
-- JWT — no compromised server, no leaked service key.
--
--   1. profiles: an authenticated user can UPDATE their own row (001:391) and
--      that policy places no restriction on WHICH columns. `is_admin` is on
--      that row (005b:2). One PATCH and the caller is an admin.
--   2. set_default_payment_method (014:95): SECURITY DEFINER, EXECUTE never
--      revoked from PUBLIC, and it trusts p_user_id. Same shape 033 fixed for
--      pay_expense_share and 039 fixed for create_expense_with_shares.
--   3. shared_expenses / expense_shares: 030's INSERT policies let a creator
--      write share rows directly, bypassing the relationship checks the API
--      and the create_expense_with_shares RPC perform.
--   4. messages: blocking is enforced only in the API route. A direct
--      PostgREST insert reaches a blocker's inbox.
--
-- Idempotent throughout: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS,
-- and DROP POLICY IF EXISTS for BOTH the old and the new policy name before
-- each CREATE POLICY (repo convention — see _qa_apply/).
-- =============================================================================


-- =============================================================================
-- 1. profiles — freeze privileged columns against authenticated self-service
-- =============================================================================
--
-- Enforced with a BEFORE UPDATE trigger rather than a narrower RLS policy: RLS
-- is row-level, so a USING/WITH CHECK clause cannot say "this column may not
-- change". Column-level GRANTs could, but revoking UPDATE(is_admin) from
-- `authenticated` makes any statement that merely MENTIONS the column fail —
-- including PostgREST's own full-row upserts — so the trigger, which silently
-- restores the old value, is the compatible mechanism.
--
-- WHICH COLUMNS. This list is deliberately shorter than "everything that looks
-- privileged", because several trust-bearing columns are legitimately written
-- today by routes running on the USER-SCOPED client. Freezing those would break
-- live flows, so they are called out as follow-ups at the bottom of this file
-- instead of being silently broken here:
--
--   FROZEN
--     is_admin          — no code path writes it, ever. Pure escalation.
--     verified_at       — written only by the Certn webhook, which runs on the
--                         service client (api/webhooks/certn/route.ts:282).
--
--   CONSTRAINED (not frozen — see the verification_level rule below)
--     verification_level — api/verify/phone/confirm/route.ts:52 sets 'verified'
--                          on the user client. 'trusted' is service-role only.
--
--   NOT FROZEN (would break a real flow; see FOLLOW-UP)
--     email_verified, phone_verified, stripe_customer_id
--
-- auth.role() is the role from the request JWT. It is 'authenticated' for user
-- traffic, 'service_role' for the API's service client, and NULL for a direct
-- database session (psql / migrations) — so this trigger constrains exactly the
-- untrusted caller and nothing else. current_user would be wrong here: it is
-- the table owner inside a trigger function, not the requester.

CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Hard freeze: silently restore, rather than raising. A raise would turn an
  -- ordinary profile save that happens to round-trip the whole row (which is
  -- what a PostgREST PATCH of a select('*') result does) into a hard failure.
  NEW.is_admin    := OLD.is_admin;
  NEW.verified_at := OLD.verified_at;

  -- verification_level drives the trust badges other users rely on.
  --   * 'trusted' requires a completed Certn ID check plus one more, and is
  --     granted only by the webhook (service role). Never self-assignable.
  --   * 'verified' is legitimately self-assigned by the phone-confirm route,
  --     but only once BOTH contact channels are confirmed — which is exactly
  --     the condition that route already checks before writing. Encoding it
  --     here makes the check load-bearing instead of advisory.
  --   * Downgrades (to 'basic') are always allowed; nobody forges a worse badge.
  IF NEW.verification_level IS DISTINCT FROM OLD.verification_level THEN
    IF NEW.verification_level = 'trusted' THEN
      NEW.verification_level := OLD.verification_level;
    ELSIF NEW.verification_level = 'verified'
      AND NOT (coalesce(NEW.email_verified, false) AND coalesce(NEW.phone_verified, false))
    THEN
      NEW.verification_level := OLD.verification_level;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privileged_columns ON public.profiles;

CREATE TRIGGER enforce_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_privileged_columns();


-- =============================================================================
-- 2. set_default_payment_method — auth guard, search_path, execute grants
-- =============================================================================
--
-- Mirrors 033 (pay_expense_share) and 039 (create_expense_with_shares). The
-- body is 014:95 verbatim apart from the guard; the sole caller
-- (api/payments/methods/route.ts:126) passes the authenticated user's own id on
-- the USER-scoped client, so `authenticated` keeps EXECUTE here — unlike 039,
-- where the caller is the service client and EXECUTE could be revoked outright.
--
-- Without the guard, `supabase.rpc('set_default_payment_method', { p_user_id:
-- <victim>, p_stripe_payment_method_id: <attacker's card>, ... })` inserts an
-- attacker-controlled payment method into a stranger's wallet and marks it
-- default — every subsequent charge of theirs would target it.

CREATE OR REPLACE FUNCTION public.set_default_payment_method(
  p_user_id                  uuid,
  p_stripe_payment_method_id text,
  p_type                     text,
  p_last_four                text,
  p_brand                    text,
  p_exp_month                int,
  p_exp_year                 int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_method   payment_methods%ROWTYPE;
  v_jwt_role text;
BEGIN
  -- Authorization. auth.uid() IS NULL is NOT proof of the service role — it is
  -- also what an `anon` request produces — so the null-uid branch must prove
  -- the role. NULL role means a direct database session (psql / migrations),
  -- which can write payment_methods without this function anyway.
  v_jwt_role := auth.role();

  IF auth.uid() IS NULL THEN
    IF v_jwt_role IS NOT NULL AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'unauthorized: no authenticated user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: p_user_id must match the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required'
      USING ERRCODE = '22004';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Original body (unchanged from 014)
  -- ---------------------------------------------------------------------------
  UPDATE payment_methods
     SET is_default  = false,
         updated_at  = now()
   WHERE user_id     = p_user_id
     AND is_default  = true;

  INSERT INTO payment_methods (
    user_id, stripe_payment_method_id, type, last_four, brand,
    exp_month, exp_year, is_default, created_at, updated_at
  ) VALUES (
    p_user_id, p_stripe_payment_method_id, p_type, p_last_four, p_brand,
    p_exp_month, p_exp_year, true, now(), now()
  )
  ON CONFLICT (user_id, stripe_payment_method_id)
  DO UPDATE SET
    type       = EXCLUDED.type,
    last_four  = EXCLUDED.last_four,
    brand      = EXCLUDED.brand,
    exp_month  = EXCLUDED.exp_month,
    exp_year   = EXCLUDED.exp_year,
    is_default = true,
    updated_at = now()
  RETURNING * INTO v_method;

  RETURN jsonb_build_object(
    'id',                       v_method.id,
    'user_id',                  v_method.user_id,
    'stripe_payment_method_id', v_method.stripe_payment_method_id,
    'type',                     v_method.type,
    'last_four',                v_method.last_four,
    'brand',                    v_method.brand,
    'exp_month',                v_method.exp_month,
    'exp_year',                 v_method.exp_year,
    'is_default',               v_method.is_default,
    'created_at',               v_method.created_at,
    'updated_at',               v_method.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_payment_method(
  uuid, text, text, text, text, int, int
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.set_default_payment_method(
  uuid, text, text, text, text, int, int
) FROM anon;

GRANT EXECUTE ON FUNCTION public.set_default_payment_method(
  uuid, text, text, text, text, int, int
) TO authenticated, service_role;

-- pay_expense_share already carries the guard and SET search_path (033), but no
-- migration ever revoked its default PUBLIC grant. The guard makes an anon call
-- fail (auth.uid() is NULL there), so this is hygiene rather than a live hole —
-- but "callable by anon" should never be the resting state of a SECURITY
-- DEFINER function that moves money. The caller
-- (api/expenses/[id]/pay/route.ts:20) is user-scoped, so `authenticated` keeps
-- EXECUTE.
REVOKE ALL ON FUNCTION public.pay_expense_share(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pay_expense_share(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_expense_share(uuid, uuid) TO authenticated, service_role;


-- =============================================================================
-- 3. shared_expenses / expense_shares — close the direct-DML bypass
-- =============================================================================
--
-- 030:104 grants a creator INSERT on expense_shares for any expense they own,
-- and 002:399 grants them INSERT on shared_expenses. Together that is a
-- complete write path that never touches create_expense_with_shares — so every
-- guard the API and migration 039 impose (recipients must be the listing owner
-- or an active cohabitant; shares must sum to the total; no duplicates) can be
-- skipped by issuing two ordinary PostgREST inserts:
--
--   POST /shared_expenses  { listing_id: <any>, created_by: <me>, ... }
--   POST /expense_shares   { expense_id: <mine>, user_id: <stranger>, ... }
--
-- and the stranger now owes money to the caller.
--
-- VERIFIED BEFORE REVOKING: no client anywhere inserts into either table. The
-- only writers are api/expenses/route.ts (via the RPC, on the service client)
-- and the Stripe webhook (service client). grep over apps/ for
-- `.from('shared_expenses').insert` / `.from('expense_shares').insert` returns
-- nothing; the mobile app reads both tables and writes neither.
--
-- SELECT policies are untouched — reading these rows is the whole feature.
-- pay_expense_share and create_expense_with_shares are SECURITY DEFINER, so
-- they write as the owner and are unaffected by these grants.

DROP POLICY IF EXISTS "Users can create expenses"          ON public.shared_expenses;
DROP POLICY IF EXISTS "Expense creators can insert shares" ON public.expense_shares;
DROP POLICY IF EXISTS "Expense creators can manage shares" ON public.expense_shares;

REVOKE INSERT ON public.shared_expenses FROM PUBLIC;
REVOKE INSERT ON public.shared_expenses FROM anon, authenticated;
REVOKE INSERT ON public.expense_shares  FROM PUBLIC;
REVOKE INSERT ON public.expense_shares  FROM anon, authenticated;

-- NOT revoked: UPDATE. api/expenses/[id]/pay/route.ts:113 stamps `payment_id`
-- back onto the share using the user-scoped client, so a live (if narrow —
-- 030's UPDATE policy admits only the expense creator) client write path
-- exists. Revoking UPDATE would turn that silent no-op into a permission error.
-- Moving that write to the service client is the prerequisite; see FOLLOW-UP.


-- =============================================================================
-- 4. messages — enforce blocking at the data layer
-- =============================================================================
--
-- The block check today lives in api/conversations/[id]/messages/route.ts:129.
-- That route is one of several ways a row reaches this table: the mobile client
-- and any browser holding the anon key can POST straight to PostgREST with
-- their own JWT, and 032's INSERT policy asks only "are you a participant?".
-- Blocking someone therefore hides them from your UI without stopping them
-- reaching your inbox.
--
-- Scope: 1:1 conversations. Group threads stay governed by is_group_member()
-- alone — muting one member of a shared group is a product decision, not a
-- security fix, and silently dropping their group messages would confuse every
-- other member.
--
-- The direction check MUST go through a SECURITY DEFINER helper. blocked_users
-- has its own RLS ("Users can view own blocked users", 001:476, USING
-- auth.uid() = user_id), and RLS applies inside policy subqueries — so an
-- inline EXISTS could see only the rows where the SENDER is the blocker. The
-- "they blocked me" direction, which is the one that matters, would be
-- invisible and the check would silently pass.

CREATE OR REPLACE FUNCTION public.is_blocked_between(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM blocked_users
     WHERE (user_id = p_a AND blocked_user_id = p_b)
        OR (user_id = p_b AND blocked_user_id = p_a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated, service_role;

-- The reverse direction has no supporting index: 001:194 declares
-- UNIQUE(user_id, blocked_user_id), which serves `user_id = ?` lookups only.
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user
  ON public.blocked_users(blocked_user_id);

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send 1:1 messages"                    ON public.messages;

CREATE POLICY "Users can send 1:1 messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = conversation_id
         AND c.group_id IS NULL
         AND auth.uid() = ANY(c.participant_ids)
    )
    -- Blocked in EITHER direction, against ANY other participant of this
    -- thread: the blocker must not receive, and the blocked must not send.
    AND NOT EXISTS (
      SELECT 1
        FROM public.conversations c,
             unnest(c.participant_ids) AS other_id
       WHERE c.id = conversation_id
         AND c.group_id IS NULL
         AND other_id <> auth.uid()
         AND public.is_blocked_between(auth.uid(), other_id)
    )
  );


-- =============================================================================
-- FOLLOW-UP (not in this migration — each needs an app change first)
-- =============================================================================
-- a) profiles.email_verified / phone_verified are written on the USER-scoped
--    client by api/verify/status/route.ts:19, app/auth/callback/route.ts:29 and
--    api/verify/phone/confirm/route.ts:36. Both flags feed the trust badges, so
--    an authenticated user can still PATCH them to true directly. Freezing them
--    in the trigger above requires moving those three writes to the service
--    client first — do that, then add both columns to the freeze list.
--
-- b) profiles.stripe_customer_id is written on the user-scoped client by
--    lib/services/stripe.ts:184 (getOrCreateCustomer, reached from the pay,
--    checkout and payment-methods routes). The unique partial index from
--    034:23 already prevents claiming a customer id another profile holds,
--    which bounds the damage; the clean fix is again to move that single write
--    to the service client and then freeze the column.
--
-- c) api/expenses/[id]/pay/route.ts:113 should write `payment_id` with the
--    service client. Once it does, REVOKE UPDATE on shared_expenses and
--    expense_shares from `authenticated` too, which retires 030's remaining
--    creator-side UPDATE policies as the last direct-DML path into the money
--    tables.
--
-- d) Blocking is now enforced for 1:1 message INSERT. Conversation CREATION is
--    not: 032's "Users can create 1:1 conversations" still lets a blocked user
--    open a fresh thread (it will simply carry no messages). Worth folding the
--    same is_blocked_between() check into that policy.
