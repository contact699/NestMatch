-- =============================================================================
-- Secure create_expense_with_shares (companion to 033, which fixed the sibling
-- pay_expense_share the same way).
-- =============================================================================
--
-- 014_atomic_payment_operations.sql:176 defines this as SECURITY DEFINER with
-- no authorization check, and no migration ever revoked EXECUTE. PostgreSQL
-- grants EXECUTE to PUBLIC by default, so any anon or authenticated client
-- could call it directly:
--
--   supabase.rpc('create_expense_with_shares', { p_created_by: <victim>, ... })
--
-- forging expenses attributed to another user, with shares marked 'paid',
-- bypassing RLS entirely (SECURITY DEFINER runs as the function owner).
--
-- Two independent fixes, either of which closes the hole:
--   1. EXECUTE revoked from PUBLIC/anon/authenticated, granted to service_role
--      only. The one caller (api/expenses/route.ts:160) uses the service client,
--      so this is transparent to the app.
--   2. An in-body guard, for the case where a future caller switches to a
--      user-scoped client.
--
-- The guard cannot be an unconditional `p_created_by = auth.uid()` (the shape
-- used in 033) because auth.uid() is NULL under service_role and the current
-- caller IS the service client — that check would break expense creation
-- outright. Instead it branches on the JWT role: with a user uid, p_created_by
-- must equal it; without one, the caller must actually be the service role (or
-- a direct database session), not merely lacking a uid. See the body.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_expense_with_shares(
  p_listing_id   uuid,
  p_created_by   uuid,
  p_title        text,
  p_description  text,
  p_total_amount numeric,
  p_split_type   text,
  p_category     text,
  p_due_date     timestamptz,
  p_shares       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expense    shared_expenses%ROWTYPE;
  v_share      expense_shares%ROWTYPE;
  v_share_obj  jsonb;
  v_shares     jsonb := '[]'::jsonb;
  v_input      jsonb;
  v_count      integer;
  v_distinct   integer;
  v_sum        numeric;
  v_jwt_role   text;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Authorization
  -- ---------------------------------------------------------------------------
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'p_created_by is required'
      USING ERRCODE = '22004';
  END IF;

  -- auth.uid() IS NULL is NOT by itself proof of the service role. It is also
  -- what an `anon` PostgREST request produces, and what an `authenticated`
  -- request produces if the sub claim is ever missing or unparseable. Treating
  -- null-uid as "trusted caller" turns this guard into an opt-out: send no user
  -- JWT and p_created_by is unchecked. So the null-uid branch must additionally
  -- prove which role is asking.
  --
  -- current_user is useless here — SECURITY DEFINER has already rebound it to
  -- the function owner. auth.role() reads the JWT `role` claim out of the
  -- request GUC, which SECURITY DEFINER does not touch: 'service_role' for the
  -- API's service client, 'anon'/'authenticated' for browser traffic, and NULL
  -- for a direct database session (psql, migrations) that is trusted anyway
  -- because it can write these tables without the function at all.
  v_jwt_role := auth.role();

  IF auth.uid() IS NULL THEN
    IF v_jwt_role IS NOT NULL AND v_jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'unauthorized: no authenticated user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF p_created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: p_created_by must match the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Normalize p_shares
  -- ---------------------------------------------------------------------------
  -- api/expenses/route.ts:189 passes JSON.stringify(sharesPayload), which
  -- arrives as a jsonb *string* scalar rather than an array — jsonb_array_elements
  -- then raises "cannot extract elements from a scalar", the route logs a warning
  -- and falls through to its non-atomic insert path. Accept both shapes so the
  -- atomic path works regardless of which form the caller sends.
  v_input := p_shares;
  IF jsonb_typeof(v_input) = 'string' THEN
    v_input := (v_input #>> '{}')::jsonb;
  END IF;

  IF v_input IS NULL OR jsonb_typeof(v_input) <> 'array' THEN
    RAISE EXCEPTION 'p_shares must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Money invariants
  -- ---------------------------------------------------------------------------
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'p_total_amount must be greater than zero'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*),
         count(DISTINCT (e ->> 'user_id')),
         coalesce(sum((e ->> 'amount')::numeric), 0)
    INTO v_count, v_distinct, v_sum
    FROM jsonb_array_elements(v_input) AS e;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'p_shares must contain at least one share'
      USING ERRCODE = '22023';
  END IF;

  IF v_distinct <> v_count THEN
    RAISE EXCEPTION 'p_shares contains duplicate user_id values'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_input) AS e
     WHERE (e ->> 'user_id') IS NULL
        OR (e ->> 'amount') IS NULL
        OR (e ->> 'amount')::numeric < 0
  ) THEN
    RAISE EXCEPTION 'every share requires a user_id and a non-negative amount'
      USING ERRCODE = '22023';
  END IF;

  -- Tolerance, not equality: api/expenses/route.ts:147 computes equal splits as
  -- round(total / n, 2) per share, so $10.00 across 3 people legitimately sums
  -- to $9.99. One cent per share catches gross mismatch (the forgery case)
  -- without rejecting existing correct usage. Tighten this to exact equality
  -- once the route allocates in integer cents and assigns the remainder.
  IF abs(v_sum - p_total_amount) > (0.01 * v_count) THEN
    RAISE EXCEPTION 'shares total % does not match expense total %', v_sum, p_total_amount
      USING ERRCODE = '22023';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Original body (unchanged from 014)
  -- ---------------------------------------------------------------------------
  INSERT INTO shared_expenses (
    listing_id, created_by, title, description, total_amount,
    split_type, category, due_date, status, created_at, updated_at
  ) VALUES (
    p_listing_id, p_created_by, p_title, p_description, p_total_amount,
    p_split_type, p_category, p_due_date, 'active', now(), now()
  )
  RETURNING * INTO v_expense;

  FOR v_share_obj IN SELECT * FROM jsonb_array_elements(v_input)
  LOOP
    INSERT INTO expense_shares (
      expense_id, user_id, amount, percentage, status, paid_at, created_at, updated_at
    ) VALUES (
      v_expense.id,
      (v_share_obj ->> 'user_id')::uuid,
      (v_share_obj ->> 'amount')::numeric,
      (v_share_obj ->> 'percentage')::numeric,
      CASE WHEN (v_share_obj ->> 'user_id')::uuid = p_created_by THEN 'paid' ELSE 'pending' END,
      CASE WHEN (v_share_obj ->> 'user_id')::uuid = p_created_by THEN now() ELSE NULL END,
      now(),
      now()
    )
    RETURNING * INTO v_share;

    v_shares := v_shares || jsonb_build_object(
      'id',         v_share.id,
      'expense_id', v_share.expense_id,
      'user_id',    v_share.user_id,
      'amount',     v_share.amount,
      'percentage', v_share.percentage,
      'status',     v_share.status,
      'payment_id', v_share.payment_id,
      'paid_at',    v_share.paid_at,
      'created_at', v_share.created_at,
      'updated_at', v_share.updated_at
    );
  END LOOP;

  RETURN jsonb_build_object(
    'expense', jsonb_build_object(
      'id',           v_expense.id,
      'listing_id',   v_expense.listing_id,
      'created_by',   v_expense.created_by,
      'title',        v_expense.title,
      'description',  v_expense.description,
      'total_amount', v_expense.total_amount,
      'currency',     v_expense.currency,
      'split_type',   v_expense.split_type,
      'category',     v_expense.category,
      'receipt_url',  v_expense.receipt_url,
      'due_date',     v_expense.due_date,
      'status',       v_expense.status,
      'created_at',   v_expense.created_at,
      'updated_at',   v_expense.updated_at
    ),
    'shares', v_shares
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Execution privileges
-- -----------------------------------------------------------------------------
-- PostgreSQL grants EXECUTE to PUBLIC on function creation. 014 never revoked
-- it, so this has been callable by anon and authenticated since it shipped.
REVOKE ALL ON FUNCTION public.create_expense_with_shares(
  uuid, uuid, text, text, numeric, text, text, timestamptz, jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_expense_with_shares(
  uuid, uuid, text, text, numeric, text, text, timestamptz, jsonb
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_expense_with_shares(
  uuid, uuid, text, text, numeric, text, text, timestamptz, jsonb
) TO service_role;

-- -----------------------------------------------------------------------------
-- FOLLOW-UP (not in this migration)
-- -----------------------------------------------------------------------------
-- a) Audit remaining SECURITY DEFINER functions from 014 and earlier for the
--    same missing-REVOKE pattern.
--
-- Shipped alongside this migration (api/expenses/route.ts), because neither the
-- REVOKE nor the guards above cover the API's own write path — it uses the
-- service client, so RLS is not the boundary there:
--   * Share recipients are now validated against the listing owner + active
--     cohabitation_periods. Previously any logged-in user could bill arbitrary
--     profile UUIDs.
--   * The non-atomic direct-insert fallback is deleted. It ran on ANY rpc error
--     and bypassed every validation in this function, and could return 201 with
--     an expense and no shares.
--   * p_shares is passed as a real array rather than JSON.stringify(...).
