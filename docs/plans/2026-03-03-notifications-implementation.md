# Notification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a notification bell to the navbar so users see join requests, acceptances, invitations, and new members — all clickable and real-time.

**Architecture:** New `notifications` Supabase table with RLS. Server-side notification creation in existing API route handlers. Bell icon + dropdown component in navbar with Supabase Realtime subscription.

**Tech Stack:** Next.js 16, Supabase (Postgres + Realtime), React 19, TypeScript, Tailwind CSS, lucide-react icons, Zod validation.

---

### Task 1: Create the notifications database migration

**Files:**
- Create: `supabase/migrations/020_notifications.sql`

**Step 1: Write the migration SQL**

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'join_request_received',
    'join_request_accepted',
    'join_request_declined',
    'invitation_received',
    'member_joined'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast unread count + recent notifications queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role inserts notifications (no INSERT policy for regular users)
-- Notifications are created server-side via service client

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Step 2: Apply the migration to Supabase**

Run: `npx supabase db push` or apply via Supabase dashboard.

**Step 3: Commit**

```bash
git add supabase/migrations/020_notifications.sql
git commit -m "feat: add notifications table migration"
```

---

### Task 2: Create the notification helper utility

**Files:**
- Create: `src/lib/notifications.ts`

**Step 1: Write the notification helper**

This utility provides a `createNotification` function used by API routes to insert notifications via the service client. It also provides a `createNotificationsForGroupMembers` helper for broadcasting to all members of a group (used for the `member_joined` type).

```typescript
import { createServiceClient } from '@/lib/supabase/service'

export type NotificationType =
  | 'join_request_received'
  | 'join_request_accepted'
  | 'join_request_declined'
  | 'invitation_received'
  | 'member_joined'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams) {
  const svcClient = createServiceClient()
  const { error } = await svcClient.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    metadata: params.metadata || {},
  })
  if (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function createNotificationsForGroupMembers(
  groupId: string,
  excludeUserId: string,
  notification: Omit<CreateNotificationParams, 'userId'>
) {
  const svcClient = createServiceClient()
  const { data: members } = await svcClient
    .from('co_renter_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .neq('user_id', excludeUserId)

  if (!members || members.length === 0) return

  const notifications = members.map((m) => ({
    user_id: m.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    metadata: notification.metadata || {},
  }))

  const { error } = await svcClient.from('notifications').insert(notifications)
  if (error) {
    console.error('Failed to create group notifications:', error)
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add notification creation helper utility"
```

---

### Task 3: Add notification creation to join-requests API

**Files:**
- Modify: `src/app/api/groups/[id]/join-requests/route.ts`

**Step 1: Update POST handler (user submits join request)**

After the join request is created (line 87-89), add notification creation for all admins of the group:

```typescript
// After: if (insertError) throw insertError
// Before: return apiResponse(...)

// Notify group admin(s) about the join request
const { data: requesterProfile } = await svcClient
  .from('profiles')
  .select('name')
  .eq('user_id', userId!)
  .single()

const { data: groupInfo } = await svcClient
  .from('co_renter_groups')
  .select('name')
  .eq('id', groupId)
  .single()

const { data: admins } = await svcClient
  .from('co_renter_members')
  .select('user_id')
  .eq('group_id', groupId)
  .eq('role', 'admin')
  .eq('status', 'active')

if (admins && admins.length > 0) {
  const { createNotification } = await import('@/lib/notifications')
  for (const admin of admins) {
    await createNotification({
      userId: admin.user_id,
      type: 'join_request_received',
      title: 'New join request',
      body: `${requesterProfile?.name || 'Someone'} wants to join ${groupInfo?.name || 'your group'}`,
      link: `/groups/${groupId}`,
      metadata: { group_id: groupId, request_id: joinRequest.id, requester_id: userId },
    })
  }
}
```

**Step 2: Update PUT handler (admin accepts/declines)**

After the request status is updated and member is added (around line 161), add notification to the requester:

