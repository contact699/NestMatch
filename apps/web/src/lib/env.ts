import { z } from 'zod'

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
