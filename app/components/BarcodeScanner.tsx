import { useState, useRef, useEffect } from 'react';
// import { BarcodeDetector } from 'barcode-detector';
// import { useToast } from '@/hooks/useToast';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const { showToast } = useToast();

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanning is not supported in your browser');
      return;
    }

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
        }
      } catch (err) {
        setError('Failed to access camera');
        // showToast('Camera access denied', 'error');
      }
    };

    startScanning();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

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
        console.error('Barcode detection error:', err);
      }

      animationFrameId = requestAnimationFrame(scanBarcode);
    };

    scanBarcode();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isScanning, onScan]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
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







