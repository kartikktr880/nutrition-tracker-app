/**
 * Apply Microsoft Screenshot Fix to All Pages
 * This script adds Microsoft screenshot fixes to all HTML files
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
 * Add Microsoft screenshot fix to an HTML file
 */
function addMicrosoftFix(htmlFilePath) {
    console.log(`Adding Microsoft screenshot fix to: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        // Check if Microsoft fix is already added
        if (htmlContent.includes('microsoft-screenshot-fix.js')) {
            console.log(`   Microsoft fix already added to ${htmlFilePath}`);
            return false;
        }
        
        // Add JS reference before the closing body tag
        const bodyEndIndex = htmlContent.indexOf('</body>');
        
        if (bodyEndIndex !== -1) {
            const jsScript = '    <script src="scripts/microsoft-screenshot-fix.js"></script>\n';
            
            htmlContent = 
                htmlContent.substring(0, bodyEndIndex) + 
                jsScript + 
                htmlContent.substring(bodyEndIndex);
                
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
            console.log(`   Successfully added Microsoft screenshot fix to ${htmlFilePath}`);
            return true;
        } else {
            console.log(`   No </body> tag found in ${htmlFilePath}`);
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
    console.log('Starting to add Microsoft screenshot fix to all HTML pages...');
    
    // Start from the current directory
    const currentDir = process.cwd();
    console.log(`Current working directory: ${currentDir}`);
    
    // Find all HTML files
    const htmlFiles = findHtmlFiles(currentDir);
    console.log(`Found ${htmlFiles.length} HTML files`);
    
    // Keep track of modified files
    let modifiedCount = 0;
    
    // Add Microsoft fix to each HTML file
    htmlFiles.forEach(file => {
        if (addMicrosoftFix(file)) {
            modifiedCount++;
        }
    });
    
    console.log(`Added Microsoft screenshot fix to ${modifiedCount} HTML files`);
}

// Run the main function
main(); 