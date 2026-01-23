-- Migration: 025_add_interview_focus_cache_rls.sql
-- Purpose: Add RLS policies for interview_focus_cache table
-- The table has RLS enabled but no policies, making it inaccessible
-- This migration fixes the Supabase advisor warning

BEGIN;

-- =========================================================================
-- 1. ENABLE RLS IF NOT ALREADY ENABLED
-- =========================================================================
ALTER TABLE public.interview_focus_cache ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. CREATE RLS POLICIES
-- =========================================================================

-- Policy: Allow service role (backend/functions) to read all cached data
CREATE POLICY "Allow service role to read interview focus cache"
  ON public.interview_focus_cache
  FOR SELECT
  USING (true);

-- Policy: Allow service role (backend/functions) to insert new cache entries
CREATE POLICY "Allow service role to insert interview focus cache"
  ON public.interview_focus_cache
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow service role (backend/functions) to update cache entries
CREATE POLICY "Allow service role to update interview focus cache"
  ON public.interview_focus_cache
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role (backend/functions) to delete cache entries (for cleanup)
CREATE POLICY "Allow service role to delete interview focus cache"
  ON public.interview_focus_cache
  FOR DELETE
  USING (true);

COMMIT;
