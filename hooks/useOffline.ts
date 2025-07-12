import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { useState, useEffect } from 'react';
import OfflineService from '@/services/offline';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState(OfflineService.getInstance().getState());

  useEffect(() => {
    const offlineService = OfflineService.getInstance();

    // Update sync state every 5 seconds
    const syncInterval = setInterval(() => {
      setSyncState(offlineService.getState());
    }, 5000);

    // Set up online/offline event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueOperation = async (operation: {
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
  }) => {
    try {
      await OfflineService.getInstance().queueOperation(operation);
      setSyncState(OfflineService.getInstance().getState());
    } catch (error) {
      logError('Failed to queue operation:', error);
      throw error;
    }
  };

  const resolveConflict = async (conflictIndex: number, resolution: 'client' | 'server' | 'manual') => {
    try {
      await OfflineService.getInstance().resolveConflict(conflictIndex, resolution);
      setSyncState(OfflineService.getInstance().getState());
    } catch (error) {
      logError('Failed to resolve conflict:', error);
      throw error;
    }
  };

  return {
    isOnline,
    syncState,
    queueOperation,
    resolveConflict
  };
} 