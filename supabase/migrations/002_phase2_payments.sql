-- Phase 2: Payments, Reviews, and Enhanced Features
-- Migration: 002_phase2_payments.sql

-- ============================================
-- PAYMENTS TABLES
-- ============================================

-- Payment methods stored for users
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account'
  last_four VARCHAR(4),
  brand VARCHAR(50), -- 'visa', 'mastercard', etc.
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect accounts for providers receiving payments
CREATE TABLE payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  stripe_connect_account_id VARCHAR(255) NOT NULL UNIQUE,
  account_type VARCHAR(50) DEFAULT 'express', -- 'express', 'standard', 'custom'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'restricted', 'disabled'
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  onboarding_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'CAD',
  type VARCHAR(50) NOT NULL, -- 'rent', 'deposit', 'utility', 'service', 'featured_listing'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
  description TEXT,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILL SPLITTING TABLES
-- ============================================

-- Shared expenses for roommates
CREATE TABLE shared_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  split_type VARCHAR(50) DEFAULT 'equal', -- 'equal', 'percentage', 'custom'
  category VARCHAR(50), -- 'rent', 'utilities', 'groceries', 'internet', 'other'
  receipt_url TEXT,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual shares of an expense
CREATE TABLE expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES shared_expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2), -- For percentage splits
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- ============================================
-- REVIEWS & RATINGS TABLES
-- ============================================

-- Track cohabitation periods for reviews
CREATE TABLE cohabitation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  seeker_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'disputed'
  end_reason VARCHAR(50), -- 'lease_ended', 'early_termination', 'mutual', 'eviction'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohabitation_id UUID REFERENCES cohabitation_periods(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reviewee_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  -- Rating criteria (1-5 stars)
  rent_payment_rating INTEGER CHECK (rent_payment_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  respect_rating INTEGER CHECK (respect_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5), -- For listing reviews
  overall_rating DECIMAL(2,1),
  -- Content
  title VARCHAR(255),
  comment TEXT,
  pros TEXT,
  cons TEXT,
  -- Moderation
  is_visible BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  moderation_status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  moderation_notes TEXT,
  -- Response from reviewee
  response TEXT,
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per cohabitation per reviewer
  UNIQUE(cohabitation_id, reviewer_id)
);

-- ============================================
-- CO-RENTER GROUPS TABLES
-- ============================================

-- Groups of users searching together
CREATE TABLE co_renter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  combined_budget_min DECIMAL(10,2),
  combined_budget_max DECIMAL(10,2),
  target_move_date DATE,
  preferred_cities TEXT[],
  preferred_provinces TEXT[],
  group_size_min INTEGER DEFAULT 2,
  group_size_max INTEGER DEFAULT 4,
  status VARCHAR(50) DEFAULT 'forming', -- 'forming', 'searching', 'matched', 'closed'
  is_public BOOLEAN DEFAULT false, -- Can others discover and request to join
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members of co-renter groups
CREATE TABLE co_renter_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES co_renter_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
  budget_contribution DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'left', 'removed'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(group_id, user_id)
);

-- Invitations to join groups
CREATE TABLE co_renter_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES co_renter_groups(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  invitee_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  invitee_email VARCHAR(255), -- For inviting non-users
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, invitee_id)
);

-- ============================================
-- SERVICE PROVIDERS TABLES (Moving, Cleaning, etc.)
-- ============================================

CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  business_name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255),
  business_phone VARCHAR(20),
  service_type VARCHAR(50) NOT NULL, -- 'moving', 'cleaning', 'storage', 'handyman'
  description TEXT,
  service_areas TEXT[], -- cities/provinces served
  logo_url TEXT,
  website_url TEXT,
  license_number VARCHAR(100),
  insurance_info JSONB,
  pricing_info JSONB, -- Base rates, hourly rates, etc.
  average_rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stripe_account_id VARCHAR(255), -- For receiving payments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service bookings
