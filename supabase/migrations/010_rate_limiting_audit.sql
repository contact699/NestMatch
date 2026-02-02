-- Rate Limiting, Audit Logging, Soft-Delete, and Background Jobs Migration

-- ============================================
-- RATE LIMITING
-- ============================================

-- Rate limit tracking table
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,  -- user_id, IP, or composite key
  endpoint TEXT NOT NULL,    -- API endpoint or action type
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Abuse detection - track suspicious patterns
CREATE TABLE abuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ip_address TEXT,
  event_type TEXT NOT NULL,  -- rapid_fire, spam_content, suspicious_login, etc.
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(user_id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate limiting
CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);
CREATE INDEX idx_rate_limits_cleanup ON rate_limits(window_start);
CREATE INDEX idx_abuse_events_user ON abuse_events(user_id, created_at);
CREATE INDEX idx_abuse_events_unresolved ON abuse_events(resolved, severity) WHERE resolved = FALSE;

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  -- Calculate current window start
  v_window_start := date_trunc('second', NOW()) -
    (EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_seconds) * INTERVAL '1 second';

  -- Check if currently blocked
  SELECT rl.blocked_until INTO v_blocked_until
  FROM rate_limits rl
  WHERE rl.identifier = p_identifier
    AND rl.endpoint = p_endpoint
    AND rl.blocked_until > NOW()
  LIMIT 1;

  IF v_blocked_until IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 0, v_blocked_until;
    RETURN;
  END IF;

  -- Upsert rate limit record
  INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, v_window_start, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Check if over limit
  IF v_current_count > p_max_requests THEN
    -- Block for the window duration
    UPDATE rate_limits
    SET blocked_until = NOW() + (p_window_seconds * INTERVAL '1 second')
    WHERE identifier = p_identifier AND endpoint = p_endpoint AND window_start = v_window_start;

    RETURN QUERY SELECT FALSE, 0, NOW() + (p_window_seconds * INTERVAL '1 second');
  ELSE
    RETURN QUERY SELECT TRUE, p_max_requests - v_current_count, v_window_start + (p_window_seconds * INTERVAL '1 second');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WEBHOOK IDEMPOTENCY
-- ============================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,           -- stripe, certn, etc.
  event_id TEXT NOT NULL,           -- provider's event ID
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhook_events_lookup ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_pending ON webhook_events(status, created_at) WHERE status IN ('pending', 'failed');

-- ============================================
-- AUDIT LOGGING
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'admin', 'system', 'webhook')),
  action TEXT NOT NULL,             -- create, update, delete, login, etc.
  resource_type TEXT NOT NULL,      -- profile, listing, message, etc.
  resource_id TEXT,                 -- ID of affected resource
  old_values JSONB,                 -- Previous state (for updates)
  new_values JSONB,                 -- New state (for creates/updates)
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,                  -- For correlation
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);

-- Security events specifically
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,         -- login_success, login_failed, password_change, etc.
  ip_address TEXT,
  user_agent TEXT,
  location JSONB,                   -- Geo-IP data if available
  risk_score INTEGER DEFAULT 0,     -- 0-100
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON security_events(user_id, created_at);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at);
CREATE INDEX idx_security_events_risk ON security_events(risk_score) WHERE risk_score > 50;

-- ============================================
-- SOFT DELETE + RETENTION
-- ============================================

-- Add soft delete columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(user_id);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for soft delete queries
CREATE INDEX idx_profiles_deleted ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_listings_deleted ON listings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Data retention tracking
CREATE TABLE data_retention_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,           -- purge_deleted_users, purge_old_messages, etc.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to soft delete a user and their data
CREATE OR REPLACE FUNCTION soft_delete_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Mark profile as deleted
  UPDATE profiles
  SET deleted_at = NOW(),
      deletion_reason = p_reason,
      -- Anonymize PII
      name = 'Deleted User',
      bio = NULL,
      phone = NULL,
      profile_photo = NULL,
      photos = '{}'
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- Soft delete user's listings
  UPDATE listings SET deleted_at = NOW() WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- Soft delete user's messages (keep conversation history for other participants)
  UPDATE messages SET deleted_at = NOW(), deleted_by = p_user_id WHERE sender_id = p_user_id AND deleted_at IS NULL;

  -- Log the deletion
  INSERT INTO audit_logs (actor_id, actor_type, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, 'user', 'soft_delete', 'profile', p_user_id::TEXT, jsonb_build_object('reason', p_reason));
