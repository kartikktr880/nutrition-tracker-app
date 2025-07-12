import { useState, useRef, useEffect } from 'react';

import { logError } from '../../utils/logger';
// import { BarcodeDetector } from 'barcode-detector';
// import { useToast } from '@/hooks/useToast';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [_isScanning, _setIsScanning] = useState(false);
  const [_error, _setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const { showToast } = useToast();

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          video.srcObject = stream;
          video.play();
        })
        .catch(err => {
          logError('Error accessing camera:', err);
        });
    }

    return () => {
      if (video) {
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!_isScanning || !videoRef.current || !canvasRef.current) return;

    // const detector = new BarcodeDetector();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    let animationFrameId: number;

    const scanBarcode = async () => {
      if (!context || !videoRef.current) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      try {
        // const barcodes = await detector.detect(canvas);
        // if (barcodes.length > 0) {
        //   const barcode = barcodes[0].rawValue;
        //   onScan(barcode);
        //   setIsScanning(false);
        // }
      } catch (err) {
        logError('Barcode detection error:', err);
      }

      animationFrameId = requestAnimationFrame(scanBarcode);
    };

    scanBarcode();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [_isScanning, onScan]);

  if (_error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {_error}
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-lg"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      <button
        onClick={onClose}
        className="absolute top-2 right-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
      >
        Close
      </button>
    </div>
  );
}; 







