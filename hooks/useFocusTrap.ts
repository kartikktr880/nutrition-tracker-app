import { useEffect, useRef, useCallback } from 'react';

/**
 * Options for the useFocusTrap hook
 */
export interface UseFocusTrapOptions {
  /** Whether the focus trap is active (default: true) */
  active?: boolean;
  /** Callback function called when Escape key is pressed */
  onEscape?: () => void;
  /** Whether to focus the first element on mount (default: true) */
  focusFirstOnMount?: boolean;
  /** Whether to restore focus to the previous element on unmount (default: true) */
  restoreFocusOnUnmount?: boolean;
}

/**
 * useFocusTrap Hook
 * 
 * A custom hook that provides focus trapping functionality for components.
 * This hook manages keyboard navigation, escape key handling, and focus management
 * within a specified container element.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * function Modal({ isOpen, onClose }) {
 *   const containerRef = useFocusTrap({
 *     active: isOpen,
 *     onEscape: onClose
 *   });
 * 
 *   if (!isOpen) return null;
 * 
 *   return (
 *     <div ref={containerRef} className="modal">
 *       <h2>Modal Title</h2>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With custom options
 * function Dropdown({ isOpen, onClose, children }) {
 *   const containerRef = useFocusTrap({
 *     active: isOpen,
 *     onEscape: onClose,
 *     focusFirstOnMount: false,
 *     restoreFocusOnUnmount: true
 *   });
 * 
 *   return (
 *     <div ref={containerRef} className="dropdown">
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // In a complex component
 * function Sidebar({ isOpen, onClose }) {
 *   const containerRef = useFocusTrap({
 *     active: isOpen,
 *     onEscape: onClose
 *   });
 * 
 *   return (
 *     <aside ref={containerRef} className="sidebar">
 *       <nav>
 *         <a href="/dashboard">Dashboard</a>
 *         <a href="/profile">Profile</a>
 *         <a href="/settings">Settings</a>
 *       </nav>
 *       <button onClick={onClose}>Close Sidebar</button>
 *     </aside>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - Automatically focuses the first focusable element when mounted (if focusFirstOnMount is true)
 * - Handles both forward (Tab) and backward (Shift+Tab) navigation
 * - Wraps focus around when reaching the end or beginning of focusable elements
 * - Responds to Escape key presses when onEscape callback is provided
 * - Can be conditionally activated/deactivated using the active option
 * - Restores focus to the previously focused element on unmount (if restoreFocusOnUnmount is true)
 * - Handles dynamic content changes and updates focus accordingly
 * - Properly cleans up event listeners on unmount
 * 
 * @see {@link https://www.w3.org/WAI/WCAG21/Techniques/general/G59 | WCAG G59: Placing the interactive elements in an order that follows sequences and relationships within the content}
 */
export const useFocusTrap = (options: UseFocusTrapOptions = {}) => {
  const {
    active = true,
    onEscape,
    focusFirstOnMount = true,
    restoreFocusOnUnmount = true
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  /**
   * Gets all focusable elements within the container
   * @returns Array of focusable HTMLElements
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    const elements = containerRef.current.querySelectorAll<HTMLElement>(
      focusableSelectors.join(', ')
    );

    return Array.from(elements).filter(element => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  /**
   * Focuses the first focusable element in the container
   */
  const focusFirstElement = useCallback(() => {
    if (!active || !focusFirstOnMount) return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [active, focusFirstOnMount, getFocusableElements]);

  /**
   * Handles keyboard events for focus trapping and escape key
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!active) return;

    if (e.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements();
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: move backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [active, onEscape, getFocusableElements]);

  // Set up event listeners and initial focus
  useEffect(() => {
    if (!active) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Add event listener for keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Focus first element after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(focusFirstElement, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [active, handleKeyDown, focusFirstElement]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocusOnUnmount && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [restoreFocusOnUnmount]);

  return containerRef;
}; 