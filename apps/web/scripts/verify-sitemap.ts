import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { FLAGSHIP_CITIES } from '../src/lib/cities'

config({ path: resolve(__dirname, '../.env.local') })

interface ChunkCheck {
  id: number
  label: string
  /** Returns the expected URL count by querying the DB. Throws on DB error. */
  expected: () => Promise<number>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Missing env. Run `vercel env pull apps/web/.env.local` first ' +
      '(see project memory: reference_local_db_scripts_env.md).'
  )
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const CHUNKS: ChunkCheck[] = [
  {
    id: 0,
    label: 'static',
    // Static chunk has 6 URLs from sitemap-static.ts. Hard-coded; doesn't query DB.
    expected: async () => 6,
  },
  {
    id: 1,
    label: 'listings',
    expected: async () => {
      const { count, error } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
      if (error) {
        throw new Error(`Failed to count active listings: ${error.message}`)
      }
      return count ?? 0
    },
  },
  {
    id: 2,
    label: 'guides',
    expected: async () => {
      const now = new Date().toISOString()
      const { count, error } = await supabase
        .from('resources')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      if (error) {
        throw new Error(`Failed to count published guides: ${error.message}`)
      }
      return count ?? 0
    },
  },
  {
    id: 3,
    label: 'cities',
    expected: async () => {
      // Count flagship cities at-or-above the 5-listing threshold.
      // Must match sitemap-cities.ts logic.
      const THRESHOLD = 5
      let qualifying = 0
      for (const city of FLAGSHIP_CITIES) {
        const { count, error } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .ilike('city', city.dbName)
        if (error) {
          throw new Error(`verify-sitemap: failed counting ${city.slug}: ${error.message}`)
        }
        if ((count ?? 0) >= THRESHOLD) qualifying++
      }
      return qualifying
    },
  },
]

function countUrlsInChunk(chunkId: number): { found: number; path: string } | null {
  const path = resolve(__dirname, `../.next/server/app/sitemap/${chunkId}.xml.body`)
  if (!existsSync(path)) {
    return null
  }
  const xml = readFileSync(path, 'utf-8')
  const matches = xml.match(/<url>/g)
  return { found: matches?.length ?? 0, path }
}

async function main() {
  let failed = false

  for (const chunk of CHUNKS) {
    const result = countUrlsInChunk(chunk.id)
    if (!result) {
      console.error(
        `MISSING artifact for chunk ${chunk.id} (${chunk.label}). ` +
          `Run 'npm run build --prefix apps/web' first.`
      )
      failed = true
      continue
    }

    const expected = await chunk.expected()

    const target = Math.min(expected, 50000) // sitemap queries limit to 50000
    const ok = result.found === target
    const line = `${ok ? 'OK  ' : 'FAIL'} chunk ${chunk.id} (${chunk.label}): found ${result.found} URLs, expected ${target}`
    if (ok) {
      console.log(line)
    } else {
      console.error(line)
      console.error(`     artifact: ${result.path}`)
      failed = true
    }
  }

  if (failed) {
    console.error('\nSitemap verification FAILED — see lines above.')
    process.exit(1)
  }
  console.log('\nAll sitemap chunks verified.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Verification crashed:', err)
  process.exit(2)
})
