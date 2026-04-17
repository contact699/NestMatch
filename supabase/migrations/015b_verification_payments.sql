-- Add payment tracking to verifications
ALTER TABLE verifications
  ADD COLUMN IF NOT EXISTS stripe_payment_id text,
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id);

-- Add badge visibility toggle to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_verification_badges boolean NOT NULL DEFAULT true;

-- Index for looking up verifications by payment
CREATE INDEX IF NOT EXISTS idx_verifications_stripe_payment_id ON verifications(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
