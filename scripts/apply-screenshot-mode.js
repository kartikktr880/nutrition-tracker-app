import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Apply Screenshot Mode to All Pages
 * This script adds screenshot mode functionality to all HTML files
 */

const fs = require('fs');
const path = require('path');

/**
 * Find all HTML files in the directory and subdirectories
 */
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
                logError(`Error accessing ${filePath}:`, err.message);
            }
        });
    } catch (err) {
        logError(`Error reading directory ${dir}:`, err.message);
    }
    
    return fileList;
}

/**
 * Add screenshot mode to an HTML file
 */
function addScreenshotMode(htmlFilePath) {
    logInfo(`Adding screenshot mode to: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        // Check if screenshot mode is already added
        if (htmlContent.includes('screenshot-mode.js')) {
            logInfo(`   Screenshot mode already added to ${htmlFilePath}`);
            return false;
        }
        
        // Add CSS reference
        if (!htmlContent.includes('screenshot-fix.css')) {
            const headEndIndex = htmlContent.indexOf('</head>');
            
            if (headEndIndex !== -1) {
                const cssLink = '    <link rel="stylesheet" href="styles/screenshot-fix.css">\n';
                
                htmlContent = 
                    htmlContent.substring(0, headEndIndex) + 
                    cssLink + 
                    htmlContent.substring(headEndIndex);
            }
        }
        
        // Add JS reference before the closing body tag
        const bodyEndIndex = htmlContent.indexOf('</body>');
        
        if (bodyEndIndex !== -1) {
            const jsScript = '    <script src="scripts/screenshot-mode.js"></script>\n';
            
            htmlContent = 
                htmlContent.substring(0, bodyEndIndex) + 
                jsScript + 
                htmlContent.substring(bodyEndIndex);
                
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
            logInfo(`   Successfully added screenshot mode to ${htmlFilePath}`);
            return true;
        } else {
            logInfo(`   No </body> tag found in ${htmlFilePath}`);
            return false;
        }
    } catch (err) {
        logError(`Error modifying ${htmlFilePath}:`, err.message);
        return false;
    }
}

/**
 * Main function to find and modify HTML files
 */
function main() {
    logInfo('Starting to add screenshot mode to all HTML pages...');
    
    // Start from the current directory
    const currentDir = process.cwd();
    logInfo(`Current working directory: ${currentDir}`);
    
    // Find all HTML files
    const htmlFiles = findHtmlFiles(currentDir);
    logInfo(`Found ${htmlFiles.length} HTML files`);
    
    // Keep track of modified files
    let modifiedCount = 0;
    
    // Add screenshot mode to each HTML file
    htmlFiles.forEach(file => {
        if (addScreenshotMode(file)) {
            modifiedCount++;
        }
    });
    
    logInfo(`Added screenshot mode to ${modifiedCount} HTML files`);
}

// Run the main function
main(); 