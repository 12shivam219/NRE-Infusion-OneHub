import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { logActivity } from './audit';

type Interview = Database['public']['Tables']['interviews']['Row'];
type InterviewInsert = Database['public']['Tables']['interviews']['Insert'];

export interface InterviewWithLogs extends Interview {
  created_by?: { id: string; full_name: string; email: string } | null;
  updated_by?: { id: string; full_name: string; email: string } | null;
}

export const getInterviewsPage = async (options: {
  userId: string;
  limit?: number;
  offset?: number;
  includeCount?: boolean;
  status?: string;
  excludeStatus?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  orderBy?: 'scheduled_date' | 'updated_at' | 'created_at';
  orderDir?: 'asc' | 'desc';
}): Promise<{ success: boolean; interviews?: InterviewWithLogs[]; total?: number; error?: string }> => {
  const {
    userId,
    limit = 20,
    offset = 0,
    includeCount = false,
    status,
    excludeStatus,
    scheduledFrom,
    scheduledTo,
    orderBy = 'scheduled_date',
    orderDir = 'asc',
  } = options;

  try {
    const countMode = includeCount ? 'exact' : undefined;
    let query = supabase
      .from('interviews')
      .select('*', { count: countMode as 'exact' | undefined })
      .eq('user_id', userId)
      .order(orderBy, { ascending: orderDir === 'asc' });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (excludeStatus) {
      query = query.neq('status', excludeStatus);
    }
    if (scheduledFrom) {
      query = query.gte('scheduled_date', scheduledFrom);
    }
    if (scheduledTo) {
      query = query.lte('scheduled_date', scheduledTo);
    }

    const start = offset;
    const end = offset + limit - 1;
    query = query.range(start, end);

    const { data, count, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching paged interviews:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, interviews: data || [], total: count ?? 0 };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching paged interviews:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch interviews' };
  }
};

export const getInterviews = async (
  userId?: string
): Promise<{ success: boolean; interviews?: InterviewWithLogs[]; error?: string }> => {
  try {
    let query = supabase
      .from('interviews')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching interviews:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, interviews: data || [] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching interviews:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch interviews' };
  }
};

export const getInterviewById = async (
  id: string
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching interview:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, interview: data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching interview:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch interview' };
  }
};

export const createInterview = async (
  interview: InterviewInsert,
  userId?: string
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const payload = {
      ...interview,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    };

    const { data, error } = await supabase
      .from('interviews')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logActivity({
      action: 'interview_created',
      actorId: userId,
      resourceType: 'interview',
      resourceId: data.id,
      details: { scheduled_date: data.scheduled_date },
    });

    return { success: true, interview: data };
  } catch {
    return { success: false, error: 'Failed to create interview' };
  }
};

export const updateInterview = async (
  id: string,
  updates: Partial<InterviewInsert>,
  userId?: string
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    };

    const { data, error } = await supabase
      .from('interviews')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logActivity({
      action: 'interview_updated',
      actorId: userId,
      resourceType: 'interview',
      resourceId: id,
      details: { fields: Object.keys(updates) },
    });

    return { success: true, interview: data };
  } catch {
    return { success: false, error: 'Failed to update interview' };
  }
};

export const deleteInterview = async (
  id: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await logActivity({
      action: 'interview_deleted',
      actorId: userId,
      resourceType: 'interview',
      resourceId: id,
    });

    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete interview' };
  }
};
