import { NextResponse } from 'next/server'

/**
 * Standard API error response format.
 */
interface ApiErrorResponse {
  error: string
  code?: string
  details?: unknown
}

/**
 * Standard API success response format.
 */
interface ApiSuccessResponse<T = unknown> {
  data?: T
  message?: string
}

/**
 * Create a standardized error response.
 *
 * @example
 * return apiError('User not found', 404)
 *
 * @example
 * return apiError('Validation failed', 400, { fields: errors })
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: unknown,
  code?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = { error: message }

  if (code) {
    response.code = code
  }

  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Create a standardized success response.
 *
 * @example
 * return apiSuccess({ users: [...] })
 *
 * @example
 * return apiSuccess({ id: newUser.id }, 201)
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200
): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * Common error responses.
 */
export const ApiErrors = {
  unauthorized: () => apiError('Unauthorized', 401, undefined, 'UNAUTHORIZED'),
  forbidden: () => apiError('Forbidden', 403, undefined, 'FORBIDDEN'),
  notFound: (resource = 'Resource') => apiError(`${resource} not found`, 404, undefined, 'NOT_FOUND'),
  badRequest: (message: string, details?: unknown) => apiError(message, 400, details, 'BAD_REQUEST'),
  conflict: (message: string) => apiError(message, 409, undefined, 'CONFLICT'),
  internal: (message = 'Internal server error') => apiError(message, 500, undefined, 'INTERNAL_ERROR'),
  validation: (details: unknown) => apiError('Validation failed', 400, details, 'VALIDATION_ERROR'),
}

/**
 * Wrap an async handler with error handling.
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData()
 *   return apiSuccess({ data })
 * })
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)

      if (error instanceof Error) {
        return apiError(error.message, 500)
      }

      return ApiErrors.internal()
    }
  }) as T
}
