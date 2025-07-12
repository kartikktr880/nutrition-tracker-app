import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { memoryManager } from '@/services/memoryManager';
import { performanceOptimizer } from '@/services/performanceOptimizer';
import { statePersistence } from '@/services/statePersistence';
import { stateRecovery } from '@/services/stateRecovery';
import { stateSync } from '@/services/stateSync';
import { stateValidation } from '@/services/stateValidation';
import { z } from 'zod';

interface StateConfig {
  maxSize?: number;
  ttl?: number;
  validateOnSet?: boolean;
  validateOnGet?: boolean;
  encrypt?: boolean;
  persist?: boolean;
  syncInterval?: number;
  validation?: {
    schema?: z.ZodType<any>;
    rules?: Array<{
      validate: (value: any) => boolean | Promise<boolean>;
      message: string;
    }>;
    typeGuard?: (value: any) => boolean;
    validateOnSet?: boolean;
    validateOnGet?: boolean;
    validateOnSync?: boolean;
    customValidators?: Array<(value: any) => boolean | Promise<boolean>>;
  };
  recovery?: {
    enabled?: boolean;
    maxVersions?: number;
    autoRecover?: boolean;
    backupInterval?: number;
  };
  sync?: {
    enabled?: boolean;
    conflictResolution?: 'server' | 'client' | 'last-write-wins' | 'manual';
    syncInterval?: number;
    batchSize?: number;
    retryAttempts?: number;
    retryDelay?: number;
    compressionEnabled?: boolean;
  };
}

interface StateMetadata {
  timestamp: Date;
  version: number;
  checksum: string;
  size: number;
  lastModified: Date;
  lastAccessed: Date;
  accessCount: number;
}

interface StateEntry<T> {
  value: T;
  metadata: StateMetadata;
}

