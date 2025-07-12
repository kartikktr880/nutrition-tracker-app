import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
export class StorageUtils {
    private static readonly STORAGE_KEYS = {
        USER_DATA: 'user_data',
        SETTINGS: 'settings',
        CACHE: 'cache',
        BACKUP: 'backup',
        ANALYTICS: 'analytics'
    } as const;

    private static readonly STORAGE_TYPES = {
        LOCAL: 'localStorage',
        SESSION: 'sessionStorage',
        INDEXED_DB: 'indexedDB'
    } as const;

    private static readonly BACKUP_CONFIG = {
        maxBackups: 5,
        backupInterval: 24 * 60 * 60 * 1000, // 24 hours
        lastBackup: 0
    };

    private static readonly ANALYTICS_CONFIG = {
        enabled: true,
        maxEntries: 1000,
        flushInterval: 5 * 60 * 1000 // 5 minutes
    };

    private static analyticsQueue: Array<{
        timestamp: number;
        action: string;
        data: any;
    }> = [];

    static async saveData<T>(key: string, data: T, type: keyof typeof this.STORAGE_TYPES = 'LOCAL'): Promise<void> {
        try {
            const serializedData = JSON.stringify(data);
            
            switch (type) {
                case 'LOCAL':
                    localStorage.setItem(key, serializedData);
                    break;
                case 'SESSION':
                    sessionStorage.setItem(key, serializedData);
                    break;
                case 'INDEXED_DB':
                    await this.saveToIndexedDB(key, data);
                    break;
            }

            this.trackAnalytics('save', { key, type });
        } catch (error) {
            logError('Error saving data:', error);
            throw new Error('Failed to save data');
        }
    }

    static async getData<T>(key: string, type: keyof typeof this.STORAGE_TYPES = 'LOCAL'): Promise<T | null> {
        try {
            let data: string | null = null;
            
            switch (type) {
                case 'LOCAL':
                    data = localStorage.getItem(key);
                    break;
                case 'SESSION':
                    data = sessionStorage.getItem(key);
                    break;
                case 'INDEXED_DB':
                    return await this.getFromIndexedDB<T>(key);
            }

            this.trackAnalytics('get', { key, type });
            if (!data) return null;
            const parsed = JSON.parse(data);
            if ((key === this.STORAGE_KEYS.ANALYTICS || key === this.STORAGE_KEYS.BACKUP) && !Array.isArray(parsed)) {
                return [] as unknown as T;
            }
            return parsed;
        } catch (error) {
            logError('Error getting data:', error);
            throw new Error('Failed to get data');
        }
    }

    static async removeData(key: string, type: keyof typeof this.STORAGE_TYPES = 'LOCAL'): Promise<void> {
        try {
            switch (type) {
                case 'LOCAL':
                    localStorage.removeItem(key);
                    break;
                case 'SESSION':
                    sessionStorage.removeItem(key);
                    break;
                case 'INDEXED_DB':
                    await this.removeFromIndexedDB(key);
                    break;
            }

            this.trackAnalytics('remove', { key, type });
        } catch (error) {
            logError('Error removing data:', error);
            throw new Error('Failed to remove data');
        }
    }

    static async clearAll(type: keyof typeof this.STORAGE_TYPES = 'LOCAL'): Promise<void> {
        try {
            switch (type) {
                case 'LOCAL':
                    localStorage.clear();
                    break;
                case 'SESSION':
                    sessionStorage.clear();
                    break;
                case 'INDEXED_DB':
                    await this.clearIndexedDB();
                    break;
            }

            this.trackAnalytics('clear', { type });
        } catch (error) {
            logError('Error clearing storage:', error);
            throw new Error('Failed to clear storage');
        }
    }

    static async clearCorruptedData(): Promise<void> {
        await this.clearAll('LOCAL');
        await this.clearAll('SESSION');
        await this.clearAll('INDEXED_DB');
    }

