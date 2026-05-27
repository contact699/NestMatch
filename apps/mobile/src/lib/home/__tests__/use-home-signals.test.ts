// Run with `npm run test:variant` (uses tsx).
// Mirrors the pattern from apps/web/scripts/test-mojibake-patterns.ts.

import { strict as assert } from 'node:assert'
import { selectVariant } from '../use-home-signals'
import type { HomeSignals, HeroVariant } from '../types'

const zero: HomeSignals = {
  newMatches: 0,
  pendingInvites: 0,
  unreadMessages: 0,
  updatedSavedListings: 0,
  cityNewListings: 0,
}

interface Case {
  name: string
  signals: HomeSignals
  profileCompletion: number
  expected: HeroVariant
}

const CASES: Case[] = [
  // signals variant
  { name: 'new matches → signals', signals: { ...zero, newMatches: 1 }, profileCompletion: 100, expected: 'signals' },
  { name: 'pending invites → signals', signals: { ...zero, pendingInvites: 2 }, profileCompletion: 50, expected: 'signals' },
  { name: 'unread → signals (even when onboarding incomplete)', signals: { ...zero, unreadMessages: 1 }, profileCompletion: 30, expected: 'signals' },
  { name: 'updated saved → signals', signals: { ...zero, updatedSavedListings: 1 }, profileCompletion: 100, expected: 'signals' },

  // onboarding variant
  { name: 'no signals + incomplete profile → onboarding', signals: zero, profileCompletion: 60, expected: 'onboarding' },
  { name: 'no signals + 99% profile → onboarding', signals: zero, profileCompletion: 99, expected: 'onboarding' },

  // discovery variant
  { name: 'no signals + complete profile → discovery', signals: zero, profileCompletion: 100, expected: 'discovery' },

  // cityNewListings alone is NOT a "signal" — it informs the discovery variant only
  { name: 'only cityNewListings + complete profile → discovery', signals: { ...zero, cityNewListings: 12 }, profileCompletion: 100, expected: 'discovery' },
  { name: 'only cityNewListings + incomplete profile → onboarding', signals: { ...zero, cityNewListings: 12 }, profileCompletion: 50, expected: 'onboarding' },
]

let passed = 0
let failed = 0
for (const c of CASES) {
  try {
    const got = selectVariant(c.signals, c.profileCompletion)
    assert.equal(got, c.expected)
    passed++
  } catch (err) {
    failed++
    console.error(`FAIL: ${c.name}`)
    console.error(`  ${(err as Error).message}`)
  }
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
