-- 018_messaging_enhancements.sql
-- Adds: message status, attachment columns, online status on profiles, chat_events table

-- 1. Add message status column (sent/delivered/read)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent'
  CHECK (status IN ('sent', 'delivered', 'read'));

-- 2. Add attachment columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT
  CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'video', 'document', 'gif'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 3. Add online status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 4. Create chat_events table for calendar scheduling
CREATE TABLE IF NOT EXISTS chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_events_conversation ON chat_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_date ON chat_events(event_date);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_by ON chat_events(created_by);

-- RLS for chat_events
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view events in their conversations"
  ON chat_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_events.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

CREATE POLICY "Participants can create events in their conversations"
  ON chat_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Participants can update events in their conversations"
  ON chat_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_events.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );
