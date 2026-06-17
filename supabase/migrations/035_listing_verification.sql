-- 035_listing_verification.sql
-- Listing verification: per-signal badge rows + aggregate level + silent-check fields.

CREATE TYPE listing_verification_type AS ENUM ('id_owner', 'live_photo', 'mail', 'email', 'phone');
CREATE TYPE listing_verification_level AS ENUM ('unverified', 'verified', 'trusted');

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

ALTER TABLE listings
    ADD COLUMN listing_verification_level listing_verification_level NOT NULL DEFAULT 'unverified',
    ADD COLUMN verification_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN photo_hashes TEXT[] NOT NULL DEFAULT '{}';

-- is_verified on listings was an unused placeholder; the level enum replaces it.
-- (Note: the separate `services` table keeps its own is_verified column.)
ALTER TABLE listings DROP COLUMN IF EXISTS is_verified;

CREATE INDEX idx_listings_verification_level ON listings(listing_verification_level);

-- RLS
ALTER TABLE listing_verifications ENABLE ROW LEVEL SECURITY;

-- Public may read COMPLETED badge rows (badges are public).
DROP POLICY IF EXISTS listing_verifications_select_public ON listing_verifications;
CREATE POLICY listing_verifications_select_public ON listing_verifications
    FOR SELECT USING (status = 'completed');

-- Listing owner may read all their own rows (incl. pending).
DROP POLICY IF EXISTS listing_verifications_select_owner ON listing_verifications;
CREATE POLICY listing_verifications_select_owner ON listing_verifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
    );

-- Writes are server-side only (service role bypasses RLS); no INSERT/UPDATE policy for anon/auth.
