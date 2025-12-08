/**
 * API functions for requirement email tracking
 * Handles email history, sync operations, and matching
 */

import { supabase } from '../supabase';

interface RequirementEmail {
  id: string;
  requirement_id: string;
  recipient_email: string;
  recipient_name?: string;
  sent_via: 'loster_app' | 'gmail_synced';
  subject: string;
  sent_date: string;
  status: 'sent' | 'failed' | 'pending' | 'bounced';
  match_confidence?: number;
  needs_user_confirmation?: boolean;
}

/**
 * Get all emails for a requirement
 */
export async function getRequirementEmails(requirementId: string): Promise<RequirementEmail[]> {
  const { data, error } = await supabase
    .from('requirement_emails')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('sent_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get emails sent for multiple requirements (for dashboard/analytics)
 */
export async function getEmailsByRequirements(
  requirementIds: string[]
): Promise<RequirementEmail[]> {
  const { data, error } = await supabase
    .from('requirement_emails')
    .select('*')
    .in('requirement_id', requirementIds)
    .order('sent_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new email record (when sending from Loster app)
 */
export async function createEmailRecord(
  requirementId: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  userId: string,
  bodyPreview?: string
): Promise<RequirementEmail> {
  const { data, error } = await supabase
    .from('requirement_emails')
    .insert({
      requirement_id: requirementId,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      sent_via: 'loster_app',
      subject,
      body_preview: bodyPreview,
      sent_date: new Date().toISOString(),
      status: 'sent',
      match_confidence: 100,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get Gmail sync status for current user
 */
export async function getGmailSyncStatus(userId: string): Promise<{
  isConnected: boolean;
  lastSync?: string;
  syncFrequency?: number;
  confidenceLevel?: string;
}> {
  const { data, error } = await supabase
    .from('gmail_sync_tokens')
    .select('last_sync_at, sync_frequency_minutes, auto_link_confidence_level, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { isConnected: false };
  }

  return {
    isConnected: true,
    lastSync: data.last_sync_at,
    syncFrequency: data.sync_frequency_minutes,
    confidenceLevel: data.auto_link_confidence_level,
  };
}

/**
 * Trigger manual email sync for user
 */
export async function triggerManualSync(userId: string): Promise<{ success: boolean }> {
  // This would call a backend endpoint that triggers the sync service
  // For now, return a placeholder
  try {
    const response = await fetch('/api/emails/sync-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) throw new Error(`Sync failed with status ${response.status}`);

    return { success: true };
  } catch (error) {
    console.error('Manual sync error:', error);
    throw error;
  }
}

/**
 * Get email sync logs for user
 */
export async function getEmailSyncLogs(
  userId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    sync_started_at: string;
    sync_completed_at?: string;
    emails_fetched: number;
    emails_matched: number;
    status: string;
  }>
> {
  const { data, error } = await supabase
    .from('email_sync_logs')
    .select('*')
    .eq('user_id', userId)
    .order('sync_started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get unconfirmed email matches that need user review
 */
export async function getUnconfirmedEmailMatches(userId: string): Promise<RequirementEmail[]> {
  // Get user's requirements first
  const { data: requirements, error: reqError } = await supabase
    .from('requirements')
    .select('id')
    .eq('user_id', userId);

  if (reqError || !requirements) return [];

  const requirementIds = requirements.map((r) => r.id);

  // Get emails that need confirmation
  const { data, error } = await supabase
    .from('requirement_emails')
    .select('*')
    .in('requirement_id', requirementIds)
    .eq('needs_user_confirmation', true)
    .order('sent_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Confirm email match (update match confidence and clear needs_confirmation flag)
 */
export async function confirmEmailMatch(
  emailId: string,
  confidence: number
): Promise<RequirementEmail> {
  const { data, error } = await supabase
    .from('requirement_emails')
    .update({
      match_confidence: confidence,
      needs_user_confirmation: false,
    })
    .eq('id', emailId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update email status
 */
export async function updateEmailStatus(
  emailId: string,
  status: 'sent' | 'failed' | 'bounced' | 'pending',
  errorMessage?: string
): Promise<RequirementEmail> {
  const { data, error } = await supabase
    .from('requirement_emails')
    .update({
      status,
      error_message: errorMessage,
    })
    .eq('id', emailId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get email statistics for a requirement
 */
export async function getRequirementEmailStats(requirementId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  lastSent?: string;
  uniqueRecipients: number;
}> {
  const emails = await getRequirementEmails(requirementId);

  const stats = {
    total: emails.length,
    sent: emails.filter((e) => e.status === 'sent').length,
    failed: emails.filter((e) => e.status === 'failed').length,
    bounced: emails.filter((e) => e.status === 'bounced').length,
    lastSent: emails[0]?.sent_date,
    uniqueRecipients: new Set(emails.map((e) => e.recipient_email)).size,
  };

  return stats;
}

/**
 * Delete email record
 */
export async function deleteEmailRecord(emailId: string): Promise<void> {
  const { error } = await supabase.from('requirement_emails').delete().eq('id', emailId);

  if (error) throw error;
}
