'use client'

import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  isLoading: boolean
  permissionState: PermissionState | null
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const CACHE_KEY = 'nestmatch_user_location'
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface CachedLocation {
  latitude: number
  longitude: number
  timestamp: number
}

function getCachedLocation(): CachedLocation | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CachedLocation = JSON.parse(cached)
    const isExpired = Date.now() - data.timestamp > CACHE_DURATION_MS

    if (isExpired) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }

    return data
  } catch {
    return null
  }
}

function setCachedLocation(latitude: number, longitude: number): void {
  if (typeof window === 'undefined') return

  try {
    const data: CachedLocation = {
      latitude,
      longitude,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
    permissionState: null,
  })

  // Check permission state
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        setState((prev) => ({ ...prev, permissionState: result.state }))

        result.addEventListener('change', () => {
          setState((prev) => ({ ...prev, permissionState: result.state }))
        })
      })
      .catch(() => {
        // Permissions API not supported
      })
  }, [])

  // Load from cache on mount
  useEffect(() => {
    const cached = getCachedLocation()
    if (cached) {
      setState((prev) => ({
        ...prev,
        latitude: cached.latitude,
        longitude: cached.longitude,
      }))
    }
  }, [])

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }))
      return
    }

    // Check cache first
    const cached = getCachedLocation()
    if (cached) {
      setState((prev) => ({
        ...prev,
        latitude: cached.latitude,
        longitude: cached.longitude,
        error: null,
        isLoading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCachedLocation(latitude, longitude)
        setState({
          latitude,
          longitude,
          error: null,
          isLoading: false,
          permissionState: 'granted',
        })
      },
      (error) => {
        let errorMessage = 'Failed to get your location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
          permissionState: error.code === error.PERMISSION_DENIED ? 'denied' : prev.permissionState,
        }))
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    )
  }, [enableHighAccuracy, timeout, maximumAge])

  const clearLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CACHE_KEY)
    }
    setState({
      latitude: null,
      longitude: null,
      error: null,
      isLoading: false,
      permissionState: state.permissionState,
    })
  }, [state.permissionState])

  return {
    ...state,
    requestLocation,
    clearLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  }
}
