-- Fix: Allow group creators to add themselves as the first member
-- The existing "Admins can manage members" policy requires the user to already be
-- an admin member, which creates a chicken-and-egg problem when creating a new group.

-- Allow group creators to insert themselves as the first member
CREATE POLICY "Group creators can add themselves" ON co_renter_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM co_renter_groups WHERE id = group_id AND created_by = auth.uid())
  );
