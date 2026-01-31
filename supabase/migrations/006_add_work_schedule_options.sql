-- Add new work schedule options to the work_schedule_type enum
-- These options support retired, not working, and job seeking users

ALTER TYPE work_schedule_type ADD VALUE IF NOT EXISTS 'retired';
ALTER TYPE work_schedule_type ADD VALUE IF NOT EXISTS 'not_working';
ALTER TYPE work_schedule_type ADD VALUE IF NOT EXISTS 'job_seeking';
