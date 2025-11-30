import { supabase } from '../supabase';
import type { Database, RequirementStatus } from '../database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type RequirementInsert = Database['public']['Tables']['requirements']['Insert'];

export const getRequirements = async (
  userId?: string
): Promise<{ success: boolean; requirements?: Requirement[]; error?: string }> => {
  try {
    let query = supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requirements: data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch requirements' };
  }
};

export const createRequirement = async (
  requirement: RequirementInsert
): Promise<{ success: boolean; requirement?: Requirement; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('requirements')
      .insert(requirement)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requirement: data };
  } catch (error) {
    return { success: false, error: 'Failed to create requirement' };
  }
};

export const updateRequirement = async (
  id: string,
  updates: Partial<RequirementInsert>
): Promise<{ success: boolean; requirement?: Requirement; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('requirements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requirement: data };
  } catch (error) {
    return { success: false, error: 'Failed to update requirement' };
  }
};

export const deleteRequirement = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete requirement' };
  }
};
