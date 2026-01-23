/**
 * Performance Configuration for Enterprise-Scale Application
 * Timeouts, batch sizes, cache TTLs, and pagination settings
 */

export const PERFORMANCE_CONFIG = {
  // Query timeouts (ms)
  QUERY_TIMEOUTS: {
    USER_FACING: 5000,        // 5 seconds for user-facing queries
    ADMIN_OPERATIONS: 30000,   // 30 seconds for admin queries
    BACKGROUND_JOBS: 300000,   // 5 minutes for background operations
  },

  // Pagination settings
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200,
    USE_CURSOR: true,          // Always use cursor pagination
    OFFSET_ONLY_FOR_ADMIN: true, // Allow offset only in admin views
  },

  // Caching TTLs (seconds)
  CACHE_TTL: {
    ADMIN_STATISTICS: 3600,     // 1 hour
    REQUIREMENTS_PAGE: 300,      // 5 minutes
    CONSULTANTS_PAGE: 300,       // 5 minutes
    INTERVIEWS_PAGE: 300,        // 5 minutes
    DOCUMENTS_PAGE: 300,         // 5 minutes
    USER_PROFILES: 600,          // 10 minutes
    SEARCH_RESULTS: 300,         // 5 minutes
  },

  // Batch operation settings
  BATCH_OPERATIONS: {
    MAX_BATCH_SIZE: 1000,       // Max items per batch operation
    BATCH_INSERT_SIZE: 100,     // Batch inserts in groups of 100
    BATCH_UPDATE_SIZE: 50,      // Batch updates in groups of 50
    BATCH_DELETE_SIZE: 100,     // Batch deletes in groups of 100
  },

  // Search settings
  SEARCH: {
    MAX_RESULTS: 200,           // Cap search results
    MIN_TERM_LENGTH: 2,         // Minimum search term length
    USE_FTS: true,              // Use full-text search
  },

  // Performance thresholds
  THRESHOLDS: {
    SLOW_QUERY_MS: 100,         // Log queries slower than 100ms
    SLOW_ADMIN_QUERY_MS: 500,   // Log admin queries slower than 500ms
  },

  // Connection pooling
  DATABASE: {
    POOL_SIZE: 50,              // Connection pool size
    IDLE_TIMEOUT: 30000,        // 30 seconds idle timeout
    MAX_LIFETIME: 600000,        // 10 minutes max connection lifetime
  },
} as const;

/**
 * Get appropriate timeout based on query type
 */
export const getQueryTimeout = (queryType: 'user' | 'admin' | 'background'): number => {
  return PERFORMANCE_CONFIG.QUERY_TIMEOUTS[
    queryType === 'user' ? 'USER_FACING' :
    queryType === 'admin' ? 'ADMIN_OPERATIONS' :
    'BACKGROUND_JOBS'
  ];
};

/**
 * Get cache TTL for specific resource
 */
export const getCacheTTL = (resource: keyof typeof PERFORMANCE_CONFIG.CACHE_TTL): number => {
  return PERFORMANCE_CONFIG.CACHE_TTL[resource];
};

/**
 * Validate pagination parameters
 */
export const validatePaginationParams = (pageSize: number, offset: number = 0): { pageSize: number; offset: number } => {
  const validPageSize = Math.min(
    Math.max(pageSize, 1),
    PERFORMANCE_CONFIG.PAGINATION.MAX_PAGE_SIZE
  );
  const validOffset = Math.max(offset, 0);
  return { pageSize: validPageSize, offset: validOffset };
};

/**
 * Check if should use cursor pagination
 */
export const shouldUseCursorPagination = (itemCount: number): boolean => {
  return PERFORMANCE_CONFIG.PAGINATION.USE_CURSOR && itemCount >= 100;
};
