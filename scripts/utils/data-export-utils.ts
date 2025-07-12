/**
 * Data Export/Import Utilities
 * Handles exporting and importing nutrition data
 */

import { StorageUtils } from './storage-utils';
import { ValidationUtils } from './validation-utils';
import { LoggingUtils } from './logging-utils';
import { errorUtils, ErrorCategory, ErrorSeverity } from './error-utils';
import { dataSecurityUtils } from './data-security-utils';

interface ExportOptions {
    format: 'json' | 'csv';
    compress?: boolean;
    encrypt?: boolean;
    password?: string;
}

interface ImportOptions {
    format: 'json' | 'csv';
    decompress?: boolean;
    decrypt?: boolean;
    password?: string;
}

export class DataExportUtils {
    private static instance: DataExportUtils;
    private readonly supportedFormats = ['json', 'csv'];
    private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): DataExportUtils {
        if (!DataExportUtils.instance) {
            DataExportUtils.instance = new DataExportUtils();
        }
        return DataExportUtils.instance;
    }

    /**
     * Export nutrition data to a file
     */
    async exportData(data: any, options: ExportOptions): Promise<Blob> {
        try {
            let exportData = this.formatData(data, options.format);
            
            // Compress data if requested
            if (options.compress) {
                const compressedData = await dataSecurityUtils.compressData(exportData);
                exportData = this.arrayBufferToBase64(compressedData.buffer as ArrayBuffer);
            }
            
            // Encrypt data if requested
            if (options.encrypt && options.password) {
                const encryptedData = await dataSecurityUtils.encryptData(exportData, options.password);
                exportData = this.arrayBufferToBase64(encryptedData.buffer as ArrayBuffer);
            }

            const blob = new Blob([exportData], { type: this.getMimeType(options) });
            return blob;
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(
                    error,
                    ErrorCategory.STORAGE,
                    ErrorSeverity.HIGH,
                    { context: 'Data export' }
                );
            } else {
                await errorUtils.handleError(
                    new Error(String(error)),
                    ErrorCategory.STORAGE,
                    ErrorSeverity.HIGH,
                    { context: 'Data export' }
                );
            }
            throw error;
        }
    }

    /**
     * Import nutrition data from a file
     */
    async importData(file: File, options: ImportOptions): Promise<any> {
        try {
            let importData = await this.readFile(file);
            
            // Decrypt data if requested
            if (options.decrypt && options.password) {
                const encryptedData = this.base64ToArrayBuffer(importData);
                importData = await dataSecurityUtils.decryptData(new Uint8Array(encryptedData), options.password);
            }
            
            // Decompress data if requested
            if (options.decompress) {
                const compressedData = this.base64ToArrayBuffer(importData);
                importData = await dataSecurityUtils.decompressData(new Uint8Array(compressedData));
            }

            return this.parseData(importData, options.format);
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(
                    error,
                    ErrorCategory.STORAGE,
                    ErrorSeverity.HIGH,
                    { context: 'Data import' }
                );
            } else {
                await errorUtils.handleError(
                    new Error(String(error)),
                    ErrorCategory.STORAGE,
                    ErrorSeverity.HIGH,
                    { context: 'Data import' }
                );
            }
            throw error;
        }
    }

    /**
     * Gather all data for export
     */
    private async gatherExportData(): Promise<any> {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            nutritionData: await StorageUtils.getData('nutritionData'),
            userPreferences: await StorageUtils.getData('userPreferences'),
            mealPlans: await StorageUtils.getData('mealPlans'),
            goals: await StorageUtils.getData('goals')
        };

        return data;
    }

    /**
     * Formats data based on the specified format
     */
    private formatData(data: any, format: 'json' | 'csv'): string {
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                throw new Error('Unsupported format');
        }
    }

    /**
     * Parses data based on the specified format
     */
    private parseData(data: string, format: 'json' | 'csv'): any {
        try {
            switch (format) {
                case 'json':
                    return JSON.parse(data);
                case 'csv':
                    return this.parseCSV(data);
                default:
                    throw new Error('Unsupported format');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse ${format} data: ${message}`);
        }
    }

    /**
     * Converts data to CSV format
     */
    private convertToCSV(data: any): string {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array for CSV conversion');
        }

        if (data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => {
                const value = item[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Parses CSV data
     */
    private parseCSV(csv: string): any[] {
        const lines = csv.split('\n');
        if (lines.length < 2) {
            throw new Error('Invalid CSV data');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        });
    }

    /**
     * Parses a single CSV line
     */
    private parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        values.push(currentValue.trim());
        return values;
    }

    /**
     * Gets the MIME type for the export
     */
    private getMimeType(options: ExportOptions): string {
        if (options.encrypt) {
            return 'application/octet-stream';
        }
        return options.format === 'json' ? 'application/json' : 'text/csv';
    }

    /**
     * Reads a file as text
     */
    private async readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Converts ArrayBuffer to Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Converts Base64 to ArrayBuffer
     */
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const dataExportUtils = DataExportUtils.getInstance(); 