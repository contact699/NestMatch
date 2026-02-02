/**
 * Request context utilities for tracking requests across the application
 * Provides request ID generation and propagation
 */

import { headers } from 'next/headers'
import { AsyncLocalStorage } from 'async_hooks'

// ============================================
// REQUEST ID GENERATION
// ============================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `req_${timestamp}_${random}`
}

/**
 * Get request ID from headers or generate a new one
 */
export async function getRequestId(): Promise<string> {
  try {
    const headersList = await headers()
    const existingId = headersList.get('x-request-id')
    if (existingId) return existingId
  } catch {
    // Headers not available (not in a request context)
  }
  return generateRequestId()
}

// ============================================
// REQUEST CONTEXT STORAGE
// ============================================

export interface RequestContextData {
  requestId: string
  userId?: string
  startTime: number
  path?: string
  method?: string
  ip?: string
  userAgent?: string
}

// AsyncLocalStorage for maintaining context across async operations
const asyncLocalStorage = new AsyncLocalStorage<RequestContextData>()

/**
 * Run a function with request context
 */
export function runWithContext<T>(context: RequestContextData, fn: () => T): T {
  return asyncLocalStorage.run(context, fn)
}

/**
 * Get the current request context
 */
export function getContext(): RequestContextData | undefined {
  return asyncLocalStorage.getStore()
}

/**
 * Get request ID from current context
 */
export function getContextRequestId(): string {
  return getContext()?.requestId || generateRequestId()
}

/**
 * Get user ID from current context
 */
export function getContextUserId(): string | undefined {
  return getContext()?.userId
}

// ============================================
// CONTEXT HELPERS
// ============================================

/**
 * Create request context from Next.js headers
 */
export async function createRequestContext(
  userId?: string
): Promise<RequestContextData> {
  const requestId = await getRequestId()

  let path: string | undefined
  let method: string | undefined
  let ip: string | undefined
  let userAgent: string | undefined

  try {
    const headersList = await headers()
    path = headersList.get('x-pathname') || undefined
    method = headersList.get('x-method') || undefined
    ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
         headersList.get('x-real-ip') ||
         undefined
    userAgent = headersList.get('user-agent') || undefined
  } catch {
    // Headers not available
  }

  return {
    requestId,
    userId,
    startTime: Date.now(),
    path,
    method,
    ip,
    userAgent,
  }
}

/**
 * Calculate request duration from context
 */
export function getRequestDuration(): number {
  const context = getContext()
  if (!context) return 0
  return Date.now() - context.startTime
}

// ============================================
// TRACING UTILITIES
// ============================================

export interface SpanData {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  attributes?: Record<string, unknown>
  status?: 'ok' | 'error'
  error?: Error
}

/**
 * Simple span for tracing operations
 */
export class Span {
  private data: SpanData

  constructor(name: string, attributes?: Record<string, unknown>) {
    this.data = {
      name,
      startTime: Date.now(),
      attributes: {
        requestId: getContextRequestId(),
        ...attributes,
      },
    }
  }

  end(status: 'ok' | 'error' = 'ok', error?: Error): SpanData {
    this.data.endTime = Date.now()
    this.data.duration = this.data.endTime - this.data.startTime
    this.data.status = status
    this.data.error = error
    return this.data
  }

  setAttribute(key: string, value: unknown): void {
    if (!this.data.attributes) this.data.attributes = {}
    this.data.attributes[key] = value
  }
}

/**
 * Trace an async operation
 */
export async function trace<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const span = new Span(name, attributes)
  try {
    const result = await fn()
    span.end('ok')
    return result
  } catch (error) {
    span.end('error', error as Error)
    throw error
  }
}

// ============================================
// CORRELATION ID PROPAGATION
// ============================================

/**
 * Get headers to propagate to downstream services
 */
export function getPropagationHeaders(): Record<string, string> {
  const context = getContext()
  const headers: Record<string, string> = {}

  if (context?.requestId) {
    headers['x-request-id'] = context.requestId
  }
  if (context?.userId) {
    headers['x-user-id'] = context.userId
  }

  return headers
}

/**
 * Add request context to fetch options
 */
export function withRequestContext(
  options: RequestInit = {}
): RequestInit {
  const propagationHeaders = getPropagationHeaders()
  return {
    ...options,
    headers: {
      ...options.headers,
      ...propagationHeaders,
    },
  }
}
