-- Phase 3: Content Scheduling
-- Adds publish_at and unpublish_at columns for scheduled content

-- Add scheduling columns to resources
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unpublish_at TIMESTAMPTZ;

-- Add scheduling columns to faqs
ALTER TABLE faqs
ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unpublish_at TIMESTAMPTZ;

-- Add indexes for scheduling queries (partial indexes for efficiency)
CREATE INDEX IF NOT EXISTS idx_resources_publish_at
  ON resources(publish_at)
  WHERE publish_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_unpublish_at
  ON resources(unpublish_at)
  WHERE unpublish_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_faqs_publish_at
  ON faqs(publish_at)
  WHERE publish_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_faqs_unpublish_at
  ON faqs(unpublish_at)
  WHERE unpublish_at IS NOT NULL;

-- Update RLS policies to consider scheduling
-- Drop and recreate the public read policies to include schedule filtering

DROP POLICY IF EXISTS "Anyone can read published resources" ON resources;
CREATE POLICY "Anyone can read published resources" ON resources
  FOR SELECT USING (
    is_published = true
    AND (publish_at IS NULL OR publish_at <= now())
    AND (unpublish_at IS NULL OR unpublish_at > now())
  );

DROP POLICY IF EXISTS "Anyone can read published FAQs" ON faqs;
CREATE POLICY "Anyone can read published FAQs" ON faqs
  FOR SELECT USING (
    is_published = true
    AND (publish_at IS NULL OR publish_at <= now())
    AND (unpublish_at IS NULL OR unpublish_at > now())
  );

-- Note: Admin policies already allow full access, so admins can see
-- scheduled content regardless of publish/unpublish dates
