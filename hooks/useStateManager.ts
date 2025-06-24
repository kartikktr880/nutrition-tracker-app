import { useState, useEffect, useCallback, useRef } from 'react';
import { stateManager } from '@/services/stateManager';
import { useComponentLifecycle } from '@/hooks/useComponentLifecycle';
import { recordError } from '@/lib/monitoring';
import { z } from 'zod';

interface UseStateManagerOptions {
  key: string;
  initialValue?: any;
  config?: {
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
  };
}

interface StateManagerResult<T> {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  metadata: any;
  versions: any[];
  rollback: (targetVersion?: number) => Promise<T | undefined>;
  syncStatus: {
    isSyncing: boolean;
    lastSync: Date | null;
    syncError: Error | null;
    pendingOperations: number;
  };
  validationStatus: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: Date | null;
  };
}

export function useStateManager<T>({
  key,
  initialValue,
  config = {}
}: UseStateManagerOptions): StateManagerResult<T> {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [validationStatus, setValidationStatus] = useState({
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    lastValidated: null as Date | null
  });
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null as Date | null,
    syncError: null as Error | null,
    pendingOperations: 0
  });
  const isMounted = useRef(true);
  const stateKey = useRef(key);

  // Initialize state from manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get existing state from memory
        let state = await stateManager.getState<T>(key);
        
        // If not in memory and persistence is enabled, try to load from persistence
        if (state === undefined && config.persist) {
          state = await stateManager.loadPersistedState<T>(key);
        }
        
        if (state !== undefined) {
          if (isMounted.current) {
            setValue(state);
          }
        } else if (initialValue !== undefined) {
          // Set initial value if no existing state
          const success = await stateManager.setState(key, initialValue, config);
          if (!success) {
            throw new Error('Failed to set initial state');
          }
          if (isMounted.current) {
            setValue(initialValue);
          }
        }

        // Load versions if recovery is enabled
        if (config.recovery?.enabled) {
          const stateVersions = stateManager.getStateVersions(key);
          if (isMounted.current) {
            setVersions(stateVersions);
          }
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          recordError('State initialization failed', err instanceof Error ? err.message : String(err), { key });
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    initializeState();

    return () => {
      isMounted.current = false;
    };
  }, [key, initialValue, config.persist, config.recovery?.enabled]);

  // Update state in manager when value changes
  const updateState = useCallback(async (newValue: T) => {
    try {
      setError(null);
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));

      const success = await stateManager.setState(key, newValue, {
        ...config,
        validation: config.validation ? {
          ...config.validation,
          onValidationComplete: (result) => {
            if (isMounted.current) {
              setValidationStatus({
                isValid: result.isValid,
                errors: result.errors,
                warnings: result.warnings,
                lastValidated: new Date()
              });
            }
          }
        } : undefined,
        sync: config.sync?.enabled ? {
          ...config.sync,
          onSyncStart: () => {
            if (isMounted.current) {
              setSyncStatus(prev => ({ ...prev, isSyncing: true }));
            }
          },
          onSyncComplete: () => {
            if (isMounted.current) {
              setSyncStatus(prev => ({
                ...prev,
                isSyncing: false,
                lastSync: new Date(),
                syncError: null
              }));
            }
          },
          onSyncError: (error: Error) => {
            if (isMounted.current) {
              setSyncStatus(prev => ({
                ...prev,
                isSyncing: false,
                syncError: error
              }));
            }
          },
          onPendingOperationsChange: (count: number) => {
            if (isMounted.current) {
              setSyncStatus(prev => ({ ...prev, pendingOperations: count }));
            }
          }
        } : undefined
      });
      
      if (!success) {
        throw new Error('Failed to update state');
      }

      if (isMounted.current) {
        setValue(newValue);
        
        // Update versions if recovery is enabled
        if (config.recovery?.enabled) {
          const stateVersions = stateManager.getStateVersions(key);
          setVersions(stateVersions);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          syncError: err instanceof Error ? err : new Error(String(err))
        }));
        recordError('State update failed', err instanceof Error ? err.message : String(err), { key });
      }
    }
  }, [key, config]);

  // Handle key changes
  useEffect(() => {
    if (stateKey.current !== key) {
      stateKey.current = key;
      setIsLoading(true);
      setError(null);
      
      // Re-initialize with new key
      const loadState = async () => {
        try {
          // Try memory first
          let newValue = await stateManager.getState<T>(key);
          
          // If not in memory and persistence is enabled, try persistence
          if (newValue === undefined && config.persist) {
            newValue = await stateManager.loadPersistedState<T>(key);
          }

          if (isMounted.current) {
            setValue(newValue ?? initialValue);
            
            // Load versions if recovery is enabled
            if (config.recovery?.enabled) {
              const stateVersions = stateManager.getStateVersions(key);
              setVersions(stateVersions);
            }
            
            setIsLoading(false);
          }
        } catch (err) {
          if (isMounted.current) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsLoading(false);
          }
        }
      };

      loadState();
    }
  }, [key, initialValue, config.persist, config.recovery?.enabled]);

  // Rollback handler
  const rollback = useCallback(async (targetVersion?: number) => {
    try {
      setError(null);
      const rolledBackState = await stateManager.rollbackState<T>(key, targetVersion);
      
      if (rolledBackState !== undefined && isMounted.current) {
        setValue(rolledBackState);
        
        // Update versions
        if (config.recovery?.enabled) {
          const stateVersions = stateManager.getStateVersions(key);
          setVersions(stateVersions);
        }
      }
      
      return rolledBackState;
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        recordError('State rollback failed', err instanceof Error ? err.message : String(err), { key });
      }
      return undefined;
    }
  }, [key, config.recovery?.enabled]);

  // Cleanup on unmount
  useComponentLifecycle({
    onUnmount: async () => {
      isMounted.current = false;
      // Only cleanup if not persisting
      if (!config.persist) {
        await stateManager.deleteState(key);
      }
    }
  });

  return {
    value,
    setValue: updateState,
    isLoading,
    error,
    metadata: stateManager.getStateMetadata(key),
    versions,
    rollback,
    syncStatus,
    validationStatus
  };
} 