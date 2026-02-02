'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

// Default query options
const defaultOptions = {
  queries: {
    // Data is fresh for 1 minute
    staleTime: 60 * 1000,
    // Cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Retry failed requests up to 3 times
    retry: 3,
    // Exponential backoff
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus (good for data freshness)
    refetchOnWindowFocus: true,
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once
    retry: 1,
  },
}

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create client inside component to avoid sharing state between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  )
}

// ============================================
// QUERY KEY FACTORIES
// ============================================

export const queryKeys = {
  // User
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    current: () => ['user', 'current'] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
  },

  // Listings
  listings: {
    all: ['listings'] as const,
    list: (filters: Record<string, any>) => ['listings', 'list', filters] as const,
    detail: (id: string) => ['listings', 'detail', id] as const,
    user: (userId: string) => ['listings', 'user', userId] as const,
    saved: (userId: string) => ['listings', 'saved', userId] as const,
  },

  // Roommates
  roommates: {
    all: ['roommates'] as const,
    list: (filters: Record<string, any>) => ['roommates', 'list', filters] as const,
    compatibility: (userId: string) => ['roommates', 'compatibility', userId] as const,
  },

  // Suggestions
  suggestions: {
    all: ['suggestions'] as const,
    user: (userId: string) => ['suggestions', 'user', userId] as const,
  },

  // Groups
  groups: {
    all: ['groups'] as const,
    list: () => ['groups', 'list'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    public: () => ['groups', 'public'] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    conversations: () => ['messages', 'conversations'] as const,
    conversation: (id: string) => ['messages', 'conversation', id] as const,
    unread: () => ['messages', 'unread'] as const,
  },

  // Resources
  resources: {
    all: ['resources'] as const,
    categories: () => ['resources', 'categories'] as const,
    detail: (slug: string) => ['resources', 'detail', slug] as const,
    faqs: (categoryId?: string) => ['resources', 'faqs', categoryId] as const,
    bookmarks: (userId: string) => ['resources', 'bookmarks', userId] as const,
  },
}

// ============================================
// MUTATION HELPERS
// ============================================

/**
 * Optimistic update helper
 */
export function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
): { previousData: T | undefined; rollback: () => void } {
  const previousData = queryClient.getQueryData<T>(queryKey)

  queryClient.setQueryData(queryKey, updater)

  return {
    previousData,
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData)
    },
  }
}
