import { describe, it, expect } from 'vitest'
import { sanitizeSearchQuery } from '../search-sanitize'

describe('sanitizeSearchQuery', () => {
  it('leaves an ordinary search term unchanged', () => {
    expect(sanitizeSearchQuery('downtown loft')).toBe('downtown loft')
  })

  it('strips PostgREST filter-injection characters', () => {
    // A raw comma would open a new .or() clause; parens group them.
    expect(sanitizeSearchQuery('a,b')).toBe('a b')
    expect(sanitizeSearchQuery('(evil)')).toBe('evil')
    expect(sanitizeSearchQuery('x*')).toBe('x')
  })

  it('neutralizes an injection payload trying to read inactive listings', () => {
    const payload = 'x,is_active.eq.false'
    const safe = sanitizeSearchQuery(payload)
    expect(safe).not.toContain(',')
    expect(safe).not.toContain('(')
    expect(safe).not.toContain(')')
  })

  it('collapses whitespace left behind by stripped characters', () => {
    expect(sanitizeSearchQuery('a , , b')).toBe('a b')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello')
  })

  it('returns an empty string when nothing usable remains (caller skips filter)', () => {
    expect(sanitizeSearchQuery(',,,')).toBe('')
    expect(sanitizeSearchQuery('()')).toBe('')
    expect(sanitizeSearchQuery('   ')).toBe('')
  })

  it('preserves the % wildcard (intentional ilike behavior, not an injection)', () => {
    expect(sanitizeSearchQuery('50%')).toBe('50%')
  })
})
