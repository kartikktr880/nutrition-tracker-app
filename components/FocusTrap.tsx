import React, { useEffect, useRef } from 'react';

/**
 * Props for the FocusTrap component.
 * @interface FocusTrapProps
 * @property {boolean} isActive - Whether the focus trap is active.
 * @property {React.ReactNode} children - The content to be rendered within the focus trap.
 * @property {() => void} [onEscape] - Optional callback function to be called when the Escape key is pressed.
 */
interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
}

/**
 * A component that traps focus within its children when active.
 * Useful for modal dialogs and other overlay components.
 * 
 * @component
 * @example
 * ```tsx
 * <FocusTrap isActive onEscape={() => setIsModalOpen(false)}>
 *   <div role="dialog">
 *     <button>Close</button>
 *     <input type="text" />
 *   </div>
 * </FocusTrap>
 * ```
 * 
 * @accessibility
 * - Traps focus within the component when active
 * - Supports Escape key to exit
 * - Maintains focus order
 * - Returns focus to trigger element on unmount
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  isActive = true,
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the element that had focus before mounting
    triggerRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusFirstElement = () => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    focusFirstElement();

    return () => {
      // Return focus to the trigger element on unmount
      if (triggerRef.current && 'focus' in triggerRef.current) {
        triggerRef.current.focus();
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (event.key === 'Tab') {
        if (!containerRef.current) return;

        const focusableElements = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey) {
          // If shift + tab and we're on the first element, move to last
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // If tab and we're on the last element, move to first
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}; 