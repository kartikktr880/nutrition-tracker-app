import { useState, useCallback } from 'react';
import { barcodeService } from '@/lib/barcode-service';
import { useToast } from './useToast';
import { useFoodLog } from './useFoodLog';

interface UseBarcodeScannerResult {
  isScanning: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  handleScan: (barcode: string) => Promise<void>;
  error: string | null;
}

export const useBarcodeScanner = (): UseBarcodeScannerResult => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { addFoodEntry } = useFoodLog();

  const startScanning = useCallback(() => {
    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanning is not supported in your browser');
      return;
    }
    setIsScanning(true);
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setError(null);
  }, []);

  const handleScan = useCallback(async (barcode: string) => {
    try {
      const result = await barcodeService.lookupBarcode(barcode);
      
      if (result.success && result.data) {
        await addFoodEntry({
          name: result.data.name,
          brand: result.data.brand,
          nutrition: result.data.nutrition,
          timestamp: Date.now()
        });
        
        showToast('Food added successfully', 'success');
        stopScanning();
      } else {
        setError(result.error || 'Failed to find food information');
        showToast('Food not found', 'error');
      }
    } catch (err) {
      setError('Failed to process barcode');
      showToast('Error processing barcode', 'error');
    }
  }, [addFoodEntry, showToast, stopScanning]);

  return {
    isScanning,
    startScanning,
    stopScanning,
    handleScan,
    error
  };
}; 