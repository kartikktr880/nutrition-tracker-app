/**
 * Script to add premium-header to HTML files
 * This script looks for HTML files that don't have the premium-header
 * and adds it right after the opening <body> tag.
 */

const fs = require('fs');
const path = require('path');

// List of files to check
const filesToUpdate = [
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

// Premium header HTML to insert
const premiumHeaderHtml = `<body class="dark-theme gradient-background dark-mode">
    <!-- Premium Desktop Header -->
    <header class="premium-header" id="premium-header">
      <div class="premium-header-container">
        <!-- Logo -->
        <a href="/" class="premium-header-logo">
          <img src="images/logo.svg" alt="NutriTrack Logo" class="premium-header-logo-img">
          <span class="premium-header-logo-text">NutriTrack</span>
        </a>
        <!-- Profile Icon -->
        <div class="premium-header-actions">
          <a href="profile.html" class="header-icon" title="Profile"><i class="fa-solid fa-user-circle"></i></a>
        </div>
      </div>
    </header>
    <div id="sidebar-container"></div>`;

// Process each file
filesToUpdate.forEach(file => {
  try {
    const filePath = path.join(__dirname, file);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${file}`);
      return;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if premium-header is already included
    if (content.includes('premium-header')) {
      console.log(`${file}: premium-header already included`);
      return;
    }
    
    // Replace the opening body tag with our premium header
    const bodyRegex = /<body[^>]*>/;
    if (!bodyRegex.test(content)) {
      console.log(`${file}: No body tag found`);
      return;
    }
    
    const updatedContent = content.replace(bodyRegex, premiumHeaderHtml);
    
    // Check if changes were made
    if (content === updatedContent) {
      console.log(`${file}: Couldn't update body tag`);
      return;
    }
    
    // Write back to file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`${file}: Successfully updated with premium-header`);
    
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Premium header update process completed.'); 