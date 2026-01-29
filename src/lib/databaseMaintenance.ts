/**
 * Database Maintenance Tasks
 * Run periodically (weekly recommended) to maintain query performance
 * Can be scheduled via cron job or manual execution
 */

import { supabase } from './supabase';

/**
 * Run VACUUM ANALYZE on all tables
 * Reclaims storage, updates query planner statistics
 * Recommended: Weekly or after bulk operations
 */
export const runMaintenanceVacuum = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // List of critical tables to maintain
    const tablesToMaintain = [
      'requirements',
      'consultants',
      'interviews',
      'documents',
      'users',
      'activity_logs',
      'login_history',
      'requirement_emails',
      'campaign_recipients',
      'error_reports',
      'bulk_email_campaigns',
    ];

    for (const table of tablesToMaintain) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `VACUUM ANALYZE ${table};`,
      });

      if (error) {
        console.warn(`VACUUM ANALYZE failed for ${table}:`, error);
      } else {
        console.log(`VACUUM ANALYZE completed for ${table}`);
      }
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Maintenance task failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Get index statistics and efficiency metrics
 * Use to identify unused or inefficient indexes
 */
export const getIndexStatistics = async (): Promise<{
  success: boolean;
  indexes?: Array<{
    tablename: string;
    indexname: string;
    scans: number;
    tuples_read: number;
    tuples_fetched: number;
    size: string;
  }>;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('pg_stat_user_indexes')
      .select('*')
      .order('idx_scan', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, indexes: data || [] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to get index statistics:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Get slow query analysis
 * Requires pg_stat_statements extension to be enabled
 */
export const getSlowQueryAnalysis = async (): Promise<{
  success: boolean;
  queries?: Array<{
    query: string;
    calls: number;
    mean_time: number;
    max_time: number;
    total_time: number;
  }>;
  error?: string;
}> => {
  try {
    // Query the slow_queries view created in migration 031
    const { data, error } = await supabase
      .from('slow_queries')
      .select('*')
      .order('mean_exec_time', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, queries: data || [] };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to get slow query analysis:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Get database size information
 */
export const getDatabaseSizeInfo = async (): Promise<{
  success: boolean;
  sizes?: {
    database: string;
    indexes: string;
    tables: string;
    unused_indexes: string;
  };
  error?: string;
}> => {
  try {
    // Get unused indexes
    const { data: unusedIndexes, error: unusedError } = await supabase
      .from('unused_indexes')
      .select('*');

    if (unusedError) {
      throw new Error(unusedError.message);
    }

    return {
      success: true,
      sizes: {
        database: 'Query pg_database_size(current_database())',
        indexes: `${unusedIndexes?.length || 0} unused indexes found`,
        tables: 'Check pg_total_relation_size()',
         
        unused_indexes: `Total size: ${(unusedIndexes as any)?.reduce((sum: number, idx: any) => sum + (idx.index_size || 0), 0)}`,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to get database size info:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Refresh materialized views
 * Updates pre-computed statistics for admin dashboard
 */
export const refreshMaterializedViews = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const viewsToRefresh = [
      'user_approval_stats',
    ];

    for (const view of viewsToRefresh) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `REFRESH MATERIALIZED VIEW CONCURRENTLY ${view};`,
      });

      if (error) {
        console.warn(`Failed to refresh ${view}:`, error);
      } else {
        console.log(`Refreshed materialized view: ${view}`);
      }
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Materialized view refresh failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Run all maintenance tasks
 * Should be called weekly or after bulk operations
 */
 
export const runFullMaintenance = async (): Promise<{ success: boolean; results: Record<string, any> }> => {
   
  const results: Record<string, any> = {};

  console.log('Starting database maintenance...');

  // Run VACUUM ANALYZE
  results.vacuum = await runMaintenanceVacuum();

  // Get statistics
  results.indexStats = await getIndexStatistics();
  results.slowQueries = await getSlowQueryAnalysis();
  results.dbSize = await getDatabaseSizeInfo();

  // Refresh materialized views
  results.materializedViews = await refreshMaterializedViews();

  console.log('Database maintenance completed', results);
  return { success: true, results };
};
