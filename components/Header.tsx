import React, { useRef, useState } from 'react';

import styles from '../styles/Header.module.css';

import { FocusTrap } from './FocusTrap';
import { SkipLink } from './SkipLink';
import { navigation } from './navigation';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isSearchOpen) {
        setIsSearchOpen(false);
      }
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    }
  };

  return (
    <header className={styles.header} role="banner">
      <SkipLink target="main-content" />
      
      <nav role="navigation" aria-label="Main navigation">
        <button
          className={styles.menuButton}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="main-menu"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={styles.menuIcon} aria-hidden="true" />
        </button>

        <FocusTrap isActive={isMenuOpen} onEscape={() => setIsMenuOpen(false)}>
          <div
            id="main-menu"
            className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}
            onKeyDown={handleKeyDown}
          >
            {/* Menu items */}
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={styles.menuItem}
                onClick={(e) => {
                  e.preventDefault();
                  // In a real application, you'd navigate to the item's href
                  // For now, we'll just close the menu
                  setIsMenuOpen(false);
                }}
              >
                {item.name}
              </a>
            ))}
          </div>
        </FocusTrap>
      </nav>

      <div className={styles.search} role="search">
        <button
          className={styles.searchButton}
          onClick={toggleSearch}
          aria-expanded={isSearchOpen}
          aria-controls="search-panel"
          aria-label={isSearchOpen ? 'Close search' : 'Open search'}
        >
          <span className={styles.searchIcon} aria-hidden="true" />
        </button>

        <FocusTrap isActive={isSearchOpen} onEscape={() => setIsSearchOpen(false)}>
          <div
            id="search-panel"
            className={`${styles.searchPanel} ${isSearchOpen ? styles.searchOpen : ''}`}
            onKeyDown={handleKeyDown}
          >
            <input
              ref={searchInputRef}
              type="search"
              className={styles.searchInput}
              placeholder="Search..."
              aria-label="Search"
            />
            <button
              className={styles.searchSubmit}
              aria-label="Submit search"
            >
              Search
            </button>
          </div>
        </FocusTrap>
      </div>
    </header>
  );
}; 