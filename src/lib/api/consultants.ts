import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Consultant = Database['public']['Tables']['consultants']['Row'];
type ConsultantInsert = Database['public']['Tables']['consultants']['Insert'];

export const getConsultants = async (
  userId?: string
): Promise<{ success: boolean; consultants?: Consultant[]; error?: string }> => {
  try {
    let query = supabase
      .from('consultants')
      .select('*')
      .order('updated_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, consultants: data };
  } catch {
    return { success: false, error: 'Failed to fetch consultants' };
  }
};

export const createConsultant = async (
  consultant: ConsultantInsert
): Promise<{ success: boolean; consultant?: Consultant; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('consultants')
      .insert(consultant)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, consultant: data };
  } catch {
    return { success: false, error: 'Failed to create consultant' };
  }
};

export const updateConsultant = async (
  id: string,
  updates: Partial<ConsultantInsert>
): Promise<{ success: boolean; consultant?: Consultant; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('consultants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, consultant: data };
  } catch {
    return { success: false, error: 'Failed to update consultant' };
  }
};

export const deleteConsultant = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('consultants')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete consultant' };
  }
};
