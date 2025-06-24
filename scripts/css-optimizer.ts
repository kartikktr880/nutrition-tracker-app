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
            console.log('Starting CSS optimization...');
            
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
            
            console.log('CSS optimization completed successfully!');
        } catch (error) {
            console.error('Error during CSS optimization:', error);
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
            console.error(`Error reading CSS file ${file}:`, error);
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
            console.error('Error writing optimized CSS:', error);
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

        console.log('\nCSS Optimization Report:');
        console.log('----------------------');
        console.log(`Important Rules: ${report.importantRules.size}`);
        console.log(`Media Queries: ${report.mediaQueries.size}`);
        console.log(`Theme Overrides: ${report.themeOverrides.size}`);
        console.log(`Temporary Rules: ${report.temporaryRules.size}`);
        
        // Log temporary rules that should be reviewed
        if (report.temporaryRules.size > 0) {
            console.log('\nTemporary Rules to Review:');
            report.temporaryRules.forEach((declarations, selector) => {
                console.log(`\n${selector}:`);
                declarations.forEach(decl => console.log(`  ${decl}`));
            });
        }
    }
}

// Export for use in other files
export { CSSOptimizer }; 