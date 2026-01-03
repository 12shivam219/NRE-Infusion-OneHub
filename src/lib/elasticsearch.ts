/**
 * Search Integration
 * NOTE: Elasticsearch is a backend-only service (requires Node.js).
 * This frontend always uses PostgreSQL with trigram indexes for search.
 * 
 * For 100K+ records with a backend, implement Elasticsearch server-side.
 */

interface ElasticsearchConfig {
  node: string;
  auth?: {
    username: string;
    password: string;
  };
}

interface SearchParams {
  query: string;
  status?: string;
  minRate?: number;
  maxRate?: number;
  remoteFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Initialize search service
 * NOTE: Elasticsearch is not available in browser context
 */
export const initializeElasticsearch = async (config?: ElasticsearchConfig) => {
  if (!config) {
    console.info('[Search] Using PostgreSQL search with trigram indexes');
    return;
  }
  
  console.info('[Search] Browser uses PostgreSQL. For Elasticsearch, implement on backend.');
};

/**
 * Create search index - Not available in browser
 */
export const createRequirementsIndex = async () => {
  // No-op: PostgreSQL indexes created via migration 021
};

/**
 * Index requirement - Not available in browser
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const indexRequirement = async (_requirement: any) => {
  // No-op: Indexing should happen server-side for Elasticsearch
};

/**
 * Bulk index requirements - Not available in browser
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const bulkIndexRequirements = async (_requirements: any[]) => {
  // No-op: Bulk indexing should happen server-side
};

/**
 * Search requirements - Returns null to use PostgreSQL
 */
export const searchRequirements = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: SearchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ hits: any[]; total: number } | null> => {
  // Return null to trigger PostgreSQL fallback
  return null;
};

/**
 * Delete from search index - Not available in browser
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const deleteRequirementIndex = async (_id: string) => {
  // No-op: Deletion should happen server-side
};

/**
 * Get search service health
 */
export const getElasticsearchHealth = async () => {
  return {
    status: 'available',
    message: 'Using PostgreSQL with trigram indexes',
  };
};

export default {
  initializeElasticsearch,
  createRequirementsIndex,
  indexRequirement,
  bulkIndexRequirements,
  searchRequirements,
  deleteRequirementIndex,
  getElasticsearchHealth,
};
