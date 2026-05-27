// Hook + pure helpers for the home hero. Queries are built up in Task 6.

import type { HomeSignals, HeroVariant } from './types'

/**
 * Picks which hero content variant to render. Pure — easy to table-test.
 *
 * Priority: in-flight signals (anything to act on) > onboarding (push profile to
 * completion) > discovery (evergreen "what's new in your city").
 *
 * `cityNewListings` does NOT participate in the signal count — it's not a
 * user-attention signal, it's information used to populate the discovery copy.
 */
export function selectVariant(signals: HomeSignals, profileCompletion: number): HeroVariant {
  const attentionSignals =
    signals.newMatches +
    signals.pendingInvites +
    signals.unreadMessages +
    signals.updatedSavedListings
  if (attentionSignals > 0) return 'signals'
  if (profileCompletion < 100) return 'onboarding'
  return 'discovery'
}
