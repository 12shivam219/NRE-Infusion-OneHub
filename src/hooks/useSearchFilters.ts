import { useState, useEffect, useCallback, useRef } from 'react';

interface SearchFiltersState {
  searchTerm: string;
  sortBy: 'date' | 'company' | 'daysOpen';
  sortOrder: 'asc' | 'desc';
  filterStatus: string;
  minRate: string;
  maxRate: string;
  remoteFilter: 'ALL' | 'REMOTE' | 'ONSITE';
  dateRangeFrom: string;
  dateRangeTo: string;
}

const STORAGE_KEY = 'requirements_search_filters';

export const useSearchFilters = () => {
  const [filters, setFilters] = useState<SearchFiltersState | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Load from localStorage and URL on mount
  useEffect(() => {
    // Try to get from URL first
    const params = new URLSearchParams(window.location.search);
    const urlFilters = {
      searchTerm: params.get('search') || '',
      sortBy: (params.get('sortBy') as 'date' | 'company' | 'daysOpen') || 'date',
      sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || 'desc',
      filterStatus: params.get('status') || 'ALL',
      minRate: params.get('minRate') || '',
      maxRate: params.get('maxRate') || '',
      remoteFilter: (params.get('remote') as 'ALL' | 'REMOTE' | 'ONSITE') || 'ALL',
      dateRangeFrom: params.get('dateFrom') || '',
      dateRangeTo: params.get('dateTo') || '',
    };

    // Check if any URL params are present
    const hasUrlParams = Array.from(params.keys()).length > 0;

    if (hasUrlParams) {
      setFilters(urlFilters);
    } else {
      // Fall back to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setFilters(JSON.parse(stored));
        } catch {
          setFilters(getDefaultFilters());
        }
      } else {
        setFilters(getDefaultFilters());
      }
    }
  }, []);

  const getDefaultFilters = (): SearchFiltersState => ({
    searchTerm: '',
    sortBy: 'date',
    sortOrder: 'desc',
    filterStatus: 'ALL',
    minRate: '',
    maxRate: '',
    remoteFilter: 'ALL',
    dateRangeFrom: '',
    dateRangeTo: '',
  });

  const updateFilters = useCallback((newFilters: Partial<SearchFiltersState>) => {
    setFilters(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...newFilters };

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        const params = new URLSearchParams();
        if (updated.searchTerm) params.set('search', updated.searchTerm);
        if (updated.sortBy !== 'date') params.set('sortBy', updated.sortBy);
        if (updated.sortOrder !== 'desc') params.set('sortOrder', updated.sortOrder);
        if (updated.filterStatus !== 'ALL') params.set('status', updated.filterStatus);
        if (updated.minRate) params.set('minRate', updated.minRate);
        if (updated.maxRate) params.set('maxRate', updated.maxRate);
        if (updated.remoteFilter !== 'ALL') params.set('remote', updated.remoteFilter);
        if (updated.dateRangeFrom) params.set('dateFrom', updated.dateRangeFrom);
        if (updated.dateRangeTo) params.set('dateTo', updated.dateRangeTo);

        const url = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;

        window.history.replaceState({}, '', url);
      }, 100);

      return updated;
    });
  }, []);

  const clearFilters = useCallback(() => {
    const defaults = getDefaultFilters();
    setFilters(defaults);
    localStorage.removeItem(STORAGE_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return { filters, updateFilters, clearFilters, isLoaded: filters !== null };
};
