import { supabase } from '../supabase';
import type { Database, UserStatus, UserRole, ErrorStatus } from '../database.types';

type User = Database['public']['Tables']['users']['Row'];
type LoginHistory = Database['public']['Tables']['login_history']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type ErrorReport = Database['public']['Tables']['error_reports']['Row'];
type Attachment = Database['public']['Tables']['attachments']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
type ErrorReportUpdate = Database['public']['Tables']['error_reports']['Update'];

// Placeholder types for user_sessions table which does not exist in the current schema
type UserSession = {
  id: string;
  user_id: string;
  revoked: boolean;
  last_activity: string;
  created_at: string;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  ip_address?: string | null;
  location?: string | null;
};

type SessionUpdate = {
  revoked: boolean;
};

const DOCUMENTS_BUCKET = 'documents';
const ATTACHMENT_URL_EXPIRY_SECONDS = 60 * 60;

const sanitizeFileName = (name: string) => {
  return name
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 200);
};

type ApprovalStatistics = {
  pendingApproval: number;
  pendingVerification: number;
  approved: number;
  rejected: number;
  todaySignups: number;
  totalApproved: number;
  totalPending: number;
};

const logAdminAction = async (
  action: string,
  context: {
    adminId?: string;
    targetUserId?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
  } = {}
) => {
  try {
    const detailsPayload = (
      context.details || context.adminId || context.targetUserId
        ? {
            ...(context.details ?? {}),
            ...(context.adminId ? { adminId: context.adminId } : {}),
            ...(context.targetUserId ? { targetUserId: context.targetUserId } : {}),
          }
        : null
    ) as ActivityLog['details'];

    const payload: ActivityLogInsert = {
      user_id: null,
      action,
      resource_type: context.resourceType ?? null,
      resource_id: context.resourceId ?? null,
      details: detailsPayload,
      ip_address: context.ipAddress ?? null,
    };

    const { error } = await supabase.from('activity_logs').insert(payload as ActivityLogInsert);
    if (error) {
      if (import.meta.env.DEV) console.error('Activity log error:', error);
    }
  } catch (error) {
    // Logging failures should not interrupt primary flows
    if (import.meta.env.DEV) console.error('Activity log exception:', error);
  }
};

const ensureAdminDemotionAllowed = async (
  userId: string,
  nextRole: UserRole
): Promise<{ allowed: boolean; error?: string }> => {
  if (import.meta.env.DEV) console.log('[RLS GUARD] ensureAdminDemotionAllowed start', { userId, nextRole });
  if (nextRole === 'admin') {
    if (import.meta.env.DEV) console.log('[RLS GUARD] nextRole is admin -> allowed');
    return { allowed: true };
  }

  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    if (import.meta.env.DEV) console.error('[RLS GUARD] failed to lookup target user role', { userId, error: userError });
    return { allowed: false, error: userError.message };
  }

  const userRoleRecord = userRecord as Pick<User, 'role'> | null;

  if (!userRoleRecord || userRoleRecord.role !== 'admin') {
    return { allowed: true };
  }

  const { count, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (countError) {
    if (import.meta.env.DEV) console.error('[RLS GUARD] failed to count admin users', { error: countError });
    return { allowed: false, error: countError.message };
  }

  if ((count ?? 0) <= 1) {
    if (import.meta.env.DEV) console.warn('[RLS GUARD] attempt to remove last admin blocked', { adminCount: count });
    return { allowed: false, error: 'Cannot remove the last remaining admin' };
  }

  if (import.meta.env.DEV) console.log('[RLS GUARD] demotion allowed');
  return { allowed: true };
};

export const getAllUsers = async (): Promise<{
  success: boolean;
  users?: User[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, users: data };
  } catch {
    return { success: false, error: 'Failed to fetch users' };
  }
};

export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  options?: { adminId?: string; reason?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {    
    const updatePayload: UserUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      if (import.meta.env.DEV) console.error('[STATUS UPDATE] Full error:', {
        message: error.message,
        code: error.code,
        details: (error as { details?: unknown }).details,
      });
      return { success: false, error: error.message };
    }

    await logAdminAction('user_status_updated', {
      adminId: options?.adminId,
      targetUserId: userId,
      resourceType: 'user',
      resourceId: userId,
      details: {
        status,
        reason: options?.reason ?? null,
      },
    });

    return { success: true };
  } catch (error) {
    if (import.meta.env.DEV) console.error('[DB] Update user status exception:', error);
    return { success: false, error: 'Failed to update user status' };
  }
};

