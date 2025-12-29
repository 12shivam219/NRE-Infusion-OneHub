/**
 * Global Search Types and Interfaces
 */

export type SearchScope = 'current' | 'module' | 'global';
export type SearchCategory = 'requirements' | 'interviews' | 'consultants' | 'documents' | 'admin' | 'dashboard';

export interface SearchResult {
  id: string;
  title: string;
  category: SearchCategory;
  description?: string;
  preview?: string;
  href: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  scope: SearchScope;
  setScope: (scope: SearchScope) => void;
  selectedCategories: SearchCategory[];
  setSelectedCategories: (categories: SearchCategory[]) => void;
  results: SearchResult[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export interface GlobalSearchState {
  query: string;
  scope: SearchScope;
  selectedCategories: SearchCategory[];
  results: SearchResult[];
  isLoading: boolean;
  recentSearches: string[];
}
