/**
 * Elasticsearch Integration for 100K+ Records
 * Provides advanced search with full-text, filtering, and aggregations
 * Falls back to PostgreSQL if unavailable
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
let esClient: any = null;
let isElasticsearchAvailable = false;

/**
 * Initialize Elasticsearch connection
 */
export const initializeElasticsearch = async (config?: ElasticsearchConfig) => {
  if (!config) {
    console.info('[Elasticsearch] Not configured, using PostgreSQL search');
    return;
  }

  try {
    // Uncomment when @elastic/elasticsearch package is installed
    // const { Client } = await import('@elastic/elasticsearch');
    // esClient = new Client(config);
    // await esClient.ping();
    // isElasticsearchAvailable = true;
    // console.log('[Elasticsearch] Connected successfully');
    // await createRequirementsIndex();
  } catch (error) {
    console.warn('[Elasticsearch] Connection failed, using PostgreSQL:', error);
    isElasticsearchAvailable = false;
  }
};

/**
 * Create Elasticsearch index with optimized mappings
 */
export const createRequirementsIndex = async () => {
  if (!isElasticsearchAvailable || !esClient) return;

  try {
    const indexExists = await esClient.indices.exists({ index: 'requirements' });
    if (indexExists) return;

    await esClient.indices.create({
      index: 'requirements',
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              custom_analyzer: {
                type: 'standard',
                stopwords: '_english_',
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'custom_analyzer',
              fields: { keyword: { type: 'keyword' } },
            },
            company: {
              type: 'text',
              analyzer: 'custom_analyzer',
              fields: { keyword: { type: 'keyword' } },
            },
            primary_tech_stack: {
              type: 'text',
              analyzer: 'custom_analyzer',
            },
            status: { type: 'keyword' },
            rate: {
              type: 'float',
              index: true,
            },
            remote_type: { type: 'keyword' },
            created_at: { type: 'date' },
            user_id: { type: 'keyword' },
          },
        },
      },
    });

    console.log('[Elasticsearch] Index created successfully');
  } catch (error) {
    console.warn('[Elasticsearch] Failed to create index:', error);
  }
};

/**
 * Index a requirement in Elasticsearch
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const indexRequirement = async (requirement: any) => {
  if (!isElasticsearchAvailable || !esClient) return;

  try {
    await esClient.index({
      index: 'requirements',
      id: requirement.id,
      body: {
        title: requirement.title,
        company: requirement.company,
        primary_tech_stack: requirement.primary_tech_stack,
        status: requirement.status,
        rate: requirement.rate ? parseFloat(requirement.rate) : null,
        remote_type: requirement.remote_type,
        created_at: requirement.created_at,
        user_id: requirement.user_id,
      },
    });
  } catch (error) {
    console.warn('[Elasticsearch] Failed to index requirement:', error);
  }
};

/**
 * Bulk index requirements (for migrations/syncs)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bulkIndexRequirements = async (requirements: any[]) => {
  if (!isElasticsearchAvailable || !esClient) return;

  try {
    const bulkOps = requirements.flatMap((req) => [
      { index: { _index: 'requirements', _id: req.id } },
      {
        title: req.title,
        company: req.company,
        primary_tech_stack: req.primary_tech_stack,
        status: req.status,
        rate: req.rate ? parseFloat(req.rate) : null,
        remote_type: req.remote_type,
        created_at: req.created_at,
        user_id: req.user_id,
      },
    ]);

    await esClient.bulk({ operations: bulkOps });
    console.log(`[Elasticsearch] Indexed ${requirements.length} requirements`);
  } catch (error) {
    console.warn('[Elasticsearch] Bulk indexing failed:', error);
  }
};

/**
 * Search requirements using Elasticsearch
 */
export const searchRequirements = async (
  params: SearchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ hits: any[]; total: number } | null> => {
  if (!isElasticsearchAvailable || !esClient) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const must: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any[] = [];

    // Full-text search
    if (params.query && params.query.trim()) {
      must.push({
        multi_match: {
          query: params.query,
          fields: ['title^2', 'company^1.5', 'primary_tech_stack'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Status filter
    if (params.status && params.status !== 'ALL') {
      filter.push({ term: { status: params.status } });
    }

    // Rate range
    if (params.minRate || params.maxRate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const range: any = {};
      if (params.minRate) range.gte = params.minRate;
      if (params.maxRate) range.lte = params.maxRate;
      filter.push({ range: { rate: range } });
    }

    // Remote type
    if (params.remoteFilter && params.remoteFilter !== 'ALL') {
      filter.push({ term: { remote_type: params.remoteFilter } });
    }

    // Date range
    if (params.dateFrom || params.dateTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const range: any = {};
      if (params.dateFrom) range.gte = params.dateFrom;
      if (params.dateTo) range.lte = params.dateTo;
      filter.push({ range: { created_at: range } });
    }

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };

    // Sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sort: any[] = [];
    if (params.sortBy === 'title') {
      sort.push({ 'title.keyword': params.sortOrder || 'asc' });
    } else if (params.sortBy === 'company') {
      sort.push({ 'company.keyword': params.sortOrder || 'asc' });
    } else {
      sort.push({ created_at: params.sortOrder || 'desc' });
    }

    const response = await esClient.search({
      index: 'requirements',
      body: {
        query,
        sort,
        from: params.offset || 0,
        size: params.limit || 20,
      },
    });

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hits: response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
      })),
      total: response.hits.total.value,
    };
  } catch (error) {
    console.warn('[Elasticsearch] Search failed:', error);
    return null;
  }
};

/**
 * Delete requirement from Elasticsearch
 */
export const deleteRequirementIndex = async (id: string) => {
  if (!isElasticsearchAvailable || !esClient) return;

  try {
    await esClient.delete({
      index: 'requirements',
      id,
    });
  } catch (error) {
    console.warn('[Elasticsearch] Failed to delete index:', error);
  }
};

/**
 * Get Elasticsearch health status
 */
export const getElasticsearchHealth = async () => {
  if (!isElasticsearchAvailable || !esClient) {
    return { status: 'unavailable', message: 'Elasticsearch not configured' };
  }

  try {
    const health = await esClient.cluster.health();
    return {
      status: health.status,
      nodes: health.number_of_nodes,
      activeShards: health.active_shards,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
