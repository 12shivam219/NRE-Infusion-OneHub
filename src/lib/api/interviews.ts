import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type InterviewInsert = Database['public']['Tables']['interviews']['Insert'];

export const getInterviews = async (
  userId?: string
): Promise<{ success: boolean; interviews?: Interview[]; error?: string }> => {
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

export const createInterview = async (
  interview: InterviewInsert
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .insert(interview)
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
  updates: Partial<InterviewInsert>
): Promise<{ success: boolean; interview?: Interview; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
