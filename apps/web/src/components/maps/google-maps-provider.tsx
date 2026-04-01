'use client'

import { useLoadScript } from '@react-google-maps/api'
import { Loader2 } from 'lucide-react'

interface GoogleMapsProviderProps {
  children: React.ReactNode
}

const libraries: ('places' | 'geometry')[] = ['places', 'geometry']

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  })

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-surface-container-low rounded-lg">
        <div className="text-center p-6">
          <p className="text-error font-medium mb-2">Failed to load Google Maps</p>
          <p className="text-sm text-on-surface-variant">
            {!apiKey
              ? 'Google Maps API key is not configured.'
              : 'Please check your internet connection and try again.'}
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-surface-container-low rounded-lg animate-pulse">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-on-surface-variant">Loading map...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
