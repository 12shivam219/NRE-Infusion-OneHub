import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { getRequirementsPage, type RequirementWithLogs } from '../lib/api/requirements';
import { cacheRequirements, getCachedRequirements, type CachedRequirement } from '../lib/offlineDB';

export type RequirementsQuery = {
  userId?: string;
  page: number;
  pageSize: number;
  search: string;
  status: string | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'date' | 'company' | 'daysOpen';
  sortOrder: 'asc' | 'desc';
  minRate?: string;
  maxRate?: string;
  remoteFilter?: 'ALL' | 'REMOTE' | 'ONSITE';
};

type RequirementsPageData = {
  requirements: RequirementWithLogs[];
  hasNextPage: boolean;
};

const buildKey = (q: RequirementsQuery) => {
  if (!q.userId) return null;
  return `requirements-page:${JSON.stringify({
    userId: q.userId,
    page: q.page,
    pageSize: q.pageSize,
    search: q.search,
    status: q.status,
    dateFrom: q.dateFrom || '',
    dateTo: q.dateTo || '',
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    minRate: q.minRate || '',
    maxRate: q.maxRate || '',
    remoteFilter: q.remoteFilter || 'ALL',
  })}`;
};

const fetchPage = async (q: RequirementsQuery): Promise<RequirementsPageData> => {
  if (!q.userId) {
    return { requirements: [], hasNextPage: false };
  }

  const orderByColumn = q.sortBy === 'date' ? 'created_at' : q.sortBy === 'company' ? 'company' : 'created_at';

  const res = await getRequirementsPage({
    userId: q.userId,
    limit: q.pageSize,
    offset: q.page * q.pageSize,
    search: q.search || undefined,
    status: q.status || undefined,
    dateFrom: q.dateFrom || undefined,
    dateTo: q.dateTo || undefined,
    orderBy: orderByColumn,
    orderDir: q.sortOrder,
    includeCount: false,
  });

  if (!res.success) {
    throw new Error(res.error || 'Failed to fetch requirements');
  }

  const list = res.requirements || [];
  return { requirements: list, hasNextPage: list.length === q.pageSize };
};

export function useRequirementsPage(query: RequirementsQuery) {
  const key = useMemo(() => buildKey(query), [query]);

  const swr = useSWR<RequirementsPageData>(key, () => fetchPage(query), {
    dedupingInterval: 15_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  useEffect(() => {
    const maybeHydrateFromCache = async () => {
      if (!query.userId) return;
      if (navigator.onLine) return;
      if (swr.data) return;

      const cached = await getCachedRequirements(query.userId, true);
      if (cached && cached.length > 0) {
        swr.mutate(
          {
            requirements: cached as unknown as RequirementWithLogs[],
            hasNextPage: false,
          },
          { revalidate: false }
        );
      }
    };

    void maybeHydrateFromCache();
  }, [query.userId, swr]);

  useEffect(() => {
    const save = async () => {
      if (!query.userId) return;
      if (!swr.data?.requirements) return;
      if (!navigator.onLine) return;
      if (query.page !== 0) return;
      await cacheRequirements(swr.data.requirements as unknown as CachedRequirement[], query.userId);
    };

    void save();
  }, [query.userId, query.page, swr.data?.requirements, swr]);

  return swr;
}
