/**
 * Performance Monitoring & Utilities
 * Tools for measuring and optimizing application performance with 10K+ records
 */

export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  recordsProcessed?: number;
  memoryUsed?: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start measuring performance for an operation
   */
  startMeasure(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * End measuring and record metrics
   */
  endMeasure(
    label: string,
    options?: {
      recordsProcessed?: number;
      success?: boolean;
      error?: string;
    }
  ): PerformanceMetrics {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`Performance mark "${label}" not found`);
      return {} as PerformanceMetrics;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation: label,
      duration,
      recordsProcessed: options?.recordsProcessed,
      memoryUsed: this.getMemoryUsage(),
      success: options?.success !== false,
      error: options?.error,
    };

    this.metrics.push(metric);
    this.marks.delete(label);

    // Log in development
    if (import.meta.env.MODE === 'development') {
      this.logMetric(metric);
    }

    return metric;
  }

  /**
   * Get current memory usage in MB (browser only)
   */
  private getMemoryUsage(): number | undefined {
    const perfMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
    if (perfMemory.memory) {
      return Math.round(perfMemory.memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return undefined;
  }

  /**
   * Log metric to console
   */
  private logMetric(metric: PerformanceMetrics): void {
    const icon = metric.success ? '✅' : '❌';
    const memory = metric.memoryUsed ? ` | ${metric.memoryUsed}MB` : '';
    const records = metric.recordsProcessed ? ` | ${metric.recordsProcessed} records` : '';
    
    console.log(
      `${icon} ${metric.operation}: ${metric.duration.toFixed(2)}ms${memory}${records}`
    );
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get average duration for operation
   */
  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    if (operationMetrics.length === 0) return 0;

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      totalOperations: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      averageDuration: this.metrics.length > 0 
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length 
        : 0,
      successCount: this.metrics.filter(m => m.success).length,
      errorCount: this.metrics.filter(m => !m.success).length,
      peakMemory: Math.max(...this.metrics.map(m => m.memoryUsed || 0)),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
      },
      null,
      2
    );
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Pagination helper for large datasets
 */
export class PaginationHelper {
  constructor(
    private totalCount: number,
    private pageSize: number = 20
  ) {}

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  /**
   * Get offset for page
   */
  getOffset(page: number): number {
    return page * this.pageSize;
  }

  /**
   * Check if page is valid
   */
  isValidPage(page: number): boolean {
    return page >= 0 && page < this.getTotalPages();
  }

  /**
   * Get page range
   */
  getPageRange(currentPage: number, windowSize: number = 5) {
    const totalPages = this.getTotalPages();
    let start = Math.max(0, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages - 1, start + windowSize - 1);

    if (end - start < windowSize - 1) {
      start = Math.max(0, end - windowSize + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  /**
   * Get records displayed range
   */
  getDisplayRange(page: number): { start: number; end: number; total: number } {
    const start = this.getOffset(page) + 1;
    const end = Math.min((page + 1) * this.pageSize, this.totalCount);
    return { start, end, total: this.totalCount };
  }
}

/**
 * Cache utility for reducing API calls
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  /**
   * Set cache entry
   */
  set(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cache entry if valid
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Debounce helper for search and filter operations
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => Promise<void> {
  let timeoutId: NodeJS.Timeout;

  return async (...args: Parameters<T>) => {
    clearTimeout(timeoutId);

    return new Promise<void>((resolve) => {
      timeoutId = setTimeout(async () => {
        try {
          await func(...args);
          resolve();
        } catch (error) {
          console.error('Debounced async function error:', error);
          resolve();
        }
      }, delay);
    });
  };
}

/**
 * Request batching for multiple queries
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private processor: (batch: T[]) => Promise<R[]>;

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
  }

  /**
   * Add item to batch queue
   */
  async add(item: T): Promise<R | null> {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      const result = await this.flush();
      return result;
    }

    return null;
  }

  /**
   * Process all queued items
   */
  async flush(): Promise<R | null> {
    if (this.queue.length === 0) return null;
    if (this.processing) return null;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const results = await this.processor(batch);
      const lastResult = results[results.length - 1] ?? null;
      
      if (this.queue.length > 0) {
        await this.flush();
      }
      
      return lastResult;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

/**
 * Performance thresholds for alerts
 */
export const PERFORMANCE_THRESHOLDS = {
  SLOW_SEARCH: 1000,        // ms - Alert if search > 1s
  SLOW_FILTER: 800,         // ms - Alert if filter > 800ms
  SLOW_PAGINATION: 500,     // ms - Alert if pagination > 500ms
  HIGH_MEMORY: 200,         // MB - Alert if memory > 200MB
  LARGE_BATCH: 1000,        // records - Alert if batch > 1000
} as const;

/**
 * Check performance against thresholds
 */
export function checkPerformanceThreshold(
  duration: number,
  threshold: number,
  operation: string
): { isSlowl: boolean; message: string } {
  const isSlow = duration > threshold;
  const message = isSlow
    ? `⚠️ ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
    : `✅ ${operation} completed in ${duration.toFixed(2)}ms`;

  return { isSlowl: isSlow, message };
}