```typescript
// After the if (body.response === 'accepted') block and before return

// Notify the requester about the decision
const { data: adminProfile } = await svcClient
  .from('profiles')
  .select('name')
  .eq('user_id', userId!)
  .single()

const { data: groupInfo } = await svcClient
  .from('co_renter_groups')
  .select('name')
  .eq('id', groupId)
  .single()

const { createNotification, createNotificationsForGroupMembers } = await import('@/lib/notifications')

const notifType = body.response === 'accepted' ? 'join_request_accepted' : 'join_request_declined'
const notifTitle = body.response === 'accepted' ? 'Join request accepted!' : 'Join request declined'
const notifBody = body.response === 'accepted'
  ? `You've been accepted into ${groupInfo?.name || 'a group'}`
  : `Your request to join ${groupInfo?.name || 'a group'} was declined`

await createNotification({
  userId: joinRequest.user_id,
  type: notifType,
  title: notifTitle,
  body: notifBody,
  link: `/groups/${groupId}`,
  metadata: { group_id: groupId, request_id: body.request_id },
})

// If accepted, also notify existing members about the new member
if (body.response === 'accepted') {
  const { data: newMemberProfile } = await svcClient
    .from('profiles')
    .select('name')
    .eq('user_id', joinRequest.user_id)
    .single()

  await createNotificationsForGroupMembers(groupId, joinRequest.user_id, {
    type: 'member_joined',
    title: 'New group member',
    body: `${newMemberProfile?.name || 'Someone'} joined ${groupInfo?.name || 'your group'}`,
    link: `/groups/${groupId}`,
    metadata: { group_id: groupId, new_member_id: joinRequest.user_id },
  })
}
```

**Step 3: Commit**

```bash
git add src/app/api/groups/[id]/join-requests/route.ts
git commit -m "feat: create notifications on join request submit and response"
```

---

### Task 4: Add notification creation to invitations API

**Files:**
- Modify: `src/app/api/groups/[id]/invitations/route.ts`

**Step 1: Update POST handler (admin sends invitation)**

After the invitation is created (line 147), add notification to the invitee:

```typescript
// After: if (inviteError) throw inviteError
// Before: return apiResponse(...)

const { data: groupInfo } = await svcClient
  .from('co_renter_groups')
  .select('name')
  .eq('id', groupId)
  .single()

const { data: inviterProfile } = await svcClient
  .from('profiles')
  .select('name')
  .eq('user_id', userId!)
  .single()

const { createNotification } = await import('@/lib/notifications')
await createNotification({
  userId: invitee_id,
  type: 'invitation_received',
  title: 'Group invitation',
  body: `${inviterProfile?.name || 'Someone'} invited you to join ${groupInfo?.name || 'a group'}`,
  link: `/groups/${groupId}`,
  metadata: { group_id: groupId, invitation_id: invitation.id, inviter_id: userId },
})
```

**Step 2: Update PUT handler (invitee accepts)**

After member is added on acceptance (line 224), add `member_joined` notification:

```typescript
// After the if (response === 'accept') block, before return

if (response === 'accept') {
  // (existing member insert code stays)

  // Notify group members about the new member
  const { data: groupInfo } = await svcClient
    .from('co_renter_groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const { data: newMemberProfile } = await svcClient
    .from('profiles')
    .select('name')
    .eq('user_id', userId!)
    .single()

  const { createNotificationsForGroupMembers } = await import('@/lib/notifications')
  await createNotificationsForGroupMembers(groupId, userId!, {
    type: 'member_joined',
    title: 'New group member',
    body: `${newMemberProfile?.name || 'Someone'} joined ${groupInfo?.name || 'your group'}`,
    link: `/groups/${groupId}`,
    metadata: { group_id: groupId, new_member_id: userId },
  })
}
```

**Step 3: Commit**

```bash
git add src/app/api/groups/[id]/invitations/route.ts
git commit -m "feat: create notifications on invitation send and acceptance"
```

---

### Task 5: Create the notifications API endpoint

**Files:**
- Create: `src/app/api/notifications/route.ts`

**Step 1: Write the API route**

```typescript
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

const markReadSchema = z.union([
  z.object({ notification_ids: z.array(z.string().uuid()) }),
  z.object({ mark_all_read: z.literal(true) }),
])

// Get notifications for the current user
export const GET = withApiHandler(
  async (req, { userId, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return null }
    })()

    if (!svcClient) {
      return apiResponse({ notifications: [], unread_count: 0 }, 200, requestId)
    }

    const { data: notifications, error } = await svcClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const unread_count = (notifications || []).filter((n: any) => !n.read_at).length

    return apiResponse({ notifications: notifications || [], unread_count }, 200, requestId)
  }
)

