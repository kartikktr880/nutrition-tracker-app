import React, { useEffect, useState } from 'react';
import OfflineService from '@/services/offline';

export const OfflineStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ total: 0, pending: 0, failed: 0 });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const offlineService = OfflineService.getInstance();
    setIsOnline(offlineService.isOnlineStatus());

    const updateStatus = () => {
      setSyncStatus(offlineService.getSyncStatus());
    };

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    const offlineService = OfflineService.getInstance();
    await offlineService.processSyncQueue();
    setSyncStatus(offlineService.getSyncStatus());
  };

  const handleClearQueue = async () => {
    const offlineService = OfflineService.getInstance();
    await offlineService.clearSyncQueue();
    setSyncStatus(offlineService.getSyncStatus());
  };

  if (isOnline && syncStatus.total === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {showDetails && (
          <div className="mt-2 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>Total Operations: {syncStatus.total}</p>
              <p>Pending: {syncStatus.pending}</p>
              <p>Failed: {syncStatus.failed}</p>
            </div>

            <div className="flex space-x-2">
              {syncStatus.failed > 0 && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Retry Failed
                </button>
              )}
              {syncStatus.total > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear Queue
                </button>
              )}
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            Changes will be synced when you're back online
          </div>
        )}
      </div>
    </div>
  );
}; 