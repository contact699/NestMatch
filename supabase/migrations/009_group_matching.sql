-- Group Matching + Trust Tiers Migration
-- Tables for AI-generated group suggestions and user matching preferences

-- Store AI-generated group suggestions
CREATE TABLE group_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  suggested_users UUID[] NOT NULL,
  practical_score INTEGER NOT NULL CHECK (practical_score >= 0 AND practical_score <= 100),
  compatibility_score INTEGER NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  combined_score INTEGER NOT NULL CHECK (combined_score >= 0 AND combined_score <= 100),
  match_criteria JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'converted')),
  converted_group_id UUID REFERENCES co_renter_groups(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for matching
CREATE TABLE user_matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  preferred_group_size INTEGER DEFAULT 2 CHECK (preferred_group_size BETWEEN 2 AND 4),
  budget_flexibility_percent INTEGER DEFAULT 20 CHECK (budget_flexibility_percent BETWEEN 0 AND 100),
  date_flexibility_days INTEGER DEFAULT 30 CHECK (date_flexibility_days BETWEEN 0 AND 365),
  verification_preference VARCHAR(20) DEFAULT 'any' CHECK (verification_preference IN ('any', 'verified_only', 'trusted_only')),
  is_discoverable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track interactions with suggestions
CREATE TABLE suggestion_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES group_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('viewed', 'interested', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id, action)
);

-- Indexes for performance
CREATE INDEX idx_suggestions_target ON group_suggestions(target_user_id, status);
CREATE INDEX idx_suggestions_expires ON group_suggestions(expires_at) WHERE status = 'active';
CREATE INDEX idx_suggestions_combined_score ON group_suggestions(combined_score DESC) WHERE status = 'active';
CREATE INDEX idx_seeking_budget ON seeking_profiles(budget_min, budget_max) WHERE is_active = true;
CREATE INDEX idx_seeking_date ON seeking_profiles(move_in_date) WHERE is_active = true;
CREATE INDEX idx_seeking_cities ON seeking_profiles USING GIN(preferred_cities) WHERE is_active = true;
CREATE INDEX idx_matching_preferences_user ON user_matching_preferences(user_id);
CREATE INDEX idx_suggestion_interactions_suggestion ON suggestion_interactions(suggestion_id);

-- Auto-update timestamp for matching preferences
CREATE TRIGGER user_matching_preferences_updated_at
  BEFORE UPDATE ON user_matching_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate average compatibility for a group of users
CREATE OR REPLACE FUNCTION calculate_group_compatibility(user_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER := 0;
  pair_count INTEGER := 0;
  i INTEGER;
  j INTEGER;
  pair_score INTEGER;
BEGIN
  IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) < 2 THEN
    RETURN 0;
  END IF;

  FOR i IN 1..array_length(user_ids, 1) LOOP
    FOR j IN (i + 1)..array_length(user_ids, 1) LOOP
      pair_score := calculate_compatibility(user_ids[i], user_ids[j]);
      total_score := total_score + pair_score;
      pair_count := pair_count + 1;
    END LOOP;
  END LOOP;

  IF pair_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(total_score::DECIMAL / pair_count::DECIMAL);
END;
$$ LANGUAGE plpgsql;

-- Calculate trust score (weighted average of verification levels)
CREATE OR REPLACE FUNCTION calculate_trust_score(user_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  trust_sum INTEGER := 0;
  v_level TEXT;
  uid UUID;
  user_count INTEGER := 0;
BEGIN
  IF array_length(user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH uid IN ARRAY user_ids LOOP
    SELECT verification_level::TEXT INTO v_level FROM profiles WHERE user_id = uid;
    IF v_level IS NOT NULL THEN
      trust_sum := trust_sum + CASE v_level
        WHEN 'trusted' THEN 100
        WHEN 'verified' THEN 70
        ELSE 30
      END;
      user_count := user_count + 1;
    END IF;
  END LOOP;

  IF user_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(trust_sum::DECIMAL / user_count::DECIMAL);
END;
$$ LANGUAGE plpgsql;

-- Batch compatibility: returns all pairwise scores in one call
CREATE OR REPLACE FUNCTION batch_calculate_compatibility(current_user_id UUID, other_user_ids UUID[])
RETURNS TABLE(user_id UUID, score INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT uid AS user_id, calculate_compatibility(current_user_id, uid) as score
  FROM unnest(other_user_ids) AS uid;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies
ALTER TABLE group_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_interactions ENABLE ROW LEVEL SECURITY;

-- Group suggestions policies
-- Users can only view their own suggestions
CREATE POLICY "Users can view their own suggestions" ON group_suggestions
  FOR SELECT USING (auth.uid() = target_user_id);

-- EXPLICITLY BLOCK INSERT for all users via RLS
-- Only service role (which bypasses RLS) can insert suggestions
-- This prevents users from creating fake suggestions with arbitrary scores
CREATE POLICY "Block all user inserts on suggestions" ON group_suggestions
  FOR INSERT
  WITH CHECK (false);

-- Users can update status of their own suggestions (dismiss, etc.)
CREATE POLICY "Users can update their own suggestions" ON group_suggestions
  FOR UPDATE USING (auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = target_user_id);

-- Users can delete their own suggestions
CREATE POLICY "Users can delete their own suggestions" ON group_suggestions
  FOR DELETE USING (auth.uid() = target_user_id);

-- User matching preferences policies
CREATE POLICY "Users can view their own preferences" ON user_matching_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_matching_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_matching_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Suggestion interactions policies
CREATE POLICY "Users can view their own interactions" ON suggestion_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON suggestion_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view suggestions where they are in the suggested_users array
CREATE POLICY "Users can view suggestions where they are suggested" ON group_suggestions
  FOR SELECT USING (auth.uid() = ANY(suggested_users));
