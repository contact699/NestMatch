export interface AddressParts {
  address: string | null
  city: string | null
  postal_code: string | null
}

/** Canonical key for duplicate-address detection: lowercase, strip punctuation, collapse spaces. */
export function normalizeAddressKey(parts: AddressParts): string {
  const norm = (s: string | null) =>
    (s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const postal = (parts.postal_code ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  return [norm(parts.address), norm(parts.city), postal].join('|')
}
