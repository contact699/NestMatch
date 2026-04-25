-- =============================================================================
-- saved_profiles — let users bookmark roommate profiles, mirroring saved_listings
-- =============================================================================
--
-- Tester noted there's no way to save profiles when browsing /roommates or
-- viewing a profile detail page. The /saved page already has a Roommates tab
-- placeholder; this table backs it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS saved_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, saved_user_id),
  CHECK (user_id <> saved_user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_profiles_user
  ON saved_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_profiles_saved_user
  ON saved_profiles(saved_user_id);

ALTER TABLE saved_profiles ENABLE ROW LEVEL SECURITY;

-- Mirrors saved_listings: a user can only see/insert/delete their own saves.
DROP POLICY IF EXISTS "Users can view own saved profiles"   ON saved_profiles;
DROP POLICY IF EXISTS "Users can save profiles"              ON saved_profiles;
DROP POLICY IF EXISTS "Users can unsave profiles"            ON saved_profiles;

CREATE POLICY "Users can view own saved profiles" ON saved_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save profiles" ON saved_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave profiles" ON saved_profiles
  FOR DELETE USING (auth.uid() = user_id);
