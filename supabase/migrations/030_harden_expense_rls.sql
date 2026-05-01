-- =============================================================================
-- Harden expense RLS: drop ALL prior policy variants, replace with
-- non-recursive policies backed by SECURITY DEFINER helpers.
-- =============================================================================
--
-- Background:
--   Migration 022 attempted to fix "infinite recursion detected in policy for
--   relation expense_shares" but had two problems:
--
--   1. It executed `DROP POLICY IF EXISTS "Users can view shared expenses"
--      ON shared_expenses` — but the original policy from migration 002 is
--      named "Expense participants can view". The DROP was a silent no-op,
--      leaving the recursive policy alongside the new one.
--
--   2. Some deployed environments never had 022 applied at all, so they still
--      run the original 002 policies (FOR ALL "Expense creators can manage
--      shares" on expense_shares queries shared_expenses, whose SELECT policy
--      queries expense_shares — the cycle Postgres aborts).
--
-- This migration is idempotent. It explicitly drops every prior policy name
-- we know about on both tables and recreates the non-recursive set, so it is
-- safe whether 022 was deployed, partially deployed, or never deployed.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helpers (recreate so this migration stands alone if 022 was skipped)
-- ----------------------------------------------------------------------------

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
-- shared_expenses: drop every prior SELECT policy, recreate one non-recursive
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Expense participants can view"   ON shared_expenses;
DROP POLICY IF EXISTS "Users can view shared expenses"  ON shared_expenses;

CREATE POLICY "Users can view shared expenses" ON shared_expenses
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR public.is_expense_participant(id, auth.uid())
  );

-- (The INSERT/UPDATE policies "Users can create expenses" and
--  "Creators can update expenses" from migration 002 are non-recursive; leave
--  them in place.)

-- ----------------------------------------------------------------------------
-- expense_shares: drop every prior policy, recreate per-action set
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own shares"          ON expense_shares;
DROP POLICY IF EXISTS "Expense creators can manage shares" ON expense_shares;
DROP POLICY IF EXISTS "Participants can view shares"       ON expense_shares;
DROP POLICY IF EXISTS "Expense creators can insert shares" ON expense_shares;
DROP POLICY IF EXISTS "Expense creators can update shares" ON expense_shares;
DROP POLICY IF EXISTS "Expense creators can delete shares" ON expense_shares;

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

-- Direct UPDATE is creator-only. Participants must transition share status
-- through the SECURITY DEFINER RPCs (pay_expense_share for pending->processing,
-- and the Stripe webhook running with the service-role key for
-- processing->paid / processing->pending on failure).
CREATE POLICY "Expense creators can update shares" ON expense_shares
  FOR UPDATE
  USING (public.is_expense_creator(expense_id, auth.uid()));

CREATE POLICY "Expense creators can delete shares" ON expense_shares
  FOR DELETE
  USING (
    public.is_expense_creator(expense_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- update_expense_status trigger function: SECURITY DEFINER so a payer who is
-- not the expense creator can still flip the parent shared_expenses status.
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
