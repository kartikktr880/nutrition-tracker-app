const fs = require('fs');
const path = require('path');

// Files to remove
const filesToRemove = [
    'styles/main.css',
    'styles/main_new.css',
    'styles/main_temp.css',
    'styles/main_fixed.css',
    'styles/enhanced-scroll-fix.css'
];

// Patterns to replace
const patterns = [
    {
        search: /<link\s+rel="stylesheet"\s+href="styles\/main\.css">/g,
        replace: '<link rel="stylesheet" href="styles/core.css">\n<link rel="stylesheet" href="styles/components.css">\n<link rel="stylesheet" href="styles/layouts.css">\n<link rel="stylesheet" href="styles/themes.css">'
    },
    {
        search: /<link\s+rel="stylesheet"\s+href="styles\/main_new\.css">/g,
        replace: '<link rel="stylesheet" href="styles/core.css">\n<link rel="stylesheet" href="styles/components.css">\n<link rel="stylesheet" href="styles/layouts.css">\n<link rel="stylesheet" href="styles/themes.css">'
    },
    {
        search: /<link\s+rel="stylesheet"\s+href="styles\/main_temp\.css">/g,
        replace: '<link rel="stylesheet" href="styles/core.css">\n<link rel="stylesheet" href="styles/components.css">\n<link rel="stylesheet" href="styles/layouts.css">\n<link rel="stylesheet" href="styles/themes.css">'
    },
    {
        search: /<link\s+rel="stylesheet"\s+href="styles\/main_fixed\.css">/g,
        replace: '<link rel="stylesheet" href="styles/core.css">\n<link rel="stylesheet" href="styles/components.css">\n<link rel="stylesheet" href="styles/layouts.css">\n<link rel="stylesheet" href="styles/themes.css">'
    },
    {
        search: /<link\s+rel="stylesheet"\s+href="styles\/enhanced-scroll-fix\.css">/g,
        replace: ''
    }
];

// Function to update a file
function updateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        patterns.forEach(pattern => {
            const newContent = content.replace(pattern.search, pattern.replace);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
        return false;
    }
}

// Function to remove old files
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

// Function to find all HTML files
function findHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            results = results.concat(findHtmlFiles(filePath));
        } else if (file.endsWith('.html')) {
            results.push(filePath);
        }
    });
    
    return results;
}

// Main execution
try {
    const htmlFiles = findHtmlFiles('.');
    let updatedCount = 0;

    htmlFiles.forEach(file => {
        if (updateFile(file)) {
            updatedCount++;
        }
    });

    removeOldFiles();

    console.log(`\nCSS update completed successfully!`);
    console.log(`Updated ${updatedCount} HTML files`);
    console.log(`Removed ${filesToRemove.length} old CSS files`);
} catch (error) {
    console.error('Error during CSS update:', error);
    process.exit(1);
} 