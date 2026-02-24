'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientLogger } from '@/lib/client-logger'

interface UseFetchOptions<T> {
  /** Initial data value */
  initialData?: T
  /** Dependencies that trigger refetch when changed */
  deps?: unknown[]
  /** Skip the initial fetch (useful for conditional fetching) */
  skip?: boolean
  /** Transform the response data before setting state */
  transform?: (data: unknown) => T
  /** Called on successful fetch */
  onSuccess?: (data: T) => void
  /** Called on fetch error */
  onError?: (error: Error) => void
}

interface UseFetchResult<T> {
  /** The fetched data */
  data: T | null
  /** Loading state */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually trigger a refetch */
  refetch: () => Promise<void>
  /** Update data manually (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<T | null>>
  /** Clear error state */
  clearError: () => void
}

/**
 * Custom hook for data fetching with loading, error, and refetch support.
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useFetch<Expense[]>('/api/expenses')
 *
 * @example
 * // With dependencies (refetch when filter changes)
 * const { data, isLoading } = useFetch<Expense[]>(
 *   `/api/expenses?status=${filter}`,
 *   { deps: [filter] }
 * )
 *
 * @example
 * // With transform
 * const { data } = useFetch<ExpenseData>(
 *   '/api/expenses',
 *   { transform: (res) => ({ expenses: res.expenses, summary: res.summary }) }
 * )
 */
export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    initialData,
    deps = [],
    skip = false,
    transform,
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState<T | null>(initialData ?? null)
  const [isLoading, setIsLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url || skip) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || `Request failed with status ${response.status}`)
      }

      const result = transform ? transform(json) : json
      setData(result)
      onSuccess?.(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      clientLogger.error(`Fetch error for ${url}`, err)
    } finally {
      setIsLoading(false)
    }
  }, [url, skip, transform, onSuccess, onError])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, skip, ...deps])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    setData,
    clearError,
  }
}

/**
 * Hook for mutations (POST, PUT, DELETE) with loading and error states.
 *
 * @example
 * const { mutate, isLoading, error } = useMutation<Expense>('/api/expenses')
 *
 * const handleSubmit = async (data) => {
 *   const result = await mutate({ method: 'POST', body: data })
 *   if (result) {
 *     // Success
 *   }
 * }
 */
export function useMutation<T>(url: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (options: {
      method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
      body?: unknown
      onSuccess?: (data: T) => void
      onError?: (error: Error) => void
    } = {}): Promise<T | null> => {
      const { method = 'POST', body, onSuccess, onError } = options

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        })

        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error || `Request failed with status ${response.status}`)
        }

        onSuccess?.(json)
        return json
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        onError?.(err instanceof Error ? err : new Error(errorMessage))
        clientLogger.error(`Mutation error for ${url}`, err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [url]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    mutate,
    isLoading,
    error,
    clearError,
  }
}
