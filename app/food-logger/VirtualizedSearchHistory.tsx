import React, { useCallback, useMemo, useState, useRef } from 'react';
import { FixedSizeList } from 'react-window';

import { useSearchHistory } from '../../hooks/useSearchHistory';
import { analytics } from '../../services/analytics';
import styles from '../styles/VirtualizedSearchHistory.module.css';

import { ErrorBoundary } from '../../components/ErrorBoundary/ErrorBoundary';
import { LoadingSpinner } from '../../components/LoadingSpinner/LoadingSpinner';

interface VirtualizedSearchHistoryProps {
  onSelect: (query: string) => void;
  height?: number;
  itemHeight?: number;
  className?: string;
  pageSize?: number;
}

/**
 * A virtualized search history component that efficiently renders large lists
 * using react-window. Includes performance optimizations like debouncing, memoization,
 * infinite scroll, and pagination.
 *
 * @component
 * @example
 * ```tsx
 * <VirtualizedSearchHistory
 *   onSelect={(query) => handleSearch(query)}
 *   height={400}
 *   itemHeight={50}
 *   pageSize={50}
 * />
 * ```
 */
export const VirtualizedSearchHistory: React.FC<VirtualizedSearchHistoryProps> = ({
  onSelect,
  height = 400,
  itemHeight = 50,
  className = '',
  // pageSize removed because it is not used
}) => {
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<FixedSizeList>(null);
  const lastScrollOffset = useRef(0);

  const {
    history,
    removeItem,
    clearHistory,
    loading,
    error,
    hasMore,
    loadMore
  } = useSearchHistory();

  // Handle infinite scroll
  const handleScroll = useCallback(async ({ scrollOffset, scrollDirection: _scrollDirection }: { scrollOffset: number; scrollDirection: 'forward' | 'backward' }) => {
    const scrollThreshold = 100; // pixels from bottom
    const listHeight = listRef.current?.props.height || 0;
    const isNearBottom = scrollOffset > lastScrollOffset.current && 
      scrollOffset >= (listHeight as number) - scrollThreshold;

    lastScrollOffset.current = scrollOffset;

    if (isNearBottom && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        await loadMore();
        setPage(prev => prev + 1);
        
        analytics.trackEvent({
          category: 'Search',
          action: 'load_more_history',
          value: page + 1
        });
      } catch (err) {
        analytics.trackError({
          errorType: 'load_more_error',
          errorMessage: err instanceof Error ? err.message : 'Failed to load more history'
        });
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [page, hasMore, isLoadingMore, loadMore]);

  // Memoize the row renderer for better performance
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = history[index];
    if (!item) return null;

    return (
      <div
        className={styles.historyItem}
        style={style}
        role="option"
        aria-selected="false"
      >
        <button
          className={styles.queryButton}
          onClick={() => {
            onSelect(item.query);
            analytics.trackEvent({
              category: 'Search',
              action: 'select_history_item',
              label: item.query
            });
          }}
          aria-label={`Search for ${item.query}`}
        >
          {item.query}
        </button>
        <button
          className={styles.removeButton}
          onClick={() => {
            removeItem(item.id);
            analytics.trackEvent({
              category: 'Search',
              action: 'remove_history_item',
              label: item.query
            });
          }}
          aria-label={`Remove ${item.query} from search history`}
        >
          ×
        </button>
      </div>
    );
  }, [history, onSelect, removeItem]);

  // Memoize the list to prevent unnecessary re-renders
  const List = useMemo(() => (
    <FixedSizeList
      ref={listRef}
      height={height}
      width="100%"
      itemCount={history.length + (hasMore ? 1 : 0)}
      itemSize={itemHeight}
      overscanCount={5}
      className={styles.list}
      onScroll={handleScroll}
    >
      {Row}
    </FixedSizeList>
  ), [height, history.length, itemHeight, Row, hasMore, handleScroll]);

  // Handle retry on error
  const handleRetry = async () => {
    try {
      await loadMore();
      setPage(1);
      
      analytics.trackEvent({
        category: 'Search',
        action: 'retry_load_history'
      });
    } catch (err) {
      analytics.trackError({
        errorType: 'retry_error',
        errorMessage: err instanceof Error ? err.message : 'Failed to retry loading history'
      });
    }
  };

  if (loading && !isLoadingMore) {
    return <LoadingSpinner size="md" label="Loading search history..." />;
  }

  if (error && !isLoadingMore) {
    return (
      <div className={styles.error} role="alert">
        <p>Error loading search history: {error}</p>
        <button 
          className={styles.retryButton}
          onClick={handleRetry}
          aria-label="Retry loading search history"
        >
          Retry
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={styles.empty} role="status">
        No search history
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Search History</h2>
          <button
            className={styles.clearButton}
            onClick={() => {
              clearHistory();
              analytics.trackEvent({
                category: 'Search',
                action: 'clear_history'
              });
            }}
            aria-label="Clear all search history"
          >
            Clear All
          </button>
        </div>
        {List}
        {isLoadingMore && (
          <div className={styles.loadingMore}>
            <LoadingSpinner size="sm" label="Loading more..." />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}; 