-- =============================================================================
-- Add stripe_customer_id to profiles
-- =============================================================================
--
-- Until now, getOrCreateCustomer (apps/web/src/lib/services/stripe.ts) called
-- stripe.customers.search() on every checkout to find the user's Stripe
-- customer record by metadata['nestmatch_user_id']. Stripe's Search API runs
-- on separate, eventually-consistent infrastructure and was throwing
-- StripeConnectionError from the Vercel iad1 region (production), blocking
-- every verification checkout and payment intent.
--
-- Persisting stripe_customer_id on the profile lets us call
-- stripe.customers.retrieve(id) directly — a single, reliable GET against
-- Stripe's main API — and remove the search call from the hot path.
--
-- Nullable so existing rows remain valid; populated lazily on first checkout.
-- Unique so a Stripe customer maps to at most one profile.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
