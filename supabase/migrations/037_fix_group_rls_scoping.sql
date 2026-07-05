-- =============================================================================
-- Fix tautological RLS policies on co_renter_groups / co_renter_members.
-- =============================================================================
--
-- The original policies (from 002-era SQL) contain self-comparisons that make
-- the group-scoping clause a tautology:
--
--   "Group members can view group"      ... WHERE co_renter_members.group_id = co_renter_members.id
--   "Admins can update groups"          ... WHERE co_renter_members.group_id = co_renter_members.id
--   "Members can view group members"    ... WHERE cm.group_id = cm.group_id          (always true)
--   "Admins can manage members"         ... WHERE m1.group_id = m1.group_id          (always true)
--
-- Effective (broken) behavior in production:
--   - Any user who belongs to at least one group can read the member rows of
--     EVERY group (privacy leak).
--   - Any user who is an admin of ANY group can insert/update/delete member
--     rows in EVERY group (authorization bypass).
--
-- Fix: rebuild the four policies on top of the SECURITY DEFINER helpers
-- is_group_member() / is_group_admin() (added in 025), which also avoids the
-- co_renter_members self-referential RLS recursion problem. Adds a small
-- is_group_public() helper so member lists of public groups remain browsable
-- by prospective joiners, and an explicit "leave group" DELETE policy for
-- members (previously only reachable through the broken admin tautology or
-- the service-role client).
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- Helper: is a group public? SECURITY DEFINER so it can be used inside
-- co_renter_members policies without re-entering co_renter_groups RLS.
CREATE OR REPLACE FUNCTION public.is_group_public(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM co_renter_groups g
     WHERE g.id = p_group_id
       AND g.is_public = true
  );
$$;

-- ----------------------------------------------------------------------------
-- co_renter_groups
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Group members can view group" ON public.co_renter_groups;
CREATE POLICY "Group members can view group" ON public.co_renter_groups
  FOR SELECT
  USING (
    is_public = true
    OR public.is_group_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update groups" ON public.co_renter_groups;
CREATE POLICY "Admins can update groups" ON public.co_renter_groups
  FOR UPDATE
  USING (public.is_group_admin(id, auth.uid()))
  WITH CHECK (public.is_group_admin(id, auth.uid()));

-- ----------------------------------------------------------------------------
-- co_renter_members
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view group members" ON public.co_renter_members;
CREATE POLICY "Members can view group members" ON public.co_renter_members
  FOR SELECT
  USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_public(group_id)
  );

DROP POLICY IF EXISTS "Admins can manage members" ON public.co_renter_members;
CREATE POLICY "Admins can manage members" ON public.co_renter_members
  FOR ALL
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- Members may remove their own membership (leave a group).
DROP POLICY IF EXISTS "Members can leave groups" ON public.co_renter_members;
CREATE POLICY "Members can leave groups" ON public.co_renter_members
  FOR DELETE
  USING (user_id = auth.uid());
