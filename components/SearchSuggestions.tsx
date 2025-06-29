import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { analytics } from '../services/analytics';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';
import styles from '../styles/SearchSuggestions.module.css';

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  maxSuggestions?: number;
  className?: string;
}

interface Suggestion {
  id: string;
  text: string;
  type: 'history' | 'popular' | 'fuzzy';
  score?: number;
}

/**
 * Search suggestions component with autocomplete functionality
 * 
 * @component
 * @example
 * ```tsx
 * <SearchSuggestions
 *   query="react"
 *   onSelect={(suggestion) => handleSearch(suggestion)}
 *   maxSuggestions={5}
 * />
 * ```
 */
export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  onSelect,
  maxSuggestions = 5,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const { history, getRecentSearches } = useSearchHistory();

  // Debounce search suggestions
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get recent searches that match the query
        const recentMatches = getRecentSearches()
          .filter(item => item.query.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(item => ({
            id: item.id,
            text: item.query,
            type: 'history' as const
          }));

        // Get popular searches (in a real app, this would come from analytics)
        const popularMatches = getPopularSearches(searchQuery)
          .map(item => ({
            id: `popular-${item.id}`,
            text: item.query,
            type: 'popular' as const,
            score: item.score
          }));

        // Get fuzzy matches
        const fuzzyMatches = getFuzzyMatches(searchQuery, history)
          .map(item => ({
            id: `fuzzy-${item.id}`,
            text: item.query,
            type: 'fuzzy' as const,
            score: item.score
          }));

        // Combine and sort suggestions
        const allSuggestions = [
          ...recentMatches,
          ...popularMatches,
          ...fuzzyMatches
        ]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, maxSuggestions);

        setSuggestions(allSuggestions);

        // Track suggestions generated
        analytics.trackEvent({
          category: 'Search',
          action: 'suggestions_generated',
          label: searchQuery,
          value: allSuggestions.length
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get suggestions'));
        analytics.trackError({
          errorType: 'suggestions_error',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          context: { query: searchQuery }
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [history, getRecentSearches, maxSuggestions]
  );

  // Update suggestions when query changes
  useEffect(() => {
    debouncedSearch(query);
    setSelectedIndex(-1);
  }, [query, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex].text);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setSuggestions([]);
    setSelectedIndex(-1);

    analytics.trackEvent({
      category: 'Search',
      action: 'suggestion_selected',
      label: suggestion
    });
  };

  if (error) {
    return (
      <div className={styles.error} role="alert">
        Error: {error.message}
      </div>
    );
  }

  if (!query.trim() || suggestions.length === 0) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={`${styles.container} ${className}`}>
        {loading ? (
          <LoadingSpinner size="small" label="Loading suggestions..." />
        ) : (
          <ul
            ref={suggestionsRef}
            className={styles.suggestions}
            role="listbox"
            aria-label="Search suggestions"
            onKeyDown={handleKeyDown}
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={index === selectedIndex}
                className={`${styles.suggestion} ${
                  index === selectedIndex ? styles.selected : ''
                } ${styles[suggestion.type]}`}
                onClick={() => handleSelect(suggestion.text)}
              >
                <span className={styles.text}>{suggestion.text}</span>
                {suggestion.type === 'history' && (
                  <span className={styles.badge}>Recent</span>
                )}
                {suggestion.type === 'popular' && (
                  <span className={styles.badge}>Popular</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Helper function to debounce function calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper function to get popular searches (mock implementation)
function getPopularSearches(query: string): Array<{ id: string; query: string; score: number }> {
  // In a real app, this would fetch from an API or analytics service
  const popularSearches = [
    { id: '1', query: 'healthy recipes', score: 0.9 },
    { id: '2', query: 'meal planning', score: 0.8 },
    { id: '3', query: 'nutrition facts', score: 0.7 },
    { id: '4', query: 'calorie calculator', score: 0.6 },
    { id: '5', query: 'diet plans', score: 0.5 }
  ];

  return popularSearches
    .filter(item => item.query.toLowerCase().includes(query.toLowerCase()));
}

// Helper function to get fuzzy matches
function getFuzzyMatches(
  query: string,
  history: Array<{ id: string; query: string }>
): Array<{ id: string; query: string; score: number }> {
  return history
    .map(item => ({
      id: item.id,
      query: item.query,
      score: calculateFuzzyScore(query, item.query)
    }))
    .filter(item => item.score > 0.3)
    .sort((a, b) => b.score - a.score);
}

// Helper function to calculate fuzzy match score
function calculateFuzzyScore(query: string, text: string): number {
  query = query.toLowerCase();
  text = text.toLowerCase();

  if (text.includes(query)) {
    return 1;
  }

  let score = 0;
  let queryIndex = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      score += 0.1 + (consecutiveMatches * 0.1);
      consecutiveMatches++;
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  return queryIndex === query.length ? score / query.length : 0;
} 