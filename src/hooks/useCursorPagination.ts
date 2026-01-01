/**
 * React Hook for Cursor-Based Pagination
 * Provides efficient pagination for large datasets
 */

import React, { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { getCursorPage, type CursorPaginationParams, type CursorPaginationResult } from '../lib/cursorPagination';

interface UseCursorPaginationParams extends Omit<CursorPaginationParams, 'pageSize'> {
  pageSize?: number;
}

interface UseCursorPaginationResult {
  data: CursorPaginationResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
}

const buildCursorKey = (params: UseCursorPaginationParams) => {
  if (!params.userId) return null;
  
  const cursorStr = params.cursor
    ? JSON.stringify(params.cursor)
    : 'initial';

  return `cursor-pagination:${JSON.stringify({
    userId: params.userId,
    cursor: cursorStr,
    search: params.search,
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })}`;
};

export function useCursorPagination(
  initialParams: UseCursorPaginationParams
): UseCursorPaginationResult {
  const [cursor, setCursor] = React.useState<CursorPaginationParams['cursor'] | undefined>(
    initialParams.cursor
  );

  const params: CursorPaginationParams = useMemo(
    () => ({
      ...initialParams,
      pageSize: initialParams.pageSize || 20,
      cursor,
    }),
    [initialParams, cursor]
  );

  const key = useMemo(() => buildCursorKey(params), [params]);

  const fetcher = useCallback(async (): Promise<CursorPaginationResult> => {
    if (!key) throw new Error('Missing userId');
    const result = await getCursorPage(params);
    if (!result.success) throw new Error(result.error);
    return result.data!;
  }, [params, key]);

  const swr = useSWR<CursorPaginationResult>(key as string, key ? fetcher : null, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  const goToNextPage = useCallback(() => {
    if (swr.data?.nextCursor) {
      setCursor(swr.data.nextCursor);
    }
  }, [swr.data]);

  const goToPrevPage = useCallback(() => {
    if (swr.data?.prevCursor) {
      setCursor(swr.data.prevCursor);
    }
  }, [swr.data]);

  return {
    data: swr.data,
    isLoading: swr.isLoading,
    error: swr.error,
    goToNextPage,
    goToPrevPage,
    hasNextPage: swr.data?.hasNextPage ?? false,
    hasPrevPage: swr.data?.hasPrevPage ?? false,
    canGoNext: !swr.isValidating && (swr.data?.hasNextPage ?? false),
    canGoPrev: !swr.isValidating && (swr.data?.hasPrevPage ?? false),
  };
}

export default useCursorPagination;
