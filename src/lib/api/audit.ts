import { supabase } from '../supabase';
import type { Database } from '../database.types';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

type ResourceType =
  | 'requirement'
  | 'interview'
  | 'consultant'
  | 'bulk_email_campaign'
  | 'requirement_email'
  | string;

type LogDetails = Record<string, unknown> | null | undefined;

export interface ActivityLogResult {
  success: boolean;
  logs?: ActivityLog[];
  error?: string;
}

const resolveUserAgent = () => {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.slice(0, 300);
  }
  return null;
};

/**
 * Write a unified audit entry for CRM/marketing flows.
 * Stores actor in `user_id` for queryability; additional context lives in `details`.
 */
export const logActivity = async (params: {
  action: string;
  actorId?: string | null;
  resourceType?: ResourceType;
  resourceId?: string | null;
  details?: LogDetails;
  ipAddress?: string | null;
}): Promise<void> => {
  const { action, actorId = null, resourceType = null, resourceId = null, details, ipAddress = null } = params;

  const payload: ActivityLogInsert = {
    user_id: actorId ?? null,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details
      ? {
          ...details,
          userAgent: resolveUserAgent(),
        }
      : { userAgent: resolveUserAgent() },
    ip_address: ipAddress,
  };

  try {
    const { error } = await supabase.from('activity_logs').insert(payload);
    if (error && import.meta.env.DEV) {
      console.error('[audit] insert failed', error);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[audit] insert exception', error);
    }
  }
};

/**
 * Fetch recent audit entries for a specific resource.
 */
export const getResourceActivityLogs = async (params: {
  resourceType: ResourceType;
  resourceId: string;
  limit?: number;
}): Promise<ActivityLogResult> => {
  const { resourceType, resourceId, limit = 20 } = params;

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, logs: data ?? [] };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[audit] fetch exception', error);
    }
    return { success: false, error: 'Failed to fetch audit logs' };
  }
};

