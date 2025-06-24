import React, { useState, useEffect } from 'react';
import { exportService } from '../../lib/export-service';

interface ExportHistoryProps {
  onClose: () => void;
}

const ExportHistory: React.FC<ExportHistoryProps> = ({ onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setIsLoading(true);
    try {
      const historyData = exportService.getExportHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading export history:', error);
    }
    setIsLoading(false);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the export history?')) {
      exportService.clearExportHistory();
      loadHistory();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Export History</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleClearHistory}
              className="text-red-500 hover:text-red-700"
            >
              Clear History
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No export history available</div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="border rounded p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">
                        {item.scheduleId ? 'Scheduled Export' : 'Template Export'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(item.timestamp)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Format: {item.format.toUpperCase()}
                    </p>
                    {item.fileSize && (
                      <p className="text-sm text-gray-600">
                        Size: {formatFileSize(item.fileSize)}
                      </p>
                    )}
                    {item.recipients && item.recipients.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Recipients: {item.recipients.join(', ')}
                      </p>
                    )}
                  </div>
                  {item.error && (
                    <div className="text-red-500 text-sm">
                      Error: {item.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportHistory; 