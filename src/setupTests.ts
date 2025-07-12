// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock IntersectionObserver
// Remove all TypeScript type annotations for Jest compatibility
// eslint-disable-next-line no-undef
global.IntersectionObserver = class IntersectionObserver {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  root: Element | null = null;
  rootMargin = '';
  thresholds: number[] = [];
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }
  observe() { /* no-op for test mock */ }
  unobserve() { /* no-op for test mock */ }
  disconnect() { /* no-op for test mock */ }
  takeRecords() { return []; }
};

// Mock ResizeObserver
// eslint-disable-next-line no-undef
global.ResizeObserver = class ResizeObserver {
  constructor() { /* no-op for test mock */ }
  disconnect() { /* no-op for test mock */ }
  observe() { /* no-op for test mock */ }
  unobserve() { /* no-op for test mock */ }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock HTMLCanvasElement.getContext for jsdom
HTMLCanvasElement.prototype.getContext = jest.fn(function (contextId: string, _options?: unknown) {
  if (contextId === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: [] })),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      // Add required properties for CanvasRenderingContext2D
      canvas: document.createElement('canvas'),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
      lineCap: 'butt',
      lineDashOffset: 0,
      lineJoin: 'miter',
      lineWidth: 1,
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: '#000',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeStyle: '#000',
      fillStyle: '#000',
      filter: 'none',
      font: '10px sans-serif',
      setLineDash: jest.fn(),
      getLineDash: jest.fn(() => []),
      isPointInPath: jest.fn(() => false),
      isPointInStroke: jest.fn(() => false),
      // ... add more as needed
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as unknown as HTMLCanvasElement['getContext'];

// Mock window.performance.getEntriesByType for performance tests
if (!window.performance) {
  window.performance = {} as Performance;
}
window.performance.getEntriesByType = jest.fn(() => []); 