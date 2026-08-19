/**
 * Decoder for the two error envelopes our API routes emit.
 *
 * `withApiHandler`'s own guards (auth, rate limit, unhandled 500s) and handlers
 * that return `apiResponse({ error: '...' }, status)` produce a flat string:
 *
 *     { "error": "Failed to delete expense", "requestId": "..." }
 *
 * Anything that *throws* an `AppError` (NotFoundError, AuthorizationError,
 * ValidationError, and the 409 conflict the expenses DELETE raises) is
 * serialised by `createErrorResponse()` in `@/lib/error-reporter` as an object:
 *
 *     { "error": { "code": "CONFLICT", "message": "...", "requestId": "..." } }
 *
 * Reading `body.error` directly therefore renders "[object Object]" for the
 * second shape. Always route API error bodies through this helper so the
 * server's message reaches the user verbatim.
 */

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

function firstNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function getApiErrorMessage(
  body: unknown,
  fallback: string = DEFAULT_MESSAGE
): string {
  if (!body || typeof body !== 'object') return fallback

  const { error, message } = body as { error?: unknown; message?: unknown }

  // Flat envelope: { error: "..." }
  const flat = firstNonEmptyString(error)
  if (flat) return flat

  // AppError envelope: { error: { code, message, ... } }
  if (error && typeof error === 'object') {
    const nested = firstNonEmptyString((error as { message?: unknown }).message)
    if (nested) return nested
  }

  // Some responses (e.g. plain thrown errors serialised by a framework layer)
  // put the text at the top level.
  const topLevel = firstNonEmptyString(message)
  if (topLevel) return topLevel

  return fallback
}

/**
 * Read an error message off a failed `fetch` Response. Safe against empty
 * (204) and non-JSON bodies, which resolve to `fallback`.
 */
export async function readApiErrorMessage(
  response: Response,
  fallback: string = DEFAULT_MESSAGE
): Promise<string> {
  try {
    return getApiErrorMessage(await response.json(), fallback)
  } catch {
    return fallback
  }
}