CREATE TABLE service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  service_type VARCHAR(50) NOT NULL,
  service_date DATE NOT NULL,
  service_time TIME,
  duration_hours DECIMAL(4,2),
  -- Location
  pickup_address TEXT,
  delivery_address TEXT,
  -- Details
  details JSONB, -- Service-specific details
  special_instructions TEXT,
  -- Pricing
  estimated_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'CAD',
  -- Status
  status VARCHAR(50) DEFAULT 'requested', -- 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled'
  cancelled_by VARCHAR(50), -- 'customer', 'provider'
  cancellation_reason TEXT,
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service reviews
CREATE TABLE service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES service_bookings(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- ============================================
-- INSURANCE REFERENCES
-- ============================================

CREATE TABLE insurance_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  provider VARCHAR(100) NOT NULL, -- 'square_one', 'duuo', 'sonnet', etc.
  policy_type VARCHAR(50), -- 'tenant', 'landlord', 'contents'
  policy_number VARCHAR(100),
  coverage_amount DECIMAL(12,2),
  premium_amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  external_reference_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Payment indexes
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_recipient ON payments(recipient_id);
CREATE INDEX idx_payments_listing ON payments(listing_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Payment methods
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- Payout accounts
CREATE INDEX idx_payout_accounts_stripe ON payout_accounts(stripe_connect_account_id);

-- Shared expenses
CREATE INDEX idx_shared_expenses_listing ON shared_expenses(listing_id);
CREATE INDEX idx_shared_expenses_created_by ON shared_expenses(created_by);
CREATE INDEX idx_expense_shares_expense ON expense_shares(expense_id);
CREATE INDEX idx_expense_shares_user ON expense_shares(user_id);

-- Reviews
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_reviews_visible ON reviews(is_visible) WHERE is_visible = true;

-- Cohabitation
CREATE INDEX idx_cohabitation_provider ON cohabitation_periods(provider_id);
CREATE INDEX idx_cohabitation_seeker ON cohabitation_periods(seeker_id);
CREATE INDEX idx_cohabitation_listing ON cohabitation_periods(listing_id);

-- Co-renter groups
CREATE INDEX idx_co_renter_members_group ON co_renter_members(group_id);
CREATE INDEX idx_co_renter_members_user ON co_renter_members(user_id);
CREATE INDEX idx_co_renter_invitations_group ON co_renter_invitations(group_id);
CREATE INDEX idx_co_renter_invitations_invitee ON co_renter_invitations(invitee_id);

-- Service providers
CREATE INDEX idx_service_providers_type ON service_providers(service_type);
CREATE INDEX idx_service_providers_active ON service_providers(is_active) WHERE is_active = true;
CREATE INDEX idx_service_bookings_provider ON service_bookings(provider_id);
CREATE INDEX idx_service_bookings_customer ON service_bookings(customer_id);

-- Insurance
CREATE INDEX idx_insurance_user ON insurance_references(user_id);
CREATE INDEX idx_insurance_listing ON insurance_references(listing_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohabitation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_renter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_renter_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_renter_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_references ENABLE ROW LEVEL SECURITY;

-- Payment methods: Users can only see their own
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Payout accounts: Users can only see their own
CREATE POLICY "Users can view own payout account" ON payout_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payout account" ON payout_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payout account" ON payout_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Payments: Users can see payments they're involved in
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create payments as payer" ON payments
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- Shared expenses: Participants can view
CREATE POLICY "Expense participants can view" ON shared_expenses
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM expense_shares WHERE expense_shares.expense_id = id AND expense_shares.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create expenses" ON shared_expenses
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update expenses" ON shared_expenses
  FOR UPDATE USING (auth.uid() = created_by);

-- Expense shares
CREATE POLICY "Users can view own shares" ON expense_shares
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Expense creators can manage shares" ON expense_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shared_expenses WHERE id = expense_id AND created_by = auth.uid())
  );

-- Cohabitation: Participants can view
CREATE POLICY "Cohabitation participants can view" ON cohabitation_periods
  FOR SELECT USING (auth.uid() = provider_id OR auth.uid() = seeker_id);
CREATE POLICY "Providers can create cohabitation" ON cohabitation_periods
  FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Participants can update cohabitation" ON cohabitation_periods
  FOR UPDATE USING (auth.uid() = provider_id OR auth.uid() = seeker_id);

-- Reviews: Public visible, own editable
CREATE POLICY "Anyone can view visible reviews" ON reviews
  FOR SELECT USING (is_visible = true);
CREATE POLICY "Reviewers can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Reviewees can add response" ON reviews
  FOR UPDATE USING (auth.uid() = reviewee_id);

-- Co-renter groups: Members can view
CREATE POLICY "Group members can view group" ON co_renter_groups
  FOR SELECT USING (
    is_public = true OR
    EXISTS (SELECT 1 FROM co_renter_members WHERE group_id = id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create groups" ON co_renter_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update groups" ON co_renter_groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM co_renter_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')
  );

-- Co-renter members
CREATE POLICY "Members can view group members" ON co_renter_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM co_renter_members cm WHERE cm.group_id = group_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage members" ON co_renter_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM co_renter_members WHERE group_id = co_renter_members.group_id AND user_id = auth.uid() AND role = 'admin')
  );

-- Co-renter invitations
CREATE POLICY "Invitees can view own invitations" ON co_renter_invitations
  FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Group admins can create invitations" ON co_renter_invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM co_renter_members WHERE group_id = co_renter_invitations.group_id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Invitees can respond" ON co_renter_invitations
  FOR UPDATE USING (auth.uid() = invitee_id);

-- Service providers: Public viewing
CREATE POLICY "Anyone can view active providers" ON service_providers
  FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own provider" ON service_providers
  FOR ALL USING (auth.uid() = user_id);

-- Service bookings
CREATE POLICY "Booking participants can view" ON service_bookings
  FOR SELECT USING (
    auth.uid() = customer_id OR
    EXISTS (SELECT 1 FROM service_providers WHERE id = provider_id AND user_id = auth.uid())
  );
CREATE POLICY "Customers can create bookings" ON service_bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Participants can update bookings" ON service_bookings
  FOR UPDATE USING (
    auth.uid() = customer_id OR
    EXISTS (SELECT 1 FROM service_providers WHERE id = provider_id AND user_id = auth.uid())
  );

-- Service reviews
CREATE POLICY "Anyone can view service reviews" ON service_reviews
  FOR SELECT USING (is_visible = true);
CREATE POLICY "Customers can review completed bookings" ON service_reviews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM service_bookings WHERE id = booking_id AND customer_id = auth.uid() AND status = 'completed')
  );

