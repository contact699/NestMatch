-- Migration: Atomic Payment Operations
-- Provides RPC functions for payment-related operations that require
-- transactional guarantees (row locking, multi-table atomicity).

-- =============================================================================
-- 1. pay_expense_share
--    Locks the expense_shares row with FOR UPDATE, validates it is not already
--    paid, sets status to 'processing', and returns the share row together with
--    the parent expense metadata needed to initiate a payment.
-- =============================================================================
CREATE OR REPLACE FUNCTION pay_expense_share(
  p_expense_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share  expense_shares%ROWTYPE;
  v_expense shared_expenses%ROWTYPE;
BEGIN
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
      'percentage',  v_share.percentage,
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

-- =============================================================================
-- 2. set_default_payment_method
--    Atomically clears the is_default flag on all of the user's existing
--    payment methods, then upserts the given method with is_default = true.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_default_payment_method(
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
AS $$
DECLARE
  v_method payment_methods%ROWTYPE;
BEGIN
  -- Clear existing defaults for this user
  UPDATE payment_methods
     SET is_default  = false,
         updated_at  = now()
   WHERE user_id     = p_user_id
     AND is_default  = true;

  -- Upsert the target payment method with is_default = true
  INSERT INTO payment_methods (
    user_id,
    stripe_payment_method_id,
    type,
    last_four,
    brand,
    exp_month,
    exp_year,
    is_default,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_stripe_payment_method_id,
    p_type,
    p_last_four,
    p_brand,
    p_exp_month,
    p_exp_year,
    true,
    now(),
    now()
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

-- =============================================================================
-- 3. create_expense_with_shares
--    Creates a shared_expenses row and all associated expense_shares rows in a
--    single atomic operation.  If any step fails the entire function is rolled
--    back automatically.  Shares whose user_id matches the expense creator are
--    inserted with status = 'paid'.
-- =============================================================================
CREATE OR REPLACE FUNCTION create_expense_with_shares(
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
AS $$
DECLARE
  v_expense   shared_expenses%ROWTYPE;
  v_share     expense_shares%ROWTYPE;
  v_share_obj jsonb;
  v_shares    jsonb := '[]'::jsonb;
BEGIN
  -- Create the parent expense
  INSERT INTO shared_expenses (
    listing_id,
    created_by,
    title,
    description,
    total_amount,
    split_type,
    category,
    due_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_listing_id,
    p_created_by,
    p_title,
    p_description,
    p_total_amount,
    p_split_type,
    p_category,
    p_due_date,
    'active',
    now(),
    now()
  )
  RETURNING * INTO v_expense;

  -- Create each share
  FOR v_share_obj IN SELECT * FROM jsonb_array_elements(p_shares)
  LOOP
    INSERT INTO expense_shares (
      expense_id,
      user_id,
      amount,
      percentage,
      status,
      paid_at,
      created_at,
      updated_at
    ) VALUES (
      v_expense.id,
      (v_share_obj ->> 'user_id')::uuid,
      (v_share_obj ->> 'amount')::numeric,
      (v_share_obj ->> 'percentage')::numeric,
      CASE
        WHEN (v_share_obj ->> 'user_id')::uuid = p_created_by THEN 'paid'
        ELSE 'pending'
      END,
      CASE
        WHEN (v_share_obj ->> 'user_id')::uuid = p_created_by THEN now()
        ELSE NULL
      END,
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

  -- Return the complete expense with its shares
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
