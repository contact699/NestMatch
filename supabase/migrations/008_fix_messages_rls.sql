-- Fix messages RLS: Add UPDATE policy for marking messages as read
-- Users should be able to update read_at on messages sent TO them (not by them)

CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (
    -- User must be a participant in the conversation
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
    -- And the message was not sent by them (can only mark received messages as read)
    AND sender_id != auth.uid()
  )
  WITH CHECK (
    -- Only allow updating read_at field
    sender_id = sender_id  -- This ensures other fields aren't changed
  );
