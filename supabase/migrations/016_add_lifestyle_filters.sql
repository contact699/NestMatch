-- Add lifestyle filter columns to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_included boolean DEFAULT false;
