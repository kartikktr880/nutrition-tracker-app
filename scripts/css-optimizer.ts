import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { CSSUtils } from './utils/css-utils';

class CSSOptimizer {
    private static readonly CSS_FILES = [
        'styles/utilities.css',
        'styles/header-fixes.css',
        'styles/animations.css',
        'styles/themes.css',
        'styles/temp.css',
        'styles/screenshot-fix.css',
        'styles/responsive.css',
        'styles/reset.css',
        'styles/premium-steps.css',
        'styles/stay-updated.css',
        'styles/print-shopping-list.css'
    ];

    static async optimize(): Promise<void> {
        try {
            logInfo('Starting CSS optimization...');
            
            // Analyze all CSS files
            for (const file of this.CSS_FILES) {
                const cssText = await this.readCSSFile(file);
                CSSUtils.analyzeCSS(cssText);
            }

            // Generate optimized CSS
            const optimizedCSS = CSSUtils.generateOptimizedCSS();
            
            // Write optimized CSS to a new file
            await this.writeOptimizedCSS(optimizedCSS);
            
            // Generate report
            this.generateReport();
            
            logInfo('CSS optimization completed successfully!');
        } catch (error) {
            logError('Error during CSS optimization:', error);
            throw error;
        }
    }

    private static async readCSSFile(file: string): Promise<string> {
        try {
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`Failed to read CSS file: ${file}`);
            }
            return await response.text();
        } catch (error) {
            logError(`Error reading CSS file ${file}:`, error);
            return '';
        }
    }

    private static async writeOptimizedCSS(css: string): Promise<void> {
        try {
            const blob = new Blob([css], { type: 'text/css' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.id = 'optimized-css';
            
            // Remove old optimized CSS if it exists
            const oldLink = document.getElementById('optimized-css');
            if (oldLink) {
                oldLink.remove();
            }
            
            document.head.appendChild(link);
        } catch (error) {
            logError('Error writing optimized CSS:', error);
            throw error;
        }
    }

    private static generateReport(): void {
        const report = {
            importantRules: CSSUtils.getImportantRules(),
            mediaQueries: CSSUtils.getMediaQueries(),
            themeOverrides: CSSUtils.getThemeOverrides(),
            temporaryRules: CSSUtils.getTemporaryRules()
        };

        logInfo('\nCSS Optimization Report:');
        logInfo('----------------------');
        logInfo(`Important Rules: ${report.importantRules.size}`);
        logInfo(`Media Queries: ${report.mediaQueries.size}`);
        logInfo(`Theme Overrides: ${report.themeOverrides.size}`);
        logInfo(`Temporary Rules: ${report.temporaryRules.size}`);
        
        // Log temporary rules that should be reviewed
        if (report.temporaryRules.size > 0) {
            logInfo('\nTemporary Rules to Review:');
            report.temporaryRules.forEach((declarations, selector) => {
                logInfo(`\n${selector}:`);
                declarations.forEach(decl => logInfo(`  ${decl}`));
            });
        }
    }
}

// Export for use in other files
export { CSSOptimizer }; 