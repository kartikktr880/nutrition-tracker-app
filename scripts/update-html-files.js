/**
 * Update HTML Files Script
 * Updates all HTML files to use the new consolidated systems
 */

const fs = require('fs');
const path = require('path');

// Files to remove (old scripts)
const filesToRemove = [
    'scripts/smooth-scroll-fix.js',
    'scripts/enhanced-header-scroll.js',
    'scripts/apply-enhanced-fixes.js',
    'scripts/fix-scroll.js',
    'scripts/fix-footer.js',
    'scripts/remove-spacers.js',
    'scripts/gradient-scroll.js',
    'scripts/fix-header-scroll.js',
    'scripts/fix-scroll-jump.js',
    'scripts/fix-scroll-position.js',
    'scripts/fix-scroll-smooth.js',
    'scripts/performance-analytics.js',
    'scripts/performance-analytics-visualizer.js',
    'scripts/performance-visualizer.js',
    'scripts/performance-dashboard.js',
    'scripts/performance-monitor.js',
    'scripts/performance-optimizer.js',
    'scripts/animation-system.js',
    'scripts/animation-queue.js',
    'scripts/animation-manager.js',
    'scripts/scroll-optimizer.js',
    'scripts/scroll-manager.js'
];

// New consolidated files to add
const newFiles = [
    {
        type: 'script',
        src: 'scripts/performance-manager.js',
        module: true
    },
    {
        type: 'script',
        src: 'scripts/animation-system.js',
        module: true
    },
    {
        type: 'script',
        src: 'scripts/scroll-manager.js',
        module: true
    },
    {
        type: 'script',
        src: 'scripts/fix-manager.js',
        module: true
    }
];

// Initialize managers
const initScript = `
<script type="module">
    import performanceManager from './scripts/performance-manager.js';
    import animationSystem from './scripts/animation-system.js';
    import scrollManager from './scripts/scroll-manager.js';
    import fixManager from './scripts/fix-manager.js';

    // Initialize managers
    document.addEventListener('DOMContentLoaded', function() {
        performanceManager.startMonitoring();
        animationSystem.enableDebug();
        scrollManager.init();
        fixManager.init();
    });
</script>
`;

// Process HTML files
function processHtmlFile(filePath) {
    console.log(`Processing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove old script references
    filesToRemove.forEach(file => {
        const scriptTag = `<script src="${file}"`;
        const scriptTagWithDefer = `<script src="${file}" defer`;
        content = content.replace(new RegExp(`${scriptTag}[^>]*>`, 'g'), '');
        content = content.replace(new RegExp(`${scriptTagWithDefer}[^>]*>`, 'g'), '');
    });
    
    // Add new script references
    newFiles.forEach(file => {
        const scriptTag = file.module 
            ? `<script type="module" src="${file.src}"></script>`
            : `<script src="${file.src}"></script>`;
        
        // Add before closing head tag
        content = content.replace('</head>', `${scriptTag}\n</head>`);
    });
    
    // Add initialization script
    content = content.replace('</head>', `${initScript}\n</head>`);
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

// Get all HTML files
const htmlFiles = fs.readdirSync('.')
    .filter(file => file.endsWith('.html'))
    .map(file => path.join('.', file));

// Process each HTML file
htmlFiles.forEach(processHtmlFile);

console.log('HTML files update complete!'); 