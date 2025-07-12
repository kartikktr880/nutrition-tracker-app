import React, { useCallback } from 'react';

import { logWarn } from '../../utils/logger';

/**
 * Props for the SkipLink component
 */
export interface SkipLinkProps {
  /** The ID of the target element to skip to */
  target: string;
  /** Custom text for the skip link (default: "Skip to main content") */
  label?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * SkipLink Component
 * 
 * A keyboard-accessible skip link that allows users to jump directly to the main content,
 * bypassing navigation and other repetitive elements. This is essential for screen reader
 * users and keyboard-only navigation.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <SkipLink target="main-content" />
 * 
 * // With custom text
 * <SkipLink target="navigation" label="Skip to navigation" />
 * 
 * // With custom styling
 * <SkipLink 
 *   target="main-content" 
 *   className="custom-skip-link"
 *   label="Skip to content" 
 * />
 * ```
 * 
 * @example
 * ```tsx
 * // In your layout component
 * function Layout({ children }) {
 *   return (
 *     <>
 *       <SkipLink target="main-content" />
 *       <nav>Navigation content...</nav>
 *       <main id="main-content">
 *         {children}
 *       </main>
 *     </>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - The component automatically adds a CSS class 'skip-link-active' to the body when focused
 * - The target element will be given a tabIndex of -1 if it doesn't already have one
 * - Smooth scrolling is used for better user experience
 * - The component handles missing target elements gracefully with a console warning
 * 
 * @see {@link https://www.w3.org/WAI/WCAG21/Techniques/general/G1 | WCAG G1: Adding a link at the top of each page}
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  target,
  label = 'Skip to main content',
  className = ''
}) => {
  /**
   * Handles the click event on the skip link
   * Scrolls to the target element and focuses it
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    const targetElement = document.getElementById(target);
    
    if (!targetElement) {
      logWarn(`SkipLink: Target element with id "${target}" not found`);
      return;
    }

    // Ensure target element is focusable
    if (targetElement.tabIndex === undefined || targetElement.tabIndex < 0) {
      targetElement.tabIndex = -1;
    }

    // Scroll to target with smooth behavior
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // Focus the target element
    targetElement.focus();
  }, [target]);

  /**
   * Handles keyboard events (Enter and Space keys)
   * Prevents default behavior and triggers the click handler
   */
  const _handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>);
    }
  }, [handleClick]);

  /**
   * Handles focus event
   * Adds a CSS class to the body for styling purposes
   */
  const handleFocus = useCallback(() => {
    document.body.classList.add('skip-link-active');
  }, []);

  /**
   * Handles blur event
   * Removes the CSS class from the body
   */
  const handleBlur = useCallback(() => {
    document.body.classList.remove('skip-link-active');
  }, []);

  return (
    <a
      href={`#${target}`}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-lg transition-all duration-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`.trim()}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>);
        }
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {label}
    </a>
  );
}; 