export const updateUserRole = async (
  userId: string,
  role: UserRole,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (import.meta.env.DEV) console.log('[ROLE UPDATE] start', { userId, role, adminId: options?.adminId });
    const guard = await ensureAdminDemotionAllowed(userId, role);
    if (import.meta.env.DEV) console.log('[ROLE UPDATE] demotion guard result', { guard });
    if (!guard.allowed) {
      if (import.meta.env.DEV) console.error('[ROLE UPDATE] guard blocked role change', { userId, role, guard });
      return { success: false, error: guard.error || 'Admin safety check failed' };
    }

    const updatePayload: UserUpdate = {
      role,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);

    if (import.meta.env.DEV) console.log('[ROLE UPDATE] supabase update response', { data, error });

    if (error) {
      if (import.meta.env.DEV) console.error('[ROLE UPDATE] Full error:', {
        message: error.message,
        code: error.code,
        details: (error as { details?: unknown }).details,
      });
      return { success: false, error: error.message };
    }

    await logAdminAction('user_role_changed', {
      adminId: options?.adminId,
      targetUserId: userId,
      resourceType: 'user',
      resourceId: userId,
      details: { role },
    });

    if (import.meta.env.DEV) console.log('[ROLE UPDATE] completed successfully', { userId, role });

    return { success: true };
  } catch {
    if (import.meta.env.DEV) console.error('[ROLE UPDATE] exception thrown during update', { userId, role });
    return { success: false, error: 'Failed to update user role' };
  }
};

export const getLoginHistory = async (
  userId?: string
): Promise<{ success: boolean; history?: LoginHistory[]; error?: string }> => {
  try {
    let query = supabase
      .from('login_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, history: data };
  } catch {
    return { success: false, error: 'Failed to fetch login history' };
  }
};

export const getUserSessions = async (
  userId?: string
): Promise<{ success: boolean; sessions?: UserSession[]; error?: string }> => {
  try {
    let query = supabase
      .from('user_sessions')
      .select('*')
      .eq('revoked', false)
      .order('last_activity', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, sessions: data };
  } catch {
    return { success: false, error: 'Failed to fetch sessions' };
  }
};

export const revokeSession = async (
  sessionId: string,
  options?: { adminId?: string; targetUserId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatePayload: SessionUpdate = {
      revoked: true,
    };

    const { error } = await supabase
      .from('user_sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction('session_revoked', {
      adminId: options?.adminId,
      targetUserId: options?.targetUserId,
      resourceType: 'session',
      resourceId: sessionId,
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to revoke session' };
  }
};

export const getActivityLogs = async (
  userId?: string
): Promise<{ success: boolean; logs?: ActivityLog[]; error?: string }> => {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, logs: data };
  } catch {
    return { success: false, error: 'Failed to fetch activity logs' };
  }
};

