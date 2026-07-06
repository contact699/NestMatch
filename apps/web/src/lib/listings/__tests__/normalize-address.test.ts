// Run with `npm run test:listing-verification` (uses tsx).
import { strict as assert } from 'node:assert'
import { normalizeAddressKey } from '../normalize-address'

let passed = 0, failed = 0
function eq(name: string, a: string, b: string) {
  try { assert.equal(a, b); passed++ } catch (e) { failed++; console.error(`FAIL: ${name} — ${(e as Error).message}`) }
}

const k = (addr: string, city: string, postal: string) =>
  normalizeAddressKey({ address: addr, city, postal_code: postal })

eq('case + punctuation insensitive',
  k('123 Main St.', 'Toronto', 'M5V 2T6'),
  k('123 MAIN ST', 'toronto', 'm5v2t6'))
eq('whitespace collapsed',
  k('  456   Oak   Ave  ', 'Laval', 'H7N 1A1'),
  k('456 Oak Ave', 'Laval', 'h7n1a1'))
eq('different street → different key',
  k('1 A St', 'X', 'A1A1A1') === k('2 B St', 'X', 'A1A1A1') ? 'same' : 'diff',
  'diff')
eq('empty address yields stable key without throwing',
  k('', 'Montreal', '') === k('', 'montreal', '') ? 'same' : 'diff',
  'same')

console.log(`normalize-address: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
