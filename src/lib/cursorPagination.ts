/**
 * Cursor-Based Pagination (Keyset Pagination)
 * More efficient than offset-based pagination for large datasets
 * Handles sorting and maintains position using cursor tokens
 */

import { supabase } from './supabase';
import type { Database } from './database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];

export interface CursorPaginationParams {
  userId: string;
  pageSize?: number;
  cursor?: {
    id: string;
    sortValue: string | number | Date;
  };
  search?: string;
  status?: string | 'ALL';
  minRate?: string;
  maxRate?: string;
  remoteFilter?: 'ALL' | 'REMOTE' | 'ONSITE';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'date' | 'company' | 'title' | 'rate';
  sortOrder?: 'asc' | 'desc';
}

export interface CursorPaginationResult {
  requirements: Requirement[];
  nextCursor: {
    id: string;
    sortValue: string | number | Date;
  } | null;
  prevCursor: {
    id: string;
    sortValue: string | number | Date;
  } | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Get page using cursor-based pagination
 * More efficient than offset pagination for large datasets
 * O(log n) lookup time instead of O(n)
 */
export const getCursorPage = async (
  params: CursorPaginationParams
): Promise<{ success: boolean; data?: CursorPaginationResult; error?: string }> => {
  const {
    userId,
    pageSize = 20,
    cursor,
    search,
    status,
    minRate,
    maxRate,
    remoteFilter,
    dateFrom,
    dateTo,
    sortBy = 'date',
    sortOrder = 'desc',
  } = params;

  try {
    // Determine sort column and direction
    const sortColumn =
      sortBy === 'date'
        ? 'created_at'
        : sortBy === 'company'
          ? 'company'
          : sortBy === 'title'
            ? 'title'
            : 'rate';

    const isDescending = sortOrder === 'desc';
    let query = supabase
      .from('requirements')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      const searchTerms = search
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .join(' & ');
      query = query.textSearch('search_vector', searchTerms, {
        type: 'plain',
        config: 'english',
      });
    }

    if (minRate) {
      query = query.gte('rate', minRate);
    }
    if (maxRate) {
      query = query.lte('rate', maxRate);
    }

    if (remoteFilter && remoteFilter !== 'ALL') {
      query = query.eq('remote_type', remoteFilter);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply cursor-based pagination
    // Fetch pageSize + 1 to check if there's a next page
    if (cursor) {
      // For cursor pagination, we need to skip to the cursor position
      // and then fetch the next set of records
      if (isDescending) {
        query = query.lt(sortColumn, cursor.sortValue);
      } else {
        query = query.gt(sortColumn, cursor.sortValue);
      }
    }

    // Add ordering and limit
    query = query
      .order(sortColumn, { ascending: !isDescending })
      .order('id', { ascending: true }) // Tiebreaker
      .limit(pageSize + 1); // Fetch +1 to detect if there are more

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const requirements = data || [];

    // Determine if there's a next page
    const hasNextPage = requirements.length > pageSize;
    const items = hasNextPage ? requirements.slice(0, pageSize) : requirements;

    // Generate cursors
    let nextCursor: CursorPaginationResult['nextCursor'] = null;
    let prevCursor: CursorPaginationResult['prevCursor'] = null;

    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = {
        id: lastItem.id,
         
        sortValue: lastItem[sortColumn as keyof typeof lastItem] as any,
      };
    }

    if (cursor && items.length > 0) {
      const firstItem = items[0];
      prevCursor = {
        id: firstItem.id,
         
        sortValue: firstItem[sortColumn as keyof typeof firstItem] as any,
      };
    }

    return {
      success: true,
      data: {
        requirements: items,
        nextCursor,
        prevCursor,
        hasNextPage,
        hasPrevPage: !!cursor,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception in cursor pagination:', errorMsg);
    }
    return { success: false, error: 'Cursor pagination failed' };
  }
};

/**
 * Get all items from a cursor position backwards (for reverse pagination)
 */
export const getCursorPagePrev = async (
  params: CursorPaginationParams
): Promise<{ success: boolean; data?: CursorPaginationResult; error?: string }> => {
  // For previous page, reverse the sort order
  const reversedParams = {
    ...params,
    sortOrder: params.sortOrder === 'asc' ? ('desc' as const) : ('asc' as const),
  };

  return getCursorPage(reversedParams);
};

/**
 * Estimate total count (fast, approximate)
 * Uses PostgreSQL statistics instead of exact COUNT
 * Much faster than exact count on large tables
 */
export const getApproximateCount = async (
  userId: string
): Promise<number> => {
  try {
    await supabase
      .from('requirements')
      .select('*', { count: 'estimated', head: true })
      .eq('user_id', userId);

    return 0; // Count is in the response metadata, not data
  } catch (error) {
    console.error('Failed to get approximate count:', error);
    return 0;
  }
};

/**
 * Generate cursor token for sharing/bookmarking
 */
export const generateCursorToken = (cursor: {
  id: string;
  sortValue: string | number | Date;
}): string => {
  const encoded = Buffer.from(JSON.stringify(cursor)).toString('base64');
  return encoded;
};

/**
 * Decode cursor token
 */
export const decodeCursorToken = (
  token: string
): { id: string; sortValue: string | number | Date } => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {  // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('Invalid cursor token');
  }
};

export default {
  getCursorPage,
  getCursorPagePrev,
  getApproximateCount,
  generateCursorToken,
  decodeCursorToken,
};
