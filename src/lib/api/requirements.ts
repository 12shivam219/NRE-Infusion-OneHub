import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { logActivity } from './audit';
import { getCacheValue, setCacheValue, generateRequirementsCacheKey } from '../redis';
import { searchRequirements, indexRequirement } from '../elasticsearch';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type RequirementInsert = Database['public']['Tables']['requirements']['Insert'];

export type RequirementWithLogs = Requirement;

const VALID_REQUIREMENT_STATUSES: Requirement['status'][] = ['NEW', 'IN_PROGRESS', 'SUBMITTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'CLOSED'];

// Cache for user lookups to prevent repeated queries
const userCache = new Map<string, { full_name: string; email: string } | null>();

// ⚡ OPTIMIZATION: In-memory cache for paginated queries to prevent duplicate API calls
// Stores response for up to 30 seconds to handle rapid filter changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queryCache = new Map<string, { data: any; timestamp: number }>();
const QUERY_CACHE_TTL = 30_000;  // 30 seconds

const getCachedQuery = (cacheKey: string) => {
  const cached = queryCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > QUERY_CACHE_TTL) {
    queryCache.delete(cacheKey);
    return null;
  }
  return cached.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setCachedQuery = (cacheKey: string, data: any) => {
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
  // Cleanup old entries if cache gets too large
  if (queryCache.size > 100) {
    const oldest = Array.from(queryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 50);
    oldest.forEach(([key]) => queryCache.delete(key));
  }
};

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
    minRate?: string;
    maxRate?: string;
    remoteFilter?: 'ALL' | 'REMOTE' | 'ONSITE';
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
    minRate,
    maxRate,
    remoteFilter,
  } = options;

  try {
    const cacheKey = JSON.stringify({
      userId, limit, offset, search, status, dateFrom, dateTo,
      orderBy, orderDir, minRate, maxRate, remoteFilter
    });

    // ⚡ ADVANCED: Try Redis cache first (distributed caching)
    const redisCacheKey = generateRequirementsCacheKey({
      userId: userId || '',
      page: offset ? Math.floor(offset / limit) : 0,
      pageSize: limit,
      search,
      status,
      minRate,
      maxRate,
      remoteFilter,
      sortBy: orderBy,
      sortOrder: orderDir,
    });

    const redisResult = await getCacheValue<any>(redisCacheKey);  // eslint-disable-line @typescript-eslint/no-explicit-any
    if (redisResult) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Redis Cache Hit] Requirements query');
      }
      return redisResult;
    }

    // Fallback to in-memory cache
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Cache Hit] Requirements query:', { userId, search, status });
      }
      return cachedResult;
    }

    // ⚡ ADVANCED: Try Elasticsearch first for better performance on 100K+ records
    if (search) {
      const esResult = await searchRequirements({
        query: search,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: status as any,
        minRate: minRate ? parseFloat(minRate) : undefined,
        maxRate: maxRate ? parseFloat(maxRate) : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remoteFilter: remoteFilter as any,
        dateFrom,
        dateTo,
        limit,
        offset,
        sortBy: orderBy,
        sortOrder: orderDir,
      });

      if (esResult) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Elasticsearch] Search successful:', {
            results: esResult.hits.length,
            total: esResult.total,
          });
        }

        const result = { success: true, requirements: esResult.hits, total: esResult.total };
        // Cache Elasticsearch result
        await setCacheValue(redisCacheKey, result, { ttl: 1800 });
        setCachedQuery(cacheKey, result);
        return result;
      }
    }

    // ⚡ Performance tracking for 50K+ record queries
    const queryStartTime = performance.now();

    const countMode = includeCount ? 'exact' : undefined;
    let query = supabase.from('requirements').select('*', { count: countMode as 'exact' | undefined });

    if (userId) query = query.eq('user_id', userId);
    if (status && status !== 'ALL' && VALID_REQUIREMENT_STATUSES.includes(status as Requirement['status'])) query = query.eq('status', status);

    if (search && search.trim()) {
      const raw = search.trim().slice(0, 120);
      const cleaned = raw
        .replace(/[(),]/g, ' ')
        .replace(/[%_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned) {
        const like = cleaned;

        const orFilters: string[] = [
          `title.ilike.%${like}%`,
          `company.ilike.%${like}%`,
          `vendor_company.ilike.%${like}%`,
          `primary_tech_stack.ilike.%${like}%`,
          `location.ilike.%${like}%`,
          `description.ilike.%${like}%`,
          `applied_for.ilike.%${like}%`,
          `imp_name.ilike.%${like}%`,
          `client_website.ilike.%${like}%`,
          `imp_website.ilike.%${like}%`,
          `vendor_website.ilike.%${like}%`,
          `vendor_person_name.ilike.%${like}%`,
          `vendor_phone.ilike.%${like}%`,
          `vendor_email.ilike.%${like}%`,
          `next_step.ilike.%${like}%`,
          `duration.ilike.%${like}%`,
          `remote.ilike.%${like}%`,
          `rate.ilike.%${like}%`,
        ];

        const num = Number(cleaned);
        if (Number.isFinite(num) && /^\d+$/.test(cleaned)) {
          orFilters.push(`requirement_number.eq.${cleaned}`);
        }

        const upper = cleaned.toUpperCase();
        if (VALID_REQUIREMENT_STATUSES.includes(upper as Requirement['status'])) {
          orFilters.push(`status.eq.${upper}`);
        }

        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleaned)) {
          orFilters.push(`id.eq.${cleaned}`);
        }

        const isoMonth = cleaned.match(/^(\d{4})-(\d{2})$/);
        const isoDay = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const isoYear = cleaned.match(/^(\d{4})$/);
        if (isoDay) {
          const from = new Date(`${isoDay[1]}-${isoDay[2]}-${isoDay[3]}T00:00:00.000Z`);
          const to = new Date(from);
          to.setUTCDate(to.getUTCDate() + 1);
          orFilters.push(`and(created_at.gte.${from.toISOString()},created_at.lt.${to.toISOString()})`);
        } else if (isoMonth) {
          const from = new Date(`${isoMonth[1]}-${isoMonth[2]}-01T00:00:00.000Z`);
          const to = new Date(from);
          to.setUTCMonth(to.getUTCMonth() + 1);
          orFilters.push(`and(created_at.gte.${from.toISOString()},created_at.lt.${to.toISOString()})`);
        } else if (isoYear) {
          const from = new Date(`${isoYear[1]}-01-01T00:00:00.000Z`);
          const to = new Date(from);
          to.setUTCFullYear(to.getUTCFullYear() + 1);
          orFilters.push(`and(created_at.gte.${from.toISOString()},created_at.lt.${to.toISOString()})`);
        }

        query = query.or(orFilters.join(','));
      }
    }

    if (minRate) {
      const minNum = parseFloat(minRate);
      if (!isNaN(minNum)) {
        query = query.gte('rate', minNum.toString());
      }
    }
    if (maxRate) {
      const maxNum = parseFloat(maxRate);
      if (!isNaN(maxNum)) {
        query = query.lte('rate', maxNum.toString());
      }
    }

    // ⚡ OPTIMIZATION: Push remote filter to database
    if (remoteFilter && remoteFilter !== 'ALL') {
      query = query.eq('remote', remoteFilter);
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
      // fallback to offset pagination using range
      query = query.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching paged requirements:', error.message);
      }
      return { success: false, error: error.message };
    }

    const result = { success: true, requirements: data || [], total: count ?? 0 };
    
    // ⚡ OPTIMIZATION: Store successful result in both Redis and in-memory cache
    setCachedQuery(cacheKey, result);
    await setCacheValue(redisCacheKey, result, { ttl: 1800 });

    // Index in Elasticsearch if available
    if (data && data.length > 0) {
      for (const req of data) {
        await indexRequirement(req).catch(err => {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[Elasticsearch] Index failed for', req.id, err);
          }
        });
      }
    }

    // ⚡ Performance logging for optimization tracking
    const queryDuration = performance.now() - queryStartTime;
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Query Performance] Search="${search}" Status="${status}" Duration=${queryDuration.toFixed(2)}ms Results=${(data || []).length}`);
    }
    
    return result;
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

    // ⚡ Index in Elasticsearch for advanced search
    await indexRequirement(data).catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Elasticsearch] Indexing failed:', err);
      }
    });

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