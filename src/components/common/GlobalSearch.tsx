/**
 * GlobalSearch Component
 * Context-aware search bar with dropdown results
 */

import { memo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, Zap, AlertCircle, Lock } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { useAuth } from '../../hooks/useAuth';
import { getCategoryLabel } from '../../lib/searchUtils';
import type { SearchCategory } from '../../lib/searchTypes';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface GlobalSearchProps {
  accentColor?: string;
  accentGlow?: string;
}

export const GlobalSearch = memo(({ accentColor = '#06b6d4', accentGlow = 'rgba(6, 182, 212, 0.4)' }: GlobalSearchProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    isOpen,
    setIsOpen,
    recentSearches,
    addRecentSearch,
    closeSearch,
    placeholder,
  } = useGlobalSearch();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        closeSearch();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeSearch]);

  // Handle result click
  const handleResultClick = (href: string, title: string) => {
    addRecentSearch(title);
    closeSearch();
    navigate(href);
  };

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      {/* Search Input */}
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: `1px solid ${isOpen ? accentColor : 'rgba(255,255,255,0.12)'}`,
          transition: 'all 300ms ease',
          boxShadow: isOpen ? `0 8px 24px ${accentGlow}` : 'none',
        }}
      >
        <Search size={20} color="rgba(255,255,255,0.6)" />
        <InputBase
          ref={searchInputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          sx={{
            flex: 1,
            '& .MuiInputBase-input': {
              padding: 0,
              fontSize: '0.95rem',
              color: '#FFFFFF',
              '&::placeholder': {
                color: 'rgba(255,255,255,0.5)',
                opacity: 1,
              },
            },
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              searchInputRef.current?.focus();
            }}
            className="inline-flex items-center justify-center p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Clear search"
          >
            <X size={18} color="rgba(255,255,255,0.6)" />
          </button>
        )}
      </Paper>

      {/* Results Dropdown */}
      {isOpen && (
        <Paper
          ref={dropdownRef}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: '500px',
            overflowY: 'auto',
            backgroundColor: 'rgba(13, 17, 23, 0.95)',
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 2,
            boxShadow: `0 12px 40px ${accentGlow}`,
            backdropFilter: 'blur(12px)',
            zIndex: 1000,
          }}
        >
          {!user ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Lock size={18} color={accentColor} />
                <Typography variant="body2" sx={{ color: accentColor }}>
                  Loading
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Waiting for authentication...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <AlertCircle size={18} color={accentColor} />
                <Typography variant="body2" sx={{ color: accentColor }}>
                  Search Error
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {error}
              </Typography>
            </Box>
          ) : isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
              <CircularProgress size={24} sx={{ color: accentColor }} />
            </Box>
          ) : query.trim() === '' ? (
            // Show recent searches and examples
            <Box sx={{ p: 2 }}>
              {recentSearches.length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                    RECENT SEARCHES
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {recentSearches.map((search) => (
                      <button
                        key={search}
                        onClick={() => {
                          setQuery(search);
                        }}
                        className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex items-center gap-2 text-sm text-white/80 hover:text-white"
                      >
                        <Clock size={16} className="opacity-50" />
                        {search}
                      </button>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Search Examples/Tips */}
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5, fontWeight: 600 }}>
                  SEARCH EXAMPLES
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <button
                    onClick={() => setQuery('requirements: react')}
                    className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-mono text-white" style={{ color: accentColor }}>requirements: react</span>
                    <span className="text-xs text-white/60">Search requirements for "react" in all columns</span>
                  </button>
                  <button
                    onClick={() => setQuery('interviews: pending')}
                    className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-mono text-white" style={{ color: accentColor }}>interviews: pending</span>
                    <span className="text-xs text-white/60">Search interviews for "pending" status</span>
                  </button>
                  <button
                    onClick={() => setQuery('consultants: python')}
                    className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-mono text-white" style={{ color: accentColor }}>consultants: python</span>
                    <span className="text-xs text-white/60">Search consultants with "python" skills</span>
                  </button>
                  <button
                    onClick={() => setQuery('documents: resume')}
                    className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-mono text-white" style={{ color: accentColor }}>documents: resume</span>
                    <span className="text-xs text-white/60">Search documents for "resume"</span>
                  </button>
                </Box>
              </Box>
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                No results found for "{query}"
              </Typography>
            </Box>
          ) : (
            // Show grouped results
            <Box sx={{ p: 2 }}>
              {Object.entries(groupedResults).map(([category, items]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: accentColor,
                      display: 'block',
                      mb: 1,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {getCategoryLabel(category as SearchCategory)}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {items.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.href, result.title)}
                        className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-0.5"
                      >
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="opacity-60 flex-shrink-0" style={{ color: accentColor }} />
                          <span className="text-sm font-medium text-white">{result.title}</span>
                        </div>
                        {result.description && (
                          <span className="text-xs text-white/60 ml-6">{result.description}</span>
                        )}
                      </button>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
});

GlobalSearch.displayName = 'GlobalSearch';
