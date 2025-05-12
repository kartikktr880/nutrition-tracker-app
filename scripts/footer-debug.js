/**
 * Footer Debug Script
 * Helps identify and fix spacing issues with the footer
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Footer Debug: Initializing...');
  
  // Find the footer element
  const footer = document.querySelector('.premium-simple-footer');
  const main = document.querySelector('main');
  
  if (!footer || !main) {
    console.warn('Footer Debug: Could not find footer or main element');
    return;
  }
  
  // Log positions for debugging
  console.log('Main bottom:', main.getBoundingClientRect().bottom);
  console.log('Footer top:', footer.getBoundingClientRect().top);
  
  // Calculate the gap between main and footer
  const gap = footer.getBoundingClientRect().top - main.getBoundingClientRect().bottom;
  console.log('Gap between main and footer:', gap, 'px');
  
  // If there's a significant gap, fix it
  if (gap > 10) {
    console.log('Footer Debug: Fixing gap between main and footer');
    
    // Add a style tag to fix the issue
    const style = document.createElement('style');
    style.textContent = `
      main {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
      
      .premium-simple-footer {
        margin-top: 0 !important;
      }
      
      body {
        min-height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      main {
        flex: 1 !important;
      }
    `;
    document.head.appendChild(style);
    
    // Force a small delay and check again
    setTimeout(() => {
      const newGap = footer.getBoundingClientRect().top - main.getBoundingClientRect().bottom;
      console.log('New gap after fix:', newGap, 'px');
    }, 100);
  }
  
  // Add a visual indicator on the footer
  footer.style.position = 'relative';
  
  // Create a debug bar at the top of the footer
  const debugBar = document.createElement('div');
  debugBar.style.position = 'absolute';
  debugBar.style.top = '0';
  debugBar.style.left = '0';
  debugBar.style.width = '100%';
  debugBar.style.height = '5px';
  debugBar.style.backgroundColor = 'red';
  debugBar.style.zIndex = '1000';
  debugBar.style.opacity = '0.5';
  
  // Only add in development mode - check URL for a debug parameter
  if (window.location.search.includes('debug=true')) {
    footer.appendChild(debugBar);
    console.log('Footer Debug: Added visual indicator');
  }
  
  console.log('Footer Debug: Initialization complete');
}); 