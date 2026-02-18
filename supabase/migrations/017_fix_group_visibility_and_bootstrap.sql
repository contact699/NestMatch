-- Ensure new co-renter groups are discoverable unless explicitly private
ALTER TABLE co_renter_groups
  ALTER COLUMN is_public SET DEFAULT true;

-- Keep creator bootstrap policy idempotent for environments that missed migration 012
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'co_renter_members'
      AND policyname = 'Group creators can add themselves'
  ) THEN
    CREATE POLICY "Group creators can add themselves" ON co_renter_members
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM co_renter_groups
          WHERE id = group_id
            AND created_by = auth.uid()
        )
      );
  END IF;
END $$;
