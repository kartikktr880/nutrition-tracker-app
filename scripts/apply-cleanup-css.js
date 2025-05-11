/**
 * Apply Cleanup CSS to All Pages
 * This script injects the cleanup-scrolling.css file into all HTML pages
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
 * Inject cleanup CSS into an HTML file
 */
function injectCleanupCSS(htmlFilePath) {
    console.log(`Applying cleanup CSS to: ${htmlFilePath}`);
    
    try {
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        // Check if cleanup CSS is already applied
        if (htmlContent.includes('cleanup-scrolling.css')) {
            console.log(`   Cleanup CSS already applied to ${htmlFilePath}`);
            return false;
        }
        
        // Find the end of the head section
        const headEndIndex = htmlContent.indexOf('</head>');
        
        if (headEndIndex === -1) {
            console.log(`   No </head> tag found in ${htmlFilePath}`);
            return false;
        }
        
        // Insert cleanup CSS right before the head closing tag
        const cssLink = '    <link rel="stylesheet" href="styles/cleanup-scrolling.css">\n';
        
        htmlContent = 
            htmlContent.substring(0, headEndIndex) + 
            cssLink + 
            htmlContent.substring(headEndIndex);
        
        fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
        console.log(`   Successfully applied cleanup CSS to ${htmlFilePath}`);
        return true;
    } catch (err) {
        console.error(`Error modifying ${htmlFilePath}:`, err.message);
        return false;
    }
}

/**
 * Main function to find and modify HTML files
 */
function main() {
    console.log('Starting to apply cleanup CSS to all HTML pages...');
    
    // Start from the current directory
    const currentDir = process.cwd();
    console.log(`Current working directory: ${currentDir}`);
    
    // Find all HTML files
    const htmlFiles = findHtmlFiles(currentDir);
    console.log(`Found ${htmlFiles.length} HTML files`);
    
    // Keep track of modified files
    let modifiedCount = 0;
    
    // Apply cleanup CSS to each HTML file
    htmlFiles.forEach(file => {
        if (injectCleanupCSS(file)) {
            modifiedCount++;
        }
    });
    
    console.log(`Applied cleanup CSS to ${modifiedCount} HTML files`);
}

// Run the main function
main(); 