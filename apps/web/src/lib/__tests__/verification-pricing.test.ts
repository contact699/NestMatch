import { describe, it, expect } from 'vitest'
import {
  isCheckType,
  isPackageType,
  getProduct,
  getCheckTypes,
  formatPrice,
  VERIFICATION_CHECKS,
  VERIFICATION_PACKAGES,
} from '../verification-pricing'

describe('isCheckType', () => {
  it('is true for id/criminal/credit', () => {
    expect(isCheckType('id')).toBe(true)
    expect(isCheckType('criminal')).toBe(true)
    expect(isCheckType('credit')).toBe(true)
  })

  it('is false for package types or unknown strings', () => {
    expect(isCheckType('standard')).toBe(false)
    expect(isCheckType('complete')).toBe(false)
    expect(isCheckType('bogus')).toBe(false)
  })
})

describe('isPackageType', () => {
  it('is true for standard/complete', () => {
    expect(isPackageType('standard')).toBe(true)
    expect(isPackageType('complete')).toBe(true)
  })

  it('is false for check types or unknown strings', () => {
    expect(isPackageType('id')).toBe(false)
    expect(isPackageType('bogus')).toBe(false)
  })
})

describe('getProduct', () => {
  it('returns the check product for a check type', () => {
    expect(getProduct('id')).toEqual(VERIFICATION_CHECKS.id)
    expect(getProduct('credit')).toEqual(VERIFICATION_CHECKS.credit)
  })

  it('returns the package product for a package type', () => {
    expect(getProduct('standard')).toEqual(VERIFICATION_PACKAGES.standard)
    expect(getProduct('complete')).toEqual(VERIFICATION_PACKAGES.complete)
  })

  it('returns null for an unrecognized product type', () => {
    expect(getProduct('bogus' as never)).toBeNull()
  })
})

describe('getCheckTypes', () => {
  it('returns a single-element array for a bare check type', () => {
    expect(getCheckTypes('id')).toEqual(['id'])
    expect(getCheckTypes('criminal')).toEqual(['criminal'])
    expect(getCheckTypes('credit')).toEqual(['credit'])
  })

  // NOTE: the "standard" package's `includes` is ['id', 'criminal'], but
  // getCheckTypes() strips the standalone 'id' whenever 'criminal' is present
  // (per the source comment: the CERTN criminal case already bundles identity
  // verification as a waterfall dependency). So the CERTN case list is just
  // ['criminal'], not ['id', 'criminal'].
  it('drops the redundant standalone "id" check for the standard package', () => {
    expect(VERIFICATION_PACKAGES.standard.includes).toEqual(['id', 'criminal'])
    expect(getCheckTypes('standard')).toEqual(['criminal'])
  })

  it('drops the redundant standalone "id" check for the complete package', () => {
    expect(VERIFICATION_PACKAGES.complete.includes).toEqual(['id', 'criminal', 'credit'])
    expect(getCheckTypes('complete')).toEqual(['criminal', 'credit'])
  })

  it('returns [] for an unrecognized product type', () => {
    expect(getCheckTypes('bogus' as never)).toEqual([])
  })
})

describe('formatPrice', () => {
  it('formats whole-dollar cent amounts', () => {
    expect(formatPrice(1500)).toBe('$15')
    expect(formatPrice(3500)).toBe('$35')
    expect(formatPrice(5500)).toBe('$55')
    expect(formatPrice(0)).toBe('$0')
  })

  // NOTE: formatPrice rounds to the nearest whole dollar (toFixed(0)), so
  // non-round-dollar cent amounts silently lose precision rather than
  // showing cents.
  it('rounds non-whole-dollar amounts to the nearest dollar', () => {
    expect(formatPrice(999)).toBe('$10')
    expect(formatPrice(950)).toBe('$10') // .5 rounds up
    expect(formatPrice(940)).toBe('$9')
  })
})
