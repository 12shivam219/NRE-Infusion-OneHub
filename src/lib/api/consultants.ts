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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching consultants:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, consultants: data || [] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching consultants:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch consultants' };
  }
};

/**
 * Get consultants with server-side pagination and filtering
 * Optimized for 10K+ records with minimal client-side processing
 */
export const getConsultantsPage = async (options: {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}): Promise<{ success: boolean; consultants?: ConsultantWithLogs[]; total?: number; error?: string }> => {
  const {
    userId,
    limit = 20,
    offset = 0,
    search,
    status,
  } = options;

  try {
    let query = supabase
      .from('consultants')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Server-side filtering
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      // Use ilike for trigram-optimized search (enable pg_trgm for best performance)
      query = query.or(`name.ilike.${term},email.ilike.${term},primary_skills.ilike.${term}`);
    }

    // Server-side pagination
    const start = offset;
    const end = offset + limit - 1;
    query = query.range(start, end);

    const { data, count, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching paged consultants:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, consultants: data || [], total: count ?? 0 };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching paged consultants:', errorMsg);
    }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching consultant:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, consultant: data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching consultant:', errorMsg);
    }
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
