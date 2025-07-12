/**
 * Data Security Utilities
 * Handles data compression and encryption for secure data export/import
 */

import { LoggingUtils } from './logging-utils';
import { errorUtils, ErrorCategory, ErrorSeverity } from './error-utils';

interface EncryptionOptions {
    algorithm?: string;
    keySize?: number;
    iterations?: number;
}

interface CompressionOptions {
    level?: number;
    method?: 'gzip' | 'deflate';
}

export class DataSecurityUtils {
    private static instance: DataSecurityUtils;
    private readonly defaultEncryptionOptions: EncryptionOptions = {
        algorithm: 'AES-GCM',
        keySize: 256,
        iterations: 100000
    };
    private readonly defaultCompressionOptions: CompressionOptions = {
        level: 6,
        method: 'gzip'
    };

    private constructor() {}

    static getInstance(): DataSecurityUtils {
        if (!DataSecurityUtils.instance) {
            DataSecurityUtils.instance = new DataSecurityUtils();
        }
        return DataSecurityUtils.instance;
    }

    /**
     * Compresses data using the specified compression method
     */
    async compressData(data: string, options: CompressionOptions = {}): Promise<Uint8Array> {
        try {
            const compressionOptions = { ...this.defaultCompressionOptions, ...options };
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            // Use CompressionStream API if available
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream(compressionOptions.method || 'gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();

                await writer.write(dataBuffer);
                await writer.close();

                const chunks: Uint8Array[] = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }

                return this.concatenateUint8Arrays(chunks);
            } else {
                // Fallback to pako if CompressionStream is not available
                const pako = await import('pako');
                return pako.gzip(data, { level: compressionOptions.level as 0 | 6 | 1 | -1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | undefined });
            }
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(error, ErrorCategory.STORAGE, ErrorSeverity.HIGH, { context: 'Data compression' });
            } else {
                await errorUtils.handleError(new Error(String(error)), ErrorCategory.STORAGE, ErrorSeverity.HIGH, { context: 'Data compression' });
            }
            throw error;
        }
    }

    /**
     * Decompresses data using the specified compression method
     */
    async decompressData(compressedData: Uint8Array, options: CompressionOptions = {}): Promise<string> {
        try {
            const compressionOptions = { ...this.defaultCompressionOptions, ...options };

            // Use DecompressionStream API if available
            if (typeof DecompressionStream !== 'undefined') {
                const stream = new DecompressionStream(compressionOptions.method || 'gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();

                await writer.write(compressedData);
                await writer.close();

                const chunks: Uint8Array[] = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }

                const decompressedData = this.concatenateUint8Arrays(chunks);
                return new TextDecoder().decode(decompressedData);
            } else {
                // Fallback to pako if DecompressionStream is not available
                const pako = await import('pako');
                const decompressed = pako.ungzip(compressedData);
                return new TextDecoder().decode(decompressed);
            }
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(error, ErrorCategory.STORAGE, ErrorSeverity.HIGH, { context: 'Data decompression' });
            } else {
                await errorUtils.handleError(new Error(String(error)), ErrorCategory.STORAGE, ErrorSeverity.HIGH, { context: 'Data decompression' });
            }
            throw error;
        }
    }

    /**
     * Encrypts data using AES-GCM
     */
    async encryptData(data: string, password: string, options: EncryptionOptions = {}): Promise<Uint8Array> {
        try {
            const encryptionOptions = { ...this.defaultEncryptionOptions, ...options };
            
            // Generate a random salt
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            // Derive key from password
            const key = await this.deriveKey(password, salt, encryptionOptions);
            
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the data
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const encryptedData = await crypto.subtle.encrypt(
                { name: encryptionOptions.algorithm || 'AES-GCM', iv },
                key,
                dataBuffer
            );

            // Combine salt, IV, and encrypted data
            const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encryptedData), salt.length + iv.length);

            return result;
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(error, ErrorCategory.RUNTIME, ErrorSeverity.HIGH, { context: 'Data encryption' });
            } else {
                await errorUtils.handleError(new Error(String(error)), ErrorCategory.RUNTIME, ErrorSeverity.HIGH, { context: 'Data encryption' });
            }
            throw error;
        }
    }

    /**
     * Decrypts data using AES-GCM
     */
    async decryptData(encryptedData: Uint8Array, password: string, options: EncryptionOptions = {}): Promise<string> {
        try {
            const encryptionOptions = { ...this.defaultEncryptionOptions, ...options };
            
            // Extract salt, IV, and encrypted data
            const salt = encryptedData.slice(0, 16);
            const iv = encryptedData.slice(16, 28);
            const data = encryptedData.slice(28);
            
            // Derive key from password
            const key = await this.deriveKey(password, salt, encryptionOptions);
            
            // Decrypt the data
            const decryptedData = await crypto.subtle.decrypt(
                { name: encryptionOptions.algorithm || 'AES-GCM', iv },
                key,
                data
            );

            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            if (error instanceof Error) {
                await errorUtils.handleError(error, ErrorCategory.RUNTIME, ErrorSeverity.HIGH, { context: 'Data decryption' });
            } else {
                await errorUtils.handleError(new Error(String(error)), ErrorCategory.RUNTIME, ErrorSeverity.HIGH, { context: 'Data decryption' });
            }
            throw error;
        }
    }

    /**
     * Derives a cryptographic key from a password
     */
    private async deriveKey(
        password: string,
        salt: Uint8Array,
        options: EncryptionOptions
    ): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        // Import the password as a raw key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive the key
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: options.iterations || 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: options.algorithm || 'AES-GCM', length: options.keySize || 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Concatenates multiple Uint8Arrays into a single array
     */
    private concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        
        return result;
    }

    /**
     * Validates encryption options
     */
    private validateEncryptionOptions(options: EncryptionOptions): void {
        if (options.keySize && ![128, 192, 256].includes(options.keySize)) {
            throw new Error('Invalid key size. Must be 128, 192, or 256.');
        }
        if (options.iterations && options.iterations < 100000) {
            throw new Error('Iterations must be at least 100,000 for security.');
        }
    }

    /**
     * Validates compression options
     */
    private validateCompressionOptions(options: CompressionOptions): void {
        if (options.level && (options.level < 0 || options.level > 9)) {
            throw new Error('Compression level must be between 0 and 9.');
        }
        if (options.method && !['gzip', 'deflate'].includes(options.method)) {
            throw new Error('Invalid compression method. Must be gzip or deflate.');
        }
    }
}

export const dataSecurityUtils = DataSecurityUtils.getInstance(); 