-- Migration: Add missing columns to listings and profiles tables
-- These columns are expected by the application code but were never created in the database

-- Create bathroom_type enum if not exists
DO $$ BEGIN
    CREATE TYPE bathroom_type AS ENUM ('ensuite', 'private', 'shared');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bathroom_size enum if not exists
DO $$ BEGIN
    CREATE TYPE bathroom_size_type AS ENUM ('full', 'three_quarter', 'half');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS bathroom_type bathroom_type DEFAULT 'shared',
ADD COLUMN IF NOT EXISTS bathroom_size bathroom_size_type,
ADD COLUMN IF NOT EXISTS help_needed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS help_tasks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS help_details TEXT;

-- Add missing columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS household_situation TEXT CHECK (household_situation IS NULL OR household_situation IN ('alone', 'couple', 'single_parent', 'couple_with_children', 'with_roommate')),
ADD COLUMN IF NOT EXISTS number_of_children INTEGER;

-- Add index for bathroom_type filtering
CREATE INDEX IF NOT EXISTS idx_listings_bathroom_type ON listings(bathroom_type);

-- Add index for help_needed listings (for help exchange feature)
CREATE INDEX IF NOT EXISTS idx_listings_help_needed ON listings(help_needed) WHERE help_needed = true;
