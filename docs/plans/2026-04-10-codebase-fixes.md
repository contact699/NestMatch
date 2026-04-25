# Codebase Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all identified issues from the codebase audit — duplicate migrations, missing password reset, mobile real-time messaging, mobile photo upload, notification persistence, URL inconsistencies, placeholder data, error handling improvements, and profile video stub removal.

**Architecture:** Fixes are grouped into independent tasks that can be parallelized where possible. Infrastructure fixes come first (migrations), then web features (password reset), then mobile features (real-time, photos, settings), then cleanup (URLs, placeholders, error handling).

**Tech Stack:** Next.js 16, Expo/React Native 0.81, Supabase, Stripe, TypeScript, React Query

---

### Task 1: Fix Duplicate Migration Numbering

**Files:**
- Rename: `supabase/migrations/005_admin_support.sql` → `supabase/migrations/005b_admin_support.sql`
- Rename: `supabase/migrations/015_verification_payments.sql` → `supabase/migrations/015b_verification_payments.sql`

**Step 1: Rename conflicting migrations**

```bash
cd supabase/migrations
mv 005_admin_support.sql 005b_admin_support.sql
mv 015_verification_payments.sql 015b_verification_payments.sql
```

Supabase CLI runs migrations in alphabetical order, so `005_add_missing_columns.sql` runs before `005b_admin_support.sql`, and `015_fix_conversations_update_policy.sql` runs before `015b_verification_payments.sql`.

**Step 2: Verify migration order**

```bash
ls supabase/migrations/
```

Expected: No more duplicate prefixes. Order should be:
- 001, 002, 003, 004, 005, 005b, 006, 007, 008, 010, 010 (note: 010 also has duplicates — rename `010_rate_limiting_audit.sql` to `010b_rate_limiting_audit.sql`), 011, 012, 014, 015, 015b, 016, 017, 018

**Step 3: Also fix the 010 conflict**

```bash
mv 010_rate_limiting_audit.sql 010b_rate_limiting_audit.sql
```

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "fix: rename duplicate migration files to resolve ordering conflicts"
```

---

### Task 2: Implement Password Reset Flow (Web)

**Files:**
- Create: `apps/web/src/app/forgot-password/page.tsx`
- Create: `apps/web/src/app/reset-password/page.tsx`
- Modify: `apps/web/src/lib/supabase/middleware.ts` (add `/forgot-password` and `/reset-password` to auth routes so logged-in users get redirected)

**Step 1: Create the forgot-password page**

Create `apps/web/src/app/forgot-password/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
    } else {
      setSuccess(true)
    }

    setIsLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <h1 className="font-display text-3xl font-extrabold text-primary tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl bg-secondary-container/30 p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-secondary mx-auto" />
            <h2 className="text-lg font-bold text-on-surface">Check your email</h2>
            <p className="text-sm text-on-surface-variant">
              If an account exists with that email, we&apos;ve sent a password reset link.
              Please check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container/30 p-4 text-sm text-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-primary" htmlFor="email">
                Email Address
              </label>
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="name@nestmatch.ca"
                className="px-4 py-3.5 rounded-xl"
                error={errors.email?.message}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
