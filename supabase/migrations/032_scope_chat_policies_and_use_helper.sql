-- =============================================================================
-- Scope 1:1 chat policies to group_id IS NULL; rebuild group chat policies
-- on top of the SECURITY DEFINER is_group_member() helper.
-- =============================================================================
--
-- Background (from a code review of migration 027):
--
-- 1. The original 1:1 chat policies on conversations/messages (from 001 and
--    015) gate on `auth.uid() = ANY(participant_ids)`. They were never scoped
--    to `group_id IS NULL`, so they continue to apply to group conversations
--    too. This had two consequences:
--      a. The chat init route inserts a group conversation row with
--         `participant_ids = [creator]` to satisfy the old INSERT policy.
--         The creator then retains SELECT/UPDATE access via the old policy
--         even after they leave the group.
--      b. The unique partial index on `conversations(group_id) WHERE
--         group_id IS NOT NULL` makes "squat the conversation row for a
--         group I don't belong to" a denial-of-service vector — the old
--         INSERT policy lets any authenticated user create a row with a
--         forged group_id and themselves in participant_ids, blocking the
--         legitimate group from ever creating its conversation.
--
-- 2. The new group policies added in 027 inline `EXISTS (SELECT 1 FROM
--    co_renter_members ...)`. The co_renter_members table itself has
--    recursive policies (002 lines 444 + 448 — both inner queries hit
--    co_renter_members from within a co_renter_members policy). Postgres
--    aborts the chain with `infinite recursion detected in policy`, so
--    browser-side message SELECTs and real-time subscriptions silently fail
--    even for legitimate group members.
--
-- Fix:
--   - Drop and recreate the old 1:1 policies with `group_id IS NULL`
--     scoping. They now apply only to 1:1 conversations.
--   - Drop and recreate the new group policies using the SECURITY DEFINER
--     helper `is_group_member()` (added in 025). SECURITY DEFINER bypasses
--     RLS on co_renter_members, breaking the recursion chain.
--   - After this migration is live, the chat init route can stop populating
--     participant_ids: [creator] (it's no longer needed to satisfy any
--     INSERT policy for group conversations).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Old 1:1 conversation/message policies — recreate scoped to group_id IS NULL
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own conversations"            ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations"              ON public.conversations;
DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own 1:1 conversations"            ON public.conversations;
DROP POLICY IF EXISTS "Users can create 1:1 conversations"              ON public.conversations;
DROP POLICY IF EXISTS "Participants can update their 1:1 conversations" ON public.conversations;

CREATE POLICY "Users can view own 1:1 conversations" ON public.conversations
  FOR SELECT
  USING (
    group_id IS NULL
    AND auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Users can create 1:1 conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (
    group_id IS NULL
    AND auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Participants can update their 1:1 conversations" ON public.conversations
  FOR UPDATE
  USING (
    group_id IS NULL
    AND auth.uid() = ANY(participant_ids)
  )
  WITH CHECK (
    group_id IS NULL
    AND auth.uid() = ANY(participant_ids)
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view 1:1 messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send 1:1 messages" ON public.messages;

CREATE POLICY "Users can view 1:1 messages" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id
         AND c.group_id IS NULL
         AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "Users can send 1:1 messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = conversation_id
         AND c.group_id IS NULL
         AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- ----------------------------------------------------------------------------
-- New group conversation/message policies — rebuild with is_group_member()
-- helper to break the recursion through co_renter_members RLS.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Group members can view group conversations"   ON public.conversations;
DROP POLICY IF EXISTS "Group members can create group conversation"  ON public.conversations;
DROP POLICY IF EXISTS "Group members can update group conversations" ON public.conversations;
DROP POLICY IF EXISTS "Group members can view group messages"        ON public.messages;
DROP POLICY IF EXISTS "Group members can send group messages"        ON public.messages;

CREATE POLICY "Group members can view group conversations" ON public.conversations
  FOR SELECT
  USING (
    group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Group members can create group conversation" ON public.conversations
  FOR INSERT
  WITH CHECK (
    group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  );

-- New: explicit UPDATE policy for group conversations so members can touch
-- last_message_at on send. The old "Participants can update their
-- conversations" no longer covers group rows because it's scoped to
-- group_id IS NULL above.
CREATE POLICY "Group members can update group conversations" ON public.conversations
  FOR UPDATE
  USING (
    group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  )
  WITH CHECK (
    group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Group members can view group messages" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id
         AND c.group_id IS NOT NULL
         AND public.is_group_member(c.group_id, auth.uid())
    )
  );

CREATE POLICY "Group members can send group messages" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = conversation_id
         AND c.group_id IS NOT NULL
         AND public.is_group_member(c.group_id, auth.uid())
    )
  );
