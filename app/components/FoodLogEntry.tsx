import { useState } from 'react';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

import { BarcodeHistory } from './BarcodeHistory';
import { BarcodeScanner } from './BarcodeScanner';

interface FoodLogEntryProps {
  onAdd: (_food: object) => void;
  onCancel: () => void;
}

export const FoodLogEntry: React.FC<FoodLogEntryProps> = ({ onAdd: _onAdd, onCancel: _onCancel }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { startScanning, stopScanning, handleScan, error } = useBarcodeScanner();
  // const { showToast } = useToast();();

  const handleScanClick = () => {
    startScanning();
    setShowScanner(true);
  };

  const handleScannerClose = () => {
    stopScanning();
    setShowScanner(false);
  };

  const handleBarcodeScan = async (barcode: string) => {
    await handleScan(barcode);
    setShowScanner(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Add Food Entry</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            History
          </button>
          <button
            onClick={handleScanClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v4m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Scan Barcode
          </button>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-md">
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={handleScannerClose}
            />
          </div>
        </div>
      )}

      {showHistory && (
        <div className="mt-4">
          <BarcodeHistory />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Existing manual food entry form */}
      <form className="space-y-4">
        {/* ... existing form fields ... */}
      </form>
    </div>
  );
}; 




