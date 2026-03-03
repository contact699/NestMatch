# Notification System Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

When a user requests to join a group, the request is saved but the group admin has no way to know about it. There's no notification system for group-related events.

## Solution

Add a notification bell icon in the navbar (left of profile icon) with a dropdown panel showing recent notifications. Create a dedicated `notifications` table in Supabase and generate notifications from existing API endpoints.

## Database

New migration `020_notifications.sql`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Default `gen_random_uuid()` |
| `user_id` | UUID (FK → profiles) | Recipient |
| `type` | VARCHAR(50) | Notification type enum |
| `title` | TEXT | Short title |
| `body` | TEXT | Detail text |
| `link` | TEXT | Navigation URL |
| `metadata` | JSONB | Extra data (group_id, request_id, actor_id, etc.) |
| `read_at` | TIMESTAMPTZ | NULL = unread |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

**RLS:** Users SELECT/UPDATE own notifications only. INSERT via service role / API.
**Index:** `(user_id, read_at, created_at DESC)` for fast unread queries.

## Notification Types

| Type | Recipient | Trigger | Link |
|------|-----------|---------|------|
| `join_request_received` | Group admin(s) | User submits join request | `/groups/{id}` |
| `join_request_accepted` | Requester | Admin accepts request | `/groups/{id}` |
| `join_request_declined` | Requester | Admin declines request | `/groups/{id}` |
| `invitation_received` | Invitee | Admin sends invitation | `/groups/{id}` |
| `member_joined` | All existing members | New member joins | `/groups/{id}` |

## API

### `GET /api/notifications`
Returns recent notifications (limit 50) and unread count for the authenticated user.

### `PUT /api/notifications`
Mark notifications as read. Body: `{ notification_ids: string[] }` or `{ mark_all_read: true }`.

## Notification Creation

Notifications are created server-side in existing API endpoints:
- `POST /api/groups/[id]/join-requests` → creates `join_request_received` for admin(s)
- `PUT /api/groups/[id]/join-requests` → creates `join_request_accepted` or `join_request_declined` for requester
- `POST /api/groups/[id]/invitations` → creates `invitation_received` for invitee
- `POST /api/groups/[id]/members` (and accept flows) → creates `member_joined` for existing members

## Frontend

### Bell Icon (Navbar)
- Bell icon (`lucide-react` Bell) with red badge showing unread count
- Positioned left of profile icon in the right side of navbar
- Badge hidden when count is 0

### Notification Dropdown
- Opens on bell click, closes on outside click
- Shows recent notifications in a scrollable list
- Each notification: icon, title, body, relative timestamp
- Unread notifications have a subtle blue background
- Clicking a notification marks it as read and navigates to `link`
- "Mark all as read" button at top when there are unread notifications

### Real-time Updates
- Supabase real-time subscription on `notifications` table filtered by `user_id`
- Same pattern as existing message unread badge
- Badge count updates instantly when new notification arrives

## Design Decisions

- **Bell is separate from messages** — messages keep their existing icon+badge
- **Dropdown only, no full page** — keeps it simple for initial version
- **Server-side notification creation** — more reliable than client-side, ensures notifications are always created
- **Dedicated table** — cleaner than deriving from multiple tables, easy to extend
