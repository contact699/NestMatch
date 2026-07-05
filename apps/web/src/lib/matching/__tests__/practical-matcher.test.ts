import { describe, it, expect } from 'vitest'
import {
  calculateBudgetOverlap,
  calculateGroupBudgetOverlap,
  findCommonCities,
  calculateDateRange,
  calculatePracticalScore,
  candidatesMatch,
} from '../practical-matcher'
import { DEFAULT_MATCHING_CONFIG } from '../types'
import { makeSeekingProfile, makeCandidate } from './fixtures'

describe('calculateBudgetOverlap', () => {
  it('returns the overlap range and percent relative to the smaller range', () => {
    const p1 = makeSeekingProfile({ budget_min: 1000, budget_max: 2000 })
    const p2 = makeSeekingProfile({ budget_min: 1500, budget_max: 2500 })
    expect(calculateBudgetOverlap(p1, p2)).toEqual({ min: 1500, max: 2000, overlapPercent: 50 })
  })

  it('returns null when ranges do not overlap', () => {
    const p1 = makeSeekingProfile({ budget_min: 1000, budget_max: 1500 })
    const p2 = makeSeekingProfile({ budget_min: 2000, budget_max: 2500 })
    expect(calculateBudgetOverlap(p1, p2)).toBeNull()
  })

  it('treats a zero-width range as 100% overlap to avoid division by zero', () => {
    const p1 = makeSeekingProfile({ budget_min: 1000, budget_max: 1000 })
    const p2 = makeSeekingProfile({ budget_min: 900, budget_max: 1100 })
    expect(calculateBudgetOverlap(p1, p2)).toEqual({ min: 1000, max: 1000, overlapPercent: 100 })
  })

  it('treats touching boundaries as overlapping, but with a 0-width (0%) overlap', () => {
    const p1 = makeSeekingProfile({ budget_min: 1000, budget_max: 1500 })
    const p2 = makeSeekingProfile({ budget_min: 1500, budget_max: 2000 })
    // overlapMin === overlapMax (1500) so it passes the `overlapMin > overlapMax` check,
    // but overlapRange is 0 and both ranges are non-zero (500), so overlapPercent is 0.
    expect(calculateBudgetOverlap(p1, p2)).toEqual({ min: 1500, max: 1500, overlapPercent: 0 })
  })
})

describe('calculateGroupBudgetOverlap', () => {
  it('returns null for fewer than 2 candidates', () => {
    expect(calculateGroupBudgetOverlap([])).toBeNull()
    expect(calculateGroupBudgetOverlap([makeCandidate()])).toBeNull()
  })

  it('narrows the overlap across 3+ candidates', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000 } }),
      makeCandidate({ seekingProfile: { budget_min: 1500, budget_max: 2500 } }),
      makeCandidate({ seekingProfile: { budget_min: 1800, budget_max: 2200 } }),
    ]
    expect(calculateGroupBudgetOverlap(candidates)).toEqual({ min: 1800, max: 2000, overlapPercent: 50 })
  })

  it('short-circuits to null as soon as any pair fails to overlap', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 1500 } }),
      makeCandidate({ seekingProfile: { budget_min: 1600, budget_max: 2000 } }),
      makeCandidate({ seekingProfile: { budget_min: 1700, budget_max: 2100 } }),
    ]
    expect(calculateGroupBudgetOverlap(candidates)).toBeNull()
  })
})

describe('findCommonCities', () => {
  it('returns [] for an empty candidate list', () => {
    expect(findCommonCities([])).toEqual([])
  })

  it('returns the single candidate cities unchanged', () => {
    const candidates = [makeCandidate({ seekingProfile: { preferred_cities: ['Toronto', 'Ottawa'] } })]
    expect(findCommonCities(candidates)).toEqual(['Toronto', 'Ottawa'])
  })

  it('intersects cities across all candidates, preserving first-candidate order', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { preferred_cities: ['Toronto', 'Ottawa', 'Montreal'] } }),
      makeCandidate({ seekingProfile: { preferred_cities: ['Montreal', 'Toronto'] } }),
      makeCandidate({ seekingProfile: { preferred_cities: ['Toronto'] } }),
    ]
    expect(findCommonCities(candidates)).toEqual(['Toronto'])
  })

  it('returns [] when there is no common city', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { preferred_cities: ['Toronto'] } }),
      makeCandidate({ seekingProfile: { preferred_cities: ['Ottawa'] } }),
    ]
    expect(findCommonCities(candidates)).toEqual([])
  })
})

describe('calculateDateRange', () => {
  it('returns null for an empty candidate list', () => {
    expect(calculateDateRange([])).toBeNull()
  })

  it('is compatible with a single candidate (0 day spread)', () => {
    const candidates = [makeCandidate({ seekingProfile: { move_in_date: '2026-08-01' } })]
    expect(calculateDateRange(candidates)).toEqual({
      earliest: '2026-08-01',
      latest: '2026-08-01',
      isCompatible: true,
    })
  })

  it('is compatible at exactly the max day difference (45 days, inclusive)', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { move_in_date: '2026-08-01' } }),
      makeCandidate({ seekingProfile: { move_in_date: '2026-09-15' } }),
    ]
    expect(calculateDateRange(candidates)).toEqual({
      earliest: '2026-08-01',
      latest: '2026-09-15',
      isCompatible: true,
    })
  })

  it('is incompatible one day past the max difference (46 days)', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { move_in_date: '2026-08-01' } }),
      makeCandidate({ seekingProfile: { move_in_date: '2026-09-16' } }),
    ]
    expect(calculateDateRange(candidates)).toEqual({
      earliest: '2026-08-01',
      latest: '2026-09-16',
      isCompatible: false,
    })
  })

  it('respects a custom maxDifferencesDays', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { move_in_date: '2026-08-01' } }),
      makeCandidate({ seekingProfile: { move_in_date: '2026-08-15' } }),
    ]
    expect(calculateDateRange(candidates, 14)!.isCompatible).toBe(true)
    expect(calculateDateRange(candidates, 13)!.isCompatible).toBe(false)
  })
})

