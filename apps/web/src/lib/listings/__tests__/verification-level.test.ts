// Run with `npm run test:listing-verification` (uses tsx).
import { strict as assert } from 'node:assert'
import { deriveListingLevel, type LVRow } from '../verification-level'

const done = (type: LVRow['type']): LVRow => ({ type, status: 'completed', expires_at: null })
const expired = (type: LVRow['type']): LVRow =>
  ({ type, status: 'completed', expires_at: '2000-01-01T00:00:00Z' })

interface Case { name: string; rows: LVRow[]; expected: string }
const NOW = '2026-06-17T00:00:00Z'
const CASES: Case[] = [
  { name: 'no rows → unverified', rows: [], expected: 'unverified' },
  { name: 'only email → unverified', rows: [done('email')], expected: 'unverified' },
  { name: 'id_owner → verified', rows: [done('id_owner')], expected: 'verified' },
  { name: 'live_photo → verified', rows: [done('live_photo')], expected: 'verified' },
  { name: 'id_owner + live_photo → trusted', rows: [done('id_owner'), done('live_photo')], expected: 'trusted' },
  { name: 'pending id_owner → unverified', rows: [{ type: 'id_owner', status: 'pending', expires_at: null }], expected: 'unverified' },
  { name: 'expired live_photo ignored', rows: [done('id_owner'), expired('live_photo')], expected: 'verified' },
]

let passed = 0, failed = 0
for (const c of CASES) {
  try {
    assert.equal(deriveListingLevel(c.rows, NOW), c.expected)
    passed++
  } catch (e) {
    failed++
    console.error(`FAIL: ${c.name} — ${(e as Error).message}`)
  }
}
console.log(`verification-level: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
