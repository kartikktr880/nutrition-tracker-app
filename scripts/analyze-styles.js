const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create log file
const logFile = path.join(logsDir, `style-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(message);
    logStream.write(`[${timestamp}] ${message}\n`);
}

async function analyzeStyles() {
    try {
        log('Starting CSS file analysis...');

        // Find all CSS files
        const cssFiles = glob.sync('**/*.{css,scss,sass,less}', {
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
        });

        log(`Found ${cssFiles.length} CSS files`);

        // Analyze each file
        const analysis = {
            totalFiles: cssFiles.length,
            totalLines: 0,
            selectors: new Set(),
            mediaQueries: new Set(),
            potentialIssues: []
        };

        for (const file of cssFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            analysis.totalLines += lines.length;

            // Analyze selectors and media queries
            lines.forEach((line, index) => {
                // Extract selectors
                if (line.includes('{') && !line.includes('@')) {
                    const selector = line.split('{')[0].trim();
                    if (selector) {
                        analysis.selectors.add(selector);
                    }
                }

                // Extract media queries
                if (line.includes('@media')) {
                    analysis.mediaQueries.add(line.trim());
                }

                // Look for potential issues
                const issues = [];
                if (line.includes('!important')) {
                    issues.push(`Line ${index + 1}: !important declaration found`);
                }
                if (line.includes('*')) {
                    issues.push(`Line ${index + 1}: Universal selector (*) found`);
                }
                if (line.includes('px') && !line.includes('0px')) {
                    issues.push(`Line ${index + 1}: Fixed pixel value found`);
                }
                if (line.length > 100) {
                    issues.push(`Line ${index + 1}: Line exceeds 100 characters`);
                }

                if (issues.length > 0) {
                    analysis.potentialIssues.push({
                        file,
                        line: index + 1,
                        issues
                    });
                }
            });
        }

        // Log analysis results
        log('\nAnalysis Results:');
        log(`Total files analyzed: ${analysis.totalFiles}`);
        log(`Total lines of code: ${analysis.totalLines}`);
        log(`Unique selectors found: ${analysis.selectors.size}`);
        log(`Media queries found: ${analysis.mediaQueries.size}`);
        log(`Files with potential issues: ${analysis.potentialIssues.length}`);

        if (analysis.potentialIssues.length > 0) {
            log('\nPotential Issues:');
            analysis.potentialIssues.forEach(({ file, line, issues }) => {
                log(`\n${file} (Line ${line}):`);
                issues.forEach(issue => log(`  - ${issue}`));
            });
        }

        log('\nStyle analysis completed successfully.');
    } catch (error) {
        log(`Error during style analysis: ${error.message}`);
        process.exit(1);
    } finally {
        logStream.end();
    }
}

analyzeStyles(); 