import { createClient } from '@supabase/supabase-js';

// SECURITY NOTICE:
// The anon key is intentionally exposed in the frontend bundle.
// This is a standard Supabase pattern. Security is enforced through:
//
// 1. Row Level Security (RLS) Policies:
//    - bulk_email_campaign_status: Anonymous users are completely blocked (policy: "Deny anon users from campaign status")
//    - bulk_email_campaigns: Only authenticated users can read their own campaigns
//    - campaign_recipients: Only authenticated users can access recipients for campaigns they created
//
// 2. Authentication:
//    - All sensitive operations require authenticated sessions
//    - Backend (service_role) uses a private key for privileged operations
//    - Frontend operations are restricted by RLS policies based on auth.uid()
//
// See /supabase/migrations/024_harden_campaign_status_rls.sql for RLS policy details

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseProjectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : '';
export const supabaseAuthStorageKey = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  },
});
