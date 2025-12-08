/**
 * Email Threading API
 * Handles email thread management, sending, and replies
 */

import { supabase } from '../supabase';
import { logger, handleApiError, retryAsync } from '../errorHandler';
import type { Database } from '../database.types';

type EmailThread = Database['public']['Tables']['email_threads']['Row'];

/**
 * Get email threads for a user, optionally filtered by requirement
 */
export const getEmailThreads = async (
  userId: string,
  requirementId?: string
): Promise<{ success: boolean; threads?: EmailThread[]; error?: string }> => {
  try {
    let query = supabase
      .from('email_threads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (requirementId) {
      query = query.eq('requirement_id', requirementId);
    }

    const { data, error } = await retryAsync(
      async () => query,
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getEmailThreads',
        userId,
        resource: requirementId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, threads: data || [] };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getEmailThreads',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Get a specific email thread with all its replies
 */
export const getEmailThread = async (
  threadId: string
): Promise<{ success: boolean; thread?: EmailThread; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('email_threads')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true }),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getEmailThread',
        resource: threadId,
      });
      return { success: false, error: appError.message };
    }

    // Return the root thread
    const thread = data?.[0];
    if (!thread) {
      return { success: true };
    }

    return { success: true, thread };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getEmailThread',
      resource: threadId,
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Create a new email thread and send the email
 */
export const createEmailThread = async (
  userId: string,
  subject: string,
  fromEmail: string,
  toEmail: string,
  body: string,
  requirementId?: string
): Promise<{ success: boolean; thread?: EmailThread; error?: string }> => {
  try {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // First, try to send the actual email via the email server
    const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
    const sendEmailResponse = await fetch(`${emailServerUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        subject: subject,
        body: body,
        from: fromEmail,
      }),
    });

    if (!sendEmailResponse.ok) {
      const errorData = await sendEmailResponse.json();
      logger.error('Failed to send email via server', {
        component: 'createEmailThread',
        error: errorData.error,
      });
      return {
        success: false,
        error: `Email service error: ${errorData.error || 'Failed to send email'}`,
      };
    }

    const emailSendResult = await sendEmailResponse.json();
    logger.info('Email sent successfully', {
      component: 'createEmailThread',
      messageId: emailSendResult.messageId,
    });

    // Now save the thread to database
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('email_threads')
          .insert({
            user_id: userId,
            requirement_id: requirementId || null,
            subject,
            from_email: fromEmail,
            to_email: toEmail,
            body,
            thread_id: threadId,
            parent_id: null,
          })
          .select()
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'createEmailThread',
        userId,
        resource: subject,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Email thread created and saved to database', {
      component: 'createEmailThread',
      resource: subject,
    });

    return { success: true, thread: data };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'createEmailThread',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Add a reply to an existing email thread and send it
 */
export const replyToEmailThread = async (
  userId: string,
  threadId: string,
  fromEmail: string,
  toEmail: string,
  body: string,
  parentId?: string
): Promise<{ success: boolean; reply?: EmailThread; error?: string }> => {
  try {
    // Get the original thread to extract metadata
    const { data: originalThread } = await supabase
      .from('email_threads')
      .select('subject, requirement_id')
      .eq('thread_id', threadId)
      .limit(1)
      .single();

    const replySubject = originalThread?.subject ? `Re: ${originalThread.subject}` : 'Reply';

    // First, try to send the actual email reply via the email server
    const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
    const sendEmailResponse = await fetch(`${emailServerUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        subject: replySubject,
        body: body,
        from: fromEmail,
      }),
    });

    if (!sendEmailResponse.ok) {
      const errorData = await sendEmailResponse.json();
      logger.error('Failed to send email reply via server', {
        component: 'replyToEmailThread',
        error: errorData.error,
      });
      return {
        success: false,
        error: `Email service error: ${errorData.error || 'Failed to send reply'}`,
      };
    }

    const emailSendResult = await sendEmailResponse.json();
    logger.info('Email reply sent successfully', {
      component: 'replyToEmailThread',
      messageId: emailSendResult.messageId,
    });

    // Now save the reply to database
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('email_threads')
          .insert({
            user_id: userId,
            requirement_id: originalThread?.requirement_id || null,
            subject: replySubject,
            from_email: fromEmail,
            to_email: toEmail,
            body,
            thread_id: threadId,
            parent_id: parentId || null,
          })
          .select()
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'replyToEmailThread',
        userId,
        resource: threadId,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Email reply added to database', {
      component: 'replyToEmailThread',
      resource: threadId,
    });

    return { success: true, reply: data };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'replyToEmailThread',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Update an email thread (e.g., mark as important, change subject)
 */
export const updateEmailThread = async (
  threadId: string,
  updates: Partial<Pick<EmailThread, 'subject' | 'body'>>
): Promise<{ success: boolean; thread?: EmailThread; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('email_threads')
          .update(updates)
          .eq('thread_id', threadId)
          .eq('parent_id', null) // Only update the root thread
          .select()
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'updateEmailThread',
        resource: threadId,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Email thread updated', {
      component: 'updateEmailThread',
      resource: threadId,
    });

    return { success: true, thread: data };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'updateEmailThread',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Delete an email thread and all its replies
 */
export const deleteEmailThread = async (
  threadId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Delete all emails in the thread
    const { error } = await retryAsync(
      async () =>
        supabase.from('email_threads').delete().eq('thread_id', threadId),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'deleteEmailThread',
        resource: threadId,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Email thread deleted', {
      component: 'deleteEmailThread',
      resource: threadId,
    });

    return { success: true };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'deleteEmailThread',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Get all threads for a requirement
 */
export const getRequirementEmailThreads = async (
  requirementId: string
): Promise<{ success: boolean; threads?: EmailThread[]; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('email_threads')
          .select('*')
          .eq('requirement_id', requirementId)
          .order('created_at', { ascending: false }),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getRequirementEmailThreads',
        resource: requirementId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, threads: data || [] };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getRequirementEmailThreads',
    });
    return { success: false, error: appError.message };
  }
};