```

**Step 2: Create the reset-password page**

Create `apps/web/src/app/reset-password/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Supabase sets the session automatically from the recovery link hash fragment
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
  }, [])

  const onSubmit = async (data: ResetPasswordData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      setError(error.message === 'New password should be different from the old password.'
        ? error.message
        : 'Failed to reset password. The link may have expired — please request a new one.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 3000)
    }

    setIsLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <h1 className="font-display text-3xl font-extrabold text-primary tracking-tight">
            Set new password
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Choose a strong password for your NestMatch account.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl bg-secondary-container/30 p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-secondary mx-auto" />
            <h2 className="text-lg font-bold text-on-surface">Password updated</h2>
            <p className="text-sm text-on-surface-variant">
              Your password has been reset successfully. Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container/30 p-4 text-sm text-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {!sessionReady && (
              <div className="flex items-center gap-2 rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
                Verifying reset link...
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-primary" htmlFor="password">
                New Password
              </label>
              <Input
                {...register('password')}
                id="password"
                type="password"
                placeholder="••••••••"
                className="px-4 py-3.5 rounded-xl"
                error={errors.password?.message}
              />
              <p className="text-xs text-on-surface-variant mt-1">
                At least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-primary" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="px-4 py-3.5 rounded-xl"
                error={errors.confirmPassword?.message}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !sessionReady}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  Updating...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
```

**Step 3: Update middleware to treat forgot/reset-password as auth routes**

In `apps/web/src/lib/supabase/middleware.ts`, change:
```typescript
const authRoutes = ['/login', '/signup']
```
to:
```typescript
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
```

**Step 4: Commit**

```bash
git add apps/web/src/app/forgot-password/ apps/web/src/app/reset-password/ apps/web/src/lib/supabase/middleware.ts
git commit -m "feat: implement password reset flow with forgot-password and reset-password pages"
```

---

### Task 3: Add Real-Time Messaging to Mobile

**Files:**
- Modify: `apps/mobile/app/conversation/[id].tsx`

**Step 1: Add Supabase real-time subscription**

In `apps/mobile/app/conversation/[id].tsx`, add a `useEffect` after the existing message query that subscribes to real-time inserts on the messages table for the current conversation:

```tsx
// Add after the existing useQuery for messages (~line 100)
useEffect(() => {
  if (!id || !user) return

  const channel = supabase
    .channel(`messages:${id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      },
      (payload) => {
        // Only process messages from other users (avoid duplicating our own)
        if (payload.new.sender_id !== user.id) {
          queryClient.setQueryData<Message[]>(['messages', id], (old) => {
            if (!old) return [payload.new as Message]
            // Avoid duplicates
            if (old.some((m) => m.id === payload.new.id)) return old
            return [...old, payload.new as Message]
          })
          // Mark as read immediately
          supabase
            .from('messages')
            .update({ read_at: new Date().toISOString(), status: 'read' as const })
            .eq('id', payload.new.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['conversations'] })
            })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [id, user, queryClient])
```

Also add optimistic update to `sendMutation` so sent messages appear instantly without waiting for a refetch:

```tsx
// Update the sendMutation's onSuccess:
onSuccess: (newMessage) => {
  queryClient.setQueryData<Message[]>(['messages', id], (old) => {
    if (!old) return [newMessage as Message]
    if (old.some((m) => m.id === newMessage.id)) return old
    return [...old, newMessage as Message]
  })
  queryClient.invalidateQueries({ queryKey: ['conversations'] })
},
```

**Step 2: Commit**

```bash
git add apps/mobile/app/conversation/[id].tsx
git commit -m "feat: add real-time messaging to mobile with Supabase subscription"
```

---

### Task 4: Mobile Photo Upload for Listings

**Files:**
- Modify: `apps/mobile/package.json` (add expo-image-picker)
- Modify: `apps/mobile/app/listing/create.tsx`

**Step 1: Install expo-image-picker**

```bash
cd apps/mobile && npx expo install expo-image-picker
```

**Step 2: Add expo-image-picker plugin to app.json**

In `apps/mobile/app.json`, add to the plugins array:
```json
"plugins": [
  ["expo-router", { "root": "./app" }],
  "expo-secure-store",
  [
    "expo-image-picker",
    {
      "photosPermission": "NestMatch needs access to your photos to add images to your listing."
    }
  ]
]
```

**Step 3: Implement photo upload in listing create**

In `apps/mobile/app/listing/create.tsx`:

1. Add imports:
```tsx
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'react-native'
```

2. Add photos state and `FormData` update:
```tsx
// Add to component state (after existing useState):
const [photos, setPhotos] = useState<string[]>([])
```

3. Add pick image function:
```tsx
const pickImages = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10 - photos.length,
    quality: 0.8,
  })

  if (!result.canceled) {
    setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)])
  }
}
```

4. Add upload function used during submission:
```tsx
const uploadPhotos = async (listingId: string): Promise<string[]> => {
  const urls: string[] = []
  for (const uri of photos) {
    const ext = uri.split('.').pop() || 'jpg'
    const fileName = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const response = await fetch(uri)
    const blob = await response.blob()
    const arrayBuffer = await new Response(blob).arrayBuffer()

    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}` })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(fileName)
      urls.push(urlData.publicUrl)
    }
  }
  return urls
}
```

5. Replace `renderStep4` photo placeholder (lines 548-554) with:
```tsx
<TouchableOpacity style={styles.photoUploadArea} onPress={pickImages}>
  <Camera color="#94a3b8" size={40} />
  <Text style={styles.photoUploadText}>Tap to add photos</Text>
  <Text style={styles.photoUploadHint}>
    Add up to 10 photos ({10 - photos.length} remaining)
  </Text>
