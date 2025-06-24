import React from 'react';
import { SearchService } from '@/services/searchService';
import { motion } from 'framer-motion';

export const SearchBackup: React.FC = () => {
  const [backups, setBackups] = React.useState<Array<{ key: string; timestamp: number }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const searchService = React.useMemo(() => SearchService.getInstance(), []);

  const loadBackups = React.useCallback(() => {
    try {
      const availableBackups = searchService.getAvailableBackups();
      setBackups(availableBackups);
    } catch (error) {
      setError('Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  }, [searchService]);

  React.useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleBackup = async () => {
    try {
      setError(null);
      setSuccess(null);
      searchService.backupSearchHistory();
      setSuccess('Backup created successfully');
      loadBackups();
    } catch (error) {
      setError('Failed to create backup');
    }
  };

  const handleRestore = async (backupKey: string) => {
    try {
      setError(null);
      setSuccess(null);
      searchService.restoreFromBackup(backupKey);
      setSuccess('Backup restored successfully');
    } catch (error) {
      setError('Failed to restore backup');
    }
  };

  const handleExport = () => {
    try {
      setError(null);
      setSuccess(null);
      const exportData = searchService.exportSearchHistory();
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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setError(null);
        setSuccess(null);
        const content = e.target?.result as string;
        searchService.importSearchHistory(content);
        setSuccess('Search history imported successfully');
        loadBackups();
      } catch (error) {
        setError('Failed to import search history');
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Create Backup
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
          >
            Export History
          </button>
          <label className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 cursor-pointer">
            Import History
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {backups.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Available Backups
            </h4>
            <div className="space-y-2">
              {backups.map(({ key, timestamp }) => (
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
                    onClick={() => handleRestore(key)}
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