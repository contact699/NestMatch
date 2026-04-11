-- Seed file for local development
-- This file is referenced in config.toml and runs after migrations

-- Insert default resource categories
INSERT INTO resource_categories (id, name, slug, description, icon)
VALUES
  (gen_random_uuid(), 'Getting Started', 'getting-started', 'Essential guides for new users', 'rocket'),
  (gen_random_uuid(), 'Legal & Rights', 'legal-rights', 'Know your tenant rights in Canada', 'scale'),
  (gen_random_uuid(), 'Financial Tips', 'financial-tips', 'Budgeting and financial advice', 'dollar-sign'),
  (gen_random_uuid(), 'Living Together', 'living-together', 'Tips for harmonious co-living', 'users')
ON CONFLICT DO NOTHING;