END;
$$ LANGUAGE plpgsql;

-- Function to permanently purge old deleted data (run as scheduled job)
CREATE OR REPLACE FUNCTION purge_deleted_data(p_retention_days INTEGER DEFAULT 30)
RETURNS TABLE(profiles_purged INTEGER, messages_purged INTEGER, listings_purged INTEGER) AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_profiles INTEGER := 0;
  v_messages INTEGER := 0;
  v_listings INTEGER := 0;
BEGIN
  v_cutoff := NOW() - (p_retention_days * INTERVAL '1 day');

  -- Purge old deleted messages
  WITH deleted AS (
    DELETE FROM messages WHERE deleted_at < v_cutoff RETURNING 1
  ) SELECT COUNT(*) INTO v_messages FROM deleted;

  -- Purge old deleted listings
  WITH deleted AS (
    DELETE FROM listings WHERE deleted_at < v_cutoff RETURNING 1
  ) SELECT COUNT(*) INTO v_listings FROM deleted;

  -- Note: Profile deletion should be handled carefully due to foreign keys
  -- This just counts eligible records
  SELECT COUNT(*) INTO v_profiles FROM profiles WHERE deleted_at < v_cutoff;

  RETURN QUERY SELECT v_profiles, v_messages, v_listings;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BACKGROUND JOBS
-- ============================================

CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 0,       -- Higher = more priority
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_pending ON background_jobs(queue, scheduled_for, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_jobs_running ON background_jobs(started_at) WHERE status = 'running';
CREATE INDEX idx_jobs_type ON background_jobs(job_type, status);

-- Function to claim a job for processing
CREATE OR REPLACE FUNCTION claim_background_job(p_queue TEXT DEFAULT 'default')
RETURNS background_jobs AS $$
DECLARE
  v_job background_jobs;
BEGIN
  UPDATE background_jobs
  SET status = 'running', started_at = NOW(), attempts = attempts + 1
  WHERE id = (
    SELECT id FROM background_jobs
    WHERE queue = p_queue
      AND status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_background_job(p_job_id UUID, p_result JSONB DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE background_jobs
  SET status = 'completed', completed_at = NOW(), result = p_result, updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to fail a job
CREATE OR REPLACE FUNCTION fail_background_job(p_job_id UUID, p_error TEXT)
RETURNS void AS $$
DECLARE
  v_job background_jobs;
BEGIN
  SELECT * INTO v_job FROM background_jobs WHERE id = p_job_id;

  IF v_job.attempts >= v_job.max_attempts THEN
    UPDATE background_jobs
    SET status = 'failed', error_message = p_error, updated_at = NOW()
    WHERE id = p_job_id;
  ELSE
    -- Retry with exponential backoff
    UPDATE background_jobs
    SET status = 'pending',
        error_message = p_error,
        scheduled_for = NOW() + (POWER(2, v_job.attempts) * INTERVAL '1 minute'),
        updated_at = NOW()
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================

-- Add search vectors to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.province, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.amenities, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

CREATE INDEX idx_listings_search ON listings USING GIN(search_vector);

-- Add search vectors to profiles (for roommate search)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION profiles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.occupation, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.languages, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_vector_update();

CREATE INDEX idx_profiles_search ON profiles USING GIN(search_vector);

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (no user policies)
-- Admin dashboard will use service role client

-- Users can view their own security events
CREATE POLICY "Users can view own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Update existing policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON listings;
CREATE POLICY "Active listings are viewable by everyone" ON listings
  FOR SELECT USING ((is_active = true AND deleted_at IS NULL) OR auth.uid() = user_id);
