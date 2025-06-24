/**
 * Update Scroll Fixes
 * This script updates all HTML files to use the new scroll-manager.js
 */

const fs = require('fs');
const path = require('path');

// Files to remove
const filesToRemove = [
    'scripts/fix-scroll-errors.js',
    'scripts/enhanced-scroll-fix.js',
    'styles/enhanced-scroll-fix.css'
];

// Patterns to replace
const patterns = [
    {
        search: /<script src="scripts\/fix-scroll-errors\.js"[^>]*><\/script>/g,
        replace: '<script src="scripts/scroll-manager.js" defer></script>'
    },
    {
        search: /<script src="scripts\/enhanced-scroll-fix\.js"[^>]*><\/script>/g,
        replace: '<script src="scripts/scroll-manager.js" defer></script>'
    },
    {
        search: /<link rel="stylesheet" href="styles\/enhanced-scroll-fix\.css"[^>]*>/g,
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
            console.log(`Updated: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
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
                console.log(`Removed: ${file}`);
            }
        } catch (error) {
            console.error(`Error removing ${file}:`, error);
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

    console.log('Scroll fix updates completed successfully!');
} catch (error) {
    console.error('Error during update:', error);
    process.exit(1);
} 