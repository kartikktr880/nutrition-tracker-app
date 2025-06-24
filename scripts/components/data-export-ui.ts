/**
 * Data Export/Import UI Component
 * Provides user interface for exporting and importing nutrition data
 */

import { dataExportUtils } from '../utils/data-export-utils';
import { errorUtils, ErrorCategory, ErrorSeverity } from '../utils/error-utils';
import { LoggingUtils } from '../utils/logging-utils';

export class DataExportUI {
    private static instance: DataExportUI;
    private container: HTMLElement | null = null;
    private readonly logger = LoggingUtils.getInstance();

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): DataExportUI {
        if (!DataExportUI.instance) {
            DataExportUI.instance = new DataExportUI();
        }
        return DataExportUI.instance;
    }

    /**
     * Initialize the UI component
     */
    initialize(): void {
        this.createContainer();
        this.setupEventListeners();
    }

    /**
     * Create the UI container
     */
    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.className = 'data-export-container';
        this.container.innerHTML = `
            <div class="data-export-header">
                <h3>Data Export/Import</h3>
                <button class="close-button">×</button>
            </div>
            <div class="data-export-content">
                <div class="export-section">
                    <h4>Export Data</h4>
                    <div class="format-selection">
                        <label>
                            <input type="radio" name="export-format" value="json" checked>
                            JSON
                        </label>
                        <label>
                            <input type="radio" name="export-format" value="csv">
                            CSV
                        </label>
                    </div>
                    <div class="security-options">
                        <label>
                            <input type="checkbox" id="compress-data">
                            Compress Data
                        </label>
                        <label>
                            <input type="checkbox" id="encrypt-data">
                            Encrypt Data
                        </label>
                        <div id="password-container" style="display: none;">
                            <input type="password" id="export-password" placeholder="Enter password">
                        </div>
                    </div>
                    <button class="export-button">Export Data</button>
                </div>
                <div class="import-section">
                    <h4>Import Data</h4>
                    <div class="file-input-container">
                        <input type="file" id="import-file" accept=".json,.csv" style="display: none;">
                        <button class="import-button">Choose File</button>
                        <span class="file-name">No file chosen</span>
                    </div>
                    <div class="security-options">
                        <label>
                            <input type="checkbox" id="decompress-data">
                            Decompress Data
                        </label>
                        <label>
                            <input type="checkbox" id="decrypt-data">
                            Decrypt Data
                        </label>
                        <div id="import-password-container" style="display: none;">
                            <input type="password" id="import-password" placeholder="Enter password">
                        </div>
                    </div>
                    <button class="import-submit-button" disabled>Import Data</button>
                </div>
            </div>
            <div class="data-export-footer">
                <div class="status-message"></div>
            </div>
        `;

        document.body.appendChild(this.container);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        if (!this.container) return;

        // Close button
        const closeButton = this.container.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // Export button
        const exportButton = this.container.querySelector('.export-button');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.handleExport());
        }

        // Import file selection
        const importButton = this.container.querySelector('.import-button');
        const fileInput = this.container.querySelector('#import-file') as HTMLInputElement;
        const fileName = this.container.querySelector('.file-name');
        const importSubmitButton = this.container.querySelector('.import-submit-button');

        if (importButton && fileInput && fileName && importSubmitButton) {
            importButton.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    fileName.textContent = file.name;
                    importSubmitButton.removeAttribute('disabled');
                } else {
                    fileName.textContent = 'No file chosen';
                    importSubmitButton.setAttribute('disabled', '');
                }
            });

            importSubmitButton.addEventListener('click', () => this.handleImport());
        }

        // Encryption checkbox
        const encryptCheckbox = this.container.querySelector('#encrypt-data') as HTMLInputElement;
        const passwordContainer = this.container.querySelector('#password-container') as HTMLElement;
        if (encryptCheckbox && passwordContainer) {
            encryptCheckbox.addEventListener('change', () => {
                passwordContainer.style.display = encryptCheckbox.checked ? 'block' : 'none';
            });
        }

        // Decryption checkbox
        const decryptCheckbox = this.container.querySelector('#decrypt-data') as HTMLInputElement;
        const importPasswordContainer = this.container.querySelector('#import-password-container') as HTMLElement;
        if (decryptCheckbox && importPasswordContainer) {
            decryptCheckbox.addEventListener('change', () => {
                importPasswordContainer.style.display = decryptCheckbox.checked ? 'block' : 'none';
            });
        }
    }

    /**
     * Handle data export
     */
    private async handleExport(): Promise<void> {
        try {
            const format = (this.container?.querySelector('input[name="export-format"]:checked') as HTMLInputElement)?.value as 'json' | 'csv';
            const compress = (this.container?.querySelector('#compress-data') as HTMLInputElement)?.checked;
            const encrypt = (this.container?.querySelector('#encrypt-data') as HTMLInputElement)?.checked;
            const password = (this.container?.querySelector('#export-password') as HTMLInputElement)?.value;

            if (encrypt && !password) {
                this.showStatus('Please enter a password for encryption', 'error');
                return;
            }

            const data = await this.gatherExportData();
            const blob = await dataExportUtils.exportData(data, {
                format,
                compress,
                encrypt,
                password
            });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nutrition-data-${new Date().toISOString()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('Data exported successfully', 'success');
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.HIGH,
                { context: 'Data export UI' }
            );
            this.showStatus('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Handle data import
     */
    private async handleImport(): Promise<void> {
        const fileInput = this.container?.querySelector('#import-file') as HTMLInputElement;
        const file = fileInput?.files?.[0];

        if (!file) {
            this.showStatus('Please select a file to import', 'error');
            return;
        }

        try {
            const format = file.name.endsWith('.json') ? 'json' : 'csv';
            const decompress = (this.container?.querySelector('#decompress-data') as HTMLInputElement)?.checked;
            const decrypt = (this.container?.querySelector('#decrypt-data') as HTMLInputElement)?.checked;
            const password = (this.container?.querySelector('#import-password') as HTMLInputElement)?.value;

            if (decrypt && !password) {
                this.showStatus('Please enter a password for decryption', 'error');
                return;
            }

            const data = await dataExportUtils.importData(file, {
                format,
                decompress,
                decrypt,
                password
            });

            await this.processImportData(data);
            this.showStatus('Data imported successfully', 'success');
            
            // Reset file input
            fileInput.value = '';
            const fileName = this.container?.querySelector('.file-name');
            if (fileName) fileName.textContent = 'No file chosen';
            
            const importSubmitButton = this.container?.querySelector('.import-submit-button');
            if (importSubmitButton) importSubmitButton.setAttribute('disabled', '');
        } catch (error) {
            await errorUtils.handleError(
                error,
                ErrorCategory.STORAGE,
                ErrorSeverity.HIGH,
                { context: 'Data import UI' }
            );
            this.showStatus('Import failed: ' + error.message, 'error');
        }
    }

    /**
     * Gather data for export
     */
    private async gatherExportData(): Promise<any> {
        // Implement data gathering logic here
        // This should collect all relevant data from your application
        return {
            version: '1.0',
            nutritionData: [],
            userPreferences: {},
            mealPlans: [],
            goals: []
        };
    }

    /**
     * Process imported data
     */
    private async processImportData(data: any): Promise<void> {
        // Implement data processing logic here
        // This should store the imported data in your application
    }

    /**
     * Show status message
     */
    private showStatus(message: string, type: 'success' | 'error'): void {
        const statusElement = this.container?.querySelector('.status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            
            // Clear status after 5 seconds
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 5000);
        }
    }

    /**
     * Show the UI component
     */
    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide the UI component
     */
    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Clean up the UI component
     */
    cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

export const dataExportUI = DataExportUI.getInstance(); 