-- =============================================================================
-- Group chat — embed real-time chat inside co-renter groups
-- =============================================================================
--
-- Reuses conversations + messages. A "group conversation" is a conversation row
-- whose group_id is non-null. There is at most one such conversation per group
-- (enforced by partial unique index). The 1:1 chat path (group_id IS NULL) is
-- unchanged.
--
-- Read tracking lives on co_renter_members.last_read_at to avoid a new table.
-- Unread = messages.created_at > member.last_read_at.
-- =============================================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS group_id UUID
    REFERENCES public.co_renter_groups(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_per_group
  ON public.conversations(group_id)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_group_id_idx
  ON public.conversations(group_id)
  WHERE group_id IS NOT NULL;

ALTER TABLE public.co_renter_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.conversations.group_id IS
  'Non-null when this conversation backs a co-renter group chat. One row per group.';
COMMENT ON COLUMN public.co_renter_members.last_read_at IS
  'When this member last read group chat messages. Drives unread counts.';

-- ---------------------------------------------------------------------------
-- RLS — group conversations
--
-- Additional policies that grant access to a member of a co_renter_group for
-- conversations/messages whose group_id matches. Existing 1:1 policies stay
-- in place; both sets of policies coexist via OR semantics.
-- ---------------------------------------------------------------------------

-- conversations: SELECT for group members
DROP POLICY IF EXISTS "Group members can view group conversations"
  ON public.conversations;
CREATE POLICY "Group members can view group conversations"
  ON public.conversations FOR SELECT
  USING (
    group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.co_renter_members m
       WHERE m.group_id = conversations.group_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- conversations: INSERT for group members (creating the lazy-conversation row)
DROP POLICY IF EXISTS "Group members can create group conversation"
  ON public.conversations;
CREATE POLICY "Group members can create group conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (
    group_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.co_renter_members m
       WHERE m.group_id = conversations.group_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- messages: SELECT for group members
DROP POLICY IF EXISTS "Group members can view group messages"
  ON public.messages;
CREATE POLICY "Group members can view group messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.conversations c
        JOIN public.co_renter_members m ON m.group_id = c.group_id
       WHERE c.id = messages.conversation_id
         AND c.group_id IS NOT NULL
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- messages: INSERT for group members, only as themselves
DROP POLICY IF EXISTS "Group members can send group messages"
  ON public.messages;
CREATE POLICY "Group members can send group messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
        FROM public.conversations c
        JOIN public.co_renter_members m ON m.group_id = c.group_id
       WHERE c.id = messages.conversation_id
         AND c.group_id IS NOT NULL
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- co_renter_members: members can update their own last_read_at
DROP POLICY IF EXISTS "Members can update own last_read_at"
  ON public.co_renter_members;
CREATE POLICY "Members can update own last_read_at"
  ON public.co_renter_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
