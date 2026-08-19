import { z } from 'zod'

/**
 * Shortest string we will accept as a real secret. Nothing Certn issues is
 * anywhere near this short; the bar exists to catch placeholder values
 * (`x`, `todo`, a stray quote) that are truthy but useless.
 */
const MIN_SECRET_LENGTH = 10

/**
 * True when a value is present and looks like an actual secret rather than
 * whitespace or a placeholder.
 *
 * Trimming first is the point: dashboards and `.env` files routinely carry a
 * trailing newline or a copy-paste space, and `Boolean(' ')` is `true`. A
 * whitespace-only secret passes a naive truthiness check, boots the app, and
 * then fails every HMAC comparison at runtime — the exact class of bug that
 * once masqueraded as a Stripe network outage in this codebase.
 */
function isUsableSecret(value: string | undefined): boolean {
  return (value ?? '').trim().length >= MIN_SECRET_LENGTH
}

/**
 * Server environment schema. Core infrastructure vars are required — the app
 * cannot function without them, so a missing/malformed one should fail boot with
 * a named error rather than surface as a confusing runtime failure later (see
 * project memory: a trailing newline in STRIPE_SECRET_KEY once masqueraded as a
 * network outage). Integration vars are optional so unconfigured features
 * (Twilio, Mapbox, etc.) don't block startup.
 */
const envSchema = z.object({
  // Core — required.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // App — optional (have defaults elsewhere).
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),

  // Integrations — optional; validated for shape only when present.
  CERTN_CLIENT_ID: z.string().optional(),
  CERTN_CLIENT_SECRET: z.string().optional(),
  CERTN_API_KEY: z.string().optional(),
  CERTN_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})
  // Certn drives verification_level, which drives the trust badges shown to
  // other users. If the integration is configured at all, the webhook signing
  // secret is not optional — without it the webhook endpoint fails closed (503)
  // and verification results silently stop arriving. Fail at boot instead, where
  // it is diagnosable.
  .superRefine((env, ctx) => {
    // CERTN_API_KEY is the only Certn credential anything actually reads
    // (lib/services/certn.ts:11 — CERTN_CLIENT_ID / CERTN_CLIENT_SECRET are
    // dead config left over from an OAuth design that was never built, and are
    // commented out in .env.local.example). Keying "is Certn configured?" off
    // an unread variable would demand a webhook secret for a deployment that
    // cannot make a single Certn call.
    if (!isUsableSecret(env.CERTN_API_KEY)) return

    if (!isUsableSecret(env.CERTN_WEBHOOK_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CERTN_WEBHOOK_SECRET'],
        message:
          `required whenever CERTN_API_KEY is set (webhooks are rejected without it), ` +
          `and must be at least ${MIN_SECRET_LENGTH} non-whitespace characters`,
      })
    }
  })

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

/**
 * Validate `process.env` against the schema. Throws a single error naming every
 * invalid/missing variable. Result is cached after the first successful call.
 */
export function validateEnv(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `${i.path.join('.')} (${i.message})`)
      .join(', ')
    throw new Error(`Invalid or missing environment variables: ${problems}`)
  }
  cached = parsed.data
  return cached
}
