/**
 * Update All HTML Files - Additional Visual Improvements
 * This script adds the newly created visual enhancement files to all HTML files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
    // Directories to exclude
    excludeDirs: [
        'node_modules',
        '.git',
        'dist',
        'build'
    ],
    // Additional scripts and styles to add
    scriptsToAdd: [
        '<link rel="stylesheet" href="styles/section-spacing-fix.css">',
        '<link rel="stylesheet" href="styles/button-enhancement.css">',
        '<link rel="stylesheet" href="styles/images-and-cards-fix.css">',
        '<script src="scripts/footer-improver.js" defer></script>'
    ],
    // Debug mode
    debug: true
};

// Count files processed
let filesProcessed = 0;
let filesUpdated = 0;
let filesSkipped = 0;
let errors = 0;

/**
 * Check if a file is in an excluded directory
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if the file should be excluded
 */
function isExcluded(filePath) {
    return config.excludeDirs.some(dir => filePath.includes(dir));
}

/**
 * Update a single HTML file
 * @param {string} filePath - Path to the HTML file
 */
function updateHtmlFile(filePath) {
    try {
        // Skip excluded directories
        if (isExcluded(filePath)) {
            if (config.debug) {
                console.log(`Skipping excluded file: ${filePath}`);
            }
            filesSkipped++;
            return;
        }
        
        // Read the file content
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Check if file already has these additional improvements
        if (content.includes('section-spacing-fix.css') && 
            content.includes('button-enhancement.css') && 
            content.includes('images-and-cards-fix.css') &&
            content.includes('footer-improver.js')) {
            if (config.debug) {
                console.log(`File already has additional fixes: ${filePath}`);
            }
            filesSkipped++;
            return;
        }
        
        // Get relative path to scripts directory
        const relPath = path.relative(path.dirname(filePath), '.').replace(/\\/g, '/');
        const scriptsPath = relPath ? relPath + '/' : '';
        
        // Add scripts before </head>
        let headEndIndex = content.indexOf('</head>');
        if (headEndIndex !== -1) {
            // Prepare scripts to add with proper paths
            const scriptsWithPath = config.scriptsToAdd.map(script => {
                return script
                    .replace('src="scripts/', `src="${scriptsPath}scripts/`)
                    .replace('href="styles/', `href="${scriptsPath}styles/`);
            });
            
            // Join scripts with newlines and indentation
            const scriptsToInsert = '\n    <!-- Additional Visual Enhancements -->\n    ' + 
                                    scriptsWithPath.join('\n    ') + 
                                    '\n    ';
            
            // Insert scripts before </head>
            content = content.slice(0, headEndIndex) + scriptsToInsert + content.slice(headEndIndex);
        }
        
        // Only write file if content has changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            filesUpdated++;
            
            if (config.debug) {
                console.log(`Updated file with additional fixes: ${filePath}`);
            }
        } else {
            filesSkipped++;
            
            if (config.debug) {
                console.log(`No additional changes needed: ${filePath}`);
            }
        }
        
        filesProcessed++;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        errors++;
    }
}

/**
 * Update all HTML files in the project
 */
function updateAllHtmlFiles() {
    try {
        // Find all HTML files
        const htmlFiles = glob.sync('**/*.html', {
            ignore: config.excludeDirs.map(dir => `${dir}/**`)
        });
        
        console.log(`Found ${htmlFiles.length} HTML files for additional visual improvements`);
        
        // Process each file
        htmlFiles.forEach(file => {
            updateHtmlFile(file);
        });
        
        // Log results
        console.log(`
=== Additional Visual Improvements Update Complete ===
Files processed: ${filesProcessed}
Files updated: ${filesUpdated}
Files skipped: ${filesSkipped}
Errors: ${errors}
        `);
    } catch (error) {
        console.error('Error updating HTML files with additional improvements:', error);
    }
}

// Run the update
updateAllHtmlFiles(); 