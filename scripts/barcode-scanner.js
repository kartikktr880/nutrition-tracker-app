/**
 * Barcode Scanner Module for Nutrition Tracker
 * Handles barcode scanning using the device camera and QuaggaJS library
 */

// Mock product database for testing when no API is available
const MOCK_PRODUCTS = {
    "8901491000012": {
        name: "Whole Grain Oats",
        brand: "HealthyGrains",
        calories: 120,
        protein: 5,
        carbohydrates: 22,
        fat: 2,
        image: "images/placeholder-food.png"
    },
    "5000168188730": {
        name: "Greek Yogurt",
        brand: "CremeDelight",
        calories: 150,
        protein: 15,
        carbohydrates: 8,
        fat: 5,
        image: "images/placeholder-food.png"
    },
    "0049000042566": {
        name: "Green Tea",
        brand: "PureTea",
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        image: "images/placeholder-food.png"
    },
    "0011110513212": {
        name: "Protein Bar",
        brand: "FitFuel",
        calories: 220,
        protein: 20,
        carbohydrates: 25,
        fat: 7,
        image: "images/placeholder-food.png"
    },
    "0011111111116": {
        name: "Mixed Nuts",
        brand: "NatureHarvest",
        calories: 180,
        protein: 6,
        carbohydrates: 7,
        fat: 15,
        image: "images/placeholder-food.png"
    }
};

class BarcodeScanner {
    constructor() {
        this.isInitialized = false;
        this.isScanning = false;
        this.scannerElement = null;
        this.onDetectedCallback = null;
        this.lastDetectionTime = 0;
        this.detectionDelay = 1000; // 1 second delay between detections to prevent duplicates
        this.useMockData = true; // Set to true to use mock data instead of real API calls
    }

    /**
     * Initialize the barcode scanner
     * @param {string} elementId - ID of the HTML element to contain the scanner
     * @returns {Promise<boolean>} - Promise that resolves to true if initialization is successful
     */
    async initialize(elementId) {
        if (this.isInitialized) {
            console.log('Barcode scanner already initialized');
            return true;
        }

        this.scannerElement = document.getElementById(elementId);
        if (!this.scannerElement) {
            console.error(`Element with ID ${elementId} not found`);
            return false;
        }

        // Check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Your browser does not support camera access');
            return false;
        }

