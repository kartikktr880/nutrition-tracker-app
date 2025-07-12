import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scroll position tracking
let scrollPosition = { x: 0, y: 0 };

// Mock window.scrollTo
window.scrollTo = vi.fn().mockImplementation((x, y) => {
  if (typeof x === 'number' && typeof y === 'number') {
    scrollPosition = { x, y };
  } else if (x && typeof x === 'object') {
    scrollPosition = { x: x.left || 0, y: x.top || 0 };
  }
});

// Mock HTMLElement.prototype.scrollIntoView
HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock performance API
vi.spyOn(performance, 'now').mockImplementation(() => 1000);
vi.spyOn(performance, 'mark').mockImplementation(() => ({} as PerformanceMark));
vi.spyOn(performance, 'measure').mockImplementation(() => ({} as PerformanceMeasure));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, // Default to reduced motion OFF
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock Element.animate
Element.prototype.animate = vi.fn().mockImplementation((keyframes, options) => {
  let playState = 'running';
  const animation = {
    get playState() { return playState; },
    onfinish: null,
    play: function() { playState = 'running'; },
    pause: function() { playState = 'paused'; },
    cancel: function() { playState = 'finished'; },
    finish: function() { playState = 'finished'; if (typeof this.onfinish === 'function') (this.onfinish as (() => void))(); },
    reverse: vi.fn(),
    updatePlaybackRate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    id: Math.random().toString(36).substr(2, 9),
    playbackRate: 1,
    direction: 'normal',
  };

  // Simulate animation completion
  setTimeout(() => {
    animation.finish();
  }, options.duration || 0);

  return animation;
});

// Export scroll position for tests
export const getScrollPosition = () => ({ ...scrollPosition });
export const setScrollPosition = (x: number, y: number) => {
  scrollPosition = { x, y };
}; 
