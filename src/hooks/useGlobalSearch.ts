/**
 * useGlobalSearch Hook
 * Manages global search state and logic with real Supabase data
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { SearchResult, SearchScope, SearchCategory } from '../lib/searchTypes';
import {
  searchGlobal,
  searchByCategory,
  searchByModule,
  getDefaultSearchScope,
  getSearchPlaceholder,
} from '../lib/searchUtils';

const DEBOUNCE_DELAY = 300;
const MAX_RECENT_SEARCHES = 5;

export const useGlobalSearch = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('current');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<SearchCategory[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const stored = localStorage.getItem('recentSearches');
    return stored ? JSON.parse(stored) : [];
  });

  const debounceTimer = useRef<NodeJS.Timeout>();
  const currentView = searchParams.get('view') as SearchCategory | null;

  // Get current page search scope
  const getCurrentPageScope = useCallback((): SearchCategory | null => {
    if (pathname === '/crm') {
      return currentView || 'requirements';
    }
    return getDefaultSearchScope(pathname);
  }, [pathname, currentView]);

  // Perform search based on scope (async version)
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user?.id) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let newResults: SearchResult[] = [];

      if (scope === 'current') {
        const currentScope = getCurrentPageScope();
        if (currentScope) {
          newResults = await searchByCategory(searchQuery, currentScope, user.id);
        }
      } else if (scope === 'module') {
        if (pathname === '/crm') {
          newResults = await searchByModule(searchQuery, 'crm', user.id);
        } else if (pathname === '/documents') {
          newResults = await searchByModule(searchQuery, 'documents', user.id);
        } else if (pathname === '/admin') {
          newResults = await searchByModule(searchQuery, 'admin', user.id);
        } else {
          newResults = await searchByModule(searchQuery, 'dashboard', user.id);
        }
      } else {
        // global scope
        newResults = await searchGlobal(
          searchQuery, 
          user.id,
          selectedCategories.length > 0 ? selectedCategories : undefined
        );
      }

      setResults(newResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [scope, pathname, selectedCategories, getCurrentPageScope, user?.id]);

  // Debounced search
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      void performSearch(searchQuery);
    }, DEBOUNCE_DELAY);
  }, [performSearch]);

  // Add to recent searches
  const addRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== term);
      const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get placeholder text
  const placeholder = getSearchPlaceholder(pathname, currentView || undefined);

  // Get current page indicator
  const getCurrentPageIndicator = useCallback((): string => {
    if (pathname === '/crm') {
      if (currentView === 'requirements') return 'Requirements';
      if (currentView === 'interviews') return 'Interviews';
      if (currentView === 'consultants') return 'Consultants';
      return 'CRM';
    }
    if (pathname === '/documents') return 'Documents';
    if (pathname === '/admin') return 'Admin';
    return 'Dashboard';
  }, [pathname, currentView]);

  // Reset results when closing
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setResults([]);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    query,
    setQuery: handleSearch,
    scope,
    setScope,
    results,
    isLoading,
    error,
    isOpen,
    setIsOpen,
    selectedCategories,
    setSelectedCategories,
    recentSearches,
    addRecentSearch,
    closeSearch,
    placeholder,
    currentPageIndicator: getCurrentPageIndicator(),
  };
};
