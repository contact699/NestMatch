import { logger } from '@/lib/logger'

interface GeocodeInput {
  address?: string | null
  city: string
  province: string
  postal_code?: string | null
  country?: string
}

interface GeocodeResult {
  lat: number
  lng: number
}

interface GoogleGeocodeResponse {
  status: string
  results: Array<{
    geometry: {
      location: { lat: number; lng: number }
    }
  }>
  error_message?: string
}

function buildAddressString(input: GeocodeInput): string {
  const parts = [
    input.address,
    input.city,
    input.province,
    input.postal_code,
    input.country ?? 'Canada',
  ].filter((p): p is string => Boolean(p && p.trim()))
  return parts.join(', ')
}

function getApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_GEOCODING_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  )
}

export async function geocodeListingAddress(
  input: GeocodeInput,
): Promise<GeocodeResult | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    logger.warn('geocode: no Google Maps API key configured; skipping')
    return null
  }

  const addressStr = buildAddressString(input)
  if (!addressStr) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', addressStr)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('region', 'ca')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      logger.warn(`geocode: HTTP ${res.status} for "${addressStr}"`)
      return null
    }
    const json = (await res.json()) as GoogleGeocodeResponse
    if (json.status !== 'OK' || !json.results?.length) {
      logger.warn(
        `geocode: status=${json.status} for "${addressStr}"${json.error_message ? ` (${json.error_message})` : ''}`,
      )
      return null
    }
    const { lat, lng } = json.results[0].geometry.location
    return { lat, lng }
  } catch (err) {
    logger.error('geocode: fetch failed', err instanceof Error ? err : new Error(String(err)))
    return null
  }
}
