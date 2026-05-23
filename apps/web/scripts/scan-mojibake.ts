import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { findMojibakePatterns, hasMojibake } from './lib/mojibake-patterns'

config({ path: resolve(__dirname, '../.env.local') })

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

interface ScanTarget {
  table: string
  idColumn: string
  textColumns: string[]
  filter?: { column: string; value: unknown }
}

const TARGETS: ScanTarget[] = [
  { table: 'listings', idColumn: 'id', textColumns: ['title', 'description'] },
  {
    table: 'resources',
    idColumn: 'id',
    textColumns: ['title', 'excerpt'],
    // `content` is JSON (per Plan 1 Task 5); we don't scan JSON columns here.
  },
  { table: 'faqs', idColumn: 'id', textColumns: ['question', 'answer'] },
  { table: 'profiles', idColumn: 'id', textColumns: ['name', 'bio'] },
]

interface Hit {
  table: string
  id: string
  column: string
  patterns: string[]
  sample: string
}

async function scanTarget(target: ScanTarget): Promise<Hit[]> {
  const columns = [target.idColumn, ...target.textColumns].join(', ')
  let q = supabase.from(target.table).select(columns).limit(50000)
  if (target.filter) q = q.eq(target.filter.column, target.filter.value as never)
  const { data, error } = await q
  if (error) {
    console.error(`Failed to scan ${target.table}:`, error.message)
    return []
  }
  const hits: Hit[] = []
  for (const row of (data as unknown as Record<string, unknown>[]) ?? []) {
    for (const col of target.textColumns) {
      const v = row[col]
      if (typeof v === 'string' && hasMojibake(v)) {
        hits.push({
          table: target.table,
          id: String(row[target.idColumn]),
          column: col,
          patterns: findMojibakePatterns(v),
          sample: v.slice(0, 120),
        })
      }
    }
  }
  return hits
}

async function main() {
  const allHits: Hit[] = []
  for (const target of TARGETS) {
    const hits = await scanTarget(target)
    allHits.push(...hits)
  }

  if (allHits.length === 0) {
    console.log('OK No mojibake found across all scanned columns.')
    process.exit(0)
  }

  console.log(`FOUND Mojibake found in ${allHits.length} row/column(s):\n`)
  const grouped = allHits.reduce<Record<string, Hit[]>>((acc, h) => {
    const key = `${h.table}.${h.column}`
    ;(acc[key] ??= []).push(h)
    return acc
  }, {})
  for (const [key, list] of Object.entries(grouped)) {
    console.log(`  ${key}: ${list.length} row(s)`)
    for (const h of list.slice(0, 3)) {
      console.log(`    - ${h.id}: ${h.patterns.join(', ')}`)
      console.log(`      sample: ${h.sample.replace(/\s+/g, ' ')}`)
    }
    if (list.length > 3) console.log(`    ... and ${list.length - 3} more`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error('Scan failed:', err)
  process.exit(2)
})