class StateManager {
  private static instance: StateManager;
  private states: Map<string, StateEntry<any>> = new Map();
  private configs: Map<string, StateConfig> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DEFAULT_TTL = 3600000; // 1 hour
  private readonly DEFAULT_SYNC_INTERVAL = 5000; // 5 seconds
  private readonly MAX_STATE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_STATES = 1000;

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupStaleStates();
    }, 300000); // Every 5 minutes
  }

  private async cleanupStaleStates() {
    const now = Date.now();
    for (const [key, entry] of this.states) {
      const config = this.configs.get(key);
      if (!config) continue;

      if (config.ttl && now - entry.metadata.lastAccessed.getTime() > config.ttl) {
        await this.deleteState(key);
      }
    }
  }

  private validateStateSize(key: string, size: number): boolean {
    const config = this.configs.get(key);
    const maxSize = config?.maxSize ?? this.DEFAULT_MAX_SIZE;

    if (size > maxSize) {
      recordError('State size exceeds limit', JSON.stringify({
        key,
        size,
        maxSize
      }));
      return false;
    }

    if (size > this.MAX_STATE_SIZE) {
      recordError('State size exceeds maximum allowed', JSON.stringify({
        key,
        size,
        maxAllowed: this.MAX_STATE_SIZE
      }));
      return false;
    }

    return true;
  }

  private async validateState<T>(key: string, value: T): Promise<boolean> {
    try {
      const config = this.configs.get(key);
      if (!config?.validateOnSet) return true;

      // Configure validation if not already configured
      if (config.validation && !stateValidation.getValidationConfig(key)) {
        stateValidation.configure(key, {
          schema: config.validation.schema,
          rules: config.validation.rules,
          typeGuard: config.validation.typeGuard,
          validateOnSet: config.validation.validateOnSet,
          validateOnGet: config.validation.validateOnGet,
          validateOnSync: config.validation.validateOnSync,
          customValidators: config.validation.customValidators
        });
      }

      // Perform validation
      const validationResult = await stateValidation.validate(key, value);
      
      if (!validationResult.isValid) {
        recordError('State validation failed', JSON.stringify({
          key,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }));
        return false;
      }

      if (validationResult.warnings.length > 0) {
        auditLogger.log({
          category: 'state_validation',
          severity: 'warning',
          message: 'State validation warnings',
          context: {
            key,
            warnings: validationResult.warnings
          }
        });
      }

      return true;
    } catch (error) {
      recordError('State validation failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  private calculateChecksum(value: any): string {
    try {
      const str = JSON.stringify(value);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    } catch (error) {
      recordError('Checksum calculation failed', error instanceof Error ? error.message : String(error));
      return '';
    }
  }

  public async setState<T>(
    key: string,
    value: T,
    config: StateConfig = {}
  ): Promise<boolean> {
    try {
      // Validate input
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid state key');
      }

      // Check state limit
      if (this.states.size >= this.MAX_STATES && !this.states.has(key)) {
        recordError('Maximum number of states reached', 'State limit exceeded', { key, currentSize: this.states.size, maxSize: this.MAX_STATES });
        return false;
      }

      // Validate state
      if (!await this.validateState(key, value)) {
        return false;
      }

      // Create metadata
      const metadata: StateMetadata = {
        timestamp: new Date(),
        version: (this.states.get(key)?.metadata.version ?? 0) + 1,
        checksum: this.calculateChecksum(value),
        size: new Blob([JSON.stringify(value)]).size,
        lastModified: new Date(),
        lastAccessed: new Date(),
        accessCount: 0
      };

      // Store state
      this.states.set(key, { value, metadata });
      this.configs.set(key, {
        maxSize: this.DEFAULT_MAX_SIZE,
        ttl: this.DEFAULT_TTL,
        validateOnSet: true,
        validateOnGet: true,
        encrypt: false,
        persist: false,
        syncInterval: this.DEFAULT_SYNC_INTERVAL,
        ...config
      });

      // Configure sync if enabled
      if (config.sync?.enabled) {
        stateSync.configure(key, {
          enabled: true,
          conflictResolution: config.sync.conflictResolution || 'last-write-wins',
          syncInterval: config.sync.syncInterval || this.DEFAULT_SYNC_INTERVAL,
          batchSize: config.sync.batchSize,
          retryAttempts: config.sync.retryAttempts,
          retryDelay: config.sync.retryDelay,
          compressionEnabled: config.sync.compressionEnabled
        });

        // Queue sync operation
        await stateSync.queueSyncOperation(key, value, 'set');
      }

      // Create version if recovery is enabled
      if (config.recovery?.enabled) {
        await stateRecovery.createVersion(key, value, {
          reason: 'State update',
          tags: ['state_update']
        });

        // Configure recovery if not already configured
        if (!stateRecovery.getVersions(key).length) {
          stateRecovery.configure(key, {
            maxVersions: config.recovery.maxVersions,
            autoRecover: config.recovery.autoRecover,
            backupInterval: config.recovery.backupInterval
          });
        }
      }

      // Start sync if configured
      if (config.syncInterval) {
        this.startStateSync(key);
      }

      // Log state update
      auditLogger.log({
        category: 'state',
        severity: 'info',
        message: 'State updated',
        context: { key, size: metadata.size, version: metadata.version }
      });

      recordOperationLatency('state_set', 0, {
        key,
        size: metadata.size,
        version: metadata.version
      });

      return true;
    } catch (error) {
      recordError('State set failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  public async getState<T>(key: string): Promise<T | undefined> {
    try {
      const entry = this.states.get(key);
      if (!entry) {
        // Try to recover state if not found
        const config = this.configs.get(key);
        if (config?.recovery?.enabled) {
          const recoveredState = await stateRecovery.recover<T>(key);
          if (recoveredState !== undefined) {
            // Restore state
            await this.setState(key, recoveredState, config);
            return recoveredState;
          }
        }
        return undefined;
      }

      const config = this.configs.get(key);
      if (!config) return undefined;

      // Validate on get if configured
      if (config.validateOnGet) {
        const validationResult = await stateValidation.validate(key, entry.value);
        if (!validationResult.isValid) {
          // Try to recover from version history
          if (config.recovery?.enabled) {
            const recoveredState = await stateRecovery.recover<T>(key);
            if (recoveredState !== undefined) {
              await this.setState(key, recoveredState, config);
              return recoveredState;
            }
          }
          recordError('State validation failed on get', JSON.stringify({
            key,
            errors: validationResult.errors
          }));
          return undefined;
        }
      }

      // Update metadata
      entry.metadata.lastAccessed = new Date();
      entry.metadata.accessCount++;

      recordOperationLatency('state_get', 0, {
        key,
        size: entry.metadata.size,
        version: entry.metadata.version
      });

      return entry.value as T;
    } catch (error) {
      recordError('State get failed', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  public async deleteState(key: string): Promise<boolean> {
    try {
      const entry = this.states.get(key);
      if (!entry) return false;

      const config = this.configs.get(key);

      // Queue sync operation if sync is enabled
      if (config?.sync?.enabled) {
        await stateSync.queueSyncOperation(key, null, 'delete');
      }

      // Stop sync if running
      this.stopStateSync(key);

      // Remove state
      this.states.delete(key);
      this.configs.delete(key);

      auditLogger.log({
        category: 'state',
        severity: 'info',
        message: 'State deleted',
        context: { key, size: entry.metadata.size }
      });

      return true;
    } catch (error) {
      recordError('State delete failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  private startStateSync(key: string) {
    const config = this.configs.get(key);
    if (!config?.syncInterval) return;

    this.stopStateSync(key);

    const interval = setInterval(async () => {
      try {
        const entry = this.states.get(key);
        if (!entry) {
          this.stopStateSync(key);
          return;
        }

        // Sync logic here
        // This could involve persisting to storage, syncing with server, etc.
        const currentChecksum = this.calculateChecksum(entry.value);
        if (currentChecksum !== entry.metadata.checksum) {
          // State has changed, perform sync
          if (config.persist) {
            // Persist to storage
            await this.persistState(key, entry.value);
          }
        }
      } catch (error) {
        recordError('State sync failed', error instanceof Error ? error.message : String(error), { key });
      }
    }, config.syncInterval);

    this.syncIntervals.set(key, interval);
  }

  private stopStateSync(key: string) {
    const interval = this.syncIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(key);
    }
  }

  private async persistState<T>(key: string, value: T): Promise<boolean> {
    try {
      const entry = this.states.get(key);
      if (!entry) return false;

      const config = this.configs.get(key);
      if (!config?.persist) return true;

      return await statePersistence.persistState(key, value, entry.metadata);
    } catch (error) {
      recordError('State persistence failed', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  public async loadPersistedState<T>(key: string): Promise<T | undefined> {
    try {
      const record = await statePersistence.retrieveState(key);
      if (!record) return undefined;

      // Validate checksum
      const currentChecksum = this.calculateChecksum(record.value);
      if (currentChecksum !== record.metadata.checksum) {
        recordError('Persisted state checksum mismatch', JSON.stringify({ key }));
        return undefined;
      }

      // Update in-memory state
      this.states.set(key, {
        value: record.value,
        metadata: {
          timestamp: new Date(record.metadata.timestamp),
          version: record.metadata.version,
          checksum: record.metadata.checksum,
          size: record.metadata.size,
          lastModified: new Date(record.metadata.lastModified),
          lastAccessed: new Date(record.metadata.lastAccessed),
          accessCount: record.metadata.accessCount
        }
      });

      return record.value as T;
    } catch (error) {
      recordError('Failed to load persisted state', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  public async cleanupPersistedStates(ttl: number): Promise<void> {
    try {
      await statePersistence.cleanup(ttl);
    } catch (error) {
      recordError('Failed to cleanup persisted states', error instanceof Error ? error.message : String(error));
    }
  }

  public async getPersistedStateSize(): Promise<number> {
    try {
      return await statePersistence.getStateSize();
    } catch (error) {
      recordError('Failed to get persisted state size', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  public getStateMetadata(key: string): StateMetadata | undefined {
    return this.states.get(key)?.metadata;
  }

  public async rollbackState<T>(key: string, targetVersion?: number): Promise<T | undefined> {
    try {
      const config = this.configs.get(key);
      if (!config?.recovery?.enabled) {
        throw new Error('State recovery not enabled');
      }

      const rolledBackState = await stateRecovery.rollback<T>(key, targetVersion);
      if (rolledBackState !== undefined) {
        // Update current state with rolled back version
        await this.setState(key, rolledBackState, config);
      }

      return rolledBackState;
    } catch (error) {
      recordError('State rollback failed', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  public getStateVersions(key: string) {
    return stateRecovery.getVersions(key);
  }

  public async cleanup() {
    // Stop all sync intervals
    for (const [key] of this.syncIntervals) {
      this.stopStateSync(key);
    }

    // Cleanup recovery system
    await stateRecovery.cleanup();

    // Cleanup sync system
    await stateSync.cleanup();

    // Cleanup validation system
    await stateValidation.cleanup();

    // Clear all states
    this.states.clear();
    this.configs.clear();
    this.syncIntervals.clear();
  }
}

export const stateManager = StateManager.getInstance(); 