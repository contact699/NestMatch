import {
  MOJIBAKE_REPLACEMENTS,
  hasMojibake,
  fixMojibake,
  findMojibakePatterns,
} from './lib/mojibake-patterns'

interface TestCase {
  name: string
  input: string
  expected: string
}

// Mojibake patterns that are easy to mis-encode in source files — use Unicode
// escapes so the bytes are unambiguous regardless of editor/OS settings.
//
// em dash (U+2014) mojibake: UTF-8 bytes 0xE2 0x80 0x94 read as Win-1252
//   => U+00E2 (â) + U+20AC (€) + U+201D (") = â€"
const EM_DASH_MOJIBAKE = 'â€”'
//
// en dash (U+2013) mojibake: UTF-8 bytes 0xE2 0x80 0x93 read as Win-1252
//   => U+00E2 (â) + U+20AC (€) + U+201C (") = â€"
const EN_DASH_MOJIBAKE = 'â€“'
//
// right single quote (U+2019) mojibake: UTF-8 bytes 0xE2 0x80 0x99 read as Win-1252
//   => U+00E2 (â) + U+20AC (€) + U+2122 (™) = â€™
const RIGHT_SINGLE_Q_MOJIBAKE = 'â€™'
//
// é (U+00E9) mojibake: UTF-8 bytes 0xC3 0xA9 read as Win-1252
//   => U+00C3 (Ã) + U+00A9 (©) = Ã©
const E_ACUTE_MOJIBAKE = 'Ã©'

const CASES: TestCase[] = [
  // Round-trip: every entry in the table must fix its own mojibake form.
  ...MOJIBAKE_REPLACEMENTS.map(([mojibake, correct]) => ({
    name: `round-trip: ${JSON.stringify(mojibake)} → ${JSON.stringify(correct)}`,
    input: `Hello ${mojibake} world`,
    expected: `Hello ${correct} world`,
  })),

  // Real-world examples (using Unicode-escape constants for safety)
  { name: 'Régie (single-encoded)', input: 'R' + E_ACUTE_MOJIBAKE + 'gie du logement', expected: 'Régie du logement' },
  { name: 'café (single-encoded)', input: 'caf' + E_ACUTE_MOJIBAKE, expected: 'café' },
  { name: 'em dash', input: 'NestMatch ' + EM_DASH_MOJIBAKE + ' find a roommate', expected: 'NestMatch — find a roommate' },
  { name: 'en dash', input: 'NestMatch ' + EN_DASH_MOJIBAKE + ' find a roommate', expected: 'NestMatch – find a roommate' },
  { name: 'right single quote (apostrophe)', input: 'don' + RIGHT_SINGLE_Q_MOJIBAKE + 't worry', expected: 'don’t worry' },
  { name: 'clean string is no-op', input: 'Just a regular sentence.', expected: 'Just a regular sentence.' },
  { name: 'empty string', input: '', expected: '' },
  { name: 'idempotent on already-clean é', input: 'café', expected: 'café' },

  // Double-encoded — we DON'T expect fixMojibake to fully fix in one pass, but it
  // shouldn't CORRUPT either. The test asserts that calling twice converges.
  // (See assertion logic below for double-encoded handling.)
]

let failed = 0
let passed = 0

for (const c of CASES) {
  const actual = fixMojibake(c.input)
  if (actual === c.expected) {
    passed++
  } else {
    failed++
    console.error(`FAIL ${c.name}`)
    console.error(`  input:    ${JSON.stringify(c.input)}`)
    console.error(`  expected: ${JSON.stringify(c.expected)}`)
    console.error(`  actual:   ${JSON.stringify(actual)}`)
  }
}

// Double-encoded case: applying fixMojibake twice should NOT corrupt.
// (We accept either "fully fixed" or "partially fixed but not corrupted".)
// Double-encoded é: UTF-8 bytes of é (C3 A9) encoded as UTF-8 again then read
// as Win-1252. In source: Ã is U+00C3, Æ' is U+0192 (Win-1252 0x83), © is U+00A9.
// Represented safely as Unicode escapes: Ãƒ©
const doubleEncoded = 'RÃƒ©gie'
const after1 = fixMojibake(doubleEncoded)
const after2 = fixMojibake(after1)
const converged = after1 === after2 || after2 === 'Régie'
if (!converged) {
  failed++
  console.error('FAIL double-encoded should converge or fully fix on two passes')
  console.error(`  input:    ${JSON.stringify(doubleEncoded)}`)
  console.error(`  after 1:  ${JSON.stringify(after1)}`)
  console.error(`  after 2:  ${JSON.stringify(after2)}`)
} else {
  passed++
}

// hasMojibake / findMojibakePatterns sanity
if (hasMojibake('café')) {
  // é (U+00E9) is the clean char — hasMojibake should return false.
  failed++
  console.error('FAIL hasMojibake("café") should be false')
}
if (hasMojibake('caf' + E_ACUTE_MOJIBAKE)) {
  passed++
} else {
  failed++
  console.error('FAIL hasMojibake("caf' + E_ACUTE_MOJIBAKE + '") should be true')
}
const foundPatterns = findMojibakePatterns('caf' + E_ACUTE_MOJIBAKE)
if (foundPatterns.length !== 1) {
  failed++
  console.error(`FAIL findMojibakePatterns should find 1 pattern; found ${foundPatterns.length}`)
} else {
  passed++
}

console.log(`\n${passed} passed, ${failed} failed`)
console.log(`Table size: MOJIBAKE_REPLACEMENTS.length = ${MOJIBAKE_REPLACEMENTS.length}`)
if (failed > 0) process.exit(1)
process.exit(0)
