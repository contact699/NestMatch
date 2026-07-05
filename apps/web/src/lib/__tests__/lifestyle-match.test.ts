import { describe, it, expect } from 'vitest'
import { computeMatchedLifestyleFactors } from '../lifestyle-match'

describe('computeMatchedLifestyleFactors', () => {
  it('returns [] when either side is null or undefined', () => {
    expect(computeMatchedLifestyleFactors(null, {})).toEqual([])
    expect(computeMatchedLifestyleFactors({}, null)).toEqual([])
    expect(computeMatchedLifestyleFactors(undefined, undefined)).toEqual([])
  })

  it('returns [] when both sides are empty objects', () => {
    expect(computeMatchedLifestyleFactors({}, {})).toEqual([])
  })

  it('matches every simple equality factor and produces the expected labels, in field order', () => {
    const me = {
      sleep_schedule: 'early_bird' as const,
      noise_tolerance: 'quiet' as const,
      cleanliness_level: 'spotless' as const,
      smoking: 'never' as const,
      communication_style: 'minimal' as const,
      temperature_preference: 'cold' as const,
      guest_frequency: 'rarely' as const,
      cooking_habits: 'daily' as const,
    }
    const them = { ...me }

    expect(computeMatchedLifestyleFactors(me, them)).toEqual([
      { key: 'sleep', label: 'Both early birds' },
      { key: 'noise', label: 'Both prefer a quiet home' },
      { key: 'clean', label: 'Both prefer a spotless home' },
      { key: 'smoking', label: 'Both non-smokers' },
      { key: 'comms', label: 'Both prefer minimal interaction' },
      { key: 'temp', label: 'Both like cool indoor temperatures' },
      { key: 'guests', label: 'Same guest frequency' },
      { key: 'cooking', label: 'Same cooking habits' },
    ])
  })

  it('skips a factor when the field is null on either side', () => {
    const result = computeMatchedLifestyleFactors(
      { sleep_schedule: null, noise_tolerance: 'quiet' },
      { sleep_schedule: 'night_owl', noise_tolerance: 'quiet' }
    )
    expect(result).toEqual([{ key: 'noise', label: 'Both prefer a quiet home' }])
  })

  it('skips a factor when values differ', () => {
    const result = computeMatchedLifestyleFactors(
      { sleep_schedule: 'early_bird' },
      { sleep_schedule: 'night_owl' }
    )
    expect(result).toEqual([])
  })

  describe('pets_preference (special compatibility rule)', () => {
    it('matches identical preferences, including both "no_pets"', () => {
      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'no_pets' }, { pets_preference: 'no_pets' })
      ).toEqual([{ key: 'pets', label: 'Compatible on pets' }])

      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'cats_ok' }, { pets_preference: 'cats_ok' })
      ).toEqual([{ key: 'pets', label: 'Compatible on pets' }])
    })

    it('matches differing pet-friendly preferences as long as neither is "no_pets"', () => {
      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'cats_ok' }, { pets_preference: 'dogs_ok' })
      ).toEqual([{ key: 'pets', label: 'Compatible on pets' }])

      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'have_pets' }, { pets_preference: 'all_pets_ok' })
      ).toEqual([{ key: 'pets', label: 'Compatible on pets' }])
    })

    it('does not match when one side is "no_pets" and the other is pet-friendly', () => {
      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'no_pets' }, { pets_preference: 'cats_ok' })
      ).toEqual([])
    })

    it('does not match when either side is missing/null', () => {
      expect(
        computeMatchedLifestyleFactors({ pets_preference: undefined }, { pets_preference: 'cats_ok' })
      ).toEqual([])
      expect(
        computeMatchedLifestyleFactors({ pets_preference: 'cats_ok' }, { pets_preference: null })
      ).toEqual([])
    })
  })

  it('returns only the subset of factors that actually match', () => {
    const me = {
      sleep_schedule: 'early_bird' as const,
      smoking: 'never' as const,
      pets_preference: 'cats_ok' as const,
    }
    const them = {
      sleep_schedule: 'early_bird' as const,
      smoking: 'yes' as const,
      pets_preference: 'no_pets' as const,
    }
    expect(computeMatchedLifestyleFactors(me, them)).toEqual([{ key: 'sleep', label: 'Both early birds' }])
  })
})