// Mark notifications as read
export const PUT = withApiHandler(
  async (req, { userId, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return null }
    })()

    if (!svcClient) {
      return apiResponse({ error: 'Service unavailable' }, 500, requestId)
    }

    const body = await parseBody(req, markReadSchema)
    const now = new Date().toISOString()

    if ('mark_all_read' in body) {
      const { error } = await svcClient
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId!)
        .is('read_at', null)

      if (error) throw error
    } else {
      const { error } = await svcClient
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId!)
        .in('id', body.notification_ids)

      if (error) throw error
    }

    return apiResponse({ success: true }, 200, requestId)
  }
)
```

**Step 2: Commit**

```bash
git add src/app/api/notifications/route.ts
git commit -m "feat: add notifications API endpoint (GET + PUT)"
```

---

### Task 6: Create the NotificationBell component

**Files:**
- Create: `src/components/layout/notification-bell.tsx`

**Step 1: Write the NotificationBell component**

This component renders the bell icon with unread badge, handles dropdown open/close, fetches notifications, subscribes to Supabase Realtime, and handles click-to-navigate + mark-as-read.

Key behaviors:
- Bell icon with red badge (same style as message badge in NavLink)
- Dropdown opens on click, closes on outside click (same pattern as profile menu in navbar.tsx)
- Each notification is clickable → marks as read + navigates to `link`
- "Mark all as read" button when there are unread notifications
- Real-time subscription on `notifications` table filtered by `user_id` (same pattern as lines 126-150 in navbar.tsx)
- Uses `lucide-react` icons: `Bell`, `UserPlus`, `UserCheck`, `UserX`, `Mail`, `Users`
- Relative timestamps (e.g., "2m ago", "1h ago") computed client-side
- Scrollable dropdown max-height for many notifications

The component receives `userId: string` as a prop (passed from Navbar which has the user object).

Use these icon mappings for notification types:
- `join_request_received` → `UserPlus` icon, blue accent
- `join_request_accepted` → `UserCheck` icon, green accent
- `join_request_declined` → `UserX` icon, red accent
- `invitation_received` → `Mail` icon, purple accent
- `member_joined` → `Users` icon, green accent

Unread notifications get a `bg-blue-50` background. Read ones get `bg-white`.

The dropdown should match the style of the existing profile menu dropdown in navbar.tsx (white bg, rounded-lg, shadow-lg, border).

**Step 2: Commit**

```bash
git add src/components/layout/notification-bell.tsx
git commit -m "feat: add NotificationBell component with real-time updates"
```

---

### Task 7: Integrate NotificationBell into the Navbar

**Files:**
- Modify: `src/components/layout/navbar.tsx`

**Step 1: Add the bell to the navbar**

In `navbar.tsx`, import and render `NotificationBell` in the right side area, left of the profile icon button. Specifically, inside the `{user ? (` block (line 217), add `<NotificationBell userId={user.id} />` before the profile button `<div className="relative">` block.

The bell should also close when the profile menu opens (and vice versa) — but for simplicity, both dropdowns can be independent since clicking outside closes them.

Also add the bell to the mobile menu section for mobile users.

**Step 2: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "feat: integrate notification bell into navbar"
```

---

### Task 8: Build and verify

**Step 1: Run build**

```bash
npm run build
```

Verify no TypeScript errors or build failures.

**Step 2: Manual testing checklist**

1. Create a public group as User A
2. As User B, request to join the group
3. Verify User A sees a notification badge on the bell
4. Click the bell → see "New join request" notification
5. Click the notification → navigate to group page, see the request
6. Accept the request as User A
7. Verify User B sees "Join request accepted!" notification
8. Verify User A sees "New group member" notification
9. Test "Mark all as read" button
10. Test invitation flow similarly

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: notification system adjustments from testing"
```
