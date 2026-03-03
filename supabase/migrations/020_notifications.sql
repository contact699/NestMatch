-- In-app notifications
CREATE TABLE notifications (
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

-- Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (e.g. mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- No INSERT policy: notifications are created server-side via the service client

-- Enable realtime for live notification updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
