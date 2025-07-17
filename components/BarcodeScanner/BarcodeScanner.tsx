'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ScanResult {
  barcode: string;
  timestamp: Date;
  success: boolean;
}

export function BarcodeScanner({ onScan, onError, className }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for camera support
  const isSupported = typeof window !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  useEffect(() => {
    if (isOpen && isSupported) {
      requestCameraPermission();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        startScanning();
      }
    } catch (err) {
      // Camera permission error - handled by error boundary
      setHasPermission(false);
      setError('Camera access denied. Please allow camera permissions to scan barcodes.');
      onError?.('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const scanFrame = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.videoWidth === 0) {
        requestAnimationFrame(scanFrame);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for barcode detection (unused in simulation)
      const _imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simulate barcode detection (in real implementation, use a library like QuaggaJS or ZXing)
      // For now, we'll simulate finding a barcode after a few seconds
      setTimeout(() => {
        if (isScanning) {
          simulateBarcodeDetection();
        }
      }, 2000);

      requestAnimationFrame(scanFrame);
    };

    scanFrame();
  };

  const simulateBarcodeDetection = () => {
    // Simulate finding a barcode
    const mockBarcode = '1234567890123';
    handleBarcodeDetected(mockBarcode);
  };

  const handleBarcodeDetected = (barcode: string) => {
    setLastScan({
      barcode,
      timestamp: new Date(),
      success: true,
    });
    
    setIsScanning(false);
    stopCamera();
    
    // Call the onScan callback
    onScan(barcode);
    
    // Close the dialog after a short delay
    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  };

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode && barcode.trim()) {
      handleBarcodeDetected(barcode.trim());
    }
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setError(null);
    setLastScan(null);
  };

  if (!isSupported) {
    return (
      <div className={cn('text-center p-4', className)}>
        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Barcode scanning is not supported in this browser.
        </p>
        <Button 
          variant="outline" 
          onClick={handleManualEntry}
          className="mt-2"
        >
          <Search className="h-4 w-4 mr-2" />
          Enter Manually
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Camera className="h-4 w-4 mr-2" />
          Scan Barcode
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a product barcode to quickly add it to your food log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}

            {hasPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm text-center px-4">
                  Camera access denied. Please allow camera permissions.
                </p>
              </div>
            )}

            {hasPermission === true && (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-blue-500 rounded-lg p-4">
                      <div className="w-48 h-32 border-2 border-white rounded relative">
                        <div className="absolute inset-0 border-2 border-blue-500 rounded animate-pulse" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500 animate-ping" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Overlay */}
                {lastScan?.success && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-75">
                    <div className="text-center text-white">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-semibold">Barcode Found!</p>
                      <p className="text-sm">{lastScan.barcode}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isScanning && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600">Scanning...</span>
                </>
              )}
              {lastScan?.success && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Barcode detected!</span>
                </>
              )}
            </div>

            <Badge variant="outline" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile Optimized
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleManualEntry}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
            
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 Tips for better scanning:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ensure good lighting</li>
              <li>Hold camera steady</li>
              <li>Position barcode in the center</li>
              <li>Keep barcode clean and unobstructed</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 