import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { analytics } from '../services/analytics';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  results?: number;
}

interface UseSearchHistoryReturn {
  history: SearchHistoryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  addItem: (query: string, results?: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getRecentSearches: (limit?: number) => Promise<SearchHistoryItem[]>;
  addToRecent: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Hook for managing search history with persistence and analytics
 * 
 * @returns {Object} Search history methods and state
 * @example
 * ```tsx
 * const { history, addItem, removeItem, clearHistory } = useSearchHistory();
 * ```
 */
export const useSearchHistory = (): UseSearchHistoryReturn => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await storage.loadSearchHistory();
        setHistory(savedHistory);
      } catch (error) {
        logError('Failed to load search history:', error);
        analytics.trackError({
          errorType: 'storage',
          errorMessage: 'Failed to load search history'
        });
      }
    };

    loadHistory();
  }, []);

  // Add search to history
  const addItem = useCallback(async (query: string, results = 0) => {
    try {
      const newItem: SearchHistoryItem = {
        id: crypto.randomUUID(),
        query,
        results,
        timestamp: Date.now()
      };

      await storage.addSearchItem(newItem);
      const updatedHistory = await storage.loadSearchHistory();
      setHistory(updatedHistory);

      analytics.trackEvent({
        category: 'search',
        action: 'search_added',
        value: results,
        metadata: {
          query,
          success: true
        }
      });
    } catch (error) {
      logError('Failed to add search to history:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to add search to history'
      });
    }
  }, []);

  // Remove item from history
  const removeItem = useCallback(async (id: string) => {
    try {
      await storage.removeSearchItem(id);
      const updatedHistory = await storage.loadSearchHistory();
      setHistory(updatedHistory);
    } catch (error) {
      logError('Failed to remove search from history:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to remove search from history'
      });
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      await storage.clearSearchHistory();
      setHistory([]);
    } catch (error) {
      logError('Failed to clear search history:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to clear search history'
      });
    }
  }, []);

  // Get recent searches
  const getRecentSearches = useCallback(async (limit = 5) => {
    try {
      const recent = await storage.loadRecentSearches();
      return recent.slice(0, limit);
    } catch (error) {
      logError('Failed to get recent searches:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to get recent searches'
      });
      return [];
    }
  }, []);

  // Add to recent searches
  const addToRecent = useCallback(async (query: string) => {
    try {
      await storage.addRecentSearch(query);
    } catch (error) {
      logError('Failed to add to recent searches:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to add to recent searches'
      });
    }
  }, []);

  const loadMore = async (): Promise<void> => {
    // Implementation for loading more items
    logInfo('Loading more search history items...');
  };

  return {
    history,
    loading,
    error,
    hasMore,
    addItem,
    removeItem,
    clearHistory,
    getRecentSearches,
    addToRecent,
    loadMore
  };
}; 