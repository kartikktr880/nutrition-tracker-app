export class ScrollUtils {
    private scrollHandlers: Set<(event: Event) => void>;
    private lastScrollPosition: { x: number; y: number };
    private scrollDirection: 'up' | 'down' | 'none';
    private scrollThrottleTimeout: number | null;

    constructor() {
        this.scrollHandlers = new Set();
        this.lastScrollPosition = { x: 0, y: 0 };
        this.scrollDirection = 'none';
        this.scrollThrottleTimeout = null;
        this.init();
    }

    private init(): void {
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    private handleScroll(event: Event): void {
        const currentX = window.scrollX;
        const currentY = window.scrollY;

        this.scrollDirection = currentY > this.lastScrollPosition.y ? 'down' : 
                             currentY < this.lastScrollPosition.y ? 'up' : 'none';

        this.lastScrollPosition = { x: currentX, y: currentY };

        if (this.scrollThrottleTimeout) {
            return;
        }

        this.scrollThrottleTimeout = window.setTimeout(() => {
            this.scrollHandlers.forEach(handler => handler(event));
            this.scrollThrottleTimeout = null;
        }, 100);
    }

    smoothScrollTo(x: number, y: number): void {
        window.scrollTo({
            top: y,
            left: x,
            behavior: 'smooth'
        });
    }

    scrollToElement(element: HTMLElement): void {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    getScrollPosition(): { x: number; y: number } {
        return { ...this.lastScrollPosition };
    }

    getScrollDirection(): 'up' | 'down' | 'none' {
        return this.scrollDirection;
    }

    onScroll(handler: (event: Event) => void): void {
        this.scrollHandlers.add(handler);
    }

    lockScroll(): void {
        document.body.style.overflow = 'hidden';
    }

    unlockScroll(): void {
        document.body.style.overflow = '';
    }

    saveScrollPosition(): void {
        sessionStorage.setItem('scrollPosition', JSON.stringify(this.lastScrollPosition));
    }

    restoreScrollPosition(): void {
        const saved = sessionStorage.getItem('scrollPosition');
        if (saved) {
            const position = JSON.parse(saved);
            window.scrollTo(position.x, position.y);
        }
    }

    getScrollProgress(): number {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        return scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    }

    isElementInViewport(element: HTMLElement): boolean {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    cleanup(): void {
        window.removeEventListener('scroll', this.handleScroll.bind(this));
        this.scrollHandlers.clear();
    }
} 