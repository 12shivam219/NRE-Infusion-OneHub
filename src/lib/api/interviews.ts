import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type InterviewInsert = Database['public']['Tables']['interviews']['Insert'];

export interface InterviewWithLogs extends Interview {
  created_by?: { id: string; full_name: string; email: string } | null;
  updated_by?: { id: string; full_name: string; email: string } | null;
}

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
      return { success: false, error: error.message };
    }

    return { success: true, interviews: data };
  } catch {
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
      return { success: false, error: error.message };
    }

    return { success: true, interview: data };
  } catch {
    return { success: false, error: 'Failed to fetch interview' };
  }
};

export const createInterview = async (
  interview: InterviewInsert,
  userId?: string
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const dataToInsert = {
      ...interview,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('interviews')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

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
      updated_by: userId || null,
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

    return { success: true, interview: data };
  } catch {
    return { success: false, error: 'Failed to update interview' };
  }
};

export const deleteInterview = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
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