export const getErrorReports = async (): Promise<{
  success: boolean;
  errors?: ErrorReport[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('error_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, errors: data };
  } catch {
    return { success: false, error: 'Failed to fetch error reports' };
  }
};

export const resolveError = async (
  errorId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatePayload: ErrorReportUpdate = {
      status: 'resolved',
    };

    const { error } = await supabase
      .from('error_reports')
      .update(updatePayload)
      .eq('id', errorId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction('error_status_updated', {
      resourceType: 'error_report',
      resourceId: errorId,
      details: { status: 'resolved' },
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to resolve error' };
  }
};

export const forceLogoutUserSessions = async (
  userId: string,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatePayload: SessionUpdate = {
      revoked: true,
    };

    const { error } = await supabase
      .from('user_sessions')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('revoked', false);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction('force_logout_all_sessions', {
      adminId: options?.adminId,
      targetUserId: userId,
      resourceType: 'user',
      resourceId: userId,
    });

    return { success: true };
  } catch  {
    return { success: false, error: 'Failed to revoke sessions' };
  }
};

export const getPendingApprovals = async (
  search?: string,
  limit: number = 50
): Promise<{ success: boolean; users?: User[]; error?: string }> => {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .in('status', ['pending_verification', 'pending_approval'])
      .order('created_at', { ascending: false })
      .limit(limit); // Add limit to prevent loading thousands of records

    if (search) {
      const term = `%${search}%`;
      query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, users: data ?? [] };
  } catch  {
    return { success: false, error: 'Failed to fetch pending approvals' };
  }
};

export const getApprovalStatistics = async (): Promise<{
  success: boolean;
  stats?: ApprovalStatistics;
  error?: string;
}> => {
  try {
    const fetchCount = async (filters?: Record<string, unknown>) => {
      let query = supabase.from('users').select('id', { count: 'exact', head: true });
      if (filters) {
        // Apply filters using eq() for each key-value pair
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      const { count, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return count ?? 0;
    };

    const [pendingApproval, pendingVerification, approved, rejected] = await Promise.all([
      fetchCount({ status: 'pending_approval' }),
      fetchCount({ status: 'pending_verification' }),
      fetchCount({ status: 'approved' }),
      fetchCount({ status: 'rejected' }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount, error: todayError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    if (todayError) {
      throw new Error(todayError.message);
    }

    return {
      success: true,
      stats: {
        pendingApproval,
        pendingVerification,
        approved,
        rejected,
        todaySignups: todayCount ?? 0,
        totalApproved: approved,
        totalPending: pendingApproval + pendingVerification,
      },
    };
  } catch  {
    return { success: false, error: 'Failed to fetch approval statistics' };
  }
};

export const getSuspiciousLogins = async (limit: number = 100): Promise<{
  success: boolean;
  events?: LoginHistory[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .or('suspicious.eq.true,success.eq.false')
      .order('created_at', { ascending: false })
      .limit(limit) // Add limit to prevent loading excessive records
      .limit(200);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, events: data ?? [] };
  } catch  {
    return { success: false, error: 'Failed to fetch suspicious logins' };
  }
};

export const updateErrorStatus = async (
  errorId: string,
  status: ErrorStatus,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatePayload: ErrorReportUpdate = {
      status,
    };

    const { error } = await supabase
      .from('error_reports')
      .update(updatePayload)
      .eq('id', errorId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction('error_status_updated', {
      adminId: options?.adminId,
      resourceType: 'error_report',
      resourceId: errorId,
      details: { status },
    });

    return { success: true };
  } catch  {
    return { success: false, error: 'Failed to update error status' };
  }
};

export const addErrorNote = async (
  errorId: string,
  note: string,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: ActivityLogInsert = {
      user_id: options?.adminId ?? null,
      action: 'error_note_added',
      resource_type: 'error_report',
      resource_id: errorId,
      details: { note },
    };

    const { error } = await supabase.from('activity_logs').insert(payload);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add error note' };
  }
};

export const getErrorNotes = async (
  errorId: string
): Promise<{ success: boolean; notes?: ActivityLog[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('resource_type', 'error_report')
      .eq('resource_id', errorId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notes: data ?? [] };
  } catch {
    return { success: false, error: 'Failed to fetch error notes' };
  }
};

export const retryErrorAction = async (
  errorId: string,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    await logAdminAction('error_retry_triggered', {
      adminId: options?.adminId,
      resourceType: 'error_report',
      resourceId: errorId,
    });

    return { success: true };
  } catch  {
    return { success: false, error: 'Failed to retry error action' };
  }
};

export const getErrorAttachments = async (
  errorId: string
): Promise<{
  success: boolean;
  attachments?: (Attachment & { download_url?: string | null })[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('resource_type', 'error_report')
      .eq('resource_id', errorId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const attachments = data ?? [];

    if (attachments.length === 0) {
      return { success: true, attachments: [] };
    }

    const paths = attachments.map(attachment => attachment.storage_path);
    const { data: signedUrls, error: signedError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrls(paths, ATTACHMENT_URL_EXPIRY_SECONDS);

    const attachmentsWithUrls = attachments.map((attachment, index) => ({
      ...attachment,
      download_url: signedUrls?.[index]?.signedUrl ?? null,
    }));

    if (signedError) {
      return {
        success: true,
        attachments: attachmentsWithUrls,
        error: signedError.message,
      };
    }

    return { success: true, attachments: attachmentsWithUrls };
  } catch  {
    return { success: false, error: 'Failed to fetch error attachments' };
  }
};

export const uploadErrorAttachment = async (
  errorId: string,
  file: File,
  options?: { adminId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name) || 'attachment';
    const path = `error-reports/${errorId}/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { error: insertError } = await supabase.from('attachments').insert({
      user_id: options?.adminId ?? null,
      resource_type: 'error_report',
      resource_id: errorId,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      storage_path: path,
    });

    if (insertError) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      return { success: false, error: insertError.message };
    }

    await logAdminAction('error_attachment_uploaded', {
      adminId: options?.adminId,
      resourceType: 'error_report',
      resourceId: errorId,
      details: {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    return { success: true };
  } catch  {
    return { success: false, error: 'Failed to upload attachment' };
  }
};
