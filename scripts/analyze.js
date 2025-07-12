import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create log file
const logFile = path.join(logsDir, `analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    logInfo(message);
    logStream.write(`[${timestamp}] ${message}\n`);
}

async function main() {
    try {
        log('Starting project assessment...');

        // Check Node.js version
        const nodeVersion = process.version;
        log(`Node.js version: ${nodeVersion}`);

        // Check npm version
        const npmVersion = execSync('npm --version').toString().trim();
        log(`npm version: ${npmVersion}`);

        // Check project structure
        const projectFiles = fs.readdirSync(process.cwd());
        log('Project structure:');
        projectFiles.forEach(file => {
            const stats = fs.statSync(path.join(process.cwd(), file));
            log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
        });

        // Check dependencies
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        log('\nDependencies:');
        Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
            log(`- ${name}: ${version}`);
        });

        log('\nDevDependencies:');
        Object.entries(packageJson.devDependencies || {}).forEach(([name, version]) => {
            log(`- ${name}: ${version}`);
        });

        // Check for configuration files
        const configFiles = [
            '.eslintrc',
            '.prettierrc',
            'tsconfig.json',
            'jest.config.js',
            'postcss.config.js',
            'tailwind.config.js'
        ];

        log('\nConfiguration files:');
        configFiles.forEach(file => {
            const exists = fs.existsSync(file);
            log(`- ${file}: ${exists ? 'found' : 'not found'}`);
        });

        log('\nProject assessment completed successfully.');
    } catch (error) {
        log(`Error during project assessment: ${error.message}`);
        process.exit(1);
    } finally {
        logStream.end();
    }
}

main(); 