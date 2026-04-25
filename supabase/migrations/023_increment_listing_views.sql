-- =============================================================================
-- increment_listing_views — bump views_count without UPDATE-RLS perms
-- =============================================================================
--
-- listings UPDATE policy is `auth.uid() = user_id`, so a non-owner viewing a
-- listing cannot increment views_count via direct UPDATE — RLS silently no-ops
-- the write, and the counter stays at 0 for everyone forever.
--
-- This RPC runs as the function owner, bypasses RLS, and atomically increments
-- the counter using a single UPDATE (no read-then-write race). The function is
-- restricted via its body to only ever increment by 1, so it can't be abused
-- to set the value.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE listings
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = p_listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_views(UUID) TO authenticated, anon;
