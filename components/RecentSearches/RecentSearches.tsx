import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';

import { SearchService } from '@/services/searchService';

import { logError } from '../../utils/logger';

interface RecentSearchesProps {
  onSelect: (query: string) => void;
  onClear: () => void;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'category';

export const RecentSearches: React.FC<RecentSearchesProps> = ({ onSelect, onClear }) => {
  const [_recentSearches, setRecentSearches] = useState<Array<{
    query: string;
    timestamp: number;
    type?: string;
    category?: string;
    tags?: string[];
  }>>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [_categories, setCategories] = useState<string[]>([]);
  const [_isEditing, setIsEditing] = useState<string | null>(null);
  const [_searchTerm, setSearchTerm] = useState('');
  const [_sortBy, setSortBy] = useState<SortOption>('newest');
  const [_isSearchFocused, setIsSearchFocused] = useState(false);
  const [_importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const searchService = SearchService.getInstance();
    try {
      const searches = searchService.getRecentSearches(
        _selectedCategory,
        [_searchTerm],
        _sortBy
      );
      const availableCategories = searchService.getCategories();
      
      setRecentSearches(searches);
      setCategories(availableCategories);
    } catch (error) {
      logError('Error loading recent searches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [_selectedCategory, _searchTerm, _sortBy]);

  const handleClear = () => {
    const searchService = SearchService.getInstance();
    searchService.clearRecentSearches();
    setRecentSearches([]);
    onClear();
  };

  const handleCategoryChange = (query: string, category: string) => {
    const searchService = SearchService.getInstance();
    searchService.updateSearchCategory(query, category);
    setRecentSearches(prev => 
      prev.map(search => 
        search.query === query ? { ...search, category } : search
      )
    );
  };

  const formatTimestamp = (timestamp: number): string => {
    try {
      return format(timestamp, 'MM/dd/yyyy HH:mm');
    } catch (error) {
      logError('Error formatting timestamp:', error);
      return 'recently';
    }
  };

  const handleExport = () => {
    try {
      const searchService = SearchService.getInstance();
      const exportData = searchService.exportRecentSearches();
      
      // Create and download file
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError('Error exporting searches:', error);
      setImportError('Failed to export search history');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const searchService = SearchService.getInstance();
        searchService.importRecentSearches(e.target?.result as string);
        setImportError(null);
        // Refresh the searches
        const searches = searchService.getRecentSearches(
          _selectedCategory,
          [_searchTerm],
          _sortBy
        );
        setRecentSearches(searches);
      } catch (error) {
        logError('Error importing searches:', error);
        setImportError('Failed to import search history');
      }
    };
    reader.readAsText(file);
  };

  if (_isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="animate-pulse space-y-3" role="status" aria-label="Loading recent searches">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (_recentSearches.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Searches
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handleExport}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Export search history"
            >
              Export
            </button>
            <label className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                aria-label="Import search history"
              />
            </label>
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Clear recent searches"
            >
              Clear all
            </button>
          </div>
        </div>

        {_importError && (
          <div className="text-sm text-red-500 dark:text-red-400">
            {_importError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={_searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search in history..."
              className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search in history"
            />
            {_isSearchFocused && _searchTerm && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={_selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || undefined)}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {_categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={_sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2"
              aria-label="Sort by"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="category">By Category</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {_recentSearches.map((search) => (
              <motion.div
                key={`${search.query}-${search.timestamp}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                onClick={() => onSelect(search.query)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect(search.query);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900 dark:text-white">{search.query}</span>
                  {search.type && (
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300">
                      {search.type}
                    </span>
                  )}
                  {search.category && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300">
                      {search.category}
                    </span>
                  )}
                  {search.tags?.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(search.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(_isEditing === search.query ? null : search.query);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Edit search"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {_isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Edit Search
            </h4>
            <div className="space-y-2">
              <select
                value={_recentSearches.find(s => s.query === _isEditing)?.category || ''}
                onChange={(e) => handleCategoryChange(_isEditing, e.target.value)}
                className="w-full text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 rounded px-2 py-1"
                aria-label="Select category"
              >
                <option value="">No Category</option>
                {_categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {/* Assuming _tags is defined elsewhere or needs to be fetched */}
                {/* For now, we'll just show a placeholder or remove if not needed */}
                {/* <label key="placeholder" className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={false} // No tags available
                    onChange={() => {}}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tags</span>
                </label> */}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 