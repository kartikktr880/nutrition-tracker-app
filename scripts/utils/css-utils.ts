import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
export class CSSUtils {
    private static state = {
        importantRules: new Map<string, Set<string>>(),
        mediaQueries: new Map<string, Set<string>>(),
        themeOverrides: new Map<string, Set<string>>(),
        temporaryRules: new Map<string, Set<string>>()
    };

    static analyzeCSS(cssText: string): void {
        const rules = this.parseCSSRules(cssText);
        Array.from(rules).forEach(rule => {
            if (typeof window.CSSMediaRule !== 'undefined' && rule instanceof window.CSSMediaRule) {
                this.analyzeMediaQuery(rule as CSSMediaRule);
            } else if (typeof window.CSSStyleRule !== 'undefined' && rule instanceof window.CSSStyleRule) {
                this.analyzeStyleRule(rule as CSSStyleRule);
            }
        });
    }

    private static parseCSSRules(cssText: string): CSSRule[] {
        const styleSheet = new CSSStyleSheet();
        try {
            styleSheet.replaceSync(cssText);
            return Array.from(styleSheet.cssRules);
        } catch (error) {
            logError('Error parsing CSS:', error);
            return [];
        }
    }

    private static analyzeStyleRule(rule: CSSStyleRule): void {
        const selector = rule.selectorText;
        const declarations = rule.style.cssText;

        if (declarations.includes('!important')) {
            this.addImportantRule(selector, declarations);
        }

        if (selector.includes('theme-') || selector.includes('dark-mode')) {
            this.addThemeOverride(selector, declarations);
        }

        if (selector.includes('temp-') || selector.includes('fix-')) {
            this.addTemporaryRule(selector, declarations);
        }
    }

    private static analyzeMediaQuery(rule: CSSMediaRule): void {
        const mediaQuery = rule.conditionText;
        const rules = Array.from(rule.cssRules);
        
        rules.forEach(innerRule => {
            if (innerRule instanceof CSSStyleRule) {
                this.addMediaQuery(mediaQuery, innerRule.selectorText);
            }
        });
    }

    private static addImportantRule(selector: string, declarations: string): void {
        if (!this.state.importantRules.has(selector)) {
            this.state.importantRules.set(selector, new Set());
        }
        const set = this.state.importantRules.get(selector);
        if (set) set.add(declarations);
    }

    private static addMediaQuery(mediaQuery: string, selector: string): void {
        if (!this.state.mediaQueries.has(mediaQuery)) {
            this.state.mediaQueries.set(mediaQuery, new Set());
        }
        const set = this.state.mediaQueries.get(mediaQuery);
        if (set) set.add(selector);
    }

    private static addThemeOverride(selector: string, declarations: string): void {
        if (!this.state.themeOverrides.has(selector)) {
            this.state.themeOverrides.set(selector, new Set());
        }
        const set = this.state.themeOverrides.get(selector);
        if (set) set.add(declarations);
    }

    private static addTemporaryRule(selector: string, declarations: string): void {
        if (!this.state.temporaryRules.has(selector)) {
            this.state.temporaryRules.set(selector, new Set());
        }
        const set = this.state.temporaryRules.get(selector);
        if (set) set.add(declarations);
    }

    static getImportantRules(): Map<string, Set<string>> {
        return new Map(this.state.importantRules);
    }

    static getMediaQueries(): Map<string, Set<string>> {
        return new Map(this.state.mediaQueries);
    }

    static getThemeOverrides(): Map<string, Set<string>> {
        return new Map(this.state.themeOverrides);
    }

    static getTemporaryRules(): Map<string, Set<string>> {
        return new Map(this.state.temporaryRules);
    }

    static generateOptimizedCSS(): string {
        const optimizedRules: string[] = [];

        // Add utility classes first
        this.state.importantRules.forEach((declarations, selector) => {
            if (selector.includes('utility-')) {
                optimizedRules.push(`${selector} { ${Array.from(declarations).join('; ')} }`);
            }
        });

        // Add layout and header fixes
        this.state.importantRules.forEach((declarations, selector) => {
            if (selector.includes('layout-') || selector.includes('header-')) {
                optimizedRules.push(`${selector} { ${Array.from(declarations).join('; ')} }`);
            }
        });

        // Add theme overrides
        this.state.themeOverrides.forEach((declarations, selector) => {
            optimizedRules.push(`${selector} { ${Array.from(declarations).join('; ')} }`);
        });

        // Add media queries
        this.state.mediaQueries.forEach((selectors, mediaQuery) => {
            const mediaRules = Array.from(selectors).map(selector => {
                const declarations = this.state.importantRules.get(selector) || new Set();
                return `${selector} { ${Array.from(declarations).join('; ')} }`;
            });
            optimizedRules.push(`@media ${mediaQuery} { ${mediaRules.join('\n')} }`);
        });

        // Add temporary rules last
        this.state.temporaryRules.forEach((declarations, selector) => {
            optimizedRules.push(`/* TEMPORARY RULE */\n${selector} { ${Array.from(declarations).join('; ')} }`);
        });

        return optimizedRules.join('\n');
    }

    static clearAnalysis(): void {
        this.state.importantRules.clear();
        this.state.mediaQueries.clear();
        this.state.themeOverrides.clear();
        this.state.temporaryRules.clear();
    }
} 