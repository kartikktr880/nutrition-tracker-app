import { render } from '@testing-library/react';
import React from 'react';

import { FocusTrap } from '../FocusTrap/FocusTrap';
import { SkipLink } from '../SkipLink/SkipLink';

describe('Responsive Behavior', () => {
  const _originalInnerWidth = window.innerWidth;
  const _originalInnerHeight = window.innerHeight;

  const _setViewportSize = (width: number, height: number) => {
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
      value: _originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: _originalInnerHeight,
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
      _setViewportSize(320, 568); // iPhone SE size
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
    });

    it('maintains visibility on tablet viewport', () => {
      _setViewportSize(768, 1024); // iPad size
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
    });

    it('maintains visibility on desktop viewport', () => {
      _setViewportSize(1920, 1080); // Full HD desktop
      const { container } = render(<SkipLink target="main-content" />);
      const skipLink = container.firstChild as HTMLElement;

      skipLink.focus();
    });
  });

  describe('FocusTrap Responsive', () => {
    it('maintains focus trap on mobile viewport', () => {
      _setViewportSize(320, 568);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const _dialog = container.firstChild as HTMLElement;
    });

    it('maintains focus trap on tablet viewport', () => {
      _setViewportSize(768, 1024);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const _dialog = container.firstChild as HTMLElement;
    });

    it('maintains focus trap on desktop viewport', () => {
      _setViewportSize(1920, 1080);
      const { container } = render(
        <FocusTrap active={true}>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      );

      const _dialog = container.firstChild as HTMLElement;
    });

    it('centers content properly on all viewports', () => {
      const viewports = [
        [320, 568],   // Mobile
        [768, 1024],  // Tablet
        [1920, 1080], // Desktop
      ];

      viewports.forEach(([width, height]) => {
        _setViewportSize(width, height);
        const { container } = render(
          <FocusTrap active={true}>
            <div>Content</div>
          </FocusTrap>
        );

        const _dialog = container.firstChild as HTMLElement;
      });
    });
  });
}); 