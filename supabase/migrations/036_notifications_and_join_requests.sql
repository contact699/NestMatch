-- 036_notifications_and_join_requests.sql
--
-- Ports the in-app notification system + co-renter join requests from the
-- legacy pre-monorepo branch (migrations 019_join_requests.sql and
-- 020_notifications.sql) into the current tree, and widens the notifications
-- type CHECK to add 'new_message'.
--
-- IDEMPOTENT: prod already has both tables, their RLS policies, and the
-- realtime publication entry. This migration is safe to (re-)run — every
-- statement is guarded so the only real effect on prod is widening the
-- notifications_type_check constraint.

-- ============================================================
-- co_renter_join_requests (mirrors 019_join_requests.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS co_renter_join_requests (
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

CREATE INDEX IF NOT EXISTS idx_join_requests_group ON co_renter_join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON co_renter_join_requests(user_id);

ALTER TABLE co_renter_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own join requests
DROP POLICY IF EXISTS "Users can view own join requests" ON co_renter_join_requests;
CREATE POLICY "Users can view own join requests" ON co_renter_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Group admins can view join requests for their groups
DROP POLICY IF EXISTS "Group admins can view join requests" ON co_renter_join_requests;
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
DROP POLICY IF EXISTS "Users can request to join public groups" ON co_renter_join_requests;
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
DROP POLICY IF EXISTS "Group admins can respond to join requests" ON co_renter_join_requests;
CREATE POLICY "Group admins can respond to join requests" ON co_renter_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM co_renter_members
      WHERE co_renter_members.group_id = co_renter_join_requests.group_id
      AND co_renter_members.user_id = auth.uid()
      AND co_renter_members.role = 'admin'
    )
  );

-- ============================================================
-- notifications (mirrors 020_notifications.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('join_request_received', 'join_request_accepted', 'join_request_declined', 'invitation_received', 'member_joined')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- No INSERT policy: notifications are created server-side via the service client.

-- Widen the type CHECK constraint to include 'new_message'. The inline CHECK
-- above is auto-named notifications_type_check by Postgres; drop it (whether it
-- came from this migration or the legacy 020 migration) and recreate with the
-- extended set of 6 types.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'join_request_received',
    'join_request_accepted',
    'join_request_declined',
    'invitation_received',
    'member_joined',
    'new_message'
  ));

-- Enable realtime for live notification updates. Guarded: adding a table that
-- is already in the publication raises an error, so only add when missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;
