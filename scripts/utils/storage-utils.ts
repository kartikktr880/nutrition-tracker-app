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

    static async saveData<T>(key: string, data: T, type: keyof typeof this.STORAGE_TYPES = 'localStorage'): Promise<void> {
        try {
            const serializedData = JSON.stringify(data);
            
            switch (type) {
                case 'localStorage':
                    localStorage.setItem(key, serializedData);
                    break;
                case 'sessionStorage':
                    sessionStorage.setItem(key, serializedData);
                    break;
                case 'indexedDB':
                    await this.saveToIndexedDB(key, data);
                    break;
            }

            this.trackAnalytics('save', { key, type });
        } catch (error) {
            console.error('Error saving data:', error);
            throw new Error('Failed to save data');
        }
    }

    static async getData<T>(key: string, type: keyof typeof this.STORAGE_TYPES = 'localStorage'): Promise<T | null> {
        try {
            let data: string | null = null;
            
            switch (type) {
                case 'localStorage':
                    data = localStorage.getItem(key);
                    break;
                case 'sessionStorage':
                    data = sessionStorage.getItem(key);
                    break;
                case 'indexedDB':
                    return await this.getFromIndexedDB<T>(key);
            }

            this.trackAnalytics('get', { key, type });
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting data:', error);
            throw new Error('Failed to get data');
        }
    }

    static async removeData(key: string, type: keyof typeof this.STORAGE_TYPES = 'localStorage'): Promise<void> {
        try {
            switch (type) {
                case 'localStorage':
                    localStorage.removeItem(key);
                    break;
                case 'sessionStorage':
                    sessionStorage.removeItem(key);
                    break;
                case 'indexedDB':
                    await this.removeFromIndexedDB(key);
                    break;
            }

            this.trackAnalytics('remove', { key, type });
        } catch (error) {
            console.error('Error removing data:', error);
            throw new Error('Failed to remove data');
        }
    }

    static async clearAll(type: keyof typeof this.STORAGE_TYPES = 'localStorage'): Promise<void> {
        try {
            switch (type) {
                case 'localStorage':
                    localStorage.clear();
                    break;
                case 'sessionStorage':
                    sessionStorage.clear();
                    break;
                case 'indexedDB':
                    await this.clearIndexedDB();
                    break;
            }

            this.trackAnalytics('clear', { type });
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw new Error('Failed to clear storage');
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

            const backups = await this.getData<Array<typeof backupData>>(this.STORAGE_KEYS.BACKUP) || [];
            backups.push(backupData);

            // Keep only the most recent backups
            if (backups.length > this.BACKUP_CONFIG.maxBackups) {
                backups.shift();
            }

            await this.saveData(this.STORAGE_KEYS.BACKUP, backups);
            this.BACKUP_CONFIG.lastBackup = now;

            this.trackAnalytics('backup', { timestamp: now });
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }

    static async restoreBackup(timestamp: number): Promise<void> {
        try {
            const backups = await this.getData<Array<{ timestamp: number; data: any }>>(this.STORAGE_KEYS.BACKUP);
            if (!backups) {
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
            console.error('Error restoring backup:', error);
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
        const transaction = db.transaction(['storage'], 'readonly');
        const store = transaction.objectStore('storage');
        return await store.get(key);
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
            console.error('Error flushing analytics:', error);
        }
    }

    static getAnalytics(): Promise<Array<typeof this.analyticsQueue[0]>> {
        return this.getData(this.STORAGE_KEYS.ANALYTICS) || Promise.resolve([]);
    }

    static setAnalyticsEnabled(enabled: boolean): void {
        this.ANALYTICS_CONFIG.enabled = enabled;
    }

    static getBackupInfo(): Promise<Array<{ timestamp: number }>> {
        return this.getData(this.STORAGE_KEYS.BACKUP) || Promise.resolve([]);
    }
} 