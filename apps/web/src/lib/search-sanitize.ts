/**
 * Sanitize a free-text search term before it is interpolated into a PostgREST
 * `.or()` filter string. Commas, parentheses (and the `*` wildcard) are
 * PostgREST-reserved: a raw comma opens a new filter clause and parentheses
 * group them, so an attacker could inject extra conditions (e.g. reading
 * inactive listings). We strip those characters and collapse whitespace.
 * Returns '' when nothing usable remains, so the caller can skip the filter.
 */
export function sanitizeSearchQuery(raw: string): string {
  return raw
    .replace(/[,()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
