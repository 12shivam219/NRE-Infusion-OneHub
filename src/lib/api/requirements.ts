import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { logActivity } from './audit';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type RequirementInsert = Database['public']['Tables']['requirements']['Insert'];

export type RequirementWithLogs = Requirement;

// Cache for user lookups to prevent repeated queries
const userCache = new Map<string, { full_name: string; email: string } | null>();

export const getUserName = async (userId: string): Promise<{ full_name: string; email: string } | null> => {
  // Check cache first
  if (userCache.has(userId)) {
    return userCache.get(userId) || null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn(`Failed to fetch user ${userId}:`, error.message, error.code);
      userCache.set(userId, null);
      return null;
    }

    if (!data) {
      console.warn(`User ${userId} not found in database - no data returned`);
      userCache.set(userId, null);
      return null;
    }

    // Handle cases where full_name might be empty string or null
    const fullName = data.full_name && data.full_name.trim() ? data.full_name : data.email?.split('@')[0] || 'Unknown';
    
    const result = { full_name: fullName, email: data.email || 'N/A' };
    // Don't log sensitive user data - security best practice
    userCache.set(userId, result);
    return result;
  } catch (err) {
    // Log error without sensitive data
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error fetching user:`, errorMsg);
    }
    userCache.set(userId, null);
    return null;
  }
};

export const getRequirementsCount = async (
  userId?: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    let query = supabase
      .from('requirements')
      .select('*', { count: 'exact', head: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching requirements count:', error.message);
      }
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching requirements count:', errorMsg);
    }
    return { success: false, count: 0, error: 'Failed to fetch count' };
  }
};

export const getRequirements = async (
  userId?: string
): Promise<{ success: boolean; requirements?: RequirementWithLogs[]; error?: string }> => {
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
      // Log error without sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching requirements:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, requirements: data || [] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching requirements:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch requirements' };
  }
};

export const getRequirementsPage = async (
  options: {
    userId?: string;
    limit?: number;
    offset?: number; // fallback pagination
    cursor?: { created_at: string; direction?: 'after' | 'before' };
    includeCount?: boolean; // avoid costly exact counts by default
    search?: string;
    status?: string | 'ALL';
    dateFrom?: string;
    dateTo?: string;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }
): Promise<{ success: boolean; requirements?: RequirementWithLogs[]; total?: number; error?: string }> => {
  const {
    userId,
    limit = 20,
    offset = 0,
    cursor,
    includeCount = false,
    search,
    status,
    dateFrom,
    dateTo,
    orderBy = 'created_at',
    orderDir = 'desc',
  } = options;

  try {
    const countMode = includeCount ? 'exact' : undefined;
    let query = supabase.from('requirements').select('*', { count: countMode as 'exact' | undefined });

    if (userId) query = query.eq('user_id', userId);
    if (status && status !== 'ALL') query = query.eq('status', status);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      // Uses pg_trgm extension for fast substring search on large datasets
      // For best performance with 10K+ records, enable GIN indexes on searched columns
      // Prefer trigram search for single-term substring matches; full-text search (search_vector) can be used via migration.
      query = query.or(`title.ilike.${term},company.ilike.${term},primary_tech_stack.ilike.${term},vendor_company.ilike.${term}`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Keyset / cursor pagination: prefer cursor over offset when provided.
    query = query.order(orderBy, { ascending: orderDir === 'asc' });

    if (cursor && cursor.created_at) {
      // Simple keyset using created_at as cursor. For most apps this is sufficient; a tiebreaker on id
      // could be added if necessary.
      if (orderDir === 'desc') {
        // fetch older than cursor
        if (cursor.direction === 'after') {
          query = query.lt('created_at', cursor.created_at);
        } else if (cursor.direction === 'before') {
          query = query.gt('created_at', cursor.created_at);
        }
      } else {
        if (cursor.direction === 'after') {
          query = query.gt('created_at', cursor.created_at);
        } else if (cursor.direction === 'before') {
          query = query.lt('created_at', cursor.created_at);
        }
      }

      // apply page size
      query = query.limit(limit);
    } else {
      // fallback to offset/range pagination
      const start = offset;
      const end = offset + limit - 1;
      query = query.range(start, end);
    }

    const { data, count, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching paged requirements:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, requirements: data || [], total: count ?? 0 };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching paged requirements:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch requirements' };
  }
};

export const getRequirementById = async (
  id: string
): Promise<{ success: boolean; requirement?: Requirement; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching requirement:', error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true, requirement: data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception fetching requirement:', errorMsg);
    }
    return { success: false, error: 'Failed to fetch requirement' };
  }
};

export const createRequirement = async (
  requirement: RequirementInsert,
  userId?: string
): Promise<{ success: boolean; requirement?: Requirement; error?: string }> => {
  try {
    // Don't set requirement_number - let the database handle it via trigger or default
    // This avoids race conditions and duplicate key violations
    const dataToInsert = {
      ...requirement,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('requirements')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Write audit entry (best effort)
    await logActivity({
      action: 'requirement_created',
      actorId: userId,
      resourceType: 'requirement',
      resourceId: data.id,
      details: {
        requirement_number: data.requirement_number,
        title: data.title,
      },
    });

    return { success: true, requirement: data };
  } catch {
    return { success: false, error: 'Failed to create requirement' };
  }
};

export const updateRequirement = async (
  id: string,
  updates: Partial<RequirementInsert>,
  userId?: string
): Promise<{ success: boolean; requirement?: Requirement; error?: string }> => {
  try {
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    };

    const { data, error } = await supabase
      .from('requirements')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logActivity({
      action: 'requirement_updated',
      actorId: userId,
      resourceType: 'requirement',
      resourceId: id,
      details: {
        fields: Object.keys(updates),
      },
    });

    return { success: true, requirement: data };
  } catch {
    return { success: false, error: 'Failed to update requirement' };
  }
};

export const deleteRequirement = async (
  id: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await logActivity({
      action: 'requirement_deleted',
      actorId: userId,
      resourceType: 'requirement',
      resourceId: id,
    });

    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete requirement' };
  }
};