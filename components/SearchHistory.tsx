import React, { useEffect, useRef, useState } from 'react';

import { useSearchHistory, SearchHistoryItem } from '../hooks/useSearchHistory';
import { analytics } from '../services/analytics';
import styles from '../styles/SearchHistory.module.css';

interface SearchHistoryProps {
  onSelect: (query: string) => void;
  maxItems?: number;
  className?: string;
}

/**
 * Accessible search history component that displays recent searches
 * and allows keyboard navigation and screen reader interaction.
 * 
 * @component
 * @example
 * ```tsx
 * <SearchHistory
 *   onSelect={(query) => handleSearch(query)}
 *   maxItems={10}
 * />
 * ```
 * 
 * @accessibility
 * - Uses ARIA live regions for updates
 * - Supports keyboard navigation
 * - High contrast mode compatible
 * - Screen reader announcements
 */
export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSelect,
  maxItems = 10,
  className = ''
}) => {
  const { history, removeItem, clearHistory } = useSearchHistory();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Filter and sort history
  const displayHistory = history
    .slice(0, maxItems)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Announce updates to screen readers
  const announce = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < displayHistory.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : displayHistory.length - 1
        );
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < displayHistory.length) {
          handleSelect(displayHistory[selectedIndex]);
        }
        break;
      
      case 'Delete':
      case 'Backspace':
        if (selectedIndex >= 0 && selectedIndex < displayHistory.length) {
          event.preventDefault();
          handleRemove(displayHistory[selectedIndex]);
        }
        break;
    }
  };

  // Handle item selection
  const handleSelect = (item: SearchHistoryItem) => {
    analytics.trackEvent({
      category: 'search',
      action: 'search_clicked',
      metadata: {
        query: item.query,
        timestamp: item.timestamp
      }
    });
    onSelect(item.query);
    announce(`Selected search: ${item.query}`);
  };

  // Handle item removal
  const handleRemove = async (item: SearchHistoryItem) => {
    await removeItem(item.id);
    announce(`Removed search: ${item.query}`);
    setSelectedIndex(-1);
  };

  // Handle clear history
  const handleClearHistory = async () => {
    await clearHistory();
    announce('Search history cleared');
    setSelectedIndex(-1);
  };

  // Focus management
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.getElementsByTagName('li');
      if (items[selectedIndex]) {
        items[selectedIndex].focus();
      }
    }
  }, [selectedIndex]);

  if (displayHistory.length === 0) {
    return (
      <div className={`${styles.emptyState} ${className}`}>
        <p role="status">No search history</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Screen reader announcements */}
      <div
        ref={announceRef}
        className={styles.visuallyHidden}
        role="status"
        aria-live="polite"
      />

      <div className={styles.header}>
        <h2 className={styles.title}>Recent Searches</h2>
        <button
          onClick={handleClearHistory}
          className={styles.clearButton}
          aria-label="Clear all search history"
        >
          Clear All
        </button>
      </div>

      <ul
        ref={listRef}
        className={styles.list}
        role="listbox"
        aria-label="Search history"
        onKeyDown={handleKeyDown}
      >
        {displayHistory.map((item, index) => (
          <li
            key={item.id}
            role="option"
            aria-selected={index === selectedIndex}
            tabIndex={index === selectedIndex ? 0 : -1}
            className={`${styles.item} ${
              index === selectedIndex ? styles.selected : ''
            }`}
            onClick={() => handleSelect(item)}
            onFocus={() => setSelectedIndex(index)}
          >
            <span className={styles.query}>{item.query}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(item);
              }}
              className={styles.removeButton}
              aria-label={`Remove ${item.query} from search history`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}; 