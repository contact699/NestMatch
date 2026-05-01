-- =============================================================================
-- Add budget_min / budget_max columns to profiles
-- =============================================================================
--
-- The profile edit page (apps/web/src/app/(app)/profile/edit/page.tsx) writes
-- budget_min and budget_max to the profiles row, and the profile view page
-- reads the same fields. Until now those columns only existed on
-- seeking_profiles, so saving a budget produced
-- "Could not find the 'budget_max' column of 'profiles' in the schema cache".
--
-- Add both columns (NULLable; budget is optional) with non-negative checks
-- and a cross-column constraint that budget_max must be >= budget_min when
-- both are set.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS budget_min INTEGER,
  ADD COLUMN IF NOT EXISTS budget_max INTEGER;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_budget_min_nonneg,
  ADD  CONSTRAINT          profiles_budget_min_nonneg
    CHECK (budget_min IS NULL OR budget_min >= 0);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_budget_max_nonneg,
  ADD  CONSTRAINT          profiles_budget_max_nonneg
    CHECK (budget_max IS NULL OR budget_max >= 0);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_budget_range_valid,
  ADD  CONSTRAINT          profiles_budget_range_valid
    CHECK (
      budget_min IS NULL
      OR budget_max IS NULL
      OR budget_min <= budget_max
    );
