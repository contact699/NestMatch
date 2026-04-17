import { posthog } from '@/components/posthog-provider'

// Key funnel events
export const analytics = {
  // Auth
  signup: (method: string) => posthog?.capture('user_signed_up', { method }),
  login: (method: string) => posthog?.capture('user_logged_in', { method }),

  // Onboarding
  quizStarted: () => posthog?.capture('quiz_started'),
  quizCompleted: () => posthog?.capture('quiz_completed'),
  profileCompleted: () => posthog?.capture('profile_completed'),

  // Listings
  listingViewed: (listingId: string) => posthog?.capture('listing_viewed', { listing_id: listingId }),
  listingCreated: (listingId: string) => posthog?.capture('listing_created', { listing_id: listingId }),
  listingSaved: (listingId: string) => posthog?.capture('listing_saved', { listing_id: listingId }),

  // Messaging
  conversationStarted: (listingId?: string) => posthog?.capture('conversation_started', { listing_id: listingId }),
  messageSent: () => posthog?.capture('message_sent'),

  // Verification
  verificationStarted: (type: string) => posthog?.capture('verification_started', { type }),
  verificationCompleted: (type: string) => posthog?.capture('verification_completed', { type }),
  checkoutStarted: (type: string, price: number) => posthog?.capture('checkout_started', { type, price }),

  // Identity
  identify: (userId: string, properties?: Record<string, unknown>) => {
    posthog?.identify(userId, properties)
  },
  reset: () => posthog?.reset(),
}
