-- Migration: Add interview_focus_cache table for Groq AI caching
-- Purpose: Cache generated interview focus points to avoid redundant API calls
-- Pattern: Follows same caching pattern as jd_parsing_cache

-- Create interview_focus_cache table
CREATE TABLE IF NOT EXISTS interview_focus_cache (
  id BIGSERIAL PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,
  generated_focus TEXT NOT NULL,
  tech_stack TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on content_hash for fast cache lookups
CREATE INDEX IF NOT EXISTS idx_interview_focus_cache_hash ON interview_focus_cache(content_hash);

-- Create index on created_at for cleanup/maintenance queries
CREATE INDEX IF NOT EXISTS idx_interview_focus_cache_created ON interview_focus_cache(created_at);

-- Add comment for documentation
COMMENT ON TABLE interview_focus_cache IS 'Caches Groq AI-generated interview focus points to avoid redundant API calls. Uses content hash for cache key matching.';
COMMENT ON COLUMN interview_focus_cache.content_hash IS 'SHA-256 hash of tech_stack|job_description used as cache key';
COMMENT ON COLUMN interview_focus_cache.generated_focus IS 'AI-generated interview focus bullet points';
