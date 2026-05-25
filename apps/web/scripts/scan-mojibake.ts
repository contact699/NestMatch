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
  /** Text columns to scan directly. */
  textColumns: string[]
  /** JSON columns to walk recursively, scanning every string node. */
  jsonColumns?: string[]
}

const TARGETS: ScanTarget[] = [
  { table: 'listings', idColumn: 'id', textColumns: ['title', 'description'] },
  {
    table: 'resources',
    idColumn: 'id',
    textColumns: ['title', 'excerpt'],
    jsonColumns: ['content'], // guide article body (rendered on detail page)
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

const PAGE_SIZE = 1000

/**
 * Walks a JSON value and returns the concatenation of every string node.
 * Used to detect mojibake in JSON columns without losing position info.
 */
function flattenJsonStrings(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return ''
  if (Array.isArray(value)) {
    return value.map((v) => flattenJsonStrings(v)).join(' ')
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((v) => flattenJsonStrings(v))
      .join(' ')
  }
  return ''
}

async function scanTarget(target: ScanTarget): Promise<Hit[]> {
  const cols = [target.idColumn, ...target.textColumns, ...(target.jsonColumns ?? [])]
  const columns = cols.join(', ')
  const hits: Hit[] = []

  let from = 0
  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from(target.table)
      .select(columns)
      .range(from, to)

    if (error) {
      // Fail loud — a query error means we can't trust "OK clean".
      throw new Error(
        `Failed to scan ${target.table} (rows ${from}-${to}): ${error.message}`
      )
    }

    const rows = (data as unknown as Record<string, unknown>[]) ?? []
    if (rows.length === 0) break

    for (const row of rows) {
      // Text columns: scan directly.
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
      // JSON columns: flatten to a string, then scan.
      for (const col of target.jsonColumns ?? []) {
        const raw = row[col]
        if (raw == null) continue
        const flat = flattenJsonStrings(raw)
        if (hasMojibake(flat)) {
          // Find the first string node containing mojibake for a usable sample.
          const sample = firstMojibakeStringNode(raw) ?? flat.slice(0, 120)
          hits.push({
            table: target.table,
            id: String(row[target.idColumn]),
            column: col,
            patterns: findMojibakePatterns(flat),
            sample: sample.slice(0, 120),
          })
        }
      }
    }

    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return hits
}

/** Returns the first string descendant of `value` that contains mojibake, or null. */
function firstMojibakeStringNode(value: unknown): string | null {
  if (typeof value === 'string') return hasMojibake(value) ? value : null
  if (value == null || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const v of value) {
      const r = firstMojibakeStringNode(v)
      if (r) return r
    }
    return null
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    const r = firstMojibakeStringNode(v)
    if (r) return r
  }
  return null
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
  console.error('Scan failed:', err instanceof Error ? err.message : err)
  process.exit(2)
})
