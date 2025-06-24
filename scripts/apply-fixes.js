/**
 * Apply Fixes Script
 * This script applies critical fixes to all HTML files in the project
 * 1. Adds dark-mode classes to html/body
 * 2. Loads critical CSS last to override other styles
 * 3. Ensures dark-mode-enforcer.js loads first
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Critical files to ensure they're included
const criticalFiles = {
    css: [
        '<link rel="stylesheet" href="styles/complete-fixes.css">',
        '<link rel="stylesheet" href="styles/disable-old-floating-badge.css">'
    ],
    js: [
        '<script src="scripts/dark-mode-enforcer.js"></script>',
        '<script src="scripts/gradient-scroll.js" defer></script>'
    ]
};

// Dark mode classes to ensure they're added to html/body
const darkModeClasses = {
    html: ['dark-mode', 'dark-theme'],
    body: ['dark-theme', 'dark-mode', 'gradient-background']
};

// Process a single HTML file
async function processHtmlFile(filePath) {
    try {
        console.log(`Processing ${filePath}...`);
        
        // Read the file content
        const content = await readFile(filePath, 'utf-8');
        
        // Create a DOM parser (simple regex for this script)
        let modifiedContent = content;
        
        // 1. Update html tag to include dark mode classes
        const htmlRegex = /<html([^>]*)>/i;
        if (htmlRegex.test(modifiedContent)) {
            let htmlTag = modifiedContent.match(htmlRegex)[0];
            // Check if classes attribute already exists
            if (htmlTag.includes('class="')) {
                // Add our classes to existing class attribute
                htmlTag = htmlTag.replace(/class="([^"]*)"/i, (match, classes) => {
                    const existingClasses = classes.split(/\s+/);
                    const newClasses = [...existingClasses];
                    
                    for (const cls of darkModeClasses.html) {
                        if (!existingClasses.includes(cls)) {
                            newClasses.push(cls);
                        }
                    }
                    
                    return `class="${newClasses.join(' ')}"`;
                });
            } else {
                // Add class attribute if it doesn't exist
                htmlTag = htmlTag.replace(/<html([^>]*)>/i, `<html$1 class="${darkModeClasses.html.join(' ')}">`)
            }
            
            modifiedContent = modifiedContent.replace(htmlRegex, htmlTag);
        }
        
        // 2. Update body tag to include dark mode classes
        const bodyRegex = /<body([^>]*)>/i;
        if (bodyRegex.test(modifiedContent)) {
            let bodyTag = modifiedContent.match(bodyRegex)[0];
            
            if (bodyTag.includes('class="')) {
                // Add our classes to existing class attribute
                bodyTag = bodyTag.replace(/class="([^"]*)"/i, (match, classes) => {
                    const existingClasses = classes.split(/\s+/);
                    const newClasses = [...existingClasses];
                    
                    for (const cls of darkModeClasses.body) {
                        if (!existingClasses.includes(cls)) {
                            newClasses.push(cls);
                        }
                    }
                    
                    return `class="${newClasses.join(' ')}"`;
                });
            } else {
                // Add class attribute if it doesn't exist
                bodyTag = bodyTag.replace(/<body([^>]*)>/i, `<body$1 class="${darkModeClasses.body.join(' ')}">`)
            }
            
            modifiedContent = modifiedContent.replace(bodyRegex, bodyTag);
        }
        
        // 3. Ensure dark-mode-enforcer.js is loaded first in the head
        if (!modifiedContent.includes('dark-mode-enforcer.js')) {
            // Add it right after the <head> tag
            modifiedContent = modifiedContent.replace(/<head>/i, `<head>\n    ${criticalFiles.js[0]}`);
        }
        
        // 4. Ensure gradient-scroll.js is included
        if (!modifiedContent.includes('gradient-scroll.js')) {
            // Add it right before the </head> tag
            modifiedContent = modifiedContent.replace(/<\/head>/i, `    ${criticalFiles.js[1]}\n</head>`);
        }
        
        // 5. Add our critical CSS fixes at the end of the head
        if (!modifiedContent.includes('complete-fixes.css')) {
            // Add both CSS files right before the </head> tag
            const cssLinks = criticalFiles.css.map(link => `    ${link}`).join('\n');
            modifiedContent = modifiedContent.replace(/<\/head>/i, `${cssLinks}\n</head>`);
        }
        
        // Only write the file if changes were made
        if (modifiedContent !== content) {
            await writeFile(filePath, modifiedContent, 'utf-8');
            console.log(`✅ Updated ${filePath}`);
            return 1; // Return 1 to count updates
        } else {
            console.log(`⏭️ No changes needed for ${filePath}`);
            return 0; // Return 0 if no updates needed
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return 0;
    }
}

// Get all HTML files in the directory and subdirectories
async function getHtmlFiles(dir) {
    const files = [];
    
    // Read the directory
    const entries = await readdir(dir);
    
    // Process each entry
    for (const entry of entries) {
        // Skip node_modules and hidden directories
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
            // Recursively process subdirectories
            const subDirFiles = await getHtmlFiles(fullPath);
            files.push(...subDirFiles);
        } else if (entry.endsWith('.html')) {
            // Add HTML files
            files.push(fullPath);
        }
    }
    
    return files;
}

// Main function to process all HTML files
async function main() {
    try {
        console.log('🔍 Finding HTML files...');
        const htmlFiles = await getHtmlFiles('.');
        console.log(`📋 Found ${htmlFiles.length} HTML files to process`);
        
        let updatedCount = 0;
        
        // Process all HTML files
        for (const file of htmlFiles) {
            updatedCount += await processHtmlFile(file);
        }
        
        console.log(`\n✅ Process complete! Updated ${updatedCount} out of ${htmlFiles.length} files.`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the script
main();