-- =============================================================================
-- group_saved_listings — let co-renter group members shortlist places together
-- =============================================================================
--
-- Tester noted: "there is no way to save listings to the group to look at
-- together". Saved-listings on /saved is per-user; this table is per-group so
-- everyone in the group sees the same shortlist.
-- =============================================================================

CREATE TABLE IF NOT EXISTS group_saved_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES co_renter_groups(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  saved_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_group_saved_listings_group   ON group_saved_listings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_saved_listings_listing ON group_saved_listings(listing_id);

ALTER TABLE group_saved_listings ENABLE ROW LEVEL SECURITY;

-- Helper to check group membership without recursing into co_renter_members'
-- own RLS — same SECURITY DEFINER pattern used elsewhere (migration 022).
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM co_renter_members
     WHERE group_id = p_group_id
       AND user_id  = p_user_id
       AND status   = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;

-- Mirror of is_group_member but checks for the admin role specifically. Used by
-- the DELETE policy so admins can clean up the shortlist. Also used by
-- get_my_active_groups below to surface admin status to the client without
-- forcing it to query co_renter_members directly (which has known recursion
-- issues — see /api/groups/route.ts comments).
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM co_renter_members
     WHERE group_id = p_group_id
       AND user_id  = p_user_id
       AND role     = 'admin'
       AND status   = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;

-- get_my_active_groups — returns the active group memberships for the calling
-- user, with admin status. SECURITY DEFINER so the SaveToGroupButton client
-- doesn't have to query co_renter_members directly (where its RLS recursion
-- bug would silently return zero rows).
CREATE OR REPLACE FUNCTION public.get_my_active_groups()
RETURNS TABLE (
  group_id   UUID,
  group_name TEXT,
  is_admin   BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT m.group_id,
         g.name::TEXT       AS group_name,
         (m.role = 'admin') AS is_admin
    FROM co_renter_members m
    JOIN co_renter_groups g ON g.id = m.group_id
   WHERE m.user_id = auth.uid()
     AND m.status  = 'active'
   ORDER BY g.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_groups() TO authenticated;

DROP POLICY IF EXISTS "Group members can view group saved listings"   ON group_saved_listings;
DROP POLICY IF EXISTS "Group members can save listings to a group"    ON group_saved_listings;
DROP POLICY IF EXISTS "Group members can unsave listings from a group" ON group_saved_listings;

-- Any active member of the group can see the shortlist.
CREATE POLICY "Group members can view group saved listings" ON group_saved_listings
  FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

-- Any active member can add a listing to the shortlist (and the saved_by must
-- match the caller, so you can't blame your save on someone else).
CREATE POLICY "Group members can save listings to a group" ON group_saved_listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = saved_by
    AND public.is_group_member(group_id, auth.uid())
  );

-- Either the saver themselves or any group admin can remove a saved listing.
-- Using is_group_admin() (SECURITY DEFINER) instead of an inline EXISTS so we
-- don't recurse through co_renter_members' own RLS.
CREATE POLICY "Group members can unsave listings from a group" ON group_saved_listings
  FOR DELETE
  USING (
    auth.uid() = saved_by
    OR public.is_group_admin(group_id, auth.uid())
  );
