import React from 'react';
import styles from '../styles/LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

/**
 * Accessible loading spinner component
 * 
 * @component
 * @example
 * ```tsx
 * <LoadingSpinner size="medium" label="Loading search results..." />
 * ```
 * 
 * @accessibility
 * - Announces loading state to screen readers
 * - Hidden from screen readers when aria-hidden is true
 * - Customizable loading message
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  label = 'Loading...',
  className = ''
}) => {
  const sizeClass = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large
  }[size];

  return (
    <div
      className={`${styles.container} ${className}`}
      role="status"
      aria-label={label}
    >
      <div className={`${styles.spinner} ${sizeClass}`} aria-hidden="true" />
      <span className={styles.visuallyHidden}>{label}</span>
    </div>
  );
}; 