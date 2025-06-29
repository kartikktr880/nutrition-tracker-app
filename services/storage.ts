import { SearchHistoryItem } from '../hooks/useSearchHistory';
import { analytics } from './analytics';
import { compress, decompress } from 'lz-string';

export interface StorageItem {
  id: string;
  value: any;
  timestamp: number;
  version?: number;
  synced?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  searchHistory: boolean;
  suggestions: boolean;
  analytics: boolean;
  notifications: boolean;
}

export interface SyncStatus {
  lastSync: number;
  pending: number;
  error?: string;
}

interface StorageQuota {
  max: number;
  used: number;
}

interface StorageOptions {
  compression?: boolean;
  quota?: {
    max: number; // in bytes
    onQuotaExceeded?: (quota: StorageQuota) => void;
  };
}

const DEFAULT_OPTIONS: Required<StorageOptions> = {
  compression: true,
  quota: {
    max: 5 * 1024 * 1024, // 5MB default quota
    onQuotaExceeded: (quota) => {
      console.warn('Storage quota exceeded:', quota);
    }
  }
};

/**
 * Storage service for managing local and cloud data persistence
 */
class StorageService {
  private storage: Map<string, StorageItem> = new Map();
  private syncQueue: Set<string> = new Set();
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private maxRetries = 3;
  private initialized = false;
  private syncStatus: SyncStatus = {
    lastSync: 0,
    pending: 0
  };
  private options: Required<StorageOptions>;
  private quotaUsed = 0;

  constructor(options: StorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initQuota();
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized) return;

    // Load data from localStorage
    this.loadFromLocal();

    // Start periodic sync
    setInterval(() => this.sync(), this.syncInterval);

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    this.initialized = true;
  }

  private async initQuota() {
    try {
      // Calculate current storage usage
      const keys = await this.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += this.getItemSize(value);
        }
      }

      this.quotaUsed = totalSize;
      this.checkQuota(0); // Check if already over quota
    } catch (err) {
      analytics.trackError({
        errorType: 'storage_init_error',
        errorMessage: err instanceof Error ? err.message : 'Failed to initialize storage'
      });
    }
  }

  private getItemSize(value: string): number {
    return new Blob([value]).size;
  }

  private checkQuota(additionalBytes: number): boolean {
    const newTotal = this.quotaUsed + additionalBytes;
    const isOverQuota = newTotal > this.options.quota.max;

    if (isOverQuota) {
      this.options.quota.onQuotaExceeded?.({
        max: this.options.quota.max,
        used: newTotal
      });
    }

    return !isOverQuota;
  }

  private async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: any): Promise<void> {
    const item: StorageItem = {
      id: key,
      value,
      timestamp: Date.now(),
      version: (this.storage.get(key)?.version || 0) + 1,
      synced: false
    };

    this.storage.set(key, item);
    this.syncQueue.add(key);
    this.saveToLocal();

    analytics.trackEvent({
      category: 'Storage',
      action: 'set_item',
      label: key
    });

    if (navigator.onLine) {
      await this.syncItem(key);
    }
  }

  /**
   * Get an item from storage
   */
  getItem<T>(key: string): T | null {
    const item = this.storage.get(key);
    return item ? item.value : null;
  }

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
    this.syncQueue.delete(key);
    this.saveToLocal();

    analytics.trackEvent({
      category: 'Storage',
      action: 'remove_item',
      label: key
    });

    if (navigator.onLine) {
      await this.deleteFromCloud(key);
    }
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): UserPreferences {
    return this.getItem<UserPreferences>('userPreferences') || {
      theme: 'system',
      fontSize: 'medium',
      searchHistory: true,
      suggestions: true,
      analytics: true,
      notifications: true
    };
  }

  /**
   * Update user preferences
   */
  async setUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const current = this.getUserPreferences();
    await this.setItem('userPreferences', {
      ...current,
      ...preferences
    });
  }

  /**
   * Load search history
   */
  loadSearchHistory(): Array<{ id: string; query: string; timestamp: number }> {
    return this.getItem<Array<{ id: string; query: string; timestamp: number }>>('searchHistory') || [];
  }

  /**
   * Save search history
   */
  async saveSearchHistory(
    history: Array<{ id: string; query: string; timestamp: number }>
  ): Promise<void> {
    await this.setItem('searchHistory', history);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      ...this.syncStatus,
      pending: this.syncQueue.size
    };
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    await this.sync();
  }

  /**
   * Export data
   */
  async exportData(): Promise<string> {
    const data = Array.from(this.storage.entries());
    return JSON.stringify(data);
  }

  /**
   * Import data
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData) as [string, StorageItem][];
      this.storage = new Map(data);
      this.saveToLocal();
      this.syncQueue.clear();
      
      for (const [key] of data) {
        this.syncQueue.add(key);
      }

      if (navigator.onLine) {
        await this.sync();
      }

      analytics.trackEvent({
        category: 'Storage',
        action: 'import_data',
        value: data.length
      });
    } catch (error) {
      analytics.trackError({
        errorType: 'import_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to import data'
      });
      throw error;
    }
  }

  private async sync(): Promise<void> {
    if (!navigator.onLine || this.syncQueue.size === 0) return;

    const startTime = Date.now();
    let success = 0;
    let failed = 0;

    for (const key of this.syncQueue) {
      try {
        await this.syncItem(key);
        success++;
      } catch (error) {
        failed++;
        console.error(`Failed to sync item ${key}:`, error);
      }
    }

    this.syncStatus = {
      lastSync: Date.now(),
      pending: this.syncQueue.size
    };

    analytics.trackEvent({
      category: 'Storage',
      action: 'sync_completed',
      value: success,
      metadata: {
        duration: Date.now() - startTime,
        failed,
        pending: this.syncQueue.size
      }
    });
  }

  private async syncItem(key: string, retries = 0): Promise<void> {
    const item = this.storage.get(key);
    if (!item || item.synced) return;

    try {
      // In a real app, this would sync with a backend API
      // await fetch('/api/storage/sync', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(item)
      // });

      // For demo, just mark as synced
      item.synced = true;
      this.storage.set(key, item);
      this.syncQueue.delete(key);
      this.saveToLocal();
    } catch (error) {
      if (retries < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        await this.syncItem(key, retries + 1);
      } else {
        throw error;
      }
    }
  }

  private async deleteFromCloud(key: string): Promise<void> {
    // In a real app, this would delete from backend API
    // await fetch(`/api/storage/${key}`, {
    //   method: 'DELETE'
    // });
  }

  private loadFromLocal(): void {
    try {
      const data = localStorage.getItem('app_storage');
      if (data) {
        this.storage = new Map(JSON.parse(data));
        
        // Add unsynced items to sync queue
        for (const [key, item] of this.storage.entries()) {
          if (!item.synced) {
            this.syncQueue.add(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      analytics.trackError({
        errorType: 'storage_load_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load from localStorage'
      });
    }
  }

  private saveToLocal(): void {
    try {
      const data = Array.from(this.storage.entries());
      localStorage.setItem('app_storage', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      analytics.trackError({
        errorType: 'storage_save_error',
        errorMessage: error instanceof Error ? error.message : 'Failed to save to localStorage'
      });
    }
  }

  private handleOnline(): void {
    analytics.trackEvent({
      category: 'Storage',
      action: 'online'
    });
    this.sync();
  }

  private handleOffline(): void {
    analytics.trackEvent({
      category: 'Storage',
      action: 'offline'
    });
  }
}

// Export singleton instance
export const storage = new StorageService(); 