-- Resources Feature Migration
-- Roommate Knowledge Base / Resources

-- Resource categories
CREATE TABLE resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Main resources/guides
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  excerpt TEXT,
  provinces TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  resource_type TEXT NOT NULL DEFAULT 'guide', -- guide, article, checklist
  featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAQs
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  provinces TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User bookmarks for resources and FAQs
CREATE TABLE resource_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bookmark_target CHECK (
    (resource_id IS NOT NULL AND faq_id IS NULL) OR
    (resource_id IS NULL AND faq_id IS NOT NULL)
  ),
  UNIQUE(user_id, resource_id),
  UNIQUE(user_id, faq_id)
);

-- User votes on resources/FAQs (helpful/not helpful)
CREATE TABLE resource_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT vote_target CHECK (
    (resource_id IS NOT NULL AND faq_id IS NULL) OR
    (resource_id IS NULL AND faq_id IS NOT NULL)
  ),
  UNIQUE(user_id, resource_id),
  UNIQUE(user_id, faq_id)
);

-- User-submitted questions (for moderation)
CREATE TABLE submitted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  context TEXT,
  province TEXT,
  category_id UUID REFERENCES resource_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'answered', 'rejected')),
  admin_notes TEXT,
  answered_faq_id UUID REFERENCES faqs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agreement clause templates
CREATE TABLE agreement_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  provinces TEXT[] DEFAULT '{}',
  content_template JSONB NOT NULL DEFAULT '{}',
  question_flow JSONB DEFAULT '{}',
  category TEXT NOT NULL, -- basics, financial, lifestyle, responsibilities
  is_required BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User-generated roommate agreements
CREATE TABLE generated_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Roommate Agreement',
  province TEXT NOT NULL,
  address TEXT,
  move_in_date DATE,
  roommate_names TEXT[] DEFAULT '{}',
  selected_clauses UUID[] DEFAULT '{}',
  answers JSONB DEFAULT '{}',
  generated_content TEXT,
  pdf_url TEXT,
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX idx_resources_category ON resources(category_id);
CREATE INDEX idx_resources_provinces ON resources USING GIN(provinces);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX idx_resources_slug ON resources(slug);
CREATE INDEX idx_resources_featured ON resources(featured) WHERE featured = true;
CREATE INDEX idx_resources_published ON resources(is_published) WHERE is_published = true;

CREATE INDEX idx_faqs_category ON faqs(category_id);
CREATE INDEX idx_faqs_provinces ON faqs USING GIN(provinces);
CREATE INDEX idx_faqs_tags ON faqs USING GIN(tags);
CREATE INDEX idx_faqs_published ON faqs(is_published) WHERE is_published = true;

CREATE INDEX idx_resource_bookmarks_user ON resource_bookmarks(user_id);
CREATE INDEX idx_resource_votes_user ON resource_votes(user_id);
CREATE INDEX idx_submitted_questions_status ON submitted_questions(status);
CREATE INDEX idx_generated_agreements_user ON generated_agreements(user_id);

-- Full-text search indexes
ALTER TABLE resources ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'C')
  ) STORED;

CREATE INDEX idx_resources_search ON resources USING GIN(search_vector);

ALTER TABLE faqs ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(answer, '')), 'B')
  ) STORED;

CREATE INDEX idx_faqs_search ON faqs USING GIN(search_vector);

-- RLS Policies

-- resource_categories: Everyone can read active categories
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active categories" ON resource_categories
  FOR SELECT USING (is_active = true);

-- resources: Everyone can read published resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published resources" ON resources
  FOR SELECT USING (is_published = true);

-- faqs: Everyone can read published FAQs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published FAQs" ON faqs
  FOR SELECT USING (is_published = true);

-- resource_bookmarks: Users can manage their own bookmarks
ALTER TABLE resource_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own bookmarks" ON resource_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookmarks" ON resource_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON resource_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- resource_votes: Users can manage their own votes
ALTER TABLE resource_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own votes" ON resource_votes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own votes" ON resource_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON resource_votes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON resource_votes
  FOR DELETE USING (auth.uid() = user_id);

-- submitted_questions: Users can create and view their own questions
ALTER TABLE submitted_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own questions" ON submitted_questions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create questions" ON submitted_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- agreement_clauses: Everyone can read active clauses
ALTER TABLE agreement_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active clauses" ON agreement_clauses
  FOR SELECT USING (is_active = true);

-- generated_agreements: Users can manage their own agreements
ALTER TABLE generated_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own agreements" ON generated_agreements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own agreements" ON generated_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agreements" ON generated_agreements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agreements" ON generated_agreements
  FOR DELETE USING (auth.uid() = user_id);

-- Seed initial categories
INSERT INTO resource_categories (slug, name, description, icon, display_order) VALUES
  ('legal', 'Legal & Rights', 'Tenant rights, lease agreements, and legal information', 'Scale', 1),
  ('roommates', 'Living with Roommates', 'Guides for successful roommate relationships', 'Users', 2),
  ('finances', 'Money & Finances', 'Rent splitting, budgeting, and financial tips', 'DollarSign', 3),
  ('moving', 'Moving & Setup', 'Move-in checklists and settling in', 'Truck', 4),
  ('safety', 'Safety & Scams', 'Avoiding scams and staying safe', 'Shield', 5);
