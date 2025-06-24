import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { stateManager } from '@/services/stateManager';
import { statePersistence } from '@/services/statePersistence';

interface SyncConfig {
  enabled: boolean;
  conflictResolution: 'server' | 'client' | 'last-write-wins' | 'manual';
  syncInterval: number;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
  compressionEnabled: boolean;
}

interface SyncMetadata {
  deviceId: string;
  timestamp: number;
  version: number;
  checksum: string;
  lastSync: number;
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  conflictResolution?: 'server' | 'client' | 'last-write-wins' | 'manual';
}

interface SyncOperation<T> {
  key: string;
  value: T;
  operation: 'set' | 'delete';
  timestamp: number;
  deviceId: string;
  version: number;
  metadata: SyncMetadata;
}

class StateSync {
  private static instance: StateSync;
  private syncQueue: Map<string, SyncOperation<any>[]> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private deviceId: string;
  private configs: Map<string, SyncConfig> = new Map();
  private readonly DEFAULT_SYNC_INTERVAL = 5000; // 5 seconds
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  private constructor() {
    this.deviceId = this.generateDeviceId();
    this.startPeriodicSync();
  }

  public static getInstance(): StateSync {
    if (!StateSync.instance) {
      StateSync.instance = new StateSync();
    }
    return StateSync.instance;
  }

  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substr(2, 9);
  }

  private startPeriodicSync() {
    setInterval(() => {
      this.processSyncQueue();
    }, this.DEFAULT_SYNC_INTERVAL);
  }

  public configure(key: string, config: Partial<SyncConfig>): void {
    this.configs.set(key, {
      enabled: true,
      conflictResolution: 'last-write-wins',
      syncInterval: this.DEFAULT_SYNC_INTERVAL,
      batchSize: this.DEFAULT_BATCH_SIZE,
      retryAttempts: this.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: this.DEFAULT_RETRY_DELAY,
      compressionEnabled: false,
      ...config
    });

    if (config.syncInterval) {
      this.setupSyncInterval(key, config.syncInterval);
    }
  }

  private setupSyncInterval(key: string, interval: number): void {
    this.stopSyncInterval(key);

    const timeout = setInterval(async () => {
      await this.syncState(key);
    }, interval);

    this.syncIntervals.set(key, timeout);
  }

  private stopSyncInterval(key: string): void {
    const interval = this.syncIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(key);
    }
  }

  public async queueSyncOperation<T>(
    key: string,
    value: T,
    operation: 'set' | 'delete'
  ): Promise<void> {
    try {
      const config = this.configs.get(key);
      if (!config?.enabled) return;

      const queue = this.syncQueue.get(key) || [];
      const metadata: SyncMetadata = {
        deviceId: this.deviceId,
        timestamp: Date.now(),
        version: (queue.length > 0 ? queue[queue.length - 1].version : 0) + 1,
        checksum: this.calculateChecksum(value),
        lastSync: Date.now(),
        syncStatus: 'pending',
        conflictResolution: config.conflictResolution
      };

      const syncOperation: SyncOperation<T> = {
        key,
        value,
        operation,
        timestamp: Date.now(),
        deviceId: this.deviceId,
        version: metadata.version,
        metadata
      };

      queue.push(syncOperation);
      this.syncQueue.set(key, queue);

      // If queue size exceeds batch size, trigger sync
      if (queue.length >= (config.batchSize || this.DEFAULT_BATCH_SIZE)) {
        await this.syncState(key);
      }

      auditLogger.log({
        category: 'state_sync',
        severity: 'info',
        message: 'Sync operation queued',
        context: { key, operation, version: metadata.version }
      });
    } catch (error) {
      recordError('Failed to queue sync operation', error instanceof Error ? error.message : String(error), { key });
    }
  }

  private async processSyncQueue(): Promise<void> {
    for (const [key, queue] of this.syncQueue) {
      if (queue.length > 0) {
        await this.syncState(key);
      }
    }
  }

  private async syncState(key: string): Promise<void> {
    try {
      const queue = this.syncQueue.get(key);
      if (!queue || queue.length === 0) return;

      const config = this.configs.get(key);
      if (!config?.enabled) return;

      const batch = queue.splice(0, config.batchSize);
      const results = await Promise.allSettled(
        batch.map(op => this.processSyncOperation(op))
      );

      // Handle failed operations
      const failedOps = results
        .map((result, index) => ({ result, operation: batch[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failedOps.length > 0) {
        // Retry failed operations
        for (const { operation } of failedOps) {
          await this.retrySyncOperation(operation, config);
        }
      }

      auditLogger.log({
        category: 'state_sync',
        severity: 'info',
        message: 'State sync completed',
        context: { key, successCount: results.length - failedOps.length, failedCount: failedOps.length }
      });
    } catch (error) {
      recordError('State sync failed', error instanceof Error ? error.message : String(error), { key });
    }
  }

  private async processSyncOperation<T>(operation: SyncOperation<T>): Promise<void> {
    try {
      const { key, value, operation: opType, metadata } = operation;
      const config = this.configs.get(key);

      // Check for conflicts
      const currentState = await stateManager.getState<T>(key);
      const hasConflict = currentState && this.calculateChecksum(currentState) !== metadata.checksum;

      if (hasConflict) {
        await this.resolveConflict(operation, currentState, config);
      } else {
        // Apply operation
        if (opType === 'set') {
          await stateManager.setState(key, value, { persist: true });
        } else if (opType === 'delete') {
          await stateManager.deleteState(key);
        }
      }

      recordOperationLatency('state_sync_operation', 0, {
        key,
        operation: opType,
        version: metadata.version
      });
    } catch (error) {
      throw new Error(`Sync operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async resolveConflict<T>(
    operation: SyncOperation<T>,
    currentState: T | undefined,
    config?: SyncConfig
  ): Promise<void> {
    const resolution = config?.conflictResolution || 'last-write-wins';

    switch (resolution) {
      case 'last-write-wins':
        if (operation.timestamp > Date.now() - (config?.syncInterval || this.DEFAULT_SYNC_INTERVAL)) {
          await stateManager.setState(operation.key, operation.value, { persist: true });
        }
        break;

      case 'server':
        // Implement server-based resolution
        break;

      case 'client':
        // Implement client-based resolution
        break;

      case 'manual':
        // Queue for manual resolution
        this.queueManualResolution(operation, currentState);
        break;
    }
  }

  private queueManualResolution<T>(operation: SyncOperation<T>, currentState: T | undefined): void {
    // Implementation for manual conflict resolution
    // This could involve user notification, conflict resolution UI, etc.
    auditLogger.log({
      category: 'state_sync',
      severity: 'warning',
      message: 'Manual conflict resolution required',
      context: {
        key: operation.key,
        operation: operation.operation,
        version: operation.version
      }
    });
  }

  private async retrySyncOperation<T>(
    operation: SyncOperation<T>,
    config: SyncConfig
  ): Promise<void> {
    let attempts = 0;
    while (attempts < config.retryAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempts + 1)));
        await this.processSyncOperation(operation);
        return;
      } catch (error) {
        attempts++;
        if (attempts === config.retryAttempts) {
          recordError('Sync operation retry failed', error instanceof Error ? error.message : String(error), {
            key: operation.key,
            attempts
          });
        }
      }
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

  public async cleanup(): Promise<void> {
    // Stop all sync intervals
    for (const [key] of this.syncIntervals) {
      this.stopSyncInterval(key);
    }

    // Clear all queues and configs
    this.syncQueue.clear();
    this.configs.clear();
    this.syncIntervals.clear();
  }
}

export const stateSync = StateSync.getInstance(); 