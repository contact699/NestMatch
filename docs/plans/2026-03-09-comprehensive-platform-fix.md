# NestMatch Comprehensive Platform Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 10 broken features, improve 10 existing features, and add 10 new capabilities — a total of 30 tasks covering the entire NestMatch platform.

**Architecture:** Next.js 16 App Router with Supabase (Postgres + Realtime + Storage). API routes use `withApiHandler` wrapper. Frontend is React 19 with react-hook-form + Zod validation. Tailwind CSS 4 for styling. Lucide React for icons. Sonner for toasts.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase, Zod 4, react-hook-form 7, Tailwind CSS 4, Lucide React, Sonner toasts, date-fns

---

## PHASE 1: Fix 10 Broken Things (Tasks 1–10)

---

### Task 1: Create Forgot Password Page

The login form links to `/forgot-password` but that page doesn't exist (404). Users who forget their password have no recovery path.

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/components/auth/forgot-password-form.tsx`
- Modify: `src/app/auth/callback/route.ts` (handle `recovery` type)
- Create: `src/app/reset-password/page.tsx`
- Create: `src/components/auth/reset-password-form.tsx`

**Step 1: Create the forgot password form component**

```tsx
// src/components/auth/forgot-password-form.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Mail } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (error) throw error
      setIsSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <Card variant="bordered" className="w-full max-w-md mx-auto">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="bordered" className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Send reset link
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create the forgot password page**

```tsx
// src/app/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata = { title: 'Reset Password — NestMatch' }

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white to-gray-50">
      <ForgotPasswordForm />
    </div>
  )
}
```

**Step 3: Create the reset password form component**

```tsx
// src/components/auth/reset-password-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter')
      return
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success('Password updated successfully')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="bordered" className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Must be at least 8 characters with uppercase, lowercase, and a number</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create the reset password page**

```tsx
// src/app/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata = { title: 'Set New Password — NestMatch' }

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white to-gray-50">
      <ResetPasswordForm />
    </div>
  )
}
```

**Step 5: Update auth callback to handle recovery type**

In `src/app/auth/callback/route.ts`, after the existing code exchange logic, add handling for the recovery flow so it redirects to `/reset-password` instead of `/dashboard`:

```typescript
// After exchanging the code for a session:
const nextUrl = new URL(request.url)
const type = nextUrl.searchParams.get('type')

if (type === 'recovery') {
  return NextResponse.redirect(new URL('/reset-password', request.url))
}
```

**Step 6: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 7: Commit**

```bash
git add src/app/forgot-password/ src/app/reset-password/ src/components/auth/forgot-password-form.tsx src/components/auth/reset-password-form.tsx src/app/auth/callback/route.ts
git commit -m "feat: add forgot password and reset password flow"
```

---

### Task 2: Fix Group Invite Modal — Implement User Search

The invite modal search always returns empty with a "coming soon" message. Users cannot invite anyone to groups.

**Files:**
- Create: `src/app/api/users/search/route.ts`
- Modify: `src/components/groups/invite-modal.tsx`

**Step 1: Create the user search API route**

```typescript
// src/app/api/users/search/route.ts
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return apiResponse({ users: [] }, 200, requestId)
    }

    const writeClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    const { data: users, error } = await writeClient
      .from('profiles')
      .select('user_id, name, avatar_url, city, province, verification_level')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
      .neq('user_id', userId!)
      .not('name', 'is', null)
      .limit(10)

    if (error) throw error

    return apiResponse({ users: users || [] }, 200, requestId)
  },
  { rateLimit: 'api' }
)
```

**Step 2: Rewrite the invite modal to use real search**

Replace the stub `handleSearch` in `src/components/groups/invite-modal.tsx` with a real API call to `/api/users/search?q=...`. Replace the `searchResults` state type to match the API response. Render each result with avatar, name, city, and an "Invite" button that calls `handleInvite(userId)`.

The `handleInvite` function should POST to `/api/groups/${groupId}/invitations` with the selected user's ID. Show a toast on success and remove the user from results.

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/api/users/search/route.ts src/components/groups/invite-modal.tsx
git commit -m "feat: implement user search in group invite modal"
```

---

### Task 3: Fix handleLeaveGroup — Match by User ID, Not Role

In `src/app/(app)/groups/[id]/page.tsx:171-173`, the leave group function finds the wrong member by matching `m.role === group.user_role` instead of comparing user IDs.

**Files:**
- Modify: `src/app/(app)/groups/[id]/page.tsx:168-202`

**Step 1: Get the current user's ID in the component**

The group detail page needs the current user's ID. Check if it's already available (e.g., from a context or fetched with the group data). If the group API response includes the current user's ID, use that. Otherwise, fetch it from supabase auth.

Add a state or ref for the current user ID at the top of the component. Use `createClient()` from `@/lib/supabase/client` to get it:

```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null)

useEffect(() => {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data }) => {
    setCurrentUserId(data.user?.id || null)
  })
}, [])
```

**Step 2: Fix the member lookup**

Replace lines 171-173:

```typescript
// BEFORE (buggy):
const userMember = group.members.find(
  (m) => m.role === group.user_role
)

// AFTER (correct):
const userMember = group.members.find(
  (m) => m.user?.user_id === currentUserId
)
```

If `m.user` is not populated, check the Member interface. The members array should include the user profile. If it only has `user_id` directly on the member object:

