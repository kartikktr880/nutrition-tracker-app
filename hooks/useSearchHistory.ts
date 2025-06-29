import { useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { analytics } from '../services/analytics';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  results?: number;
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
export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await storage.loadSearchHistory();
        setHistory(savedHistory);
      } catch (error) {
        console.error('Failed to load search history:', error);
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
      const newItem: Omit<SearchHistoryItem, 'id' | 'timestamp'> = {
        query,
        results
      };

      await storage.addSearchItem(newItem);
      const updatedHistory = await storage.loadSearchHistory();
      setHistory(updatedHistory);

      analytics.trackSearch({
        query,
        resultCount: results,
        success: true
      });
    } catch (error) {
      console.error('Failed to add search to history:', error);
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
      console.error('Failed to remove search from history:', error);
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
      console.error('Failed to clear search history:', error);
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
      console.error('Failed to get recent searches:', error);
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
      console.error('Failed to add to recent searches:', error);
      analytics.trackError({
        errorType: 'storage',
        errorMessage: 'Failed to add to recent searches'
      });
    }
  }, []);

  return {
    history,
    addItem,
    removeItem,
    clearHistory,
    getRecentSearches,
    addToRecent
  };
}; 