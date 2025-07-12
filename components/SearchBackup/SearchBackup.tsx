import { motion } from 'framer-motion';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { SearchService } from '@/services/searchService';

export const SearchBackup: React.FC = () => {
  const [_backups, setBackups] = useState<Array<{ key: string; timestamp: number }>>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [_success, setSuccess] = useState<string | null>(null);

  const _searchService = useMemo(() => SearchService.getInstance(), []);

  const _loadBackups = useCallback(() => {
    try {
      const availableBackups = _searchService.getAvailableBackups();
      setBackups(availableBackups);
    } catch (error) {
      setError('Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  }, [_searchService]);

  useEffect(() => {
    _loadBackups();
  }, [_loadBackups]);

  const _handleBackup = async () => {
    try {
      setError(null);
      setSuccess(null);
      _searchService.backupSearchHistory();
      setSuccess('Backup created successfully');
      _loadBackups();
    } catch (error) {
      setError('Failed to create backup');
    }
  };

  const _handleRestore = async (backupKey: string) => {
    try {
      setError(null);
      setSuccess(null);
      _searchService.restoreFromBackup(backupKey);
      setSuccess('Backup restored successfully');
    } catch (error) {
      setError('Failed to restore backup');
    }
  };

  const _handleExport = () => {
    try {
      setError(null);
      setSuccess(null);
      const exportData = _searchService.exportSearchHistory();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-history-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Search history exported successfully');
    } catch (error) {
      setError('Failed to export search history');
    }
  };

  const _handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setError(null);
        setSuccess(null);
        const content = e.target?.result as string;
        _searchService.importSearchHistory(content);
        setSuccess('Search history imported successfully');
        _loadBackups();
      } catch (error) {
        setError('Failed to import search history');
      }
    };
    reader.readAsText(file);
  };

  if (_isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Search History Backup
      </h3>

      {_error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{_error}</p>
        </div>
      )}

      {_success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{_success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={_handleBackup}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Create Backup
          </button>
          <button
            onClick={_handleExport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
          >
            Export History
          </button>
          <label className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 cursor-pointer">
            Import History
            <input
              type="file"
              accept=".json"
              onChange={_handleImport}
              className="hidden"
            />
          </label>
        </div>

        {_backups.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Available Backups
            </h4>
            <div className="space-y-2">
              {_backups.map(({ key, timestamp }) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(timestamp).toLocaleString()}
                  </span>
                  <button
                    onClick={() => _handleRestore(key)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  >
                    Restore
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 