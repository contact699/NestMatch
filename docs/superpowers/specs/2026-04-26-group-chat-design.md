# Group chat — design

**Goal:** real-time chat inside co-renter groups, embedded on the group page so members can coordinate house-hunting without leaving group context.

## Decisions captured during brainstorm
- **Location:** embedded card on `/groups/[id]`, between Members and Saved Listings. Not in `/messages`.
- **Scope (v1):** text, emoji picker, real-time updates, "new since you last visited" divider, per-user `last_read_at` tracking, unread badges on /groups list and Groups nav link.
- **Deferred (v2):** attachments, GIF picker, schedule modal, typing indicator, online-presence dot. (Re-add by extracting shared composer/message components from `/messages/[id]`.)
- **Email notifications:** separate follow-up PR. Per recipient per group: max one email per 30-minute window after a new message they haven't read.
- **History visibility:** new members see all prior messages — RLS only checks active membership, no `joined_at` filter.

## Data model
Reuse `conversations` + `messages`. One conversation per group, created lazily on first send.

```sql
ALTER TABLE conversations
  ADD COLUMN group_id UUID REFERENCES co_renter_groups(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX conversations_one_per_group
  ON conversations(group_id) WHERE group_id IS NOT NULL;

ALTER TABLE co_renter_members
  ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();
```

**RLS — additional policies on `messages`:**
- SELECT allowed if the message's conversation has a `group_id` AND the requester is an `active` member of that group.
- INSERT allowed if the conversation has a `group_id`, the requester is an active member, and `sender_id = auth.uid()`.
- 1:1 policies (participant array based) are unchanged. They coexist via `OR`.

**RLS — conversations:**
- SELECT/INSERT for group conversations: requester is an active group member (or for INSERT, is creating a conversation tied to their own group).

**`/messages` list:** `.is('group_id', null)` so group threads never appear there.

## UI
**`<GroupChat groupId={...} />`** — fresh component in `src/components/groups/group-chat.tsx`. Self-contained: ~350 lines.

Internally:
- Lazy-loads (or creates) the group's conversation row on mount
- Subscribes to `postgres_changes` on `messages` filtered by `conversation_id`
- Posts `last_read_at = now()` to a small API route on mount, on focus, and when new messages arrive while the tab is visible
- Renders message bubbles styled to match `/messages` (sender name, timestamp, bubble color)
- Inserts a "— New since you last visited —" divider where `last_read_at` falls
- Emoji picker: extract the `EMOJI_CATEGORIES` constant from `/messages/[id]/page.tsx` to `src/lib/chat/emojis.ts` so both pages share one source

**Embed:** add `<GroupChat groupId={id} />` card to `/groups/[id]/page.tsx`, between Members section and Saved Listings.

## API routes (new)
- `POST /api/groups/[id]/chat/messages` — send a message. Lazy-creates the conversation if needed, inserts message. Body: `{ content: string }`.
- `POST /api/groups/[id]/chat/read` — bumps `co_renter_members.last_read_at = now()` for the calling user.
- Reads (listing messages) go through Supabase client directly (RLS does the filtering) — no new GET route needed.

## Unread surface
- **Group row in /groups list:** server fetches `count(*)` of `messages` per group where `created_at > member.last_read_at`. Render small badge.
- **Groups nav link:** aggregate of the above across all the user's active groups. Reuses the same query, summed.

## Implementation order
1. Migration `027_group_chat.sql` — schema + RLS + index
2. Regenerate / extend `Database` type to include `group_id` and `last_read_at`
3. Pull `EMOJI_CATEGORIES` into `src/lib/chat/emojis.ts`
4. Build `<GroupChat>` component
5. Build the two new API routes
6. Embed in `/groups/[id]` page
7. Filter `/messages` list
8. Add unread badge query + render on /groups list and Groups nav link
9. Typecheck + manual smoke test in dev
10. Open PR

## Out of scope (this PR)
- Email notifications (follow-up PR — uses existing `lib/email.ts` Resend pipeline; rate-limited per recipient per group)
- Attachments + GIFs + schedule modal + typing indicator + online presence (v2 polish)
- Search inside chat history
- Mentions / replies / threads
- Pinned messages, reactions
