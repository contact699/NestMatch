-- =============================================================================
-- Group chat email notifications — per-recipient-per-group cooldown
-- =============================================================================
--
-- When a new message is posted in a group's chat we email each member who
-- isn't actively using the app. To avoid spamming members during a busy
-- thread, each member gets at most one notification email per group per
-- 30-minute window. We track the last-sent timestamp on co_renter_members
-- so the messages POST handler can decide whether to send.
-- =============================================================================

ALTER TABLE public.co_renter_members
  ADD COLUMN IF NOT EXISTS last_chat_email_at TIMESTAMPTZ;

COMMENT ON COLUMN public.co_renter_members.last_chat_email_at IS
  'When this member was last emailed about new group chat activity. Drives the 30-minute cooldown.';
