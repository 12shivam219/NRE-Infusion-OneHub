/**
 * Bulk Email Campaign API
 * Handles creating and managing bulk email campaigns with rotation
 */

import { supabase } from '../supabase';
import { logger, handleApiError, retryAsync } from '../errorHandler';

interface BulkEmailCampaign {
  id: string;
  user_id: string;
  requirement_id: string | null;
  subject: string;
  body: string;
  total_recipients: number;
  rotation_enabled: boolean;
  emails_per_account: number;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface CampaignRecipient {
  id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string;
  account_id: string | null;
  status: 'pending' | 'sent' | 'failed';
  message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface CreateCampaignPayload {
  userId: string;
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  rotationEnabled: boolean;
  emailsPerAccount?: number;
  requirementId?: string;
}

/**
 * Create a new bulk email campaign
 */
export const createBulkEmailCampaign = async (
  payload: CreateCampaignPayload
): Promise<{ success: boolean; campaign?: BulkEmailCampaign; error?: string }> => {
  try {
    const {
      userId,
      subject,
      body,
      recipients,
      rotationEnabled,
      emailsPerAccount = 5,
      requirementId,
    } = payload;

    if (!subject || !body || recipients.length === 0) {
      return {
        success: false,
        error: 'Subject, body, and recipients are required',
      };
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await retryAsync(
      async () =>
        supabase
          .from('bulk_email_campaigns')
          .insert({
            user_id: userId,
            requirement_id: requirementId || null,
            subject,
            body,
            total_recipients: recipients.length,
            rotation_enabled: rotationEnabled,
            emails_per_account: emailsPerAccount,
            status: 'draft',
          })
          .select()
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (campaignError) {
      const appError = handleApiError(campaignError, {
        component: 'createBulkEmailCampaign',
        userId,
      });
      return { success: false, error: appError.message };
    }

    if (!campaign) {
      return { success: false, error: 'Failed to create campaign' };
    }

    // Insert recipient records
    const recipientRecords = recipients.map((recipient) => ({
      campaign_id: campaign.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name || null,
      status: 'pending',
    }));

    const { error: recipientError } = await retryAsync(
      async () =>
        supabase
          .from('campaign_recipients')
          .insert(recipientRecords),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (recipientError) {
      // Clean up campaign if recipient insert fails
      await supabase.from('bulk_email_campaigns').delete().eq('id', campaign.id);
      
      const appError = handleApiError(recipientError, {
        component: 'createBulkEmailCampaign',
        resource: 'recipients',
      });
      return { success: false, error: appError.message };
    }

    logger.info('Bulk email campaign created', {
      component: 'createBulkEmailCampaign',
      resource: campaign.id,
      recipientCount: recipients.length,
    });

    return { success: true, campaign };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'createBulkEmailCampaign',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Get campaign details with recipients
 */
export const getCampaignDetails = async (
  campaignId: string
): Promise<{
  success: boolean;
  campaign?: BulkEmailCampaign;
  recipients?: CampaignRecipient[];
  error?: string;
}> => {
  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      const appError = handleApiError(campaignError, {
        component: 'getCampaignDetails',
        resource: campaignId,
      });
      return { success: false, error: appError.message };
    }

    const { data: recipients, error: recipientError } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (recipientError) {
      const appError = handleApiError(recipientError, {
        component: 'getCampaignDetails',
        resource: campaignId,
      });
      return { success: false, error: appError.message };
    }

    return {
      success: true,
      campaign,
      recipients: recipients || [],
    };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getCampaignDetails',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Send bulk email campaign
 */
export const sendBulkEmailCampaign = async (
  campaignId: string
): Promise<{
  success: boolean;
  result?: {
    total: number;
    sent: number;
    failed: number;
    details: Array<{
      email: string;
      status: string;
      fromAccount: string;
    }>;
  };
  error?: string;
}> => {
  try {
    // Get campaign details
    const { campaign, recipients } = await getCampaignDetails(campaignId);

    if (!campaign || !recipients) {
      return { success: false, error: 'Campaign not found' };
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No recipients in campaign' };
    }

    // Prepare recipients list for server
    const recipientEmails = recipients.map((r) => ({
      email: r.recipient_email,
      name: r.recipient_name,
    }));

    // Call bulk send endpoint
    const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
    
    const response = await fetch(`${emailServerUrl}/api/send-bulk-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails: recipientEmails,
        subject: campaign.subject,
        body: campaign.body,
        rotationConfig: campaign.rotation_enabled
          ? { emailsPerAccount: campaign.emails_per_account }
          : null,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send bulk emails',
      };
    }

    // Update campaign status
    await supabase
      .from('bulk_email_campaigns')
      .update({
        status: result.failed === 0 ? 'completed' : 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Update recipient statuses
    for (const detail of result.details) {
      const status = detail.status === 'sent' ? 'sent' : 'failed';
      await supabase
        .from('campaign_recipients')
        .update({
          status,
          message_id: detail.messageId || null,
          error_message: detail.error || null,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('campaign_id', campaignId)
        .eq('recipient_email', detail.email);
    }

    logger.info('Bulk email campaign sent', {
      component: 'sendBulkEmailCampaign',
      resource: campaignId,
      sent: result.sent,
      failed: result.failed,
    });

    return {
      success: true,
      result,
    };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'sendBulkEmailCampaign',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Get user's campaigns
 */
export const getUserCampaigns = async (
  userId: string
): Promise<{ success: boolean; campaigns?: BulkEmailCampaign[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('bulk_email_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      const appError = handleApiError(error, {
        component: 'getUserCampaigns',
        userId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, campaigns: data || [] };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getUserCampaigns',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Delete a campaign
 */
export const deleteCampaign = async (campaignId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('bulk_email_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      const appError = handleApiError(error, {
        component: 'deleteCampaign',
        resource: campaignId,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Campaign deleted', {
      component: 'deleteCampaign',
      resource: campaignId,
    });

    return { success: true };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'deleteCampaign',
    });
    return { success: false, error: appError.message };
  }
};
