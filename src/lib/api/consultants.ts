import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Consultant = Database['public']['Tables']['consultants']['Row'];
type ConsultantInsert = Database['public']['Tables']['consultants']['Insert'];

export interface ConsultantWithLogs extends Consultant {
  created_by?: { id: string; full_name: string; email: string } | null;
  updated_by?: { id: string; full_name: string; email: string } | null;
}

export const getConsultants = async (
  userId?: string
): Promise<{ success: boolean; consultants?: ConsultantWithLogs[]; error?: string }> => {
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

export const getConsultantById = async (
  id: string
): Promise<{ success: boolean; consultant?: Consultant; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('consultants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, consultant: data };
  } catch {
    return { success: false, error: 'Failed to fetch consultant' };
  }
};

export const createConsultant = async (
  consultant: ConsultantInsert,
  userId?: string
): Promise<{ success: boolean; consultant?: Consultant; error?: string }> => {
  try {
    const dataToInsert = {
      ...consultant,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('consultants')
      .insert(dataToInsert)
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
  updates: Partial<ConsultantInsert>,
  userId?: string
): Promise<{ success: boolean; consultant?: Consultant; error?: string }> => {
  try {
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('consultants')
      .update(dataToUpdate)
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