</TouchableOpacity>

{photos.length > 0 && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
    {photos.map((uri, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
        style={{ marginRight: 8 }}
      >
        <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
        <Text style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          Remove
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
```

6. Update the submit mutation to upload photos after creating the listing and then update the listing's `photos` array.

**Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "feat: implement photo upload for mobile listing creation"
```

---

### Task 5: Mobile Profile Photo Upload

**Files:**
- Modify: `apps/mobile/app/edit-profile.tsx`

**Step 1: Add photo picker to edit-profile screen**

Add imports:
```tsx
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'react-native'
```

Add photo state and upload logic similar to Task 4, but uploading to `profile-photos` storage bucket and updating `profiles.profile_photo` field.

Add a tappable avatar at the top of the form that opens the image picker.

**Step 2: Commit**

```bash
git add apps/mobile/app/edit-profile.tsx
git commit -m "feat: add profile photo upload to mobile edit-profile screen"
```

---

### Task 6: Persist Notification Settings (Mobile)

**Files:**
- Modify: `apps/mobile/app/settings.tsx`

**Step 1: Add AsyncStorage persistence for notification preferences**

In `apps/mobile/app/settings.tsx`:

1. Load saved values in the existing `useEffect`:
```tsx
useEffect(() => {
  if (!user) return
  Promise.all([
    AsyncStorage.getItem(`@settings:show_badges:${user.id}`),
    AsyncStorage.getItem(`@settings:push_enabled:${user.id}`),
    AsyncStorage.getItem(`@settings:email_enabled:${user.id}`),
  ])
    .then(([badges, push, email]) => {
      if (badges !== null) setShowBadges(badges === 'true')
      if (push !== null) setPushEnabled(push === 'true')
      if (email !== null) setEmailEnabled(email === 'true')
    })
    .finally(() => setLoadingPrivacy(false))
}, [user])
```

2. Add toggle handlers:
```tsx
const togglePushEnabled = async (value: boolean) => {
  setPushEnabled(value)
  if (!user) return
  try {
    await AsyncStorage.setItem(`@settings:push_enabled:${user.id}`, String(value))
  } catch {
    setPushEnabled(!value)
    Alert.alert('Error', 'Failed to update notification setting.')
  }
}

const toggleEmailEnabled = async (value: boolean) => {
  setEmailEnabled(value)
  if (!user) return
  try {
    await AsyncStorage.setItem(`@settings:email_enabled:${user.id}`, String(value))
  } catch {
    setEmailEnabled(!value)
    Alert.alert('Error', 'Failed to update notification setting.')
  }
}
```

3. Wire toggles to handlers:
```tsx
<Switch value={pushEnabled} onValueChange={togglePushEnabled} ... />
<Switch value={emailEnabled} onValueChange={toggleEmailEnabled} ... />
```

**Step 2: Commit**

```bash
git add apps/mobile/app/settings.tsx
git commit -m "fix: persist notification settings to AsyncStorage on mobile"
```

---

### Task 7: Fix Inconsistent URLs (Mobile)

**Files:**
- Modify: `apps/mobile/app/(auth)/signup.tsx`

**Step 1: Fix hardcoded URLs**

In `apps/mobile/app/(auth)/signup.tsx`, change:
- `https://nestmatch.com/terms` → `https://www.nestmatch.app/terms`
- `https://nestmatch.com/privacy` → `https://www.nestmatch.app/privacy`

**Step 2: Commit**

```bash
git add apps/mobile/app/(auth)/signup.tsx
git commit -m "fix: correct URLs in mobile signup to use nestmatch.app domain"
```

---

### Task 8: Remove Hardcoded Monthly Change Percentage (Web)

**Files:**
- Modify: `apps/web/src/app/(app)/payments/page.tsx`

**Step 1: Remove the fake percentage display**

In `apps/web/src/app/(app)/payments/page.tsx`, remove the `monthlyChangePercent` useMemo (lines 86-90) and remove the JSX that renders it (lines 255-261). Without historical data there's no honest way to show this metric.

Remove:
```tsx
const monthlyChangePercent = useMemo(() => {
  // Dynamic: would need historical data; show placeholder derived from data
  if (!summary) return 0
  return summary.total_received > 0 ? 4 : 0
}, [summary])
```

And remove the JSX block:
```tsx
{monthlyChangePercent !== 0 && (
  <div className="flex items-center gap-1 mt-1">
    <TrendingUp className="h-3 w-3 text-secondary-container" />
    <span className="text-xs text-secondary-container">
      {monthlyChangePercent}% vs last month
    </span>
  </div>
)}
```

Also remove the `TrendingUp` import if no longer used elsewhere.

**Step 2: Commit**

```bash
git add apps/web/src/app/(app)/payments/page.tsx
git commit -m "fix: remove hardcoded monthly change percentage from payments page"
```

---

### Task 9: Remove Profile Video Stub (Web)

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Step 1: Remove the disabled "Add Profile Video" stub**

In `apps/web/src/app/(app)/dashboard/page.tsx`, remove lines 319-326:
```tsx
<div className="flex items-center p-3 rounded-xl bg-surface-container-low opacity-60 cursor-default">
  <Video className="w-4 h-4 text-secondary mr-3" />
  <span className="text-xs font-medium text-on-surface flex-1">
    Add Profile Video
  </span>
  <span className="text-[10px] text-on-surface-variant mr-1">Soon</span>
  <ChevronRight className="w-4 h-4 text-outline-variant" />
</div>
```

Also remove the `Video` import from lucide-react if no longer used.

**Step 2: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "fix: remove unimplemented profile video placeholder from dashboard"
```

---

### Task 10: Improve Error Handling in API Routes (Web)

**Files:**
- Modify: `apps/web/src/app/api/expenses/route.ts` (add logging to service client fallback)
- Modify: `apps/web/src/app/api/connect/status/route.ts` (add error flag to response)

**Step 1: Add logging to silent service client fallback**

In `apps/web/src/app/api/expenses/route.ts`, change lines 161-167:
```typescript
const writeClient = (() => {
  try {
    return createServiceClient()
  } catch {
    return supabase
  }
})()
```
to:
```typescript
const writeClient = (() => {
  try {
    return createServiceClient()
  } catch (e) {
    logger.warn('Service client creation failed, falling back to authenticated client', {
      requestId,
      error: e instanceof Error ? e.message : String(e),
    })
    return supabase
  }
})()
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/expenses/route.ts apps/web/src/app/api/connect/status/route.ts
git commit -m "fix: add logging to silent error fallbacks in API routes"
```

---

### Task 11: Create Seed File

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Create a minimal seed file**

The `supabase/config.toml` references `./seed.sql` but it doesn't exist. Create a minimal one:

```sql
-- Seed file for local development
-- This file is referenced in config.toml and runs after migrations

-- Insert default resource categories
INSERT INTO resource_categories (id, name, slug, description, icon)
VALUES
  (gen_random_uuid(), 'Getting Started', 'getting-started', 'Essential guides for new users', 'rocket'),
  (gen_random_uuid(), 'Legal & Rights', 'legal-rights', 'Know your tenant rights in Canada', 'scale'),
  (gen_random_uuid(), 'Financial Tips', 'financial-tips', 'Budgeting and financial advice', 'dollar-sign'),
  (gen_random_uuid(), 'Living Together', 'living-together', 'Tips for harmonious co-living', 'users')
ON CONFLICT DO NOTHING;
```

**Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add seed.sql for local development bootstrapping"
```
