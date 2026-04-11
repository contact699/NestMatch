-- Add admin support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;

-- Admin policies for resource management
-- Allow admins to insert/update/delete resources
CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage FAQs" ON faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage categories" ON resource_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Allow admins to view and manage all submitted questions
CREATE POLICY "Admins can manage submitted questions" ON submitted_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Allow admins to manage agreement clauses
CREATE POLICY "Admins can manage agreement clauses" ON agreement_clauses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
