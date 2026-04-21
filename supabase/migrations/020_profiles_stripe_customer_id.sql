-- Cache Stripe customer ID on profiles so we don't hit customers.search on every checkout.
-- customers.search is one of Stripe's slowest endpoints and has caused StripeConnectionError
-- timeouts on production (/api/verify/checkout 500s).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
