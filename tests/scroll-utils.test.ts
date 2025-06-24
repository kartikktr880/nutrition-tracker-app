import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrollUtils } from '../scripts/utils/scroll-utils.ts';
import { getScrollPosition, setScrollPosition } from './setup';

describe('ScrollUtils', () => {
    let scrollUtils: ScrollUtils;
    let mockElement: HTMLElement;

    beforeEach(() => {
        scrollUtils = new ScrollUtils();
        mockElement = document.createElement('div');
        document.body.appendChild(mockElement);
        vi.useFakeTimers();
    });

    afterEach(() => {
        document.body.removeChild(mockElement);
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should handle smooth scroll', () => {
        scrollUtils.smoothScrollTo(100, 200);
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 200,
            left: 100,
            behavior: 'smooth'
        });
    });

    it('should handle scroll to element', () => {
        scrollUtils.scrollToElement(mockElement);
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'start'
        });
    });

    it('should handle scroll position tracking', () => {
        setScrollPosition(100, 200);
        const position = scrollUtils.getScrollPosition();
        expect(position).toEqual({ x: 100, y: 200 });
    });

    it('should handle scroll direction detection', () => {
        setScrollPosition(0, 0);
        scrollUtils.trackScrollDirection();
        setScrollPosition(0, 100);
        expect(scrollUtils.getScrollDirection()).toBe('down');
    });

    it('should handle scroll event throttling', () => {
        const callback = vi.fn();
        scrollUtils.onScroll(callback);
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(100);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle scroll lock', () => {
        scrollUtils.lockScroll();
        expect(document.body.style.overflow).toBe('hidden');
        scrollUtils.unlockScroll();
        expect(document.body.style.overflow).toBe('');
    });

    it('should handle scroll restoration', () => {
        setScrollPosition(100, 200);
        scrollUtils.saveScrollPosition();
        setScrollPosition(0, 0);
        scrollUtils.restoreScrollPosition();
        expect(getScrollPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should handle scroll progress tracking', () => {
        const progress = scrollUtils.getScrollProgress();
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
    });

    it('should handle scroll visibility detection', () => {
        const isVisible = scrollUtils.isElementInViewport(mockElement);
        expect(typeof isVisible).toBe('boolean');
    });

    it('should handle scroll cleanup', () => {
        const callback = vi.fn();
        scrollUtils.onScroll(callback);
        scrollUtils.cleanup();
        window.dispatchEvent(new Event('scroll'));
        expect(callback).not.toHaveBeenCalled();
    });
}); 