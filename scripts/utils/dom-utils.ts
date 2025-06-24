export class DOMUtils {
    static createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        attributes: Record<string, string> = {},
        children: (string | Node)[] = []
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'string') {
                element.style.cssText = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    static removeElement(element: Element): void {
        element.parentNode?.removeChild(element);
    }

    static addClass(element: Element, className: string): void {
        element.classList.add(className);
    }

    static removeClass(element: Element, className: string): void {
        element.classList.remove(className);
    }

    static toggleClass(element: Element, className: string): void {
        element.classList.toggle(className);
    }

    static hasClass(element: Element, className: string): boolean {
        return element.classList.contains(className);
    }

    static getElement(selector: string): Element | null {
        return document.querySelector(selector);
    }

    static getElements(selector: string): Element[] {
        return Array.from(document.querySelectorAll(selector));
    }

    static getParentElement(element: Element, selector: string): Element | null {
        let parent = element.parentElement;
        while (parent) {
            if (parent.matches(selector)) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    static getChildElements(element: Element, selector: string): Element[] {
        return Array.from(element.querySelectorAll(selector));
    }

    static getNextElement(element: Element, selector: string): Element | null {
        let next = element.nextElementSibling;
        while (next) {
            if (next.matches(selector)) {
                return next;
            }
            next = next.nextElementSibling;
        }
        return null;
    }

    static getPreviousElement(element: Element, selector: string): Element | null {
        let prev = element.previousElementSibling;
        while (prev) {
            if (prev.matches(selector)) {
                return prev;
            }
            prev = prev.previousElementSibling;
        }
        return null;
    }

    static addEventListener(
        element: Element,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void {
        element.addEventListener(event, handler, options);
    }

    static removeEventListener(
        element: Element,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void {
        element.removeEventListener(event, handler, options);
    }

    static dispatchEvent(element: Element, event: Event): boolean {
        return element.dispatchEvent(event);
    }
} 