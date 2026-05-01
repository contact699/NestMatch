-- =============================================================================
-- Backfill is_public for groups created before migration 017
-- =============================================================================
--
-- Migration 017_fix_group_visibility_and_bootstrap.sql changed the column
-- default for co_renter_groups.is_public from false to true so newly-created
-- groups would be discoverable. It did NOT touch existing rows. Groups
-- created before 017 was applied therefore keep is_public = false and
-- silently never appear in any "public groups" listing — even though their
-- creators usually never saw a "private/public" toggle and didn't intend to
-- hide them.
--
-- This migration flips those legacy groups to public. The created_at
-- cutoff is a FIXED timestamp (the date this migration first shipped) so
-- re-running this migration in the future will NOT silently flip private
-- groups created after the migration date back to public — a safety
-- regression flagged in code review of the original `created_at < NOW()`
-- version.
--
-- Anyone who actually wants their old group to stay private can flip it
-- back from group settings; this is the safer default for the much larger
-- population of inadvertently-private groups.
-- =============================================================================

UPDATE public.co_renter_groups
   SET is_public = true,
       updated_at = NOW()
 WHERE is_public IS DISTINCT FROM true
   AND created_at < TIMESTAMPTZ '2026-05-01 00:00:00+00';
