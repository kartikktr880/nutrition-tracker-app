/**
 * Apply Fixes to All Pages
 * This script finds all HTML files in the project and applies our fixes
 */

const fs = require('fs');
const path = require('path');

/**
 * Find all HTML files in the directory and subdirectories
 */
function findHtmlFiles(dir, fileList = []) {
    console.log(`Searching for HTML files in: ${dir}`);
    
    try {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            
            try {
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules and .git directories
                    if (file !== 'node_modules' && file !== '.git') {
                        findHtmlFiles(filePath, fileList);
                    }
                } else if (file.endsWith('.html')) {
                    console.log(`Found HTML file: ${filePath}`);
                    fileList.push(filePath);
                }
            } catch (err) {
                console.error(`Error accessing ${filePath}:`, err.message);
            }
        });
    } catch (err) {
        console.error(`Error reading directory ${dir}:`, err.message);
    }
    
    return fileList;
}

/**
 * Inject our fix scripts into an HTML file
 */
function injectFixes(htmlFilePath) {
    console.log(`Applying fixes to: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        let modified = false;
        
        // Check if our fixes are already applied
        if (htmlContent.includes('fix-scroll-smoothness.css') && 
            htmlContent.includes('fix-header-scroll.js') && 
            htmlContent.includes('fix-scroll-errors.js')) {
            console.log(`   Fixes already applied to ${htmlFilePath}`);
            return false;
        }
        
        // Add CSS fix
        if (!htmlContent.includes('fix-scroll-smoothness.css')) {
            htmlContent = htmlContent.replace(
                /<link [^>]*rel=['"]stylesheet['"][^>]*>/i,
                match => `<link rel="stylesheet" href="styles/fix-scroll-smoothness.css">\n    ${match}`
            );
            modified = true;
        }
        
        // Add JS fixes - look for a good place to inject them, preferably before other scripts
        if (!htmlContent.includes('fix-header-scroll.js')) {
            // Try to find a good place to inject scripts
            if (htmlContent.includes('<script')) {
                htmlContent = htmlContent.replace(
                    /<script/i,
                    `<script src="scripts/fix-header-scroll.js" defer></script>\n    <script src="scripts/fix-scroll-errors.js" defer></script>\n    <script`
                );
            } else if (htmlContent.includes('</head>')) {
                htmlContent = htmlContent.replace(
                    '</head>',
                    `    <script src="scripts/fix-header-scroll.js" defer></script>\n    <script src="scripts/fix-scroll-errors.js" defer></script>\n</head>`
                );
            }
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
            console.log(`   Successfully applied fixes to ${htmlFilePath}`);
            return true;
        } else {
            console.log(`   No changes needed for ${htmlFilePath}`);
            return false;
        }
    } catch (err) {
        console.error(`Error modifying ${htmlFilePath}:`, err.message);
        return false;
    }
}

/**
 * Main function to find and modify HTML files
 */
function main() {
    console.log('Starting to apply fixes to all HTML pages...');
    
    // Start from the current directory
    const currentDir = process.cwd();
    console.log(`Current working directory: ${currentDir}`);
    
    // Find all HTML files
    const htmlFiles = findHtmlFiles(currentDir);
    console.log(`Found ${htmlFiles.length} HTML files`);
    
    // Keep track of modified files
    let modifiedCount = 0;
    
    // Apply fixes to each HTML file
    htmlFiles.forEach(file => {
        if (injectFixes(file)) {
            modifiedCount++;
        }
    });
    
    console.log(`Applied fixes to ${modifiedCount} HTML files`);
}

// Run the main function
main(); 