const isDev = process.env.NODE_ENV === 'development'
const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN

function reportToSentry(msg: string, err?: unknown) {
  if (!sentryEnabled) return
  // Dynamic import so Sentry isn't pulled into the critical path when unused.
  import('@sentry/nextjs')
    .then((Sentry) => {
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: { message: msg } })
      } else {
        Sentry.captureMessage(msg, 'error')
      }
    })
    .catch(() => {})
}

export const clientLogger = {
  error: (msg: string, err?: unknown) => {
    if (isDev) console.error(`[NestMatch] ${msg}`, err)
    reportToSentry(msg, err)
  },
  warn: (msg: string) => {
    if (isDev) console.warn(`[NestMatch] ${msg}`)
  },
  info: (msg: string) => {
    if (isDev) console.info(`[NestMatch] ${msg}`)
  },
}