        try {
            // Check for camera permission
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            // Load QuaggaJS if not already loaded
            if (typeof Quagga === 'undefined') {
                await this.loadQuaggaJS();
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                this.showError('Camera access denied. Please allow camera access to scan barcodes.');
            } else {
                this.showError(`Error initializing barcode scanner: ${error.message}`);
            }
            console.error('Error initializing barcode scanner:', error);
            return false;
        }
    }

    /**
     * Load QuaggaJS dynamically
     * @returns {Promise<void>}
     */
    loadQuaggaJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load QuaggaJS'));
            document.head.appendChild(script);
        });
    }

    /**
     * Start the barcode scanner
     * @param {Function} callback - Callback function to handle detected barcodes
     * @returns {Promise<boolean>} - Promise that resolves to true if scanner starts successfully
     */
    async start(callback) {
        if (!this.isInitialized) {
            console.error('Barcode scanner not initialized');
            return false;
        }

        if (this.isScanning) {
            console.log('Barcode scanner already running');
            return true;
        }

        this.onDetectedCallback = callback;
        this.scannerElement.innerHTML = `
            <div class="barcode-scanner-container">
                <div id="barcode-scanner-viewport"></div>
                <div class="barcode-scanner-overlay">
                    <div class="scanner-crosshair"></div>
                    <div class="scanner-message">Align barcode in the center</div>
                </div>
            </div>
        `;

        try {
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#barcode-scanner-viewport"),
                    constraints: {
                        width: { min: 640 },
                        height: { min: 480 },
                        facingMode: "environment", // Use the rear camera
                        aspectRatio: { min: 1, max: 2 }
                    }
                },
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: 2,
                frequency: 10,
                decoder: {
                    readers: [
                        "ean_reader",
                        "ean_8_reader",
                        "upc_reader",
                        "upc_e_reader"
                    ]
                },
                locate: true
            }, (err) => {
                if (err) {
                    console.error('Error starting barcode scanner:', err);
                    this.showError(`Error starting scanner: ${err.message}`);
                    return;
                }
                
                Quagga.start();
                this.isScanning = true;
                
                // Register detection handler
                Quagga.onDetected(this.handleDetection.bind(this));
                
                // Register processed handler to draw detection
                Quagga.onProcessed(this.handleProcessed.bind(this));
            });
            
            return true;
        } catch (error) {
            console.error('Error starting barcode scanner:', error);
            this.showError(`Error starting scanner: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop the barcode scanner
     */
    stop() {
        if (!this.isScanning) return;
        
        Quagga.stop();
        this.isScanning = false;
        this.scannerElement.innerHTML = '';
    }

    /**
     * Handle barcode detection
     * @param {Object} result - Detection result
     */
    handleDetection(result) {
        const now = Date.now();
        // Prevent multiple detections in quick succession
        if (now - this.lastDetectionTime < this.detectionDelay) {
            return;
        }
        
        this.lastDetectionTime = now;
        const code = result.codeResult.code;
        
        // Play a success sound
        this.playBeepSound();
        
        // Highlight the detected barcode
        if (result.box) {
            this.drawBox(result.box, '#00FF00');
        }
        
        if (this.onDetectedCallback) {
            this.onDetectedCallback(code);
        }
    }

    /**
     * Handle processed frames
     * @param {Object} result - Processing result
     */
    handleProcessed(result) {
        const drawingCanvas = document.querySelector('#barcode-scanner-viewport canvas.drawingBuffer');
        if (!drawingCanvas) return;
        
        const ctx = drawingCanvas.getContext('2d');
        if (!ctx) return;
        
        // Draw location boxes for possible barcode detections
        if (result && result.boxes) {
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            
            result.boxes.forEach(box => {
                if (box !== result.box) { // Draw yellow boxes for potential detections
                    this.drawBox(box, '#FFFF00', ctx, drawingCanvas);
                }
            });
        }
    }

    /**
     * Draw a box around the detected barcode
     * @param {Array} box - Box coordinates
     * @param {string} color - Box color
     * @param {CanvasRenderingContext2D} [ctx] - Canvas context
     * @param {HTMLCanvasElement} [canvas] - Canvas element
     */
    drawBox(box, color, ctx, canvas) {
        if (!ctx || !canvas) {
            const drawingCanvas = document.querySelector('#barcode-scanner-viewport canvas.drawingBuffer');
            if (!drawingCanvas) return;
            
            ctx = drawingCanvas.getContext('2d');
            canvas = drawingCanvas;
        }
        
        if (!ctx) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(box[0][0], box[0][1]);
        box.forEach((point, index) => {
            if (index > 0) {
                ctx.lineTo(point[0], point[1]);
            }
        });
        ctx.lineTo(box[0][0], box[0][1]);
        ctx.stroke();
    }

    /**
     * Play a beep sound when a barcode is detected
     */
    playBeepSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 1800;
            gainNode.gain.value = 0.1;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(0);
            
            // Beep for 100ms
            setTimeout(() => {
                oscillator.stop();
            }, 100);
        } catch (error) {
            console.error('Error playing beep sound:', error);
        }
    }

    /**
     * Show an error message in the scanner element
     * @param {string} message - Error message
     */
    showError(message) {
        if (!this.scannerElement) return;
        
        this.scannerElement.innerHTML = `
            <div class="barcode-scanner-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="error-message">${message}</div>
            </div>
        `;
    }

    /**
     * Look up a product by barcode
     * @param {string} barcode - Barcode to look up
     * @returns {Promise<Object|null>} - Promise that resolves to the product data or null if not found
     */
    async lookupProduct(barcode) {
        // For testing/demo purposes, if using mock data, check the mock product database first
        if (this.useMockData && MOCK_PRODUCTS[barcode]) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            return MOCK_PRODUCTS[barcode];
        }
        
        try {
            // First check if the product is in our local database
            const localProduct = await this.searchLocalDatabase(barcode);
            if (localProduct) {
                return localProduct;
            }
            
            // If not found locally, try an external API
            // In a real app, you would use an actual food database API
            const apiUrl = `https://api.example.com/products/${barcode}`;
            
            // For demo/development purposes, simulate a success or failure response
            // In a real app, you would make an actual API call
            const shouldSimulateSuccess = Math.random() > 0.7; // 30% chance of failure for testing
            
            if (shouldSimulateSuccess) {
                // Simulate a successful API response with random nutritional data
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
                
                const mockProduct = {
                    name: `Product ${barcode.slice(-4)}`,
                    brand: `Brand ${Math.floor(Math.random() * 100)}`,
                    calories: Math.floor(Math.random() * 500),
                    protein: Math.floor(Math.random() * 30),
                    carbohydrates: Math.floor(Math.random() * 50),
                    fat: Math.floor(Math.random() * 20),
                    image: "images/placeholder-food.png"
                };
                
                // Cache the result in local database for future lookups
                this.saveToLocalDatabase(mockProduct);
                
                return mockProduct;
            } else {
                // Simulate API failure
                await new Promise(resolve => setTimeout(resolve, 1500));
                return null;
            }
        } catch (error) {
            console.error(`Error looking up barcode ${barcode}:`, error);
            return null;
        }
    }

    /**
     * Search for a product in the local database
     * @param {string} barcode - Barcode to search for
     * @returns {Promise<Object|null>} - Promise that resolves to the product data or null if not found
     */
    async searchLocalDatabase(barcode) {
        // This is a placeholder - in a real app, you would query IndexedDB or other local storage
        return null;
    }

    /**
     * Save a product to the local database
     * @param {Object} productData - Product data to save
     */
    saveToLocalDatabase(productData) {
        // This is a placeholder - in a real app, you would save to IndexedDB or other local storage
        console.log('Saving product to local database:', productData);
    }
    
    /**
     * Generate a random barcode from the mock database (for testing only)
     * @returns {string} - A random barcode that exists in the mock database
     */
    generateRandomBarcode() {
        const barcodes = Object.keys(MOCK_PRODUCTS);
        const randomIndex = Math.floor(Math.random() * barcodes.length);
        return barcodes[randomIndex];
    }
}

// Create a singleton instance
const barcodeScanner = new BarcodeScanner();

// Export the instance
export default barcodeScanner; 