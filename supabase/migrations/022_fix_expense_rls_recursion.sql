-- =============================================================================
-- Fix infinite recursion in expense RLS policies + expense status trigger
-- =============================================================================
--
-- Root cause:
--   `shared_expenses` SELECT policy queries `expense_shares`.
--   `expense_shares` had a `FOR ALL` policy ("Expense creators can manage
--   shares") whose USING clause queries `shared_expenses`.
--   Selecting from either table triggered a cycle that Postgres aborts with
--   "infinite recursion detected in policy for relation expense_shares".
--
-- Fix:
--   Replace the cross-table EXISTS subqueries with SECURITY DEFINER helper
--   functions. Functions marked SECURITY DEFINER run with the function
--   owner's privileges and bypass RLS, breaking the recursion cycle.
--
--   Also make `update_expense_status` (the AFTER UPDATE trigger on
--   expense_shares) SECURITY DEFINER so a payer who is not the expense
--   creator can still flip the parent shared_expenses row's status. The
--   shared_expenses UPDATE policy is `auth.uid() = created_by`, which would
--   silently no-op the trigger when the payer is anyone other than the
--   creator.
-- =============================================================================

-- Helper: is the given user a participant (has a share) of the given expense?
CREATE OR REPLACE FUNCTION public.is_expense_participant(
  p_expense_id UUID,
  p_user_id    UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM expense_shares
     WHERE expense_id = p_expense_id
       AND user_id    = p_user_id
  );
$$;

-- Helper: did the given user create the given expense?
CREATE OR REPLACE FUNCTION public.is_expense_creator(
  p_expense_id UUID,
  p_user_id    UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM shared_expenses
     WHERE id         = p_expense_id
       AND created_by = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_expense_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_expense_creator(UUID, UUID)     TO authenticated;

-- ----------------------------------------------------------------------------
-- shared_expenses policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view shared expenses" ON shared_expenses;

CREATE POLICY "Users can view shared expenses" ON shared_expenses
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR public.is_expense_participant(id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- expense_shares policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own shares"        ON expense_shares;
DROP POLICY IF EXISTS "Expense creators can manage shares" ON expense_shares;

-- Participants can SELECT shares for any expense they participate in OR created.
-- Splitting the previous FOR ALL into per-action policies avoids the recursive
-- SELECT path while keeping creator-only mutation rights.
CREATE POLICY "Participants can view shares" ON expense_shares
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_expense_creator(expense_id, auth.uid())
  );

CREATE POLICY "Expense creators can insert shares" ON expense_shares
  FOR INSERT
  WITH CHECK (
    public.is_expense_creator(expense_id, auth.uid())
  );

CREATE POLICY "Expense creators can update shares" ON expense_shares
  FOR UPDATE
  USING (
    public.is_expense_creator(expense_id, auth.uid())
    OR auth.uid() = user_id  -- payers can update their own share status
  );

CREATE POLICY "Expense creators can delete shares" ON expense_shares
  FOR DELETE
  USING (
    public.is_expense_creator(expense_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- update_expense_status trigger function — promote to SECURITY DEFINER
-- so a non-creator paying their share can still recompute parent status.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_expense_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_shares INTEGER;
  paid_shares  INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid')
    INTO total_shares, paid_shares
    FROM expense_shares
   WHERE expense_id = NEW.expense_id;

  UPDATE shared_expenses
     SET status = CASE
                    WHEN paid_shares = total_shares THEN 'completed'
                    WHEN paid_shares > 0            THEN 'partial'
                    ELSE                                  'pending'
                  END,
         updated_at = now()
   WHERE id = NEW.expense_id;

  RETURN NEW;
END;
$$;
