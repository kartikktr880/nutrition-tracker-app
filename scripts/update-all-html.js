/**
 * Update All HTML Files
 * Adds dark-mode-enforcer.js to all HTML files in the project
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Get the root directory
const rootDir = path.resolve(__dirname, '..');

// Function to process a single HTML file
async function processHtmlFile(filePath) {
    try {
        // Read file content
        const content = await readFile(filePath, 'utf8');
        
        // Check if dark-mode-enforcer.js is already included
        if (content.includes('dark-mode-enforcer.js') && content.includes('gradient-scroll.js')) {
            // console.log(`✓ Already updated: ${filePath}`);
            return;
        }
        
        // Find the head section closing tag
        const headCloseIndex = content.indexOf('</head>');
        if (headCloseIndex === -1) {
            // console.log(`✕ No head section found: ${filePath}`);
            return;
        }
        
        // Create the script tags
        let updatedContent = content;
        
        if (!updatedContent.includes('dark-mode-enforcer.js')) {
            const darkModeEnforcerScript = `
    <!-- Dark Mode Enforcer - Load First -->
    <script src="scripts/dark-mode-enforcer.js"></script>
`;
            // Insert the script tag before the head closing tag
            updatedContent = updatedContent.slice(0, headCloseIndex) + darkModeEnforcerScript + updatedContent.slice(headCloseIndex);
        }
        
        // Add gradient scroll script if not already present
        if (!updatedContent.includes('gradient-scroll.js')) {
            // Find the updated head closing tag
            const newHeadCloseIndex = updatedContent.indexOf('</head>');
            
            const gradientScrollScript = `
    <!-- Gradient Scroll Effect -->
    <script src="scripts/gradient-scroll.js" defer></script>
`;
            // Insert the script tag before the head closing tag
            updatedContent = updatedContent.slice(0, newHeadCloseIndex) + gradientScrollScript + updatedContent.slice(newHeadCloseIndex);
        }
        
        // Add dark-mode class to html tag if not present
        let finalContent = updatedContent;
        const htmlTagMatch = finalContent.match(/<html[^>]*>/);
        if (htmlTagMatch) {
            const htmlTag = htmlTagMatch[0];
            if (!htmlTag.includes('class="dark-mode') && !htmlTag.includes("class='dark-mode")) {
                // Add dark-mode class
                if (htmlTag.includes('class="')) {
                    // Already has a class attribute
                    finalContent = finalContent.replace(/<html([^>]*)class="([^"]*)"/, '<html$1class="dark-mode $2"');
                } else if (htmlTag.includes("class='")) {
                    // Already has a class attribute with single quotes
                    finalContent = finalContent.replace(/<html([^>]*)class='([^']*)'/, "<html$1class='dark-mode $2'");
                } else {
                    // No class attribute
                    finalContent = finalContent.replace(/<html([^>]*)>/, '<html$1 class="dark-mode">');
                }
            }
        }
        
        // Add dark-theme and gradient-background classes to body tag if not present
        const bodyTagMatch = finalContent.match(/<body[^>]*>/);
        if (bodyTagMatch) {
            const bodyTag = bodyTagMatch[0];
            if (!bodyTag.includes('class="dark-theme gradient-background') && 
                !bodyTag.includes("class='dark-theme gradient-background")) {
                
                // Check if there's a dark-theme class but no gradient-background
                if (bodyTag.includes('class="dark-theme') || bodyTag.includes("class='dark-theme")) {
                    // Add gradient-background class
                    finalContent = finalContent.replace(
                        /<body([^>]*)class="dark-theme([^"]*)"/, 
                        '<body$1class="dark-theme gradient-background$2"'
                    );
                    finalContent = finalContent.replace(
                        /<body([^>]*)class='dark-theme([^']*)'/, 
                        "<body$1class='dark-theme gradient-background$2'"
                    );
                } else if (bodyTag.includes('class="') || bodyTag.includes("class='")) {
                    // Already has a class attribute
                    finalContent = finalContent.replace(
                        /<body([^>]*)class="([^"]*)"/, 
                        '<body$1class="dark-theme gradient-background $2"'
                    );
                    finalContent = finalContent.replace(
                        /<body([^>]*)class='([^']*)'/, 
                        "<body$1class='dark-theme gradient-background $2'"
                    );
                } else {
                    // No class attribute
                    finalContent = finalContent.replace(
                        /<body([^>]*)>/, 
                        '<body$1 class="dark-theme gradient-background">'
                    );
                }
            }
        }
        
        // Add theme-color meta tag if not present
        if (!finalContent.includes('name="theme-color"')) {
            const headOpenIndex = finalContent.indexOf('<head>') + 6;
            finalContent = finalContent.slice(0, headOpenIndex) + 
                '\n    <meta name="theme-color" content="#1A3C34">' + 
                finalContent.slice(headOpenIndex);
        } else {
            // Update the theme-color to #1A3C34
            finalContent = finalContent.replace(
                /<meta name="theme-color" content="[^"]*">/,
                '<meta name="theme-color" content="#1A3C34">'
            );
        }
        
        // Write updated content back to file
        await writeFile(filePath, finalContent, 'utf8');
        // console.log(`✓ Updated: ${filePath}`);
    } catch (error) {
        console.error(`✕ Error processing ${filePath}:`, error.message);
    }
}

// Function to process all HTML files in a directory
async function processDirectory(dirPath) {
    try {
        // Read all files/directories in the current directory
        const items = await readDir(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const itemStat = await stat(itemPath);
            
            if (itemStat.isDirectory()) {
                // Skip node_modules and .git directories
                if (item !== 'node_modules' && item !== '.git' && item !== '.firebase') {
                    // Recursively process subdirectories
                    await processDirectory(itemPath);
                }
            } else if (itemPath.endsWith('.html')) {
                // Process HTML files
                await processHtmlFile(itemPath);
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error.message);
    }
}

// Main function
async function main() {
    // console.log('Starting to update all HTML files with dark mode enforcer...');
    await processDirectory(rootDir);
    // console.log('Finished updating HTML files!');
}

// Run the main function
main().catch(console.error); 