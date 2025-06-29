import { useState, useCallback, useRef } from 'react';
import { analytics } from '../services/analytics';
import { storage } from '../services/storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface SuggestionCache {
  [query: string]: CacheItem<Suggestion[]>;
}

export interface Suggestion {
  id: string;
  text: string;
  type: 'history' | 'popular' | 'fuzzy';
  score?: number;
}

interface UseSearchSuggestionsOptions {
  maxSuggestions?: number;
  minChars?: number;
  cacheTimeout?: number;
  rateLimitMs?: number;
  maxQueryLength?: number;
}

const DEFAULT_OPTIONS: Required<UseSearchSuggestionsOptions> = {
  maxSuggestions: 5,
  minChars: 2,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  rateLimitMs: 300, // 300ms between requests
  maxQueryLength: 100
};

export function useSearchSuggestions(options: UseSearchSuggestionsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache and rate limiting
  const cache = useRef<SuggestionCache>({});
  const lastRequestTime = useRef<number>(0);
  const pendingRequest = useRef<NodeJS.Timeout | null>(null);

  // Clear old cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    Object.entries(cache.current).forEach(([query, item]) => {
      if (now - item.timestamp > opts.cacheTimeout) {
        delete cache.current[query];
      }
    });
  }, [opts.cacheTimeout]);

  // Get suggestions with caching and rate limiting
  const getSuggestions = useCallback(async (query: string) => {
    // Input validation
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    if (query.length > opts.maxQueryLength) {
      setError(new Error(`Query length exceeds maximum of ${opts.maxQueryLength} characters`));
      return;
    }

    if (query.length < opts.minChars) {
      setSuggestions([]);
      return;
    }

    // Check cache
    const cacheKey = query.toLowerCase();
    const cachedItem = cache.current[cacheKey];
    if (cachedItem && Date.now() - cachedItem.timestamp < opts.cacheTimeout) {
      setSuggestions(cachedItem.data);
      return;
    }

    // Rate limiting
    const now = Date.now();
    const timeUntilNextRequest = opts.rateLimitMs - (now - lastRequestTime.current);

    if (pendingRequest.current) {
      clearTimeout(pendingRequest.current);
    }

    if (timeUntilNextRequest > 0) {
      pendingRequest.current = setTimeout(() => {
        getSuggestions(query);
      }, timeUntilNextRequest);
      return;
    }

    setLoading(true);
    setError(null);
    lastRequestTime.current = now;

    try {
      // Get suggestions from different sources
      const [historyResults, popularResults, fuzzyResults] = await Promise.all([
        getHistorySuggestions(query),
        getPopularSuggestions(query),
        getFuzzySuggestions(query)
      ]);

      // Combine and sort suggestions
      const allSuggestions = [
        ...historyResults,
        ...popularResults,
        ...fuzzyResults
      ]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, opts.maxSuggestions);

      // Update cache
      cache.current[cacheKey] = {
        data: allSuggestions,
        timestamp: Date.now()
      };

      setSuggestions(allSuggestions);
      cleanCache();

      // Track metrics
      analytics.trackEvent({
        category: 'Search',
        action: 'suggestions_generated',
        label: query,
        value: allSuggestions.length,
        metadata: {
          cacheHit: false,
          sources: {
            history: historyResults.length,
            popular: popularResults.length,
            fuzzy: fuzzyResults.length
          }
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get suggestions');
      setError(error);
      analytics.trackError({
        errorType: 'suggestions_error',
        errorMessage: error.message,
        context: { query }
      });
    } finally {
      setLoading(false);
    }
  }, [opts.maxSuggestions, opts.maxQueryLength, opts.minChars, opts.rateLimitMs, opts.cacheTimeout, cleanCache]);

  return {
    suggestions,
    loading,
    error,
    getSuggestions,
    clearCache: useCallback(() => {
      cache.current = {};
    }, [])
  };
}

// Helper functions for getting suggestions from different sources
async function getHistorySuggestions(query: string): Promise<Suggestion[]> {
  const history = await storage.loadSearchHistory();
  return history
    .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
    .map(item => ({
      id: item.id,
      text: item.query,
      type: 'history' as const,
      score: 1
    }));
}

async function getPopularSuggestions(query: string): Promise<Suggestion[]> {
  // In a real app, this would fetch from an API
  const popularSearches = [
    { id: '1', query: 'healthy recipes', score: 0.9 },
    { id: '2', query: 'meal planning', score: 0.8 },
    { id: '3', query: 'nutrition facts', score: 0.7 },
    { id: '4', query: 'calorie calculator', score: 0.6 },
    { id: '5', query: 'diet plans', score: 0.5 }
  ];

  return popularSearches
    .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
    .map(item => ({
      id: `popular-${item.id}`,
      text: item.query,
      type: 'popular' as const,
      score: item.score
    }));
}

async function getFuzzySuggestions(query: string): Promise<Suggestion[]> {
  const history = await storage.loadSearchHistory();
  return history
    .map(item => ({
      id: `fuzzy-${item.id}`,
      text: item.query,
      type: 'fuzzy' as const,
      score: calculateFuzzyScore(query, item.query)
    }))
    .filter(item => item.score > 0.3)
    .sort((a, b) => b.score - a.score);
}

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