```typescript
const userMember = group.members.find(
  (m) => m.user_id === currentUserId
)
```

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/(app)/groups/[id]/page.tsx
git commit -m "fix: match leave-group member by user ID instead of role"
```

---

### Task 4: Fix Edit Listing — Add All Missing Fields

The edit listing page and API are missing 9+ fields: `bathroom_type`, `bathroom_size`, `pets_allowed`, `smoking_allowed`, `parking_included`, `ideal_for_students`, `help_needed`, `help_tasks`, `help_details`.

**Files:**
- Modify: `src/app/api/listings/[id]/route.ts:10-31` (update schema)
- Modify: `src/app/(app)/listings/[id]/edit/page.tsx:25-45` (update schema + add form fields)

**Step 1: Add missing fields to the API update schema**

In `src/app/api/listings/[id]/route.ts`, add to `updateListingSchema`:

```typescript
bathroom_type: z.enum(['ensuite', 'private', 'shared']).optional(),
bathroom_size: z.enum(['full', 'three_quarter', 'half']).nullable().optional(),
pets_allowed: z.boolean().optional(),
smoking_allowed: z.boolean().optional(),
parking_included: z.boolean().optional(),
ideal_for_students: z.boolean().optional(),
help_needed: z.boolean().optional(),
help_tasks: z.array(z.string()).optional(),
help_details: z.string().max(500).optional().nullable(),
```

**Step 2: Add missing fields to the frontend edit schema**

In `src/app/(app)/listings/[id]/edit/page.tsx`, add the same fields to the Zod schema and add corresponding form sections. Use the same UI patterns from the create listing form (`src/app/(app)/listings/new/steps/`):

- Add a "Bathroom" section with `bathroom_type` radio/select and `bathroom_size` select
- Add a "Lifestyle" section with toggle switches for `pets_allowed`, `smoking_allowed`, `parking_included`, `ideal_for_students`
- Add a "Help Exchange" section with `help_needed` toggle, conditional `help_tasks` checkboxes, and `help_details` textarea

**Step 3: Pre-populate the new fields from the loaded listing data**

In the `reset()` call that pre-populates form data (~line 102-122), add:

```typescript
bathroom_type: listing.bathroom_type || 'shared',
bathroom_size: listing.bathroom_size || null,
pets_allowed: listing.pets_allowed || false,
smoking_allowed: listing.smoking_allowed || false,
parking_included: listing.parking_included || false,
ideal_for_students: listing.ideal_for_students || false,
help_needed: listing.help_needed || false,
help_tasks: listing.help_tasks || [],
help_details: listing.help_details || '',
```

**Step 4: Fix city dropdown to use province-filtered cascade**

Replace the flat `MAJOR_CITIES` dropdown with province-filtered `CITIES_BY_PROVINCE[selectedProvince]` to match the create form pattern.

**Step 5: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 6: Commit**

```bash
git add src/app/api/listings/[id]/route.ts src/app/(app)/listings/[id]/edit/page.tsx
git commit -m "fix: add all missing fields to listing edit form and API schema"
```

---

### Task 5: Fix Public Profile Self-Redirect

In `src/app/(app)/profile/[userId]/page.tsx:54-61`, a broken `<meta httpEquiv="refresh">` tag is placed inside a `<div>` body. This doesn't work in most browsers, leaving users stuck on "Redirecting...".

**Files:**
- Modify: `src/app/(app)/profile/[userId]/page.tsx:54-61`

**Step 1: Replace meta redirect with Next.js redirect**

Import `redirect` from `next/navigation` at the top of the file. Replace the broken meta tag block:

```typescript
// BEFORE (broken):
if (currentUser?.id === userId) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p className="text-center text-gray-600">Redirecting to your profile...</p>
      <meta httpEquiv="refresh" content="0;url=/profile" />
    </div>
  )
}

// AFTER (correct):
if (currentUser?.id === userId) {
  redirect('/profile')
}
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/(app)/profile/[userId]/page.tsx
git commit -m "fix: use Next.js redirect instead of broken meta tag for self-profile"
```

---

### Task 6: Fix Profile Edit — Duplicate City Registration

In `src/app/(app)/profile/edit/page.tsx`, `register('city')` is called on both a `<select>` (line 333) and an `<Input>` (line 350). React Hook Form binds the last one, so the dropdown is silently ignored.

**Files:**
- Modify: `src/app/(app)/profile/edit/page.tsx:328-355`

**Step 1: Remove the duplicate and use a single city field**

Remove the second `<Input {...register('city')} />` text field. Keep only the `<select>` dropdown with an "Other" option that reveals a text input when selected:

```tsx
<select
  {...register('city')}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  disabled={!selectedProvince}
>
  <option value="">Select a city</option>
  {availableCities.map((city) => (
    <option key={city} value={city}>{city}</option>
  ))}
  <option value="__other__">Other (type below)</option>
</select>

{watchedCity === '__other__' && (
  <Input
    label="Enter your city"
    placeholder="Type your city name"
    onChange={(e) => setValue('city', e.target.value)}
  />
)}
```

Alternatively, the simpler fix is to remove the text input entirely and let the dropdown be the sole city selector. If the user's city isn't in the list, they need the "Other" option.

**Step 2: Add province change handler that resets city**

When province changes, clear the city value:

```typescript
const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setValue('province', e.target.value)
  setValue('city', '')
}
```

Use this handler on the province `<select>` instead of `{...register('province')}`.

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/(app)/profile/edit/page.tsx
git commit -m "fix: remove duplicate city registration and add province-city cascade"
```

---

### Task 7: Implement Account Deletion

In `src/app/(app)/settings/page.tsx:156-173`, the delete account function is a fake stub that shows "not yet implemented" after a 1-second delay.

**Files:**
- Create: `src/app/api/account/delete/route.ts`
- Modify: `src/app/(app)/settings/page.tsx:156-173`

**Step 1: Create the account deletion API route**

```typescript
// src/app/api/account/delete/route.ts
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const serviceClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // 1. Deactivate all user's listings
    await serviceClient
      .from('listings')
      .update({ is_active: false })
      .eq('user_id', userId!)

    // 2. Anonymize profile (keep row for FK integrity)
    await serviceClient
      .from('profiles')
      .update({
        name: 'Deleted User',
        bio: null,
        avatar_url: null,
        phone: null,
        email: null,
        city: null,
        province: null,
        languages: [],
        is_online: false,
      })
      .eq('user_id', userId!)

    // 3. Delete auth user (requires service role)
    const { error } = await serviceClient.auth.admin.deleteUser(userId!)

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'api' }
)
```

**Step 2: Update the settings page handler**

Replace the fake `handleDeleteAccount` in `src/app/(app)/settings/page.tsx`:

```typescript
const handleDeleteAccount = async () => {
  setIsDeleting(true)
  try {
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete account')
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Your account has been deleted')
    router.push('/')
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete account')
  } finally {
    setIsDeleting(false)
    setShowDeleteConfirm(false)
  }
}
```

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/api/account/delete/route.ts src/app/(app)/settings/page.tsx
git commit -m "feat: implement real account deletion with data anonymization"
```

---

### Task 8: Fix Notification Toggles in Settings

In `src/app/(app)/settings/page.tsx:387-417`, notification checkboxes use `defaultChecked` with no `onChange` handler — they're decorative.

**Files:**
- Modify: `src/app/(app)/settings/page.tsx:387-417`

**Step 1: Add state and persistence for notification preferences**

Add state variables and a save handler. Store preferences in the `profiles` table (add columns if needed) or in `localStorage` as a lightweight approach:

```typescript
const [notifPrefs, setNotifPrefs] = useState({
  emailNotifications: true,
  messageAlerts: true,
})

// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('nestmatch_notif_prefs')
  if (saved) {
    try { setNotifPrefs(JSON.parse(saved)) } catch {}
  }
}, [])

const updateNotifPref = (key: keyof typeof notifPrefs, value: boolean) => {
  const updated = { ...notifPrefs, [key]: value }
  setNotifPrefs(updated)
  localStorage.setItem('nestmatch_notif_prefs', JSON.stringify(updated))
  toast.success('Notification preference saved')
}
```

**Step 2: Wire up the checkboxes**

Replace `defaultChecked` with `checked` and add `onChange`:

```tsx
<input
  type="checkbox"
  checked={notifPrefs.emailNotifications}
  onChange={(e) => updateNotifPref('emailNotifications', e.target.checked)}
  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
/>
```

Same for the message alerts checkbox.

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/(app)/settings/page.tsx
git commit -m "fix: make notification toggles functional with localStorage persistence"
```

---

### Task 9: Fix Read Receipts — Update Status Field

In `src/app/api/messages/[id]/read/route.ts:37-41`, the endpoint sets `read_at` but not `status: 'read'`. The chat UI uses `message.status` for the blue checkmark, so read receipts never show.

**Files:**
- Modify: `src/app/api/messages/[id]/read/route.ts:37-41`

**Step 1: Update the read endpoint to set both fields**

Replace line 40:

```typescript
// BEFORE:
.update({ read_at: new Date().toISOString() })

// AFTER:
.update({ read_at: new Date().toISOString(), status: 'read' })
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/api/messages/[id]/read/route.ts
git commit -m "fix: update message status to 'read' alongside read_at timestamp"
```

---

### Task 10: Fix Group Invite Link Route

The invite modal generates `/groups/join/${groupId}` links, but no page exists at that route.

**Files:**
- Create: `src/app/(app)/groups/join/[id]/page.tsx`

**Step 1: Create the join group page**

