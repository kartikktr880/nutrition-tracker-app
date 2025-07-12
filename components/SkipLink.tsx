import React from 'react';

import styles from '../styles/SkipLink.module.css';
import { logError } from '../utils/logger';
/**
 * Props for the SkipLink component.
 * @interface SkipLinkProps
 * @property {string} target - The ID of the element to skip to (without the '#' prefix).
 * @property {string} [label] - Optional custom label for the skip link. Defaults to 'Skip to main content'.
 */
interface SkipLinkProps {
  target: string;
  label?: string;
}

/**
 * A skip navigation link component that helps keyboard users bypass repetitive navigation.
 * The link is visually hidden by default and becomes visible when focused.
 * 
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <SkipLink target="main-content" />
 * 
 * // With custom label
 * <SkipLink target="main-content" label="Skip to content" />
 * ```
 * 
 * @accessibility
 * - Visible on focus for keyboard users
 * - Supports Enter key activation
 * - Smooth scrolls to target
 * - Focuses target element
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  target,
  label = 'Skip to main content'
}) => {
  /**
   * Handles click and Enter key events on the skip link.
   * Prevents default behavior, focuses the target element, and smoothly scrolls to it.
   * 
   * @param {React.MouseEvent<HTMLAnchorElement>} e - The click event
   */
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetElement = document.getElementById(target);
    if (targetElement) {
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      logError(`Target element #${target} not found`);
    }
  };

  return (
    <a
      href={`#${target}`}
      className={styles.skipLink}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>);
        }
      }}
      role="link"
      tabIndex={0}
    >
      {label}
    </a>
  );
}; 