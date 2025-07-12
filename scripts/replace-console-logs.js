const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rootDir: process.cwd(),
  exclude: ['node_modules', '.git', 'dist', 'build'],
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  loggerPath: '../utils/logger',
  dryRun: false
};

// Import patterns to look for
const patterns = [
  {
    type: 'error',
    regex: /console\.error\((.*)\)/g,
    replacement: 'logError($1)'
  },
  {
    type: 'warn',
    regex: /console\.warn\((.*)\)/g,
    replacement: 'logWarn($1)'
  },
  {
    type: 'info',
    regex: /console\.log\((.*)\)/g,
    replacement: 'logInfo($1)'
  },
  {
    type: 'debug',
    regex: /console\.debug\((.*)\)/g,
    replacement: 'logDebug($1)'
  }
];

// Process files recursively
function processFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!config.exclude.includes(file)) {
        processFiles(fullPath);
      }
    } else if (config.extensions.includes(path.extname(file))) {
      replaceInFile(fullPath);
    }
  });
}

// Replace console.log in a file
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  patterns.forEach(({ regex, replacement }) => {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      modified = true;
    }
  });

  if (modified) {
    if (!content.includes("import { log")) {
      content = `import { logError, logWarn, logInfo, logDebug } from '${config.loggerPath}';\n${content}`;
    }
    if (!config.dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
      logInfo(`Updated ${filePath}`);
    }
  }
}

// Run the script
try {
  processFiles(config.rootDir);
  logInfo('Completed replacing console.log statements');
} catch (error) {
  logError('Error:', error);
  process.exit(1);
}
