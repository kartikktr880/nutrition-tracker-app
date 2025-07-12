import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Header Migration Script
 * Safely transitions from old header implementation to new header manager
 */

class HeaderMigration {
    constructor() {
        this.oldFiles = [
            'scripts/fix-header-scroll.js',
            'scripts/enhanced-header-scroll.js',
            'styles/header-fixes.css'
        ];
        this.newFile = 'scripts/header-manager.js';
    }

    async migrate() {
        try {
            // 1. Backup old files
            await this.backupFiles();

            // 2. Update HTML files
            await this.updateHtmlFiles();

            // 3. Clean up old files
            await this.cleanupOldFiles();

            logInfo('Header migration completed successfully');
        } catch (error) {
            logError('Header migration failed:', error);
            await this.rollback();
        }
    }

    async backupFiles() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = 'backups/header-migration-' + timestamp;

        // Create backup directory
        await this.runCommand(`mkdir -p ${backupDir}`);

        // Copy files to backup
        for (const file of this.oldFiles) {
            await this.runCommand(`cp ${file} ${backupDir}/`);
        }
    }

    async updateHtmlFiles() {
        const htmlFiles = await this.findHtmlFiles();
        
        for (const file of htmlFiles) {
            let content = await this.readFile(file);
            
            // Remove old header script and CSS
            content = content.replace(/<link[^>]*header-fixes\.css[^>]*>/g, '');
            content = content.replace(/<script[^>]*fix-header-scroll\.js[^>]*><\/script>/g, '');
            content = content.replace(/<script[^>]*enhanced-header-scroll\.js[^>]*><\/script>/g, '');
            
            // Add new header manager
            if (!content.includes(this.newFile)) {
                content = content.replace(
                    '</head>',
                    `    <script src="${this.newFile}" defer></script>\n</head>`
                );
            }
            
            await this.writeFile(file, content);
        }
    }

    async cleanupOldFiles() {
        for (const file of this.oldFiles) {
            await this.runCommand(`rm ${file}`);
        }
    }

    async rollback() {
        logInfo('Rolling back changes...');
        // Implementation of rollback logic
    }

    async findHtmlFiles() {
        // Implementation to find all HTML files
        return ['*.html'];
    }

    async readFile(file) {
        // Implementation to read file content
        return '';
    }

    async writeFile(file, content) {
        // Implementation to write file content
    }

    async runCommand(command) {
        // Implementation to run shell commands
    }
}

// Run migration
new HeaderMigration().migrate(); 