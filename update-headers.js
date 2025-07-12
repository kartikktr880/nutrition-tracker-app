import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Script to update HTML files with header-fixes.css and fix-scroll.js
 * This script looks for key HTML pages and adds the header-fixes.css and fix-scroll.js
 * to each page to ensure consistent header behavior and no scrollbar issues.
 */

const fs = require('fs');
const path = require('path');

// List of files to update
const filesToUpdate = [
  'index.html',
  'dashboard.html',
  'food-logger.html',
  'profile.html',
  'settings.html',
  'recipes.html',
  'meal-planner.html',
  'nutrition-goals.html',
  'goals.html',
  'food-search.html',
  'water-tracker.html',
  'activity-dashboard.html'
];

// CSS link to insert
const cssLinkToAdd = '    <!-- Final header fixes - should be last to take precedence -->\n    <link rel="stylesheet" href="styles/header-fixes.css">\n</head>';

// Script to add for scrollbar fix
const scriptToAdd = '    <!-- Fix Scroll Issues - Load Early -->\n    <script src="scripts/fix-scroll.js" defer></script>\n';

// Process each file
filesToUpdate.forEach(file => {
  try {
    const filePath = path.join(__dirname, file);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logInfo(`File not found: ${file}`);
      return;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Process changes
    let updated = false;
    let updatedContent = content;
    
    // Add header-fixes.css if not already present
    if (!content.includes('header-fixes.css')) {
      updatedContent = updatedContent.replace('</head>', cssLinkToAdd);
      if (updatedContent !== content) {
        updated = true;
        logInfo(`${file}: Added header-fixes.css`);
      }
    } else {
      logInfo(`${file}: header-fixes.css already included`);
    }
    
    // Add fix-scroll.js script if not already present
    if (!updatedContent.includes('fix-scroll.js')) {
      // Find a good place to insert the script - after reset.css or main.css
      if (updatedContent.includes('main.css')) {
        updatedContent = updatedContent.replace(/main\.css[^>]*>/, match => match + '\n' + scriptToAdd);
        updated = true;
        logInfo(`${file}: Added fix-scroll.js after main.css`);
      } else if (updatedContent.includes('reset.css')) {
        updatedContent = updatedContent.replace(/reset\.css[^>]*>/, match => match + '\n' + scriptToAdd);
        updated = true;
        logInfo(`${file}: Added fix-scroll.js after reset.css`);
      } else {
        // Just add it after the first style or script tag
        const styleRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/;
        const scriptRegex = /<script[^>]*src=/;
        
        if (styleRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(styleRegex, match => match + '\n' + scriptToAdd);
          updated = true;
          logInfo(`${file}: Added fix-scroll.js after first stylesheet`);
        } else if (scriptRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(scriptRegex, match => scriptToAdd + match);
          updated = true;
          logInfo(`${file}: Added fix-scroll.js before first script`);
        }
      }
    } else {
      logInfo(`${file}: fix-scroll.js already included`);
    }
    
    // Remove any large spacer divs that might cause scrollbar issues
    if (updatedContent.includes('<div style="height: 2000px;"></div>')) {
      updatedContent = updatedContent.replace('<div style="height: 2000px;"></div>', '');
      updated = true;
      logInfo(`${file}: Removed large spacer div`);
    }
    
    // Write back to file if changes were made
    if (updated) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      logInfo(`${file}: Successfully updated`);
    } else {
      logInfo(`${file}: No changes needed`);
    }
    
  } catch (error) {
    logError(`Error processing ${file}:`, error.message);
  }
});

logInfo('Update process completed.'); 