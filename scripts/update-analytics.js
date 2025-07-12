import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Update Analytics References
 * This script updates all HTML files to use the new analytics-core.js
 */

const fs = require('fs');
const path = require('path');

// Files to remove
const filesToRemove = [
    'scripts/analytics.js',
    'scripts/enhanced-analytics.js',
    'scripts/advanced-analytics.js',
    'scripts/analytics-test.js'
];

// Patterns to replace
const patterns = [
    {
        search: /<script src="scripts\/analytics\.js"[^>]*><\/script>/g,
        replace: '<script src="scripts/analytics-core.js" type="module"></script>'
    },
    {
        search: /<script src="scripts\/enhanced-analytics\.js"[^>]*><\/script>/g,
        replace: '<script src="scripts/analytics-core.js" type="module"></script>'
    },
    {
        search: /<script src="scripts\/advanced-analytics\.js"[^>]*><\/script>/g,
        replace: '<script src="scripts/analytics-core.js" type="module"></script>'
    },
    {
        search: /<script src="scripts\/analytics-test\.js"[^>]*><\/script>/g,
        replace: ''
    }
];

/**
 * Update a single HTML file
 */
function updateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Apply all patterns
        patterns.forEach(pattern => {
            const newContent = content.replace(pattern.search, pattern.replace);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        });

        // Write back if modified
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            logInfo(`Updated: ${filePath}`);
        }
    } catch (error) {
        logError(`Error updating ${filePath}:`, error);
    }
}

/**
 * Remove old files
 */
function removeOldFiles() {
    filesToRemove.forEach(file => {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                logInfo(`Removed: ${file}`);
            }
        } catch (error) {
            logError(`Error removing ${file}:`, error);
        }
    });
}

/**
 * Find all HTML files in a directory recursively
 */
function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    const htmlFiles = [];

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            htmlFiles.push(...findHtmlFiles(filePath));
        } else if (file.endsWith('.html')) {
            htmlFiles.push(filePath);
        }
    });

    return htmlFiles;
}

// Main execution
try {
    // Find all HTML files
    const htmlFiles = findHtmlFiles('.');

    // Update each HTML file
    htmlFiles.forEach(updateFile);

    // Remove old files
    removeOldFiles();

    logInfo('Analytics updates completed successfully!');
} catch (error) {
    logError('Error during update:', error);
    process.exit(1);
} 