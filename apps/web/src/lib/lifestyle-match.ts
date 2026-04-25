/**
 * Compare two users' lifestyle_responses rows and surface human-readable
 * descriptions of the factors they actually match on. Used by the listing
 * detail page to replace the hardcoded "compatible lifestyles" copy with
 * specifics ("Same sleep schedule", "Both non-smokers", etc.).
 *
 * Compares only the fields that are most useful as match signals — the full
 * lifestyle_responses table has 17 columns; many (alcohol, conflict_resolution,
 * etc.) aren't great differentiators on a listing card.
 */

type Lifestyle = {
  sleep_schedule: 'early_bird' | 'night_owl' | 'flexible' | null
  noise_tolerance: 'quiet' | 'moderate' | 'loud_ok' | null
  cleanliness_level: 'spotless' | 'tidy' | 'relaxed' | 'messy' | null
  smoking: 'never' | 'outside_only' | 'yes' | null
  pets_preference: 'no_pets' | 'cats_ok' | 'dogs_ok' | 'all_pets_ok' | 'have_pets' | null
  communication_style: 'minimal' | 'occasional' | 'frequent' | 'very_social' | null
  temperature_preference: 'cold' | 'moderate' | 'warm' | null
  guest_frequency: 'never' | 'rarely' | 'sometimes' | 'often' | null
  cooking_habits: 'never' | 'rarely' | 'sometimes' | 'daily' | null
}

const SLEEP_LABELS: Record<NonNullable<Lifestyle['sleep_schedule']>, string> = {
  early_bird: 'early birds',
  night_owl: 'night owls',
  flexible: 'flexible sleepers',
}
const NOISE_LABELS: Record<NonNullable<Lifestyle['noise_tolerance']>, string> = {
  quiet: 'a quiet home',
  moderate: 'a moderate noise level',
  loud_ok: 'a lively home',
}
const CLEAN_LABELS: Record<NonNullable<Lifestyle['cleanliness_level']>, string> = {
  spotless: 'a spotless home',
  tidy: 'a tidy home',
  relaxed: 'a relaxed standard of cleanliness',
  messy: 'a flexible standard of cleanliness',
}
const SMOKING_LABELS: Record<NonNullable<Lifestyle['smoking']>, string> = {
  never: 'non-smokers',
  outside_only: 'outdoor smokers only',
  yes: 'smokers',
}
const COMMS_LABELS: Record<NonNullable<Lifestyle['communication_style']>, string> = {
  minimal: 'minimal interaction',
  occasional: 'occasional interaction',
  frequent: 'frequent interaction',
  very_social: 'a very social home',
}
const TEMP_LABELS: Record<NonNullable<Lifestyle['temperature_preference']>, string> = {
  cold: 'cool indoor temperatures',
  moderate: 'moderate indoor temperatures',
  warm: 'warm indoor temperatures',
}

/**
 * Two pet preferences match if they're identical OR if both are pet-friendly
 * (i.e. neither is `no_pets`). Stricter than the others because mismatched
 * pet preferences are a real dealbreaker.
 */
function petsCompatible(
  a: Lifestyle['pets_preference'] | undefined,
  b: Lifestyle['pets_preference'] | undefined
): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return a !== 'no_pets' && b !== 'no_pets'
}

export interface MatchedFactor {
  /** Stable key for React, e.g. "sleep" */
  key: string
  /** Sentence-fragment description, e.g. "Both early birds" */
  label: string
}

export function computeMatchedLifestyleFactors(
  me: Partial<Lifestyle> | null | undefined,
  them: Partial<Lifestyle> | null | undefined
): MatchedFactor[] {
  if (!me || !them) return []

  const out: MatchedFactor[] = []

  if (me.sleep_schedule && me.sleep_schedule === them.sleep_schedule) {
    out.push({ key: 'sleep', label: `Both ${SLEEP_LABELS[me.sleep_schedule]}` })
  }

  if (me.noise_tolerance && me.noise_tolerance === them.noise_tolerance) {
    out.push({ key: 'noise', label: `Both prefer ${NOISE_LABELS[me.noise_tolerance]}` })
  }

  if (me.cleanliness_level && me.cleanliness_level === them.cleanliness_level) {
    out.push({ key: 'clean', label: `Both prefer ${CLEAN_LABELS[me.cleanliness_level]}` })
  }

  if (me.smoking && me.smoking === them.smoking) {
    out.push({ key: 'smoking', label: `Both ${SMOKING_LABELS[me.smoking]}` })
  }

  if (petsCompatible(me.pets_preference, them.pets_preference)) {
    out.push({ key: 'pets', label: 'Compatible on pets' })
  }

  if (me.communication_style && me.communication_style === them.communication_style) {
    out.push({ key: 'comms', label: `Both prefer ${COMMS_LABELS[me.communication_style]}` })
  }

  if (me.temperature_preference && me.temperature_preference === them.temperature_preference) {
    out.push({ key: 'temp', label: `Both like ${TEMP_LABELS[me.temperature_preference]}` })
  }

  if (me.guest_frequency && me.guest_frequency === them.guest_frequency) {
    out.push({ key: 'guests', label: 'Same guest frequency' })
  }

  if (me.cooking_habits && me.cooking_habits === them.cooking_habits) {
    out.push({ key: 'cooking', label: 'Same cooking habits' })
  }

  return out
}
