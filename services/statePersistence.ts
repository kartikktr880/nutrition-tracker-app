import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';

const DB_NAME = 'nutrition-tracker-state';
const DB_VERSION = 1;
const STORE_NAME = 'states';

interface StateRecord {
  key: string;
  value: any;
  metadata: {
    timestamp: number;
    version: number;
    checksum: string;
    size: number;
    lastModified: number;
    lastAccessed: number;
    accessCount: number;
  };
}

class StatePersistence {
  private static instance: StatePersistence;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): StatePersistence {
    if (!StatePersistence.instance) {
      StatePersistence.instance = new StatePersistence();
    }
    return StatePersistence.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error;
          recordError('Failed to open IndexedDB', error?.message ?? 'Unknown error');
          reject(error);
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isInitialized = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
            store.createIndex('lastAccessed', 'metadata.lastAccessed', { unique: false });
          }
        };
      } catch (error) {
        recordError('Failed to initialize IndexedDB', error instanceof Error ? error.message : String(error));
        reject(error);
      }
    });

    return this.initPromise;
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  }

  public async persistState(key: string, value: any, metadata: any): Promise<boolean> {
    try {
      const store = await this.getStore('readwrite');
      const record: StateRecord = {
        key,
        value,
        metadata: {
          ...metadata,
          timestamp: metadata.timestamp.getTime(),
          lastModified: metadata.lastModified.getTime(),
          lastAccessed: metadata.lastAccessed.getTime()
        }
      };

      return new Promise((resolve, reject) => {
        const request = store.put(record);

        request.onsuccess = () => {
          auditLogger.log({
            category: 'state_persistence',
            severity: 'info',
            message: 'State persisted',
            context: { key, size: metadata.size }
          });

          recordOperationLatency('state_persist', 0, {
            key,
            size: metadata.size
          });

          resolve(true);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          recordError('Failed to persist state', error?.message ?? 'Unknown error', { key });
          reject(error);
        };
      });
    } catch (error) {
      recordError('State persistence failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  public async retrieveState(key: string): Promise<StateRecord | null> {
    try {
      const store = await this.getStore();
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as StateRecord | undefined;
          if (result) {
            // Convert timestamps back to Date objects
            result.metadata.timestamp = new Date(result.metadata.timestamp);
            result.metadata.lastModified = new Date(result.metadata.lastModified);
            result.metadata.lastAccessed = new Date(result.metadata.lastAccessed);

            recordOperationLatency('state_retrieve', 0, {
              key,
              size: result.metadata.size
            });
          }
          resolve(result ?? null);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          recordError('Failed to retrieve state', error?.message ?? 'Unknown error', { key });
          reject(error);
        };
      });
    } catch (error) {
      recordError('State retrieval failed', error instanceof Error ? error.message : String(error), { key });
      return null;
    }
  }

  public async deleteState(key: string): Promise<boolean> {
    try {
      const store = await this.getStore('readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => {
          auditLogger.log({
            category: 'state_persistence',
            severity: 'info',
            message: 'State deleted from persistence',
            context: { key }
          });
          resolve(true);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          recordError('Failed to delete state', error?.message ?? 'Unknown error', { key });
          reject(error);
        };
      });
    } catch (error) {
      recordError('State deletion failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  public async cleanup(ttl: number): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      const index = store.index('lastAccessed');
      const cutoff = Date.now() - ttl;

      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          recordError('Failed to cleanup states', error?.message ?? 'Unknown error');
          reject(error);
        };
      });
    } catch (error) {
      recordError('State cleanup failed', error instanceof Error ? error.message : String(error));
    }
  }

  public async getStateSize(): Promise<number> {
    try {
      const store = await this.getStore();
      let totalSize = 0;

      return new Promise((resolve, reject) => {
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value as StateRecord;
            totalSize += record.metadata.size;
            cursor.continue();
          } else {
            resolve(totalSize);
          }
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          recordError('Failed to calculate state size', error?.message ?? 'Unknown error');
          reject(error);
        };
      });
    } catch (error) {
      recordError('State size calculation failed', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }
}

export const statePersistence = StatePersistence.getInstance(); 