import React from 'react';
import { render } from '@testing-library/react';
import { SkipLink } from '../SkipLink';
import { FocusTrap } from '../FocusTrap';

describe.skip('Responsive Behavior', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const setViewportSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  afterAll(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  describe('SkipLink Responsive', () => {
    beforeEach(() => {
      const main = document.createElement('main');
      main.id = 'main-content';
      document.body.appendChild(main);
    });

    afterEach(() => {
      const main = document.getElementById('main-content');
      if (main) {
        document.body.removeChild(main);
      }
    });

    it('maintains visibility on mobile viewport', () => {
      setViewportSize(320, 568); // iPhone SE size
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
      const styles = window.getComputedStyle(skipLink);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(styles.getPropertyValue('top')).toBe('0px');
      expect(styles.getPropertyValue('left')).toBe('0px');
      expect(parseInt(styles.getPropertyValue('z-index'))).toBeGreaterThan(0);
    });

    it('maintains visibility on tablet viewport', () => {
      setViewportSize(768, 1024); // iPad size
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
      const styles = window.getComputedStyle(skipLink);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(skipLink).toBeVisible();
    });

    it('maintains visibility on desktop viewport', () => {
      setViewportSize(1920, 1080); // Full HD desktop
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
      const styles = window.getComputedStyle(skipLink);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(skipLink).toBeVisible();
    });
  });

  describe('FocusTrap Responsive', () => {
    it('maintains focus trap on mobile viewport', () => {
      setViewportSize(320, 568);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const dialog = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(dialog);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(styles.getPropertyValue('width')).toBe('100%');
      expect(styles.getPropertyValue('height')).toBe('100%');
    });

    it('maintains focus trap on tablet viewport', () => {
      setViewportSize(768, 1024);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const dialog = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(dialog);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(parseInt(styles.getPropertyValue('max-width'))).toBeLessThanOrEqual(768);
    });

    it('maintains focus trap on desktop viewport', () => {
      setViewportSize(1920, 1080);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const dialog = container.firstChild as HTMLElement;
      const styles = window.getComputedStyle(dialog);
      
      expect(styles.getPropertyValue('position')).toBe('fixed');
      expect(parseInt(styles.getPropertyValue('max-width'))).toBeLessThanOrEqual(1920);
    });

    it('centers content properly on all viewports', () => {
      const viewports = [
        [320, 568],   // Mobile
        [768, 1024],  // Tablet
        [1920, 1080], // Desktop
      ];

      viewports.forEach(([width, height]) => {
        setViewportSize(width, height);
        const { container } = render(
          <FocusTrap active={true}>
            <div>Content</div>
          </FocusTrap>
        );

        const dialog = container.firstChild as HTMLElement;
        const styles = window.getComputedStyle(dialog);
        
        expect(styles.getPropertyValue('display')).toBe('flex');
        expect(styles.getPropertyValue('align-items')).toBe('center');
        expect(styles.getPropertyValue('justify-content')).toBe('center');
      });
    });
  });
}); 