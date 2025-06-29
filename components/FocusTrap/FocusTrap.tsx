import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Props for the FocusTrap component
 */
export interface FocusTrapProps {
  /** The content to be wrapped in the focus trap */
  children: React.ReactNode;
  /** Whether the focus trap is active (default: true) */
  active?: boolean;
  /** Callback function called when Escape key is pressed */
  onEscape?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Optional ref to the element that should receive initial focus */
  initialFocus?: React.RefObject<HTMLElement>;
}

/**
 * FocusTrap Component
 * 
 * A component that traps keyboard focus within its children, preventing users from
 * tabbing outside the component. This is essential for modals, dropdowns, and other
 * overlay components to maintain proper accessibility and user experience.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <FocusTrap>
 *   <button>First Button</button>
 *   <button>Last Button</button>
 * </FocusTrap>
 * 
 * // With escape handler
 * <FocusTrap onEscape={() => setIsOpen(false)}>
 *   <div>Modal content</div>
 * </FocusTrap>
 * 
 * // Conditionally active
 * <FocusTrap active={isModalOpen} onEscape={closeModal}>
 *   <ModalContent />
 * </FocusTrap>
 * 
 * // With initial focus
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * <FocusTrap initialFocus={buttonRef}>
 *   <button ref={buttonRef}>Focus me first</button>
 *   <button>Second button</button>
 * </FocusTrap>
 * ```
 * 
 * @example
 * ```tsx
 * // In a modal component
 * function Modal({ isOpen, onClose, children }) {
 *   const closeButtonRef = useRef<HTMLButtonElement>(null);
 *   
 *   if (!isOpen) return null;
 *   
 *   return (
 *     <div className="modal-overlay">
 *       <FocusTrap onEscape={onClose} initialFocus={closeButtonRef}>
 *         <div className="modal-content">
 *           <h2>Modal Title</h2>
 *           {children}
 *           <button ref={closeButtonRef} onClick={onClose}>Close</button>
 *         </div>
 *       </FocusTrap>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @remarks
 * - Automatically focuses the first focusable element when mounted (or initialFocus if provided)
 * - Handles both forward (Tab) and backward (Shift+Tab) navigation
 * - Wraps focus around when reaching the end or beginning of focusable elements
 * - Responds to Escape key presses when onEscape callback is provided
 * - Can be conditionally activated/deactivated using the active prop
 * - Handles dynamic content changes and updates focus accordingly
 * - Properly cleans up event listeners on unmount
 * - Restores focus to the previously focused element on unmount
 * 
 * @see {@link https://www.w3.org/WAI/WCAG21/Techniques/general/G59 | WCAG G59: Placing the interactive elements in an order that follows sequences and relationships within the content}
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  onEscape,
  className = '',
  initialFocus
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);
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
   * Updates the first and last focusable element references
   */
  const updateFocusableElements = useCallback(() => {
    const focusableElements = getFocusableElements();
    
    if (focusableElements.length > 0) {
      firstFocusableRef.current = focusableElements[0];
      lastFocusableRef.current = focusableElements[focusableElements.length - 1];
    } else {
      firstFocusableRef.current = null;
      lastFocusableRef.current = null;
    }
  }, [getFocusableElements]);

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

  /**
   * Focuses the first focusable element in the container or the initialFocus element
   */
  const focusFirstElement = useCallback(() => {
    if (!active) return;
    
    updateFocusableElements();
    
    // Use initialFocus if provided and available
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [active, updateFocusableElements, initialFocus]);

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
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  // Update focusable elements when children change
  useEffect(() => {
    if (!active) return;

    const observer = new MutationObserver(() => {
      updateFocusableElements();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'hidden', 'style', 'tabindex']
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [active, updateFocusableElements]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="presentation"
    >
      {children}
    </div>
  );
}; 