import { openDB, IDBPDatabase } from 'idb';
import { logError, logInfo, logWarn } from '../utils/logger';

interface StorageOptions {
  dbName?: string;
  version?: number;
  useLocalStorageFallback?: boolean;
}

type StorageValue = any;

class StorageService {
  private db: IDBPDatabase | null = null;
  private dbName: string;
  private version: number;
  private useLocalStorageFallback: boolean;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(options: StorageOptions = {}) {
    this.dbName = options.dbName || 'nutrition-tracker-db';
    this.version = options.version || 1;
    this.useLocalStorageFallback = options.useLocalStorageFallback !== false;
    
    // Initialize immediately
    this.init();
  }

  /**
   * Initialize the storage service
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        if ('indexedDB' in window) {
          this.db = await openDB(this.dbName, this.version, {
            upgrade(db) {
              // Create stores for different data types
              if (!db.objectStoreNames.contains('foodEntries')) {
                db.createObjectStore('foodEntries');
              }
              if (!db.objectStoreNames.contains('activities')) {
                db.createObjectStore('activities');
              }
              if (!db.objectStoreNames.contains('goals')) {
                db.createObjectStore('goals');
              }
              if (!db.objectStoreNames.contains('userPreferences')) {
                db.createObjectStore('userPreferences');
              }
              if (!db.objectStoreNames.contains('recipes')) {
                db.createObjectStore('recipes');
              }
              if (!db.objectStoreNames.contains('mealPlans')) {
                db.createObjectStore('mealPlans');
              }
              if (!db.objectStoreNames.contains('searchHistory')) {
                db.createObjectStore('searchHistory');
              }
            },
          });
          logInfo('IndexedDB initialized successfully');
          this.isInitialized = true;
          resolve();
        } else {
          logWarn('IndexedDB not supported, falling back to localStorage');
          this.isInitialized = true;
          resolve();
        }
      } catch (error) {
        logError('Failed to initialize IndexedDB:', error);
        if (this.useLocalStorageFallback) {
          logWarn('Falling back to localStorage');
          this.isInitialized = true;
          resolve();
        } else {
          reject(error);
        }
      }
    });

    return this.initPromise;
  }

  /**
   * Get an item from storage
   */
  async getItem<T = StorageValue>(key: string, storeName = 'foodEntries'): Promise<T | null> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        return await this.db.get(storeName, key) as T;
      } else if (this.useLocalStorageFallback) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      }
      return null;
    } catch (error) {
      logError(`Error getting item ${key}:`, error);
      if (this.useLocalStorageFallback) {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (localError) {
          logError(`Error getting item ${key} from localStorage:`, localError);
        }
      }
      return null;
    }
  }

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: StorageValue, storeName = 'foodEntries'): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        await this.db.put(storeName, value, key);
      } else if (this.useLocalStorageFallback) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      logError(`Error setting item ${key}:`, error);
      if (this.useLocalStorageFallback) {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (localError) {
          logError(`Error setting item ${key} in localStorage:`, localError);
          throw localError;
        }
      } else {
      throw error;
      }
    }
  }

  /**
   * Remove an item from storage
   */
  async removeItem(key: string, storeName = 'foodEntries'): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        await this.db.delete(storeName, key);
      } else if (this.useLocalStorageFallback) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      logError(`Error removing item ${key}:`, error);
      if (this.useLocalStorageFallback) {
        try {
          localStorage.removeItem(key);
        } catch (localError) {
          logError(`Error removing item ${key} from localStorage:`, localError);
          throw localError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get all keys in a store
   */
  async getAllKeys(storeName = 'foodEntries'): Promise<string[]> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        return await this.db.getAllKeys(storeName) as string[];
      } else if (this.useLocalStorageFallback) {
        return Object.keys(localStorage).filter(key => 
          key.startsWith(storeName + '_')
        );
      }
      return [];
    } catch (error) {
      logError(`Error getting all keys from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Get all items in a store
   */
  async getAll<T = StorageValue>(storeName = 'foodEntries'): Promise<T[]> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        return await this.db.getAll(storeName) as T[];
      } else if (this.useLocalStorageFallback) {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(storeName + '_')
        );
        return keys.map(key => {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        }).filter(Boolean) as T[];
      }
      return [];
    } catch (error) {
      logError(`Error getting all items from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Clear all items in a store
   */
  async clear(storeName = 'foodEntries'): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.db) {
        await this.db.clear(storeName);
      } else if (this.useLocalStorageFallback) {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(storeName + '_')
        );
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      logError(`Error clearing store ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Load search history
   */
  async loadSearchHistory(): Promise<any[]> {
    return this.getAll('searchHistory');
  }

  /**
   * Add a search item to history
   */
  async addSearchItem(item: any): Promise<void> {
    await this.setItem(item.id, item, 'searchHistory');
  }

  /**
   * Remove a search item from history
   */
  async removeSearchItem(id: string): Promise<void> {
    await this.removeItem(id, 'searchHistory');
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    await this.clear('searchHistory');
  }

  /**
   * Load recent searches
   */
  async loadRecentSearches(): Promise<any[]> {
    const history = await this.loadSearchHistory();
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add a recent search
   */
  async addRecentSearch(query: string): Promise<void> {
    const recentSearches = (await this.getItem<string[]>('recentSearches', 'userPreferences')) || [];
    const updatedSearches = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    await this.setItem('recentSearches', updatedSearches, 'userPreferences');
  }

  /**
   * Check if storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<Record<string, any>> {
    await this.ensureInitialized();
    
    const data: Record<string, any> = {};
    
    try {
      if (this.db) {
        const storeNames = this.db.objectStoreNames;
        for (const storeName of storeNames) {
          data[storeName] = await this.db.getAll(storeName);
        }
      } else if (this.useLocalStorageFallback) {
        // Group localStorage items by store name prefix
        Object.keys(localStorage).forEach(key => {
          const parts = key.split('_');
          if (parts.length > 1) {
            const storeName = parts[0];
            if (!data[storeName]) {
              data[storeName] = [];
            }
            const value = localStorage.getItem(key);
            if (value) {
              try {
                data[storeName].push(JSON.parse(value));
              } catch (e) {
                data[storeName].push(value);
              }
            }
          }
        });
      }
      return data;
    } catch (error) {
      logError('Error exporting data:', error);
      return {};
    }
  }

  /**
   * Import data from JSON
   */
  async importData(data: Record<string, any>): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      const storeNames = Object.keys(data);
      
      for (const storeName of storeNames) {
        const items = data[storeName];
        
        if (Array.isArray(items)) {
          if (this.db && this.db.objectStoreNames.contains(storeName)) {
            // Clear existing data
            await this.db.clear(storeName);
            
            // Add new items
            const tx = this.db.transaction(storeName, 'readwrite');
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item && item.id) {
                await tx.store.put(item, item.id);
              }
            }
            await tx.done;
          } else if (this.useLocalStorageFallback) {
            // Clear existing data
            const keys = Object.keys(localStorage).filter(key => 
              key.startsWith(storeName + '_')
            );
            keys.forEach(key => localStorage.removeItem(key));
            
            // Add new items
            items.forEach((item: any, index: number) => {
              if (item) {
                const key = `${storeName}_${item.id || index}`;
                localStorage.setItem(key, JSON.stringify(item));
              }
            });
          }
        }
      }
    } catch (error) {
      logError('Error importing data:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storage = new StorageService(); 