/**
 * Calculate the distance between two points using the Haversine formula.
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format a distance in kilometers to a human-readable string.
 * Shows meters for distances under 1km, kilometers otherwise.
 * @param km - Distance in kilometers
 * @returns Formatted distance string (e.g., "500 m" or "2.5 km")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    // Show in meters for distances under 1km
    const meters = Math.round(km * 1000)
    return `${meters} m`
  }

  // Round to 1 decimal place for distances 1km and over
  const rounded = Math.round(km * 10) / 10
  return `${rounded} km`
}

/**
 * Sort items by distance from a reference point.
 * @param items - Array of items with lat/lng coordinates
 * @param refLat - Reference latitude
 * @param refLng - Reference longitude
 * @param getCoords - Function to extract lat/lng from an item
 * @returns Sorted array with distance property added
 */
export function sortByDistance<T>(
  items: T[],
  refLat: number,
  refLng: number,
  getCoords: (item: T) => { lat: number | null; lng: number | null }
): (T & { distance: number | null })[] {
  return items
    .map((item) => {
      const coords = getCoords(item)
      let distance: number | null = null

      if (coords.lat !== null && coords.lng !== null) {
        distance = calculateDistance(refLat, refLng, coords.lat, coords.lng)
      }

      return { ...item, distance }
    })
    .sort((a, b) => {
      // Items without coordinates go to the end
      if (a.distance === null && b.distance === null) return 0
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })
}
