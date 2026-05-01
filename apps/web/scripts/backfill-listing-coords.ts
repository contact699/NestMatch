import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey =
  process.env.GOOGLE_MAPS_GEOCODING_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!apiKey) {
  console.error(
    'Missing Google Maps geocoding key (GOOGLE_MAPS_GEOCODING_API_KEY / GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ListingRow {
  id: string
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
}

async function geocode(row: ListingRow): Promise<{ lat: number; lng: number } | null> {
  const parts = [row.address, row.city, row.province, row.postal_code, 'Canada']
    .filter((p): p is string => Boolean(p && p.trim()))
  if (parts.length === 0) return null
  const addressStr = parts.join(', ')

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', addressStr)
  url.searchParams.set('key', apiKey!)
  url.searchParams.set('region', 'ca')

  const res = await fetch(url.toString())
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} for "${addressStr}"`)
    return null
  }
  const json = (await res.json()) as {
    status: string
    results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
    error_message?: string
  }
  if (json.status !== 'OK' || !json.results?.length) {
    console.warn(`  status=${json.status} for "${addressStr}"${json.error_message ? ` (${json.error_message})` : ''}`)
    return null
  }
  return json.results[0].geometry.location
}

async function main() {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, address, city, province, postal_code')
    .or('lat.is.null,lng.is.null')

  if (error) {
    console.error('Failed to load listings:', error.message)
    process.exit(1)
  }

  const rows = (listings ?? []) as ListingRow[]
  console.log(`Found ${rows.length} listings missing coordinates.`)

  let ok = 0
  let skipped = 0
  let failed = 0
  for (const row of rows) {
    process.stdout.write(`Geocoding ${row.id} (${row.city ?? 'no city'})... `)
    const coords = await geocode(row)
    if (!coords) {
      console.log('skipped')
      skipped += 1
      continue
    }

    const { error: updateError } = await supabase
      .from('listings')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', row.id)

    if (updateError) {
      console.log(`failed (${updateError.message})`)
      failed += 1
    } else {
      console.log(`ok (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`)
      ok += 1
    }

    // Stay well under the Google geocoding rate limit (~50 qps free tier).
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log(`\nDone. updated=${ok} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
