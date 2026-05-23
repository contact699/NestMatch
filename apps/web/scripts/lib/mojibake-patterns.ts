/**
 * Common mojibake sequences caused by interpreting UTF-8 bytes as Latin-1
 * and re-encoding them as UTF-8 (the classic "double encoded" bug).
 *
 * Sources: Wikipedia "Mojibake" article + manual observation of NestMatch
 * Quebec/French-Canadian content where mojibake is most visible.
 *
 * Order matters: longer sequences first so we don't partial-match.
 */
export const MOJIBAKE_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  // 3-byte mojibake (longer matches first)
  ['â€™', '’'], // right single quote
  ['â€˜', '‘'], // left single quote
  ['â€œ', '“'], // left double quote
  ['â€', '”'],  // right double quote (3-byte; precedes the 2-byte â€)
  ['â€"', '—'], // em dash
  ['â€"', '–'], // en dash
  ['â€¦', '…'], // ellipsis
  ['â€¢', '•'], // bullet

  // 2-byte accented Latin (alphabetic order of correct character)
  ['Ã€', 'À'],
  ['Ã‚', 'Â'],
  ['Ã„', 'Ä'],
  ['Ã‡', 'Ç'],
  ['ÃˆÂ ', 'È'],
  ['Ã‰', 'É'],
  ['ÃŠ', 'Ê'],
  ['Ã‹', 'Ë'],
  ['ÃŽ', 'Î'],
  ['Ã', 'Í'],
  ['Ã"', 'Ô'],
  ['Ã–', 'Ö'],
  ['Ã™', 'Ù'],
  ['Ãœ', 'Ü'],
  ['Ã', 'ß'],
  ['Ã ', 'à'],
  ['Ã¡', 'á'],
  ['Ã¢', 'â'],
  ['Ã¤', 'ä'],
  ['Ã§', 'ç'],
  ['Ã¨', 'è'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã´', 'ô'],
  ['Ã¶', 'ö'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
]

/**
 * Returns true if the string contains any known mojibake sequence.
 */
export function hasMojibake(s: string | null | undefined): boolean {
  if (!s) return false
  return MOJIBAKE_REPLACEMENTS.some(([pat]) => s.includes(pat))
}

/**
 * Returns the string with all known mojibake sequences replaced. Idempotent —
 * running it twice on a clean string is a no-op.
 */
export function fixMojibake(s: string | null | undefined): string {
  if (!s) return s ?? ''
  let out = s
  for (const [pat, replacement] of MOJIBAKE_REPLACEMENTS) {
    if (out.includes(pat)) {
      out = out.split(pat).join(replacement)
    }
  }
  return out
}

/**
 * Surface-level inspection: returns the list of mojibake patterns found in the
 * string (deduped, in the order they appear in MOJIBAKE_REPLACEMENTS).
 */
export function findMojibakePatterns(s: string | null | undefined): string[] {
  if (!s) return []
  return MOJIBAKE_REPLACEMENTS.filter(([pat]) => s.includes(pat)).map(([pat]) => pat)
}
