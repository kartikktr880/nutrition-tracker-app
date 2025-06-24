import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { FocusTrap } from '@/components/FocusTrap/FocusTrap';
import { SearchService, type SearchResult } from '@/services/searchService';
import { SearchBarErrorBoundary } from './SearchBarErrorBoundary';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'minimal';
}

const SearchBarComponent: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search foods, meals, or recipes...',
  className,
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchService = SearchService.getInstance();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchService.search(searchQuery);
      setResults(searchResults);
      onSearch(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [onSearch, searchService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await performSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const variantClasses = {
    default: 'w-full max-w-lg',
    minimal: 'w-64',
  };

  return (
    <div ref={searchRef} className={twMerge('relative', variantClasses[variant], className)}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Search"
          aria-expanded={isOpen}
          aria-controls="search-results"
          role="searchbox"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Submit search"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M14.5 14.5L10.5 10.5M6.5 12C9.53757 12 12 9.53757 12 6.5C12 3.46243 9.53757 1 6.5 1C3.46243 1 1 3.46243 1 6.5C1 9.53757 3.46243 12 6.5 12Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>

      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <FocusTrap active={isOpen} onEscape={() => setIsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full mt-1 rounded-md border bg-popover p-2 shadow-md"
              id="search-results"
              role="listbox"
            >
              {results.length > 0 ? (
                <ul className="space-y-1">
                  {results.map((result) => (
                    <li
                      key={result.id}
                      className="rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      role="option"
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground">{result.description}</div>
                      )}
                      {result.calories && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {result.calories} cal | P: {result.protein}g | C: {result.carbs}g | F: {result.fat}g
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {isLoading ? 'Searching...' : `Press Enter to search for "${query}"`}
                </div>
              )}
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SearchBar: React.FC<SearchBarProps> = (props) => (
  <SearchBarErrorBoundary>
    <SearchBarComponent {...props} />
  </SearchBarErrorBoundary>
); 