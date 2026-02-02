-- Fix RLS for group_suggestions: explicitly block INSERT for all users
-- Drop any existing INSERT policy (in case one was added previously)
DROP POLICY IF EXISTS "Users can insert suggestions" ON group_suggestions;
DROP POLICY IF EXISTS "Allow inserts" ON group_suggestions;
DROP POLICY IF EXISTS "insert_policy" ON group_suggestions;

-- Create an explicit DENY policy for INSERT
-- This uses a false condition to block all inserts via RLS
-- Only service role (which bypasses RLS) can insert
CREATE POLICY "Block all user inserts" ON group_suggestions
  FOR INSERT
  WITH CHECK (false);

-- ============================================
-- BATCH COMPATIBILITY FUNCTION
-- Calculates compatibility for multiple groups in a single call
-- Eliminates N+1 queries when evaluating combinations
-- ============================================

CREATE OR REPLACE FUNCTION batch_calculate_group_compatibilities(
  group_member_arrays UUID[][]
)
RETURNS TABLE(group_index INTEGER, compatibility_score INTEGER) AS $$
DECLARE
  arr UUID[];
  idx INTEGER := 0;
  total_score INTEGER;
  pair_count INTEGER;
  i INTEGER;
  j INTEGER;
  pair_score INTEGER;
BEGIN
  FOREACH arr SLICE 1 IN ARRAY group_member_arrays LOOP
    -- Calculate compatibility for this group
    total_score := 0;
    pair_count := 0;

    IF array_length(arr, 1) >= 2 THEN
      FOR i IN 1..array_length(arr, 1) LOOP
        FOR j IN (i + 1)..array_length(arr, 1) LOOP
          pair_score := calculate_compatibility(arr[i], arr[j]);
          total_score := total_score + pair_score;
          pair_count := pair_count + 1;
        END LOOP;
      END LOOP;
    END IF;

    group_index := idx;
    IF pair_count > 0 THEN
      compatibility_score := ROUND(total_score::DECIMAL / pair_count::DECIMAL);
    ELSE
      compatibility_score := 0;
    END IF;

    RETURN NEXT;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_calculate_group_compatibilities TO authenticated;
