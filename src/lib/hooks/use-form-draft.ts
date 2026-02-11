'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useFormDraft<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const saved = localStorage.getItem(`nestmatch-draft:${key}`)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  const timeoutRef = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined') return
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`nestmatch-draft:${key}`, JSON.stringify(value))
      } catch {
        // localStorage full or unavailable
      }
    }, 1000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [key, value])

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(`nestmatch-draft:${key}`)
    } catch {
      // ignore
    }
  }, [key])

  return [value, setValue, clearDraft] as const
}
