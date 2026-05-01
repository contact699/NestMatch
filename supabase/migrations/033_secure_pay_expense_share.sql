-- =============================================================================
-- Secure pay_expense_share against p_user_id forgery.
-- =============================================================================
--
-- The original 014 definition is SECURITY DEFINER and accepts p_user_id as
-- a parameter without asserting it matches auth.uid(). Because Supabase
-- exposes RPCs to any authenticated client, a malicious caller could invoke
--
--   supabase.rpc('pay_expense_share', { p_expense_id, p_user_id: <victim> })
--
-- and transition another user's share to 'processing'. The /api/expenses/[id]/pay
-- API route always passes the auth user, so this isn't reachable via the
-- intended UI — but the RPC itself is callable directly with any user JWT.
--
-- This migration replaces the function body with the existing logic plus an
-- authorization check at the top: callers may only pay their own share.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.pay_expense_share(
  p_expense_id uuid,
  p_user_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_share   expense_shares%ROWTYPE;
  v_expense shared_expenses%ROWTYPE;
BEGIN
  -- Authorization: callers may only pay their own share. Without this,
  -- any authenticated user could pass another user's id and trigger a
  -- state transition on their share.
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: p_user_id must match the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the share row to prevent concurrent payment attempts
  SELECT *
    INTO v_share
    FROM expense_shares
   WHERE expense_id = p_expense_id
     AND user_id    = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense share not found for expense_id=% and user_id=%', p_expense_id, p_user_id;
  END IF;

  -- Guard: reject if already paid
  IF v_share.status = 'paid' THEN
    RAISE EXCEPTION 'Expense share is already paid';
  END IF;

  -- Guard: reject if already processing
  IF v_share.status = 'processing' THEN
    RAISE EXCEPTION 'Expense share is already being processed';
  END IF;

  -- Transition to processing
  UPDATE expense_shares
     SET status     = 'processing',
         updated_at = now()
   WHERE id = v_share.id;

  -- Refresh the share record after the update
  v_share.status     := 'processing';
  v_share.updated_at := now();

  -- Fetch the parent expense
  SELECT *
    INTO v_expense
    FROM shared_expenses
   WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent expense not found for id=%', p_expense_id;
  END IF;

  -- Return combined payload
  RETURN jsonb_build_object(
    'share', jsonb_build_object(
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
    ),
    'expense', jsonb_build_object(
      'id',           v_expense.id,
      'title',        v_expense.title,
      'created_by',   v_expense.created_by,
      'listing_id',   v_expense.listing_id,
      'total_amount', v_expense.total_amount
    )
  );
END;
$$;
