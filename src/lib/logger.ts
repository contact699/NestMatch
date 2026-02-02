/**
 * Structured logging utility for observability
 * Outputs JSON-formatted logs with consistent metadata
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  duration?: number
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'development') {
    // Pretty print in development
    const { timestamp, level, message, context, error } = entry
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    const errorStr = error ? `\n  Error: ${error.message}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`
  }
  // JSON in production for log aggregators
  return JSON.stringify(entry)
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'nestmatch',
    environment: process.env.NODE_ENV || 'development',
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  }
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return

  const entry = createEntry(level, message, context, error)
  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    log('error', message, context, error),

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log('warn', message, { ...baseContext, ...context }),
    error: (message: string, error?: Error, context?: LogContext) =>
      log('error', message, { ...baseContext, ...context }, error),
  }),

  /**
   * Log with timing information
   */
  timed: async <T>(
    message: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> => {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      log('info', message, { ...context, duration, success: true })
      return result
    } catch (error) {
      const duration = Date.now() - start
      log('error', message, { ...context, duration, success: false }, error as Error)
      throw error
    }
  },
}

// ============================================
// API REQUEST LOGGING
// ============================================

export interface RequestLogContext {
  requestId: string
  method: string
  path: string
  userId?: string
  userAgent?: string
  ip?: string
}

export function logApiRequest(context: RequestLogContext): void {
  logger.info(`API Request: ${context.method} ${context.path}`, {
    requestId: context.requestId,
    userId: context.userId,
    action: 'api_request',
    resource: context.path,
  })
}

export function logApiResponse(
  context: RequestLogContext,
  statusCode: number,
  duration: number
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  log(level, `API Response: ${context.method} ${context.path} ${statusCode}`, {
    requestId: context.requestId,
    userId: context.userId,
    action: 'api_response',
    resource: context.path,
    duration,
    statusCode,
  })
}

// ============================================
// DATABASE QUERY LOGGING
// ============================================

export function logDbQuery(
  operation: string,
  table: string,
  duration: number,
  context?: LogContext
): void {
  logger.debug(`DB ${operation} on ${table}`, {
    ...context,
    action: 'db_query',
    resource: table,
    duration,
    operation,
  })
}

// ============================================
// EXTERNAL SERVICE LOGGING
// ============================================

export function logExternalCall(
  service: string,
  operation: string,
  duration: number,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? 'info' : 'error'
  log(level, `External call: ${service}.${operation}`, {
    ...context,
    action: 'external_call',
    resource: service,
    duration,
    operation,
    success,
  })
}
