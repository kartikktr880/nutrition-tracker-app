/**
 * Apply Enhanced Fixes to All Pages
 * This script injects our new enhanced fixes into all HTML pages
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
                    // Skip component HTML files
                    if (!filePath.includes('components/')) {
                        fileList.push(filePath);
                    }
                }
            } catch (err) {
                console.error(`Error accessing ${filePath}: ${err.message}`);
            }
        });
    } catch (err) {
        console.error(`Error reading directory ${dir}: ${err.message}`);
    }
    
    return fileList;
}

/**
 * Inject fixes into HTML file
 */
function injectFixesToHtmlFile(htmlFilePath) {
    console.log(`Processing: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        let modified = false;
        
        // 1. Add enhanced scroll fix CSS
        if (!htmlContent.includes('enhanced-scroll-fix.css')) {
            htmlContent = htmlContent.replace(
                /<link rel="stylesheet" href="styles\/main\.css/,
                `<link rel="stylesheet" href="styles/main.css$1\n    \n    <!-- Critical Scroll & Header Fixes - Must Load First -->\n    <link rel="stylesheet" href="styles/enhanced-scroll-fix.css"`
            );
            modified = true;
        }
        
        // 2. Add the enhanced header scroll scripts
        if (!htmlContent.includes('smooth-scroll-fix.js') || !htmlContent.includes('enhanced-header-scroll.js')) {
            // Check if we already have a fix scripts section
            if (htmlContent.includes('<!-- Critical Scroll & Header Fixes - Must Load First -->')) {
                // Section exists, just make sure scripts are included
                if (!htmlContent.includes('smooth-scroll-fix.js')) {
                    htmlContent = htmlContent.replace(
                        /<!-- Critical Scroll & Header Fixes - Must Load First -->[^<]*<link[^>]*>/,
                        `$&\n    <script src="scripts/smooth-scroll-fix.js" defer></script>`
                    );
                    modified = true;
                }
                
                if (!htmlContent.includes('enhanced-header-scroll.js')) {
                    htmlContent = htmlContent.replace(
                        /<!-- Critical Scroll & Header Fixes - Must Load First -->[^<]*(?:<link[^>]*>[^<]*)?(?:<script[^>]*>[^<]*)?/,
                        `$&\n    <script src="scripts/enhanced-header-scroll.js" defer></script>`
                    );
                    modified = true;
                }
            } else {
                // Section doesn't exist, add complete section
                htmlContent = htmlContent.replace(
                    /<link rel="stylesheet" href="styles\/main\.css[^>]*>/,
                    `$&\n    \n    <!-- Critical Scroll & Header Fixes - Must Load First -->\n    <link rel="stylesheet" href="styles/enhanced-scroll-fix.css">\n    <script src="scripts/smooth-scroll-fix.js" defer></script>\n    <script src="scripts/enhanced-header-scroll.js" defer></script>`
                );
                modified = true;
            }
        }
        
        // 3. Add "Legacy Fix Scripts" section if it doesn't exist
        if (!htmlContent.includes('<!-- Legacy Fix Scripts')) {
            if (htmlContent.includes('fix-scroll.js') || htmlContent.includes('fix-footer.js') || htmlContent.includes('remove-spacers.js')) {
                // Replace existing scripts with the legacy section
                htmlContent = htmlContent.replace(
                    /(?:<!-- Fix Scroll Issues[^<]*)?(?:<script src="scripts\/fix-scroll\.js[^>]*>[^<]*)?(?:<script src="scripts\/fix-header-scroll\.js[^>]*>[^<]*)?(?:<script src="scripts\/fix-scroll-errors\.js[^>]*>[^<]*)?(?:<script src="scripts\/fix-footer\.js[^>]*>[^<]*)?(?:<script src="scripts\/remove-spacers\.js[^>]*>[^<]*)?/,
                    `\n    <!-- Legacy Fix Scripts - Keeping for compatibility -->\n    <script src="scripts/fix-scroll.js" defer></script>\n    <script src="scripts/fix-footer.js" defer></script>\n    <script src="scripts/remove-spacers.js" defer></script>`
                );
                modified = true;
            } else {
                // Add the legacy section after our enhanced fixes
                htmlContent = htmlContent.replace(
                    /<!-- Critical Scroll & Header Fixes - Must Load First -->[^<]*(?:<link[^>]*>[^<]*)?(?:<script[^>]*>[^<]*){0,5}/,
                    `$&\n    \n    <!-- Legacy Fix Scripts - Keeping for compatibility -->\n    <script src="scripts/fix-scroll.js" defer></script>\n    <script src="scripts/fix-footer.js" defer></script>\n    <script src="scripts/remove-spacers.js" defer></script>`
                );
                modified = true;
            }
        }
        
        // 4. Remove fix-header-scroll.js and fix-scroll-errors.js scripts if they exist
        // (they're being replaced by our enhanced scripts)
        if (htmlContent.includes('fix-header-scroll.js')) {
            htmlContent = htmlContent.replace(/<script src="scripts\/fix-header-scroll\.js[^>]*>[^<]*/g, '');
            modified = true;
        }
        
        if (htmlContent.includes('fix-scroll-errors.js')) {
            htmlContent = htmlContent.replace(/<script src="scripts\/fix-scroll-errors\.js[^>]*>[^<]*/g, '');
            modified = true;
        }
        
        // 5. Remove fix-scroll-smoothness.css if it exists (replaced by enhanced-scroll-fix.css)
        if (htmlContent.includes('fix-scroll-smoothness.css')) {
            htmlContent = htmlContent.replace(/<link rel="stylesheet" href="styles\/fix-scroll-smoothness\.css[^>]*>[^<]*/g, '');
            modified = true;
        }
        
        // 6. Ensure header has the right class
        if (!htmlContent.includes('class="premium-header"')) {
            htmlContent = htmlContent.replace(
                /<header[^>]*>/,
                '<header class="premium-header" id="premium-header">'
            );
            modified = true;
        }
        
        // Save the file if it was modified
        if (modified) {
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
            console.log(`✅ Updated: ${htmlFilePath}`);
        } else {
            console.log(`⏭️ No changes needed: ${htmlFilePath}`);
        }
        
        return modified;
    } catch (err) {
        console.error(`Error processing ${htmlFilePath}: ${err.message}`);
        return false;
    }
}

/**
 * Main function
 */
function main() {
    const currentDir = process.cwd();
    console.log(`Starting from directory: ${currentDir}`);
    
    // Find all HTML files
    const htmlFiles = findHtmlFiles(currentDir);
    console.log(`Found ${htmlFiles.length} HTML files to process.`);
    
    // Process each HTML file
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    htmlFiles.forEach(htmlFile => {
        try {
            const wasUpdated = injectFixesToHtmlFile(htmlFile);
            if (wasUpdated) {
                updatedCount++;
            } else {
                skippedCount++;
            }
        } catch (err) {
            console.error(`Error updating ${htmlFile}: ${err.message}`);
            errorCount++;
        }
    });
    
    // Print summary
    console.log('\n--- Summary ---');
    console.log(`Total HTML files: ${htmlFiles.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`No changes needed: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('---------------');
}

// Run the main function
main(); 