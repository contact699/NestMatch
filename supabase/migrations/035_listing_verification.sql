-- 035_listing_verification.sql
-- Listing verification: per-signal badge rows, an aggregate level, and a
-- service-role-only moderation table for silent fraud signals.
--
-- Security model (the DB is the boundary, not the API layer):
--   * listings exposes only `listing_verification_level` (a public-safe badge tier).
--   * Fraud evidence (flags, photo hashes) lives in `listing_moderation`, which has
--     NO anon/authenticated read policy — only the service role and the owner read it.
--   * Auto-flagged listings are hidden from the public listings SELECT policy via the
--     SECURITY DEFINER helper is_listing_flagged() (owner still sees their own).
--   * `listing_verifications.result` holds capture evidence (photoUrl, lat/lng), so the
--     table is NOT publicly readable; public badges come from the `listing_badges` view
--     which projects only badge-safe columns.

CREATE TYPE listing_verification_type AS ENUM ('id_owner', 'live_photo', 'mail', 'email', 'phone');
CREATE TYPE listing_verification_level AS ENUM ('unverified', 'verified', 'trusted');

-- Per-signal verification rows (may contain private evidence in `result`).
CREATE TABLE listing_verifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    type         listing_verification_type NOT NULL,
    status       verification_status DEFAULT 'pending',
    result       JSONB,
    completed_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (listing_id, type)
);
CREATE INDEX idx_listing_verifications_listing ON listing_verifications(listing_id);

-- Service-role-only moderation/fraud signals. No anon/authenticated write path.
CREATE TABLE listing_moderation (
    listing_id   UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    is_flagged   BOOLEAN NOT NULL DEFAULT FALSE,
    flags        JSONB NOT NULL DEFAULT '{}'::jsonb,
    photo_hashes TEXT[] NOT NULL DEFAULT '{}',
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_listing_moderation_flagged ON listing_moderation(listing_id) WHERE is_flagged;

-- listings gains only the public-safe aggregate level.
ALTER TABLE listings
    ADD COLUMN listing_verification_level listing_verification_level NOT NULL DEFAULT 'unverified';

-- is_verified on listings was an unused placeholder; the level enum replaces it.
-- (The separate `services` table keeps its own is_verified column.)
ALTER TABLE listings DROP COLUMN IF EXISTS is_verified;

CREATE INDEX idx_listings_verification_level ON listings(listing_verification_level);

-- Keep policy helper functions out of the exposed `public` schema. Supabase
-- PostgREST exposes public RPC functions, so this function belongs in a private
-- schema that app roles can execute for RLS evaluation but cannot call via RPC.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

-- SECURITY DEFINER helper: true when a listing has an active moderation flag.
-- Definer rights let the listings SELECT policy consult listing_moderation even
-- though anon/authenticated cannot read that table directly. Mirrors the
-- is_group_member() pattern from migration 025, but without exposing a public RPC.
CREATE OR REPLACE FUNCTION private.is_listing_flagged(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM listing_moderation m
     WHERE m.listing_id = p_listing_id
       AND m.is_flagged
  );
$$;
REVOKE ALL ON FUNCTION private.is_listing_flagged(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_listing_flagged(UUID) TO anon, authenticated;

-- Rewrite the public listings SELECT policy to hide auto-flagged rows from
-- everyone except the owner. (Original from migration 010b.)
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON listings;
CREATE POLICY "Active listings are viewable by everyone" ON listings
    FOR SELECT USING (
        (is_active = true AND deleted_at IS NULL AND NOT private.is_listing_flagged(id))
        OR auth.uid() = user_id
    );

-- RLS: listing_verifications — owner + service role only (no public read; result
-- may contain private capture evidence). Public badges come from the view below.
ALTER TABLE listing_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS listing_verifications_select_owner ON listing_verifications;
CREATE POLICY listing_verifications_select_owner ON listing_verifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
    );

-- RLS: listing_moderation — owner may read their own moderation status (e.g. to
-- show "under review"); writes are service-role only (no insert/update policy).
ALTER TABLE listing_moderation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS listing_moderation_select_owner ON listing_moderation;
CREATE POLICY listing_moderation_select_owner ON listing_moderation
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
    );

-- Public badge projection: only badge-safe columns, only completed signals, and
-- only for listings visible to the caller. A view is SECURITY DEFINER by default,
-- so it can read listing_verifications past its RLS while exposing nothing
-- beyond these four columns.
CREATE VIEW listing_badges AS
    SELECT lv.listing_id, lv.type, lv.status, lv.completed_at
      FROM listing_verifications lv
      JOIN listings l ON l.id = lv.listing_id
     WHERE lv.status = 'completed'
       AND (lv.expires_at IS NULL OR lv.expires_at > NOW())
       AND (
           (l.is_active = true AND l.deleted_at IS NULL AND NOT private.is_listing_flagged(l.id))
           OR auth.uid() = l.user_id
       );
GRANT SELECT ON listing_badges TO anon, authenticated;