describe('calculatePracticalScore', () => {
  it('fails when budget overlap is below the minimum threshold', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { budget_min: 0, budget_max: 1000, preferred_cities: ['Toronto'] } }),
      makeCandidate({ seekingProfile: { budget_min: 900, budget_max: 2000, preferred_cities: ['Toronto'] } }),
    ]
    // overlap = [900,1000] -> range 100; smaller of (1000, 1100) = 1000 -> 10% overlap, below default 20% minimum
    const result = calculatePracticalScore(candidates)
    expect(result).toEqual({
      passes: false,
      score: 0,
      budgetOverlap: null,
      commonCities: [],
      dateRange: null,
    })
  })

  it('fails when there is no common city (even with full budget overlap)', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'] } }),
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Ottawa'] } }),
    ]
    const result = calculatePracticalScore(candidates)
    expect(result).toEqual({
      passes: false,
      score: 0,
      budgetOverlap: { min: 1000, max: 2000 },
      commonCities: [],
      dateRange: null,
    })
  })

  it('fails when dates are incompatible (budget + city otherwise pass)', () => {
    const candidates = [
      makeCandidate({
        seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'], move_in_date: '2026-08-01' },
      }),
      makeCandidate({
        seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'], move_in_date: '2026-09-16' },
      }),
    ]
    const result = calculatePracticalScore(candidates)
    expect(result).toEqual({
      passes: false,
      score: 0,
      budgetOverlap: { min: 1000, max: 2000 },
      commonCities: ['Toronto'],
      dateRange: { earliest: '2026-08-01', latest: '2026-09-16' },
    })
  })

  it('computes a weighted score (40% budget / 30% cities / 30% date) on a full pass', () => {
    const candidates = [
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['Toronto', 'Ottawa'],
          move_in_date: '2026-08-01',
        },
      }),
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['Toronto', 'Ottawa'],
          move_in_date: '2026-08-01',
        },
      }),
    ]
    // budgetScore=100, cityScore=min(100,(2/3)*100)=66.67, dateScore=100
    // score = round(100*0.4 + 66.67*0.3 + 100*0.3) = round(90.0) = 90
    const result = calculatePracticalScore(candidates)
    expect(result).toEqual({
      passes: true,
      score: 90,
      budgetOverlap: { min: 1000, max: 2000 },
      commonCities: ['Toronto', 'Ottawa'],
      dateRange: { earliest: '2026-08-01', latest: '2026-08-01' },
    })
  })

  it('computes a lower score with 1 common city and a 14-day spread', () => {
    const candidates = [
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['Toronto'],
          move_in_date: '2026-08-01',
        },
      }),
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['Toronto'],
          move_in_date: '2026-08-15',
        },
      }),
    ]
    // budgetScore=100, cityScore=min(100,(1/3)*100)=33.33, dateScore=100-(14/45)*100=68.89
    // score = round(40 + 10 + 20.67) = round(70.67) = 71
    const result = calculatePracticalScore(candidates)
    expect(result.passes).toBe(true)
    expect(result.score).toBe(71)
  })

  it('caps cityScore at 100 for 3+ common cities', () => {
    const candidates = [
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['A', 'B', 'C', 'D'],
          move_in_date: '2026-08-01',
        },
      }),
      makeCandidate({
        seekingProfile: {
          budget_min: 1000,
          budget_max: 2000,
          preferred_cities: ['A', 'B', 'C', 'D'],
          move_in_date: '2026-08-01',
        },
      }),
    ]
    const result = calculatePracticalScore(candidates)
    expect(result.commonCities).toEqual(['A', 'B', 'C', 'D'])
    // budgetScore=100, cityScore=min(100,(4/3)*100)=100, dateScore=100 -> score=100
    expect(result.score).toBe(100)
  })

  it('uses DEFAULT_MATCHING_CONFIG when no config is passed', () => {
    const candidates = [
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'] } }),
      makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'] } }),
    ]
    const withDefault = calculatePracticalScore(candidates)
    const withExplicitDefault = calculatePracticalScore(candidates, DEFAULT_MATCHING_CONFIG)
    expect(withDefault).toEqual(withExplicitDefault)
  })
})

describe('candidatesMatch', () => {
  it('returns true when the pair passes calculatePracticalScore', () => {
    const c1 = makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'] } })
    const c2 = makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 2000, preferred_cities: ['Toronto'] } })
    expect(candidatesMatch(c1, c2)).toBe(true)
  })

  it('returns false when the pair fails calculatePracticalScore', () => {
    const c1 = makeCandidate({ seekingProfile: { budget_min: 1000, budget_max: 1500, preferred_cities: ['Toronto'] } })
    const c2 = makeCandidate({ seekingProfile: { budget_min: 2000, budget_max: 2500, preferred_cities: ['Toronto'] } })
    expect(candidatesMatch(c1, c2)).toBe(false)
  })
})
