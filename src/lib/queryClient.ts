/**
 * React Query Configuration for Optimal Performance
 * Replaces scattered SWR usage with centralized caching
 * 
 * Installation: npm install @tanstack/react-query
 */

// Placeholder for when @tanstack/react-query is installed
// Uncomment when library is installed
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryFilters {
  [key: string]: unknown;
}

// ============================================
// 1. QUERY CLIENT CONFIGURATION
// ============================================

/**
 * To use this, uncomment the import and create the client instance
 * export const queryClient = new QueryClient({...})
 */
export const createQueryClient = () => {
  // Import will work after npm install @tanstack/react-query
  // const QueryClient = require('@tanstack/react-query').QueryClient;
  
  // return new QueryClient({
  return {
    defaultOptions: {
      queries: {
        // Keep data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        
        // Keep data in cache for 10 minutes even if stale
        gcTime: 10 * 60 * 1000,
        
        // Retry failed requests once
        retry: 1,
        
        // Don't refetch when window regains focus
        refetchOnWindowFocus: false,
        
        // Don't refetch on mount if data exists
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  };
  // });
};

// ============================================
// 2. QUERY KEY FACTORY
// ============================================

/**
 * Centralized query keys for consistency and refactoring safety
 * Prevents string typos and enables easy cache invalidation
 */
export const queryKeys = {
  // Requirements queries
  requirements: {
    all: ['requirements'] as const,
    lists: () => [...queryKeys.requirements.all, 'list'] as const,
    list: (userId: string, filters?: QueryFilters) => [
      ...queryKeys.requirements.lists(),
      { userId, ...filters },
    ] as const,
    details: () => [...queryKeys.requirements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.requirements.details(), id] as const,
  },

  // Consultants queries
  consultants: {
    all: ['consultants'] as const,
    lists: () => [...queryKeys.consultants.all, 'list'] as const,
    list: (userId: string, filters?: QueryFilters) => [
      ...queryKeys.consultants.lists(),
      { userId, ...filters },
    ] as const,
    details: () => [...queryKeys.consultants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.consultants.details(), id] as const,
    search: (term: string) => [...queryKeys.consultants.lists(), 'search', term] as const,
  },

  // Interviews queries
  interviews: {
    all: ['interviews'] as const,
    lists: () => [...queryKeys.interviews.all, 'list'] as const,
    list: (userId: string, filters?: QueryFilters) => [
      ...queryKeys.interviews.lists(),
      { userId, ...filters },
    ] as const,
    details: () => [...queryKeys.interviews.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.interviews.details(), id] as const,
  },
};

// ============================================
// 3. CACHE INVALIDATION HELPERS
// ============================================

/**
 * Helper function to invalidate requirements cache after mutations
 * Usage: await invalidateRequirementsCache(queryClient);
 */
export const invalidateRequirementsCache = (qc: unknown) => {
  const queryClient = qc as { invalidateQueries: (opts: unknown) => unknown };
  return queryClient.invalidateQueries({
    queryKey: queryKeys.requirements.lists(),
  });
};

/**
 * Helper function to invalidate consultants cache after mutations
 * Usage: await invalidateConsultantsCache(queryClient);
 */
export const invalidateConsultantsCache = (qc: unknown) => {
  const queryClient = qc as { invalidateQueries: (opts: unknown) => unknown };
  return queryClient.invalidateQueries({
    queryKey: queryKeys.consultants.lists(),
  });
};

/**
 * Helper function to invalidate interviews cache after mutations
 * Usage: await invalidateInterviewsCache(queryClient);
 */
export const invalidateInterviewsCache = (qc: unknown) => {
  const queryClient = qc as { invalidateQueries: (opts: unknown) => unknown };
  return queryClient.invalidateQueries({
    queryKey: queryKeys.interviews.lists(),
  });
};