    static getLocalItem(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            logError('Error getting local item:', error);
            return null;
        }
    }

    static async createBackup(): Promise<void> {
        try {
            const now = Date.now();
            if (now - this.BACKUP_CONFIG.lastBackup < this.BACKUP_CONFIG.backupInterval) {
                return;
            }

            const backupData = {
                timestamp: now,
                data: {
                    localStorage: this.getAllLocalStorageData(),
                    settings: await this.getData(this.STORAGE_KEYS.SETTINGS),
                    userData: await this.getData(this.STORAGE_KEYS.USER_DATA)
                }
            };

            const rawBackups = await this.getData<Array<typeof backupData>>(this.STORAGE_KEYS.BACKUP);
            const backups = Array.isArray(rawBackups) ? rawBackups : [];
            backups.push(backupData);

            // Keep only the most recent backups
            if (backups.length > this.BACKUP_CONFIG.maxBackups) {
                backups.shift();
            }

            await this.saveData(this.STORAGE_KEYS.BACKUP, backups);
            this.BACKUP_CONFIG.lastBackup = now;

            this.trackAnalytics('backup', { timestamp: now });
        } catch (error) {
            logError('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }

    static async restoreBackup(timestamp: number): Promise<void> {
        try {
            const rawBackups = await this.getData<Array<{ timestamp: number; data: any }>>(this.STORAGE_KEYS.BACKUP);
            const backups = Array.isArray(rawBackups) ? rawBackups : [];
            if (!backups.length) {
                throw new Error('No backups found');
            }

            const backup = backups.find(b => b.timestamp === timestamp);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Restore localStorage data
            Object.entries(backup.data.localStorage).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });

            // Restore other data
            await this.saveData(this.STORAGE_KEYS.SETTINGS, backup.data.settings);
            await this.saveData(this.STORAGE_KEYS.USER_DATA, backup.data.userData);

            this.trackAnalytics('restore', { timestamp });
        } catch (error) {
            logError('Error restoring backup:', error);
            throw new Error('Failed to restore backup');
        }
    }

    private static getAllLocalStorageData(): Record<string, any> {
        const data: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key) || '');
                } catch {
                    data[key] = localStorage.getItem(key);
                }
            }
        }
        return data;
    }

    private static async saveToIndexedDB<T>(key: string, data: T): Promise<void> {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        await store.put(data, key);
    }

    private static async getFromIndexedDB<T>(key: string): Promise<T | null> {
        const db = await this.openIndexedDB();
        return new Promise<T | null>((resolve, reject) => {
            const transaction = db.transaction(['storage'], 'readonly');
            const store = transaction.objectStore('storage');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    private static async removeFromIndexedDB(key: string): Promise<void> {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        await store.delete(key);
    }

    private static async clearIndexedDB(): Promise<void> {
        const db = await this.openIndexedDB();
        const transaction = db.transaction(['storage'], 'readwrite');
        const store = transaction.objectStore('storage');
        await store.clear();
    }

    private static async openIndexedDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('appStorage', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('storage')) {
                    db.createObjectStore('storage');
                }
            };
        });
    }

    private static trackAnalytics(action: string, data: any): void {
        if (!this.ANALYTICS_CONFIG.enabled) return;

        this.analyticsQueue.push({
            timestamp: Date.now(),
            action,
            data
        });

        if (this.analyticsQueue.length >= this.ANALYTICS_CONFIG.maxEntries) {
            this.flushAnalytics();
        }
    }

    private static async flushAnalytics(): Promise<void> {
        if (this.analyticsQueue.length === 0) return;

        try {
            const analytics = await this.getData<Array<typeof this.analyticsQueue[0]>>(this.STORAGE_KEYS.ANALYTICS) || [];
            analytics.push(...this.analyticsQueue);
            
            // Keep only the most recent entries
            if (analytics.length > this.ANALYTICS_CONFIG.maxEntries) {
                analytics.splice(0, analytics.length - this.ANALYTICS_CONFIG.maxEntries);
            }

            await this.saveData(this.STORAGE_KEYS.ANALYTICS, analytics);
            this.analyticsQueue = [];
        } catch (error) {
            logError('Error flushing analytics:', error);
        }
    }

    static async getAnalytics(): Promise<Array<typeof this.analyticsQueue[0]>> {
        const data = await this.getData(this.STORAGE_KEYS.ANALYTICS);
        return Array.isArray(data) ? data : [];
    }

    static setAnalyticsEnabled(enabled: boolean): void {
        this.ANALYTICS_CONFIG.enabled = enabled;
    }

    static async getBackupInfo(): Promise<Array<{ timestamp: number }>> {
        const data = await this.getData(this.STORAGE_KEYS.BACKUP);
        return Array.isArray(data) ? data : [];
    }
} 