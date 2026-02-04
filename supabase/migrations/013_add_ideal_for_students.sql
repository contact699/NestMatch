-- Add ideal_for_students flag to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ideal_for_students BOOLEAN DEFAULT false;
