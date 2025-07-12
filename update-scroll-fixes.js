import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Script to update HTML files with fix-scroll.js
 * This script looks for key HTML pages and adds the fix-scroll.js script
 * before the closing </head> tag if it doesn't already exist.
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

// Script tag to insert
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
    
    // Check if script is already included
    if (content.includes('fix-scroll.js')) {
      logInfo(`${file}: fix-scroll.js already included`);
      return;
    }
    
    // Find a good injection point - after main.css or reset.css
    let updatedContent;
    if (content.includes('main.css')) {
      // Add after main.css
      updatedContent = content.replace(
        /(main\.css[^>]*>)/i,
        `$1\n${scriptToAdd}`
      );
    } else if (content.includes('reset.css')) {
      // Add after reset.css
      updatedContent = content.replace(
        /(reset\.css[^>]*>)/i,
        `$1\n${scriptToAdd}`
      );
    } else {
      // Just add before </head>
      updatedContent = content.replace(
        /<\/head>/i,
        `${scriptToAdd}</head>`
      );
    }
    
    // Remove any large spacer divs (common cause of scrollbar issues)
    updatedContent = updatedContent.replace(
      /<div style="height: 2000px;">[^<]*<\/div>/gi,
      ''
    );
    
    // Check if changes were made
    if (content === updatedContent) {
      logInfo(`${file}: No changes made (couldn't find insertion point)`);
      return;
    }
    
    // Write back to file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    logInfo(`${file}: Successfully added fix-scroll.js`);
    
  } catch (error) {
    logError(`Error processing ${file}:`, error.message);
  }
});

logInfo('Scroll fix update process completed.'); 