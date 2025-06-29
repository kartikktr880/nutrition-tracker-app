import { recordError, recordOperationLatency } from '@/lib/monitoring';
import { auditLogger } from '@/lib/audit-logger';
import { statePersistence } from '@/services/statePersistence';

interface StateVersion<T> {
  version: number;
  value: T;
  timestamp: Date;
  checksum: string;
  metadata: {
    reason?: string;
    user?: string;
    tags?: string[];
  };
}

interface RecoveryConfig {
  maxVersions?: number;
  autoRecover?: boolean;
  backupInterval?: number;
  compressionEnabled?: boolean;
}

class StateRecovery {
  private static instance: StateRecovery;
  private versions: Map<string, StateVersion<any>[]> = new Map();
  private configs: Map<string, RecoveryConfig> = new Map();
  private readonly DEFAULT_MAX_VERSIONS = 10;
  private readonly DEFAULT_BACKUP_INTERVAL = 300000; // 5 minutes
  private backupIntervals: Map<string, NodeJS.Timeout> = new Map();

  public static getInstance(): StateRecovery {
    if (!StateRecovery.instance) {
      StateRecovery.instance = new StateRecovery();
    }
    return StateRecovery.instance;
  }

  public async createVersion<T>(
    key: string,
    value: T,
    metadata: Partial<StateVersion<T>['metadata']> = {}
  ): Promise<boolean> {
    try {
      const versions = this.versions.get(key) || [];
      const config = this.configs.get(key);
      const maxVersions = config?.maxVersions ?? this.DEFAULT_MAX_VERSIONS;

      // Create new version
      const newVersion: StateVersion<T> = {
        version: versions.length + 1,
        value,
        timestamp: new Date(),
        checksum: this.calculateChecksum(value),
        metadata: {
          reason: metadata.reason,
          user: metadata.user,
          tags: metadata.tags
        }
      };

      // Add version and maintain max versions
      versions.push(newVersion);
      if (versions.length > maxVersions) {
        versions.shift(); // Remove oldest version
      }

      this.versions.set(key, versions);

      // Persist version if configured
      if (config?.autoRecover) {
        await this.persistVersion(key, newVersion);
      }

      auditLogger.log({
        category: 'state_recovery',
        severity: 'info',
        message: 'State version created',
        context: { key, version: newVersion.version }
      });

      recordOperationLatency('state_version_create', 0, {
        key,
        version: newVersion.version
      });

      return true;
    } catch (error) {
      recordError('Failed to create state version', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  public async rollback<T>(key: string, targetVersion?: number): Promise<T | undefined> {
    try {
      const versions = this.versions.get(key);
      if (!versions || versions.length === 0) {
        throw new Error('No versions available for rollback');
      }

      // If no target version specified, rollback to previous version
      const targetIndex = targetVersion 
        ? versions.findIndex(v => v.version === targetVersion)
        : versions.length - 2;

      if (targetIndex < 0) {
        throw new Error('Target version not found');
      }

      const targetState = versions[targetIndex];

      // Validate checksum
      const currentChecksum = this.calculateChecksum(targetState.value);
      if (currentChecksum !== targetState.checksum) {
        throw new Error('Version checksum mismatch');
      }

      // Remove newer versions
      versions.splice(targetIndex + 1);

      auditLogger.log({
        category: 'state_recovery',
        severity: 'info',
        message: 'State rolled back',
        context: { key, version: targetState.version }
      });

      return targetState.value as T;
    } catch (error) {
      recordError('Failed to rollback state', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  public async recover<T>(key: string): Promise<T | undefined> {
    try {
      // Try to recover from memory first
      const versions = this.versions.get(key);
      if (versions && versions.length > 0) {
        const latestVersion = versions[versions.length - 1];
        if (this.validateVersion(latestVersion)) {
          return latestVersion.value as T;
        }
      }

      // Try to recover from persistence
      const persistedVersion = await this.loadLatestVersion(key);
      if (persistedVersion && this.validateVersion(persistedVersion)) {
        // Restore to memory
        this.versions.set(key, [persistedVersion]);
        return persistedVersion.value as T;
      }

      return undefined;
    } catch (error) {
      recordError('Failed to recover state', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  public getVersions(key: string): StateVersion<any>[] {
    return this.versions.get(key) || [];
  }

  public configure(key: string, config: RecoveryConfig): void {
    this.configs.set(key, {
      maxVersions: this.DEFAULT_MAX_VERSIONS,
      autoRecover: false,
      backupInterval: this.DEFAULT_BACKUP_INTERVAL,
      compressionEnabled: false,
      ...config
    });

    // Setup backup interval if configured
    if (config.backupInterval) {
      this.setupBackupInterval(key, config.backupInterval);
    }
  }

  private setupBackupInterval(key: string, interval: number): void {
    this.stopBackupInterval(key);

    const timeout = setInterval(async () => {
      const versions = this.versions.get(key);
      if (versions && versions.length > 0) {
        const latestVersion = versions[versions.length - 1];
        await this.persistVersion(key, latestVersion);
      }
    }, interval);

    this.backupIntervals.set(key, timeout);
  }

  private stopBackupInterval(key: string): void {
    const interval = this.backupIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.backupIntervals.delete(key);
    }
  }

  private async persistVersion<T>(key: string, version: StateVersion<T>): Promise<boolean> {
    try {
      const record = {
        key: `${key}_v${version.version}`,
        value: version,
        metadata: {
          timestamp: version.timestamp.getTime(),
          version: version.version,
          checksum: version.checksum,
          size: new Blob([JSON.stringify(version.value)]).size,
          lastModified: version.timestamp.getTime(),
          lastAccessed: version.timestamp.getTime(),
          accessCount: 0
        }
      };

      return await statePersistence.persistState(record.key, record.value, record.metadata);
    } catch (error) {
      recordError('Failed to persist version', error instanceof Error ? error.message : String(error), { key });
      return false;
    }
  }

  private async loadLatestVersion(key: string): Promise<StateVersion<any> | undefined> {
    try {
      // Get all persisted versions for this key
      const versions = await this.loadPersistedVersions(key);
      if (!versions || versions.length === 0) return undefined;

      // Return the latest version
      return versions[versions.length - 1];
    } catch (error) {
      recordError('Failed to load latest version', error instanceof Error ? error.message : String(error), { key });
      return undefined;
    }
  }

  private async loadPersistedVersions(key: string): Promise<StateVersion<any>[]> {
    try {
      const versions: StateVersion<any>[] = [];
      // Implementation would depend on how versions are stored in persistence
      // This is a placeholder for the actual implementation
      return versions;
    } catch (error) {
      recordError('Failed to load persisted versions', error instanceof Error ? error.message : String(error), { key });
      return [];
    }
  }

  private validateVersion<T>(version: StateVersion<T>): boolean {
    try {
      const currentChecksum = this.calculateChecksum(version.value);
      return currentChecksum === version.checksum;
    } catch (error) {
      recordError('Version validation failed', error instanceof Error ? error.message : String(error));
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

  public async cleanup(): Promise<void> {
    // Stop all backup intervals
    for (const [key] of this.backupIntervals) {
      this.stopBackupInterval(key);
    }

    // Clear all versions and configs
    this.versions.clear();
    this.configs.clear();
    this.backupIntervals.clear();
  }
}

export const stateRecovery = StateRecovery.getInstance(); 