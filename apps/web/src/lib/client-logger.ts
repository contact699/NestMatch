const isDev = process.env.NODE_ENV === 'development'

export const clientLogger = {
  error: (msg: string, err?: unknown) => {
    if (isDev) console.error(`[NestMatch] ${msg}`, err)
  },
  warn: (msg: string) => {
    if (isDev) console.warn(`[NestMatch] ${msg}`)
  },
  info: (msg: string) => {
    if (isDev) console.info(`[NestMatch] ${msg}`)
  },
}