-- Insurance references
CREATE POLICY "Users can view own insurance" ON insurance_references
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own insurance" ON insurance_references
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update review overall rating on insert/update
CREATE OR REPLACE FUNCTION calculate_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_rating := (
    COALESCE(NEW.rent_payment_rating, 0) +
    COALESCE(NEW.cleanliness_rating, 0) +
    COALESCE(NEW.respect_rating, 0) +
    COALESCE(NEW.communication_rating, 0) +
    COALESCE(NEW.accuracy_rating, 0)
  )::DECIMAL / NULLIF(
    (CASE WHEN NEW.rent_payment_rating IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cleanliness_rating IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.respect_rating IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.communication_rating IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.accuracy_rating IS NOT NULL THEN 1 ELSE 0 END),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_overall_rating
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION calculate_overall_rating();

-- Update service provider ratings
CREATE OR REPLACE FUNCTION update_provider_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_providers
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0)
      FROM service_reviews
      WHERE provider_id = NEW.provider_id AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM service_reviews
      WHERE provider_id = NEW.provider_id AND is_visible = true
    )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_ratings
  AFTER INSERT OR UPDATE OR DELETE ON service_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_ratings();

-- Update expense status when shares are paid
CREATE OR REPLACE FUNCTION update_expense_status()
RETURNS TRIGGER AS $$
DECLARE
  total_shares INTEGER;
  paid_shares INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid')
  INTO total_shares, paid_shares
  FROM expense_shares
  WHERE expense_id = NEW.expense_id;

  UPDATE shared_expenses
  SET status = CASE
    WHEN paid_shares = total_shares THEN 'completed'
    WHEN paid_shares > 0 THEN 'partial'
    ELSE 'pending'
  END,
  updated_at = NOW()
  WHERE id = NEW.expense_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expense_status
  AFTER UPDATE ON expense_shares
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_expense_status();
