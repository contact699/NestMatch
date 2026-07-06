import { describe, it, expect } from 'vitest'
import { normalizeAddressKey } from '../normalize-address'

const k = (addr: string, city: string, postal: string) =>
  normalizeAddressKey({ address: addr, city, postal_code: postal })

describe('normalizeAddressKey', () => {
  it('is case + punctuation insensitive', () => {
    expect(k('123 Main St.', 'Toronto', 'M5V 2T6')).toBe(k('123 MAIN ST', 'toronto', 'm5v2t6'))
  })

  it('collapses whitespace', () => {
    expect(k('  456   Oak   Ave  ', 'Laval', 'H7N 1A1')).toBe(k('456 Oak Ave', 'Laval', 'h7n1a1'))
  })

  it('different street → different key', () => {
    expect(k('1 A St', 'X', 'A1A1A1')).not.toBe(k('2 B St', 'X', 'A1A1A1'))
  })

  it('empty address yields stable key without throwing', () => {
    expect(k('', 'Montreal', '')).toBe(k('', 'montreal', ''))
  })
})
