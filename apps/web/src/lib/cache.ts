/**
 * Server-side caching utilities
 * Uses in-memory cache with TTL for server components
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// In-memory cache (per-instance, suitable for serverless with short lifetimes)
const cache = new Map<string, CacheEntry<any>>()

// Default TTLs in seconds
export const CACHE_TTL = {
  short: 60,          // 1 minute
  medium: 300,        // 5 minutes
  long: 3600,         // 1 hour
  day: 86400,         // 24 hours
} as const

/**
 * Get a value from cache
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.value as T
}

/**
 * Set a value in cache
 */
export function setCached<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.medium): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Delete a value from cache
 */
export function deleteCached(key: string): void {
  cache.delete(key)
}

/**
 * Delete all values matching a prefix
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.medium
): Promise<T> {
  const existing = getCached<T>(key)
  if (existing !== null) {
    return existing
  }

  const value = await fetcher()
  setCached(key, value, ttlSeconds)
  return value
}

/**
 * Decorator for caching function results
 */
export function withCache<TArgs extends any[], TResult>(
  keyGenerator: (...args: TArgs) => string,
  ttlSeconds: number = CACHE_TTL.medium
) {
  return function (fn: (...args: TArgs) => Promise<TResult>) {
    return async (...args: TArgs): Promise<TResult> => {
      const key = keyGenerator(...args)
      return cached(key, () => fn(...args), ttlSeconds)
    }
  }
}

// ============================================
// CACHE KEY GENERATORS
// ============================================

export const CacheKeys = {
  // User-related
  profile: (userId: string) => `profile:${userId}`,
  preferences: (userId: string) => `preferences:${userId}`,
  userListings: (userId: string) => `user_listings:${userId}`,

  // Listings
  listing: (id: string) => `listing:${id}`,
  listingsSearch: (params: string) => `listings_search:${params}`,
  publicListings: (page: number) => `public_listings:${page}`,

  // Suggestions
  suggestions: (userId: string) => `suggestions:${userId}`,
  compatibility: (user1: string, user2: string) =>
    `compatibility:${[user1, user2].sort().join(':')}`,

  // Groups
  group: (id: string) => `group:${id}`,
  userGroups: (userId: string) => `user_groups:${userId}`,

  // Resources
  resourceCategories: () => 'resource_categories',
  resource: (slug: string) => `resource:${slug}`,
  faqs: (categoryId?: string) => `faqs:${categoryId || 'all'}`,

  // Stats
  stats: (type: string) => `stats:${type}`,
}

// ============================================
// STALE-WHILE-REVALIDATE PATTERN
// ============================================

interface SWREntry<T> {
  value: T
  staleAt: number
  expiresAt: number
  revalidating: boolean
}

const swrCache = new Map<string, SWREntry<any>>()

/**
 * Stale-while-revalidate cache
 * Returns stale data immediately while revalidating in background
 */
export async function cachedSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    staleSeconds?: number
    maxAgeSeconds?: number
  } = {}
): Promise<T> {
  const staleSeconds = options.staleSeconds || 60
  const maxAgeSeconds = options.maxAgeSeconds || 300
  const now = Date.now()

  const entry = swrCache.get(key)

  // If no entry or expired, fetch fresh
  if (!entry || now > entry.expiresAt) {
    const value = await fetcher()
    swrCache.set(key, {
      value,
      staleAt: now + staleSeconds * 1000,
      expiresAt: now + maxAgeSeconds * 1000,
      revalidating: false,
    })
    return value
  }

  // If stale but not expired, return stale and revalidate in background
  if (now > entry.staleAt && !entry.revalidating) {
    entry.revalidating = true
    // Fire and forget revalidation
    fetcher().then(value => {
      swrCache.set(key, {
        value,
        staleAt: Date.now() + staleSeconds * 1000,
        expiresAt: Date.now() + maxAgeSeconds * 1000,
        revalidating: false,
      })
    }).catch(() => {
      entry.revalidating = false
    })
  }

  return entry.value
}