```tsx
// src/app/(app)/groups/join/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function JoinGroupPage() {
  const { id } = useParams()
  const router = useRouter()
  const [group, setGroup] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${id}`)
        if (!res.ok) throw new Error('Group not found')
        const data = await res.json()
        setGroup(data.group)

        // If user is already a member, redirect to group page
        if (data.group.user_role) {
          router.push(`/groups/${id}`)
          return
        }
      } catch {
        setError('This group was not found or the link has expired.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchGroup()
  }, [id, router])

  const handleJoinRequest = async () => {
    setIsJoining(true)
    try {
      const res = await fetch(`/api/groups/${id}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send join request')
      }

      setJoined(true)
      toast.success('Join request sent!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card variant="bordered">
          <CardContent className="py-8 text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push('/groups')}>
              Browse groups
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card variant="bordered">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Request sent!</h2>
            <p className="text-gray-600 mb-4">The group admin will review your request.</p>
            <Button onClick={() => router.push('/groups')}>Go to my groups</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card variant="bordered">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{group?.name}</CardTitle>
          <CardDescription>{group?.description || 'You\'ve been invited to join this co-renter group'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {group?.member_count && (
            <p className="text-sm text-gray-500 text-center">{group.member_count} members</p>
          )}
          <Button className="w-full" onClick={handleJoinRequest} isLoading={isJoining}>
            Request to join
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/groups')}>
            Go back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/(app)/groups/join/[id]/page.tsx
git commit -m "feat: add join group page for invite links"
```

---

## PHASE 2: Improve 10 Existing Things (Tasks 11–20)

---

### Task 11: Fix Quiz — Validate All Questions Before Submission

In `src/app/(app)/quiz/page.tsx`, validation only checks the current question. Users can skip to the last question and submit with 2 of 12 answers.

**Files:**
- Modify: `src/app/(app)/quiz/page.tsx`

**Step 1: Add full validation on submit**

Find the `handleSubmit` function. Before the upsert call, add a check that all questions have been answered:

```typescript
const handleSubmit = async () => {
  // Validate all questions are answered
  const unansweredQuestions = quizQuestions.filter(q => !answers[q.id])
  if (unansweredQuestions.length > 0) {
    setError(`Please answer all questions. You have ${unansweredQuestions.length} unanswered.`)
    // Navigate to the first unanswered question
    const firstUnanswered = quizQuestions.findIndex(q => !answers[q.id])
    setCurrentStep(firstUnanswered)
    return
  }

  // ... existing save logic
}
```

**Step 2: Add visual indicators for unanswered questions in the progress bar**

Update the step indicator dots to show which questions are answered (filled dot) vs unanswered (empty dot). This gives visual feedback as users navigate.

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/(app)/quiz/page.tsx
git commit -m "fix: validate all quiz questions are answered before submission"
```

---

### Task 12: Fix Password Validation Consistency

Signup requires 8+ chars with uppercase, lowercase, and number. Settings password change only requires 6 chars.

**Files:**
- Modify: `src/app/(app)/settings/page.tsx:85-99`

**Step 1: Extract shared password validation**

Create a shared validation function or apply the same rules in the settings page. In `src/app/(app)/settings/page.tsx`, update `handleChangePassword`:

```typescript
if (passwordForm.new.length < 8) {
  setPasswordError('New password must be at least 8 characters')
  return
}
if (!/[A-Z]/.test(passwordForm.new)) {
  setPasswordError('Password must contain at least one uppercase letter')
  return
}
if (!/[a-z]/.test(passwordForm.new)) {
  setPasswordError('Password must contain at least one lowercase letter')
  return
}
if (!/[0-9]/.test(passwordForm.new)) {
  setPasswordError('Password must contain at least one number')
  return
}
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/(app)/settings/page.tsx
git commit -m "fix: enforce consistent password complexity rules in settings"
```

---

### Task 13: Add Photo Gallery Carousel to Listing Detail

The listing detail page only renders `photos[0]`. There's a counter "1/N" but no way to view other photos.

**Files:**
- Modify: `src/app/(app)/listings/[id]/page.tsx:137-149`

**Step 1: Add carousel state and navigation**

Replace the single image with a carousel. Add state for `currentPhotoIndex` and prev/next handlers:

```tsx
// In the client component wrapper or create a new ListingGallery client component
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

function ListingGallery({ photos, title }: { photos: string[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Home className="h-16 w-16 text-gray-300" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full group">
      <img
        src={photos[currentIndex]}
        alt={`${title} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Dots */}
      {photos.length > 1 && photos.length <= 10 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

Since the listing detail page is a Server Component, extract the photo section into a separate Client Component (`ListingGallery`) and import it.

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/(app)/listings/[id]/page.tsx src/components/listings/listing-gallery.tsx
git commit -m "feat: add photo gallery carousel to listing detail page"
```

---

### Task 14: Add Search Pagination

The search page loads max 24 results with no pagination. Listings beyond 24 are invisible.

**Files:**
- Modify: `src/app/(app)/search/page.tsx`

**Step 1: Add pagination state and URL params**

```typescript
const page = parseInt(searchParams.get('page') || '1')
const ITEMS_PER_PAGE = 24

// In the fetch call, add limit and offset params:
params.set('limit', String(ITEMS_PER_PAGE))
params.set('offset', String((page - 1) * ITEMS_PER_PAGE))
```

**Step 2: Store total count from API response**

The API route's GET handler already returns a count if available (or add `{ count: 'exact' }` to the Supabase query). Store it in state:

```typescript
const [totalCount, setTotalCount] = useState(0)
// In fetch: setTotalCount(data.total || data.listings?.length || 0)
```

**Step 3: Add pagination controls below the results**

```tsx
{totalCount > ITEMS_PER_PAGE && (
  <div className="flex items-center justify-center gap-2 mt-8">
    <Button
      variant="outline"
      size="sm"
      disabled={page <= 1}
      onClick={() => updateSearchParam('page', String(page - 1))}
    >
      Previous
    </Button>
    <span className="text-sm text-gray-600">
      Page {page} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
    </span>
    <Button
      variant="outline"
      size="sm"
      disabled={page >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
      onClick={() => updateSearchParam('page', String(page + 1))}
    >
      Next
    </Button>
  </div>
)}
```

**Step 4: Update the API to return total count**

In `src/app/api/listings/route.ts`, add `{ count: 'exact', head: false }` to the select query and return `total` in the response:

```typescript
return apiResponse({ listings: data || [], total: count || 0 }, 200, requestId)
```

**Step 5: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 6: Commit**

```bash
git add src/app/(app)/search/page.tsx src/app/api/listings/route.ts
git commit -m "feat: add pagination to search results"
```

---

### Task 15: Fix Navbar Active State

In `src/components/layout/navbar.tsx:209`, active state uses `pathname === href` which doesn't match sub-pages like `/messages/abc123`.

**Files:**
- Modify: `src/components/layout/navbar.tsx:209,368`

**Step 1: Replace exact match with startsWith**

```typescript
// BEFORE:
isActive={pathname === href}

// AFTER:
isActive={href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)}
```

The `/dashboard` exception is needed because `/dashboard` would match `/dashboard-settings` etc. if we just used `startsWith`. For all other links (`/search`, `/messages`, `/discover`, etc.) `startsWith` is correct.

Apply the same fix on both line 209 (desktop) and line 368 (mobile).

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "fix: use startsWith for navbar active state to match sub-pages"
```

---

### Task 16: Fix Calendar — Show Past Events and Add Month Filtering

Calendar only shows future events but lets users navigate to past months (which appear empty).

**Files:**
- Modify: `src/app/api/events/route.ts:27`
- Modify: `src/app/(app)/calendar/page.tsx`

**Step 1: Remove the future-only filter from the API**

In `src/app/api/events/route.ts`, remove line 27:

```typescript
// REMOVE:
.gte('event_date', new Date().toISOString().split('T')[0])
```

Instead, fetch all events (or add optional month filtering via query params):

```typescript
const { searchParams } = new URL(req.url)
const month = searchParams.get('month') // YYYY-MM format
const year = searchParams.get('year')

let query = supabase
  .from('chat_events')
  .select(`*, conversations (id, participant_ids)`)
  .in('conversation_id', conversationIds)
  .order('event_date', { ascending: true })
  .order('start_time', { ascending: true })

// Optional date range filtering
if (month && year) {
  const startDate = `${year}-${month}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
  query = query.gte('event_date', startDate).lte('event_date', endDate)
}
```

**Step 2: Update the calendar page to pass month/year params**

In `src/app/(app)/calendar/page.tsx`, update the `useFetch` call to include the current month:

```typescript
const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
const year = String(currentMonth.getFullYear())
const { data, isLoading, error, refetch } = useFetch<{ events: ChatEvent[] }>(
  `/api/events?month=${month}&year=${year}`
)
```

Refetch when `currentMonth` changes by adding it as a dependency.

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/api/events/route.ts src/app/(app)/calendar/page.tsx
git commit -m "fix: show past events in calendar and add month-based filtering"
```

---

### Task 17: Consolidate Discover and Roommates Pages

Two nearly identical pages (`/discover` People tab and `/roommates`) cause user confusion. Merge their best features.

**Files:**
- Modify: `src/app/(app)/roommates/page.tsx`
- Modify: `src/components/layout/navbar.tsx:174`

**Step 1: Make /roommates redirect to /discover?tab=people**

Replace the entire roommates page with a redirect:

```tsx
// src/app/(app)/roommates/page.tsx
import { redirect } from 'next/navigation'

export default function RoommatesPage() {
  redirect('/discover?tab=people')
}
```

**Step 2: Update navbar link**

In `src/components/layout/navbar.tsx:174`, change the Roommates link to point to Discover, or remove the Roommates link and keep only Discover. This reduces nav clutter:

```typescript
// Remove this line from navLinks:
{ href: '/roommates', label: 'Roommates', icon: Users },
```

This gives us 6 nav links instead of 7, reducing clutter.

**Step 3: Update any other links to /roommates**

Search codebase for `/roommates` links and redirect them to `/discover?tab=people`:
- Dashboard quick action "Find a roommate"
- Public profile "Back to roommates" link
- Any other references

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/roommates/page.tsx src/components/layout/navbar.tsx src/app/(app)/dashboard/page.tsx src/app/(app)/profile/[userId]/page.tsx
git commit -m "refactor: consolidate roommates page into discover tab"
```

---

### Task 18: Add Agreement Terms Step to Agreement Generator

The `noticeToLeave`, `disputeResolution`, and `agreementDuration` fields use hardcoded defaults with no input step.

**Files:**
- Create: `src/app/(app)/resources/agreement/steps/step-terms.tsx`
- Modify: `src/app/(app)/resources/agreement/page.tsx:35-43,356-378,394-434`

**Step 1: Create the Agreement Terms step component**

```tsx
// src/app/(app)/resources/agreement/steps/step-terms.tsx
'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { AgreementFormData } from '../types'
import { Input } from '@/components/ui/input'

interface StepTermsProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

export function StepTerms({ register, watch, setValue, errors }: StepTermsProps) {
  const agreementDuration = watch('agreementDuration')

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Agreement Terms</h3>

      {/* Notice Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notice to leave (days)
        </label>
        <Input
          type="number"
          {...register('noticeToLeave', { valueAsNumber: true })}
          min={1}
          max={90}
          placeholder="30"
        />
        <p className="text-sm text-gray-500 mt-1">
          How many days notice must be given before moving out
        </p>
        {errors.noticeToLeave && (
          <p className="text-sm text-red-500 mt-1">{errors.noticeToLeave.message}</p>
        )}
      </div>

      {/* Dispute Resolution */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dispute resolution method
        </label>
        <div className="space-y-2">
          {[
            { value: 'direct', label: 'Direct conversation', desc: 'Roommates discuss issues directly' },
            { value: 'written', label: 'Written notice', desc: 'Issues must be raised in writing first' },
            { value: 'mediation', label: 'Mediation', desc: 'Involve a neutral third party if needed' },
          ].map(({ value, label, desc }) => (
            <label key={value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value={value}
                {...register('disputeResolution')}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Agreement Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agreement duration
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              value="month_to_month"
              {...register('agreementDuration')}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">Month to month</p>
              <p className="text-xs text-gray-500">Continues indefinitely with notice period</p>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              value="fixed_term"
              {...register('agreementDuration')}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-sm">Fixed term</p>
              <p className="text-xs text-gray-500">Agreement ends on a specific date</p>
            </div>
          </label>
        </div>

        {agreementDuration === 'fixed_term' && (
          <div className="mt-3">
            <Input
              type="date"
              {...register('fixedTermEndDate')}
              label="End date"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Insert the new step into the wizard**

In `src/app/(app)/resources/agreement/page.tsx`:

1. Add the step to STEPS array at position 6 (shift Review to 7, Download to 8):
```typescript
const STEPS = [
  { id: 1, title: 'Basics', icon: FileText, description: 'Names and address' },
  { id: 2, title: 'Financial', icon: DollarSign, description: 'Rent and utilities' },
  { id: 3, title: 'Lifestyle', icon: Moon, description: 'House rules' },
  { id: 4, title: 'Responsibilities', icon: Sparkles, description: 'Cleaning and supplies' },
  { id: 5, title: 'Accommodations', icon: Accessibility, description: 'Parking & accessibility' },
  { id: 6, title: 'Terms', icon: Scale, description: 'Duration and notice' },
  { id: 7, title: 'Review', icon: Check, description: 'Check details' },
  { id: 8, title: 'Download', icon: Download, description: 'Get your agreement' },
]
```

2. Update `validateStep` case 6 to validate the terms fields
3. Move the old case 6 (review validation) to case 7
4. Add `case 6:` rendering in `renderStep()`:
```typescript
case 6:
  return <StepTerms register={register} watch={watch} setValue={setValue} errors={errors} />
```

5. Shift Review to case 7 and Download to case 8

**Step 3: Add all 13 provinces to the province mapping**

Update the province mapping in the Download step (line 410-415) to cover all provinces and territories.

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/resources/agreement/steps/step-terms.tsx src/app/(app)/resources/agreement/page.tsx src/app/(app)/resources/agreement/steps/index.ts
git commit -m "feat: add editable Agreement Terms step to roommate agreement generator"
```

---

### Task 19: Fix View Count — Remove Double Increment and Race Condition

View count is incremented in both the server page component (`listings/[id]/page.tsx:107`) AND the API GET handler (`listings/[id]/route.ts:67`). Also uses a read-then-write pattern that loses counts under concurrency.

**Files:**
- Modify: `src/app/(app)/listings/[id]/page.tsx:105-111`
- Modify: `src/app/api/listings/[id]/route.ts:66-71`

**Step 1: Remove the view count increment from the API GET route**

In `src/app/api/listings/[id]/route.ts`, delete lines 66-71 (the fire-and-forget view count update). The page component already handles it.

**Step 2: Fix the race condition in the page component**

Replace the read-then-write pattern with an RPC call or direct SQL increment. Use Supabase's `.rpc()` to call a simple increment function:

If an RPC is not available, use a simpler approach — just use the service client with a raw update that adds 1:

```typescript
// In src/app/(app)/listings/[id]/page.tsx, replace lines 105-111:
if (!isOwner) {
  const serviceClient = (() => {
    try {
      const { createServiceClient } = require('@/lib/supabase/service')
      return createServiceClient()
    } catch { return supabase }
  })()

  // Use rpc for atomic increment, or fallback:
  serviceClient.rpc('increment_views', { listing_id: id }).then(() => {}, () => {
    // Fallback if RPC doesn't exist — still better than nothing
    serviceClient
      .from('listings')
      .update({ views_count: (listing.views_count || 0) + 1 })
      .eq('id', id)
      .then(() => {}, () => {})
  })
}
```

Alternatively, create a simple Supabase function in a migration:

```sql
-- In a new migration file
CREATE OR REPLACE FUNCTION increment_views(listing_id UUID)
RETURNS void AS $$
  UPDATE listings SET views_count = COALESCE(views_count, 0) + 1 WHERE id = listing_id;
$$ LANGUAGE sql;
```

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/app/(app)/listings/[id]/page.tsx src/app/api/listings/[id]/route.ts supabase/migrations/
git commit -m "fix: remove double view count increment and fix race condition"
```

---

### Task 20: Add Missing Items to Mobile Navigation

The mobile hamburger menu only shows the 7 main nav links. Calendar, Groups, Resources, Reviews, Expenses, and Settings are only accessible via the small profile dropdown.

**Files:**
- Modify: `src/components/layout/navbar.tsx:359-373`

**Step 1: Add profile section items to the mobile menu**

After the main nav links in the mobile menu, add a divider and the profile items:

```tsx
{user ? (
  <>
    {navLinks.map(({ href, label, icon, badge }) => (
      <NavLink
        key={href}
        href={href}
        label={label}
        icon={icon}
        isActive={href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)}
        onClick={closeMobileMenu}
        mobile
        badge={badge}
      />
    ))}
    <hr className="my-2 border-gray-200" />
    {[
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/groups', label: 'Co-Renter Groups', icon: Users },
      { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
      { href: '/resources', label: 'Resources', icon: BookOpen },
      { href: '/settings', label: 'Settings', icon: Settings },
    ].map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
          pathname.startsWith(href)
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        onClick={closeMobileMenu}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{label}</span>
      </Link>
    ))}
  </>
) : (
  // ... existing unauthenticated menu
)}
```

Make sure the necessary icons (`Settings`, `CalendarIcon`, `BookOpen`, etc.) are imported at the top of the file.

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "feat: add profile items to mobile navigation menu"
```

---

## PHASE 3: Add 10 New Features (Tasks 21–30)

---

### Task 21: Add Typing Indicators to Chat

**Files:**
- Modify: `src/app/(app)/messages/[id]/page.tsx`

**Step 1: Add typing state and broadcast**

Use Supabase Realtime's `broadcast` feature (which doesn't require DB changes) to send typing events:

```typescript
// State
const [otherUserTyping, setOtherUserTyping] = useState(false)
const typingTimeoutRef = useRef<NodeJS.Timeout>()

// Send typing event (debounced) — call this onInput of the textarea
const sendTypingEvent = useCallback(() => {
  if (!conversationId) return
  const supabase = createClient()
  supabase.channel(`typing:${conversationId}`).send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId: currentUserId },
  })
}, [conversationId, currentUserId])

// Subscribe to typing events
useEffect(() => {
  if (!conversationId) return
  const supabase = createClient()
  const channel = supabase.channel(`typing:${conversationId}`)
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== currentUserId) {
        setOtherUserTyping(true)
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000)
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
    clearTimeout(typingTimeoutRef.current)
  }
}, [conversationId, currentUserId])
```

**Step 2: Render the typing indicator**

Below the messages list, above the input:

```tsx
{otherUserTyping && (
  <div className="px-4 py-1">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{otherUserName} is typing...</span>
    </div>
  </div>
)}
```

**Step 3: Wire up the textarea onInput**

Add the debounced typing event to the textarea's `onInput` or `onChange` handler.

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/messages/[id]/page.tsx
git commit -m "feat: add typing indicators to chat using Supabase broadcast"
```

---

### Task 22: Add Message Pagination (Load Older Messages)

The chat page loads a fixed batch with no way to see older messages.

**Files:**
- Modify: `src/app/(app)/messages/[id]/page.tsx`

**Step 1: Add pagination state**

```typescript
const [hasMoreMessages, setHasMoreMessages] = useState(true)
const [isLoadingMore, setIsLoadingMore] = useState(false)
const messagesContainerRef = useRef<HTMLDivElement>(null)
```

**Step 2: Update the initial fetch to check for more**

When loading messages, request `limit + 1`. If you get more than `limit`, there are more messages:

```typescript
const MESSAGES_PER_PAGE = 50

// In the fetch function:
const data = await res.json()
const fetched = data.messages || []
setHasMoreMessages(fetched.length > MESSAGES_PER_PAGE)
setMessages(fetched.slice(0, MESSAGES_PER_PAGE))
```

**Step 3: Add "Load more" button at the top of messages**

```tsx
{hasMoreMessages && (
  <div className="flex justify-center py-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={loadOlderMessages}
      isLoading={isLoadingMore}
    >
      Load older messages
    </Button>
  </div>
)}
```

**Step 4: Implement loadOlderMessages**

```typescript
const loadOlderMessages = async () => {
  if (!messages.length || isLoadingMore) return
  setIsLoadingMore(true)

  const oldestMessage = messages[0]
  const res = await fetch(
    `/api/conversations/${conversationId}/messages?before=${oldestMessage.created_at}&limit=${MESSAGES_PER_PAGE + 1}`
  )
  const data = await res.json()
  const older = data.messages || []

  setHasMoreMessages(older.length > MESSAGES_PER_PAGE)
  setMessages(prev => [...older.slice(0, MESSAGES_PER_PAGE), ...prev])
  setIsLoadingMore(false)
}
```

**Step 5: Preserve scroll position when loading older messages**

Before prepending, save the scroll height. After state update, restore it:

```typescript
const container = messagesContainerRef.current
const scrollHeightBefore = container?.scrollHeight || 0

// ... after setMessages:
requestAnimationFrame(() => {
  if (container) {
    container.scrollTop = container.scrollHeight - scrollHeightBefore
  }
})
```

**Step 6: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 7: Commit**

```bash
git add src/app/(app)/messages/[id]/page.tsx
git commit -m "feat: add message pagination with 'load older messages' button"
```

---

### Task 23: Add Distance Radius Filter to Proximity Search

Proximity search sorts by distance but can't filter by it.

**Files:**
- Modify: `src/components/search/search-results-proximity.tsx`

**Step 1: Add radius filter state and UI**

```typescript
const [maxDistance, setMaxDistance] = useState<number | null>(null) // in km
```

Add a radius selector above the results:

```tsx
<div className="flex items-center gap-3 mb-4">
  <label className="text-sm font-medium text-gray-700">Max distance:</label>
  <select
    value={maxDistance || ''}
    onChange={(e) => setMaxDistance(e.target.value ? Number(e.target.value) : null)}
    className="border rounded-lg px-3 py-1.5 text-sm"
  >
    <option value="">Any distance</option>
    <option value="1">1 km</option>
    <option value="2">2 km</option>
    <option value="5">5 km</option>
    <option value="10">10 km</option>
    <option value="25">25 km</option>
    <option value="50">50 km</option>
  </select>
</div>
```

**Step 2: Filter results by distance**

In the sorted listings computation, add the distance filter:

```typescript
const filteredListings = sortedByDistance.filter(listing => {
  if (maxDistance === null) return true
  if (listing.distance === null) return false
  return listing.distance <= maxDistance
})
```

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/components/search/search-results-proximity.tsx
git commit -m "feat: add distance radius filter to proximity search"
```

---

### Task 24: Add Sort Options to Search

Search always sorts by `created_at DESC`. Users need price and other sorting options.

**Files:**
- Modify: `src/app/(app)/search/page.tsx`
- Modify: `src/app/api/listings/route.ts`

**Step 1: Add sort parameter to the API**

In `src/app/api/listings/route.ts`, read a `sort` query param:

```typescript
const sort = searchParams.get('sort') || 'newest'

// Replace the hardcoded .order() with:
switch (sort) {
  case 'price_asc':
    query = query.order('price', { ascending: true })
    break
  case 'price_desc':
    query = query.order('price', { ascending: false })
    break
  case 'oldest':
    query = query.order('created_at', { ascending: true })
    break
  default: // 'newest'
    query = query.order('created_at', { ascending: false })
}
```

**Step 2: Add sort dropdown to the search page**

Add a sort selector near the view mode toggle:

```tsx
<select
  value={searchParams.get('sort') || 'newest'}
  onChange={(e) => updateSearchParam('sort', e.target.value)}
  className="border rounded-lg px-3 py-1.5 text-sm"
>
  <option value="newest">Newest first</option>
  <option value="oldest">Oldest first</option>
  <option value="price_asc">Price: low to high</option>
  <option value="price_desc">Price: high to low</option>
</select>
```

**Step 3: Pass the sort param in the API fetch**

In the search page's fetch function, add:

```typescript
const sort = searchParams.get('sort')
if (sort) params.set('sort', sort)
```

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/search/page.tsx src/app/api/listings/route.ts
git commit -m "feat: add sort options (price, date) to listing search"
```

---

### Task 25: Add Resend Verification Email Button

If the verification email is lost or expired, there's no way to request a new one.

**Files:**
- Modify: `src/app/(app)/verify/page.tsx`

**Step 1: Add resend functionality**

In the email verification section, add a "Resend email" button:

```tsx
const [resendingEmail, setResendingEmail] = useState(false)

const handleResendVerificationEmail = async () => {
  setResendingEmail(true)
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('No email found')

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    toast.success('Verification email sent! Check your inbox.')
  } catch (err: any) {
    toast.error(err.message || 'Failed to resend email')
  } finally {
    setResendingEmail(false)
  }
}
```

In the UI, add the button next to the "Check your inbox" text:

```tsx
{!status?.profile?.email_verified && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleResendVerificationEmail}
    isLoading={resendingEmail}
  >
    Resend verification email
  </Button>
)}
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/app/(app)/verify/page.tsx
git commit -m "feat: add resend verification email button"
```

---

### Task 26: Add Quiz Retake/Edit Capability

Once the lifestyle quiz is completed, there's no way to update answers.

**Files:**
- Modify: `src/app/(app)/profile/page.tsx:278-284`
- Modify: `src/app/(app)/quiz/page.tsx`

**Step 1: Change the quiz button on profile page**

Replace the conditional that hides the button when quiz is done:

```tsx
// BEFORE: Only shows "Take Quiz" when lifestyleResponses is null
{!lifestyleResponses && (
  <Button onClick={() => router.push('/quiz')}>Take Quiz</Button>
)}

// AFTER: Show different text based on completion
<Button
  variant={lifestyleResponses ? 'outline' : 'default'}
  onClick={() => router.push('/quiz')}
>
  {lifestyleResponses ? 'Update Quiz Answers' : 'Take the Lifestyle Quiz'}
</Button>
```

**Step 2: Pre-populate quiz with existing answers**

In `src/app/(app)/quiz/page.tsx`, on mount, fetch existing `lifestyle_responses` and pre-populate the `answers` state:

```typescript
useEffect(() => {
  async function loadExisting() {
    const supabase = createClient()
    const { data } = await supabase
      .from('lifestyle_responses')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      const existing: Record<string, string> = {}
      quizQuestions.forEach(q => {
        if (data[q.id]) existing[q.id] = data[q.id]
      })
      setAnswers(existing)
    }
    setIsLoading(false)
  }
  loadExisting()
}, [userId])
```

**Step 3: Show a success toast on completion**

After saving, show a toast: `toast.success('Quiz answers saved!')` before redirecting.

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/profile/page.tsx src/app/(app)/quiz/page.tsx
git commit -m "feat: allow retaking and editing lifestyle quiz answers"
```

---

### Task 27: Add Event Management to Calendar

Calendar is read-only — can't accept, decline, or create events from it.

**Files:**
- Modify: `src/app/(app)/calendar/page.tsx`

**Step 1: Add event action buttons**

In the upcoming events list, add Accept/Decline buttons for events with status `proposed`:

```tsx
{event.status === 'proposed' && (
  <div className="flex gap-2 mt-2">
    <Button
      size="sm"
      onClick={() => handleEventAction(event, 'accepted')}
    >
      <CheckCircle className="h-3 w-3 mr-1" />
      Accept
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleEventAction(event, 'declined')}
    >
      <XCircle className="h-3 w-3 mr-1" />
      Decline
    </Button>
  </div>
)}
```

**Step 2: Implement the action handler**

```typescript
const handleEventAction = async (event: ChatEvent, status: 'accepted' | 'declined' | 'cancelled') => {
  try {
    const res = await fetch(`/api/conversations/${event.conversation_id}/events`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, status }),
    })
    if (!res.ok) throw new Error('Failed to update event')
    toast.success(`Event ${status}`)
    refetch()
  } catch (err: any) {
    toast.error(err.message)
  }
}
```

**Step 3: Add event detail modal on click**

When clicking an event in the calendar grid, show a modal with full details (title, description, date, time, location, status) and action buttons.

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/app/(app)/calendar/page.tsx
git commit -m "feat: add event accept/decline actions and detail modal to calendar"
```

---

### Task 28: Add Global Auth State Listener

No `onAuthStateChange` — if a session expires or user signs out in another tab, the app doesn't react until next page load.

**Files:**
- Create: `src/components/providers/auth-listener.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Step 1: Create the auth listener component**

```tsx
// src/components/providers/auth-listener.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
          router.refresh()
        }
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
```

**Step 2: Add AuthListener to the app layout**

In `src/app/(app)/layout.tsx`, import and render `<AuthListener />` inside the layout, alongside the Navbar:

```tsx
import { AuthListener } from '@/components/providers/auth-listener'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ... existing code
  return (
    <>
      <AuthListener />
      <Navbar user={user} />
      <main>{children}</main>
    </>
  )
}
```

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 4: Commit**

```bash
git add src/components/providers/auth-listener.tsx src/app/(app)/layout.tsx
git commit -m "feat: add global auth state listener for session expiry and multi-tab sync"
```

---

### Task 29: Add Unsaved Changes Warning to Listing Forms

Both create and edit listing forms have no `beforeunload` prompt. Navigating away loses all progress.

**Files:**
- Create: `src/lib/hooks/use-unsaved-changes.ts`
- Modify: `src/app/(app)/listings/new/page.tsx`
- Modify: `src/app/(app)/listings/[id]/edit/page.tsx`

**Step 1: Create the reusable hook**

```typescript
// src/lib/hooks/use-unsaved-changes.ts
'use client'

import { useEffect } from 'react'

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
```

**Step 2: Use the hook in the create listing page**

In `src/app/(app)/listings/new/page.tsx`:

```typescript
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes'

// Inside the component:
const { formState: { isDirty } } = methods // or from useForm
useUnsavedChanges(isDirty)
```

**Step 3: Use the hook in the edit listing page**

Same pattern in `src/app/(app)/listings/[id]/edit/page.tsx`.

**Step 4: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 5: Commit**

```bash
git add src/lib/hooks/use-unsaved-changes.ts src/app/(app)/listings/new/page.tsx src/app/(app)/listings/[id]/edit/page.tsx
git commit -m "feat: add unsaved changes warning to listing create/edit forms"
```

---

### Task 30: Add Group Status Management UI

Groups have statuses (forming/searching/matched) but no UI to change them. Groups are permanently stuck in "forming."

**Files:**
- Modify: `src/app/(app)/groups/[id]/page.tsx` (GroupSettingsModal)

**Step 1: Add status selector to the group settings modal**

In the `GroupSettingsModal` section of `src/app/(app)/groups/[id]/page.tsx`, add a status field:

```tsx
{/* Group Status */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Group Status</label>
  <select
    value={groupStatus}
    onChange={(e) => setGroupStatus(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="forming">Forming — Looking for members</option>
    <option value="searching">Searching — Looking for a place</option>
    <option value="matched">Matched — Found a place!</option>
  </select>
  <p className="text-sm text-gray-500 mt-1">Let others know what stage your group is at</p>
</div>
```

**Step 2: Add state initialization and include in save payload**

```typescript
const [groupStatus, setGroupStatus] = useState((group as any).status || 'forming')

// In handleSaveSettings, include status in the request body:
body: JSON.stringify({
  // ... existing fields
  status: groupStatus,
})
```

**Step 3: Display group status on the group detail page**

Add a status badge near the group name:

```tsx
const statusConfig = {
  forming: { label: 'Forming', color: 'bg-yellow-100 text-yellow-800' },
  searching: { label: 'Searching', color: 'bg-blue-100 text-blue-800' },
  matched: { label: 'Matched', color: 'bg-green-100 text-green-800' },
}
const statusInfo = statusConfig[(group as any).status || 'forming']

<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
  {statusInfo.label}
</span>
```

**Step 4: Update the Group interface to include `status` and `is_public`**

Add the missing fields to the `Group` interface to eliminate `as any` casts:

```typescript
interface Group {
  // ... existing fields
  status: 'forming' | 'searching' | 'matched'
  is_public: boolean
}
```

**Step 5: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

**Step 6: Commit**

```bash
git add src/app/(app)/groups/[id]/page.tsx
git commit -m "feat: add group status management UI (forming/searching/matched)"
```

---

## Final QA Checklist

After all 30 tasks, manually verify:

### Phase 1 Fixes
- [ ] Forgot password link → page loads → sends email → reset works
- [ ] Group invite modal → search users → invite → they receive it
- [ ] Leave group → correct member is removed (not someone else)
- [ ] Edit listing → all fields present (bathroom, pets, smoking, parking, help)
- [ ] Visit own public profile → redirects to /profile (no stuck "Redirecting...")
- [ ] Profile edit → city dropdown works, no duplicate registration
- [ ] Delete account → data anonymized → signed out → can't log in
- [ ] Notification toggles → toggle → refresh → state persists
- [ ] Send message → recipient reads → sender sees blue double-check
- [ ] Invite link `/groups/join/[id]` → page loads → can request to join

### Phase 2 Improvements
- [ ] Quiz → skip questions → try submit → blocked with count of unanswered
- [ ] Settings → change password → requires 8 chars + uppercase + lowercase + number
- [ ] Listing detail → multiple photos → carousel arrows work
- [ ] Search → 50+ results → pagination controls appear → next/prev work
- [ ] Navigate to /messages/abc → Messages tab highlighted in navbar
- [ ] Calendar → navigate to past month → events from that month appear
- [ ] /roommates → redirects to /discover?tab=people
- [ ] Agreement generator → Terms step → can edit notice period, duration, dispute method
- [ ] View listing → only incremented once per view
- [ ] Mobile → hamburger → shows Groups, Calendar, Settings, etc.

### Phase 3 New Features
- [ ] Chat → type → other user sees "typing..." indicator
- [ ] Chat → 100+ messages → "Load older" button → loads previous batch
- [ ] Proximity search → select "5 km" → only nearby listings shown
- [ ] Search → sort by "Price: low to high" → correct order
- [ ] Verify page → email not verified → "Resend" button → email arrives
- [ ] Profile → "Update Quiz Answers" → pre-populated → can change → saves
- [ ] Calendar → proposed event → Accept/Decline buttons → status changes
- [ ] Sign out in another tab → this tab redirects to login
- [ ] Create listing → fill halfway → close tab → browser warns "unsaved changes"
- [ ] Group settings → change status to "Searching" → badge updates on group page
