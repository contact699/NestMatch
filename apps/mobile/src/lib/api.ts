import { Alert, Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Origin of the NestMatch web API. The native app calls the same server routes
 * the web app uses (auth via Bearer token, see callWebApi). Override with
 * EXPO_PUBLIC_API_URL for local/staging testing (origin only, no trailing /api).
 */
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'https://www.nestmatch.app').replace(
  /\/+$/,
  '',
)

export interface CallWebApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
}

/**
 * Pull a human-readable message out of a web API error body.
 *
 * The server emits two different envelopes (see apps/web/src/lib/api/with-handler.ts
 * and apps/web/src/lib/error-reporter.ts):
 *   - plain routes / rate limiting: `{ error: "Service temporarily unavailable" }`
 *   - AppError responses:           `{ error: { code, message, requestId, details } }`
 * Assuming the string shape rendered the object one as "[object Object]" in the
 * alert, so handle both (plus a bare `{ message }`) and always end up with text.
 */
function extractErrorMessage(payload: unknown, status: number): string {
  const fallback = `Request failed (${status})`

  const clean = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null

  if (typeof payload === 'string') return clean(payload) ?? fallback
  if (!payload || typeof payload !== 'object') return fallback

  const { error, message } = payload as { error?: unknown; message?: unknown }

  const direct = clean(error)
  if (direct) return direct

  if (error && typeof error === 'object') {
    const nested = clean((error as { message?: unknown }).message)
    if (nested) return nested
  }

  return clean(message) ?? fallback
}

/**
 * Call a NestMatch web API route (`/api${path}`) authenticated with the current
 * user's Supabase access token as a Bearer header. React Native's fetch is not a
 * browser fetch, so there is no CORS preflight to worry about.
 *
 * Throws if the user isn't signed in or the response is not ok.
 */
export async function callWebApi<T = unknown>(
  path: string,
  options: CallWebApiOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('Not authenticated')
  }

  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    json = undefined
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(json ?? text, res.status))
  }

  return json as T
}

// ---------------------------------------------------------------------------
// Report + block
//
// App Store / Play Store review require a way to report objectionable content
// and block abusive users from any screen where user-generated content is
// shown. Both are backed by the same web routes the site uses:
//   POST /api/reports        { reported_user_id? | reported_listing_id?, type, description }
//   POST /api/blocked-users  { user_id }
// ---------------------------------------------------------------------------

/** Report categories accepted by `POST /api/reports` (see its zod schema). */
export type ReportType = 'scam' | 'harassment' | 'fake' | 'discrimination' | 'other'

/** What is being reported — exactly one of the two ids must be provided. */
export interface ReportTarget {
  userId?: string
  listingId?: string
}

/** Submit a report. Throws with the server's message on failure. */
export async function submitReport(
  target: ReportTarget,
  type: ReportType,
  description: string,
): Promise<void> {
  await callWebApi('/reports', {
    method: 'POST',
    body: {
      reported_user_id: target.userId,
      reported_listing_id: target.listingId,
      type,
      description,
    },
  })
}

/** Block a user so they can no longer reach the current user. */
export async function blockUser(userId: string): Promise<void> {
  await callWebApi('/blocked-users', { method: 'POST', body: { user_id: userId } })
}

type Reason = { label: string; type: ReportType }

const REPORT_REASONS: Reason[] = [
  { label: 'Harassment or abuse', type: 'harassment' },
  { label: 'Scam or fraud', type: 'scam' },
  { label: 'Fake or misleading', type: 'fake' },
  { label: 'Discrimination', type: 'discrimination' },
  { label: 'Something else', type: 'other' },
]

const REASON_PROMPT = 'Choose a reason. Our safety team reviews every report.'

/**
 * Ask for a reason. Android's AlertDialog only renders three buttons, so there
 * the list is chained across dialogs ("More reasons…"); iOS shows them all.
 */
function pickReason(title: string, reasons: Reason[], onPick: (reason: Reason) => void) {
  if (Platform.OS !== 'android' || reasons.length <= 2) {
    Alert.alert(title, REASON_PROMPT, [
      { text: 'Cancel', style: 'cancel' },
      ...reasons.map((reason) => ({ text: reason.label, onPress: () => onPick(reason) })),
    ])
    return
  }

  const [first, ...rest] = reasons
  Alert.alert(title, REASON_PROMPT, [
    { text: 'Cancel', style: 'cancel' },
    { text: first.label, onPress: () => onPick(first) },
    { text: 'More reasons…', onPress: () => pickReason(title, rest, onPick) },
  ])
}

/**
 * Full report flow: pick a reason, submit it, confirm or surface the error.
 * `subject` is what the user sees in the dialog title ("this profile", "this
 * listing", a person's name).
 */
export function promptReport(target: ReportTarget, subject: string) {
  pickReason(`Report ${subject}`, REPORT_REASONS, (reason) => {
    submitReport(target, reason.type, `${reason.label} — reported from the NestMatch mobile app.`)
      .then(() => {
        Alert.alert('Report sent', 'Thanks — our safety team will review this.')
      })
      .catch((err: unknown) => {
        Alert.alert(
          'Could not send report',
          err instanceof Error ? err.message : 'Please try again in a moment.',
        )
      })
  })
}

/**
 * Confirm-then-block flow. `onBlocked` runs after a successful block so the
 * caller can navigate away and refetch whatever listed the blocked user.
 */
export function promptBlock(userId: string, subject: string, onBlocked?: () => void) {
  Alert.alert(
    `Block ${subject}?`,
    'They will not be able to message you, and you will stop seeing them in NestMatch.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          blockUser(userId)
            .then(() => {
              Alert.alert('Blocked', `${subject} can no longer contact you.`)
              onBlocked?.()
            })
            .catch((err: unknown) => {
              Alert.alert(
                'Could not block',
                err instanceof Error ? err.message : 'Please try again in a moment.',
              )
            })
        },
      },
    ],
  )
}
