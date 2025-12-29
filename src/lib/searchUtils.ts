/**
 * Search Utilities - Real Data Version
 * Uses Supabase for actual data, no mock data
 */

import type { SearchResult, SearchCategory } from './searchTypes';
import { 
  performGlobalSearch, 
  fetchRequirements, 
  fetchInterviews, 
  fetchConsultants, 
  fetchDocuments 
} from './searchService';


export const parseSearchPrefix = (query: string): { prefix: SearchCategory | null; searchTerm: string } => {
  const trimmedQuery = query.trim();
  const prefixMatch = trimmedQuery.match(/^(requirements|interviews|consultants|documents|admin|dashboard):\s*/i);
  
  if (prefixMatch) {
    const prefix = prefixMatch[1].toLowerCase() as SearchCategory;
    const searchTerm = trimmedQuery.slice(prefixMatch[0].length);
    return { prefix, searchTerm };
  }
  
  return { prefix: null, searchTerm: trimmedQuery };
};

/**
 * Search by query and category with prefix support (REAL DATA)
 * Supports prefix syntax: "requirements: react"
 */
export const searchGlobal = async (
  query: string,
  userId: string | null,
  categories?: SearchCategory[]
): Promise<SearchResult[]> => {
  const { prefix, searchTerm } = parseSearchPrefix(query);
  
  if (!userId || !searchTerm.trim()) return [];

  // If prefix is specified, search only that category
  if (prefix) {
    switch (prefix) {
      case 'requirements':
        return fetchRequirements(searchTerm, userId);
      case 'interviews':
        return fetchInterviews(searchTerm, userId);
      case 'consultants':
        return fetchConsultants(searchTerm, userId);
      case 'documents':
        return fetchDocuments(searchTerm, userId);
      default:
        return [];
    }
  }

  // Otherwise search across specified categories or all
  return performGlobalSearch(searchTerm, userId, categories);
};

/**
 * Search by category (for current page/module search)
 */
export const searchByCategory = async (
  query: string,
  category: SearchCategory,
  userId: string | null
): Promise<SearchResult[]> => {
  if (!userId || !query.trim()) return [];

  const categoryMap: Record<SearchCategory, (q: string, uid: string) => Promise<SearchResult[]>> = {
    requirements: fetchRequirements,
    interviews: fetchInterviews,
    consultants: fetchConsultants,
    documents: fetchDocuments,
    admin: async () => [],
    dashboard: async (q, uid) => performGlobalSearch(q, uid),
  };

  const fetchFn = categoryMap[category];
  return fetchFn ? fetchFn(query, userId) : [];
};

/**
 * Search within a module (CRM module includes all sub-types)
 */
export const searchByModule = async (
  query: string,
  module: 'crm' | 'documents' | 'admin' | 'dashboard',
  userId: string | null
): Promise<SearchResult[]> => {
  if (!userId || !query.trim()) return [];

  const moduleMap = {
    crm: async (q: string, uid: string) => performGlobalSearch(q, uid, ['requirements', 'interviews', 'consultants']),
    documents: fetchDocuments,
    admin: async () => [],
    dashboard: async (q: string, uid: string) => performGlobalSearch(q, uid),
  };

  const fetchFn = moduleMap[module];
  return fetchFn ? fetchFn(query, userId) : [];
};

/**
 * Get placeholder text based on current page
 */
export const getSearchPlaceholder = (pathname: string, view?: string): string => {
  if (pathname === '/crm') {
    if (view === 'requirements') return 'Search Requirements...';
    if (view === 'interviews') return 'Search Interviews...';
    if (view === 'consultants') return 'Search Consultants...';
    return 'Search CRM...';
  }
  if (pathname === '/documents') return 'Search Resumes...';
  if (pathname === '/admin') return 'Search Admin...';
  if (pathname === '/dashboard') return 'Search Dashboard...';
  return 'Search everything...';
};

/**
 * Get default search scope based on current page
 */
export const getDefaultSearchScope = (pathname: string): SearchCategory | null => {
  if (pathname === '/crm') return 'requirements';
  if (pathname === '/documents') return 'documents';
  if (pathname === '/admin') return 'admin';
  if (pathname === '/dashboard') return 'dashboard';
  return null;
};

/**
 * Get category label for display
 */
export const getCategoryLabel = (category: SearchCategory): string => {
  const labels: Record<SearchCategory, string> = {
    requirements: 'Requirements',
    interviews: 'Interviews',
    consultants: 'Consultants',
    documents: 'Documents',
    admin: 'Admin',
    dashboard: 'Dashboard',
  };
  return labels[category];
};
