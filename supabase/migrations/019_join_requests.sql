-- Join requests for public co-renter groups
CREATE TABLE co_renter_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES co_renter_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX idx_join_requests_group ON co_renter_join_requests(group_id, status);
CREATE INDEX idx_join_requests_user ON co_renter_join_requests(user_id);

-- RLS
ALTER TABLE co_renter_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own join requests
CREATE POLICY "Users can view own join requests" ON co_renter_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Group admins can view join requests for their groups
CREATE POLICY "Group admins can view join requests" ON co_renter_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM co_renter_members
      WHERE co_renter_members.group_id = co_renter_join_requests.group_id
      AND co_renter_members.user_id = auth.uid()
      AND co_renter_members.role = 'admin'
    )
  );

-- Users can create join requests for public groups
CREATE POLICY "Users can request to join public groups" ON co_renter_join_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM co_renter_groups
      WHERE co_renter_groups.id = group_id
      AND co_renter_groups.is_public = true
    )
  );

-- Group admins can update join requests (accept/decline)
CREATE POLICY "Group admins can respond to join requests" ON co_renter_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM co_renter_members
      WHERE co_renter_members.group_id = co_renter_join_requests.group_id
      AND co_renter_members.user_id = auth.uid()
      AND co_renter_members.role = 'admin'
    )
  );
