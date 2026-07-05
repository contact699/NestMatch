// Client-side error visibility. Previously production client errors were
// invisible (client-logger no-ops outside dev, no browser reporter). Sentry's
// init installs global handlers that capture unhandled errors/rejections.
// Inert unless NEXT_PUBLIC_SENTRY_DSN is set, and only sends in production.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0, // errors only for now — no performance tracing overhead
  })
}

// Lets Sentry tie client navigations to errors (no-op when not initialized).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
