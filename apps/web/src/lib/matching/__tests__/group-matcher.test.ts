import { describe, it, expect } from 'vitest'
import {
  applyTrustBoost,
  calculateCombinedScore,
  getAverageVerificationLevel,
  calculateTrustScoreLocal,
} from '../group-matcher'
import { DEFAULT_MATCHING_CONFIG } from '../types'
import { makeCandidate } from './fixtures'

// NOTE: generateGroupSuggestions / saveGroupSuggestions / getSuggestionsWithProfiles
// are DB-bound (supabase queries + RPC) and intentionally not covered here.

describe('applyTrustBoost', () => {
  it('applies no boost for basic level', () => {
    expect(applyTrustBoost(80, 'basic')).toBe(80)
  })

  it('applies the verifiedBoost multiplier (1.3x default)', () => {
    expect(applyTrustBoost(50, 'verified')).toBe(65)
  })

  it('applies the trustedBoost multiplier (1.5x default)', () => {
    expect(applyTrustBoost(50, 'trusted')).toBe(75)
  })

  it('caps the boosted score at 100', () => {
    expect(applyTrustBoost(90, 'trusted')).toBe(100)
  })

  it('rounds the boosted score', () => {
    // 33 * 1.3 = 42.9 -> rounds to 43
    expect(applyTrustBoost(33, 'verified')).toBe(43)
  })

  it('respects a custom config', () => {
    const config = { ...DEFAULT_MATCHING_CONFIG, verifiedBoost: 2 }
    expect(applyTrustBoost(40, 'verified', config)).toBe(80)
  })
})

describe('calculateCombinedScore', () => {
  it('weights practical/compatibility/trust at 40/35/25 by default, then applies trust boost', () => {
    // weighted = 80*0.4 + 70*0.35 + 60*0.25 = 32 + 24.5 + 15 = 71.5 -> basic boost round(71.5) = 72
    expect(calculateCombinedScore(80, 70, 60, 'basic')).toBe(72)
  })

  it('applies the verified boost on top of the weighted score', () => {
    // weighted = 71.5, boosted = 71.5 * 1.3 = 92.95 -> round = 93
    expect(calculateCombinedScore(80, 70, 60, 'verified')).toBe(93)
  })

  it('caps the final combined score at 100', () => {
    expect(calculateCombinedScore(100, 100, 100, 'trusted')).toBe(100)
  })
})

describe('getAverageVerificationLevel', () => {
  it('returns "trusted" when trusted candidates are at least half the group', () => {
    const candidates = [
      makeCandidate({ verificationLevel: 'trusted' }),
      makeCandidate({ verificationLevel: 'basic' }),
    ]
    expect(getAverageVerificationLevel(candidates)).toBe('trusted')
  })

  it('returns "verified" when verified+trusted are at least half but trusted alone is not', () => {
    const candidates = [
      makeCandidate({ verificationLevel: 'verified' }),
      makeCandidate({ verificationLevel: 'basic' }),
    ]
    expect(getAverageVerificationLevel(candidates)).toBe('verified')
  })

  it('returns "basic" when fewer than half are verified or trusted', () => {
    const candidates = [
      makeCandidate({ verificationLevel: 'trusted' }),
      makeCandidate({ verificationLevel: 'basic' }),
      makeCandidate({ verificationLevel: 'basic' }),
    ]
    expect(getAverageVerificationLevel(candidates)).toBe('basic')
  })

  it('returns "trusted" when exactly half the group is trusted', () => {
    const candidates = [
      makeCandidate({ verificationLevel: 'trusted' }),
      makeCandidate({ verificationLevel: 'trusted' }),
      makeCandidate({ verificationLevel: 'basic' }),
      makeCandidate({ verificationLevel: 'basic' }),
    ]
    expect(getAverageVerificationLevel(candidates)).toBe('trusted')
  })

  // NOTE: for an empty candidate list, `trusted >= levels.length / 2` is `0 >= 0`,
  // which is true — so an empty group is reported as "trusted" rather than
  // "basic". This is current (likely unintended) behavior; locking it in here
  // rather than changing production code.
  it('returns "trusted" for an empty candidate list (0 >= 0 edge case)', () => {
    expect(getAverageVerificationLevel([])).toBe('trusted')
  })
})

describe('calculateTrustScoreLocal', () => {
  it('returns 0 for an empty candidate list', () => {
    expect(calculateTrustScoreLocal([])).toBe(0)
  })

  it('scores trusted candidates as 100', () => {
    expect(calculateTrustScoreLocal([makeCandidate({ verificationLevel: 'trusted' })])).toBe(100)
  })

  it('scores verified candidates as 70', () => {
    expect(calculateTrustScoreLocal([makeCandidate({ verificationLevel: 'verified' })])).toBe(70)
  })

  it('scores basic candidates as 30', () => {
    expect(calculateTrustScoreLocal([makeCandidate({ verificationLevel: 'basic' })])).toBe(30)
  })

  it('averages and rounds across a mixed group', () => {
    // (100 + 70 + 30) / 3 = 66.67 -> rounds to 67
    const candidates = [
      makeCandidate({ verificationLevel: 'trusted' }),
      makeCandidate({ verificationLevel: 'verified' }),
      makeCandidate({ verificationLevel: 'basic' }),
    ]
    expect(calculateTrustScoreLocal(candidates)).toBe(67)
  })
})
