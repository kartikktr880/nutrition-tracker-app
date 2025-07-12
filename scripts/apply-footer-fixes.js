import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Apply Footer Fixes to All Pages
 * This script finds all HTML files in the project and ensures they include the necessary footer fixes
 */

const fs = require('fs');
const path = require('path');

// Find all HTML files in the directory and subdirectories
function findHtmlFiles(dir, fileList = []) {
    logInfo(`Searching for HTML files in: ${dir}`);
    
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
                    logInfo(`Found HTML file: ${filePath}`);
                    fileList.push(filePath);
                }
            } catch (err) {
                logError(`Error accessing ${filePath}: ${err.message}`);
            }
        });
    } catch (err) {
        logError(`Error reading directory ${dir}: ${err.message}`);
    }
    
    return fileList;
}

// Inject our footer fix scripts into an HTML file
function injectFooterFixes(htmlFilePath) {
    logInfo(`Processing: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        // Check if the file already has the fixes
        if (htmlContent.includes('fix-footer.js') && 
            htmlContent.includes('remove-spacers.js')) {
            logInfo(`${htmlFilePath} already has the fixes.`);
            return;
        }
        
        // Find the position to insert the scripts
        let insertPosition;
        
        // Look for fix-scroll.js first (preferred position)
        if (htmlContent.includes('fix-scroll.js')) {
            const fixScrollIndex = htmlContent.indexOf('fix-scroll.js');
            const scriptEndIndex = htmlContent.indexOf('</script>', fixScrollIndex);
            insertPosition = scriptEndIndex + 9; // After the </script> tag
            logInfo(`Inserting after fix-scroll.js script at position ${insertPosition}`);
        } 
        // Otherwise look for other good insertion points
        else {
            // Try to insert before the first CSS file
            const cssLinkIndex = htmlContent.indexOf('<link rel="stylesheet"');
            if (cssLinkIndex !== -1) {
                insertPosition = cssLinkIndex;
                logInfo(`Inserting before first stylesheet at position ${insertPosition}`);
            } 
            // Or before the closing head tag
            else {
                const headCloseIndex = htmlContent.indexOf('</head>');
                if (headCloseIndex !== -1) {
                    insertPosition = headCloseIndex;
                    logInfo(`Inserting before </head> at position ${insertPosition}`);
                } 
                // Last resort: beginning of body
                else {
                    const bodyIndex = htmlContent.indexOf('<body');
                    if (bodyIndex !== -1) {
                        // Find the closing > of the body tag
                        const bodyTagEndIndex = htmlContent.indexOf('>', bodyIndex);
                        insertPosition = bodyTagEndIndex + 1;
                        logInfo(`Inserting at beginning of body at position ${insertPosition}`);
                    } else {
                        logError(`Could not find insertion point in ${htmlFilePath}`);
                        return;
                    }
                }
            }
        }
        
        // Create the script tags to inject
        const scriptsToInject = `
    <!-- Footer Fix Scripts -->
    <script src="scripts/fix-footer.js" defer></script>
    <script src="scripts/remove-spacers.js" defer></script>
    `;
        
        // Insert the scripts
        htmlContent = htmlContent.slice(0, insertPosition) + scriptsToInject + htmlContent.slice(insertPosition);
        
        // Also make sure we have the CSS fix
        if (!htmlContent.includes('footer-elite-luxury.css')) {
            // Add the CSS link before the closing head tag
            const headCloseIndex = htmlContent.indexOf('</head>');
            if (headCloseIndex !== -1) {
                const cssToInject = `
    <!-- Footer Fix Styles -->
    <link rel="stylesheet" href="styles/footer-elite-luxury.css">
    `;
                htmlContent = htmlContent.slice(0, headCloseIndex) + cssToInject + htmlContent.slice(headCloseIndex);
                logInfo(`Added footer-elite-luxury.css stylesheet link`);
            }
        }
        
        // Write the updated content back to the file
        fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
        logInfo(`Added footer fixes to ${htmlFilePath}`);
    } catch (err) {
        logError(`Error processing ${htmlFilePath}: ${err.message}`);
    }
}

// Main function
function main() {
    try {
        logInfo("Starting footer fixes application...");
        
        const currentDir = process.cwd();
        logInfo(`Current working directory: ${currentDir}`);
        
        const htmlFiles = findHtmlFiles('.');
        logInfo(`Found ${htmlFiles.length} HTML files.`);
        
        // Ensure our fix scripts exist
        const scriptsDir = './scripts';
        logInfo(`Checking for required scripts in ${scriptsDir}...`);
        
        if (!fs.existsSync(path.join(scriptsDir, 'fix-footer.js'))) {
            logError('fix-footer.js does not exist in the scripts directory.');
            return;
        } else {
            logInfo('Found fix-footer.js');
        }
        
        if (!fs.existsSync(path.join(scriptsDir, 'remove-spacers.js'))) {
            logError('remove-spacers.js does not exist in the scripts directory.');
            return;
        } else {
            logInfo('Found remove-spacers.js');
        }
        
        // Apply fixes to all HTML files
        htmlFiles.forEach(injectFooterFixes);
        
        logInfo(`Applied footer fixes to ${htmlFiles.length} HTML files.`);
        
    } catch (error) {
        logError('Error:', error);
    }
}

// Run the script
main(); 