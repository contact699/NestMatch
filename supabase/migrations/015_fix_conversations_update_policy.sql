-- Add missing UPDATE policy for conversations table
-- This allows participants to update last_message_at when sending messages

CREATE POLICY "Participants can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));
