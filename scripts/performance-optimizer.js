/**
 * Performance Optimizer
 * Provides utilities to optimize performance for large datasets
 * This includes:
 * - Virtualized lists/tables
 * - Data chunking
 * - Web Workers for background processing
 * - Optimized rendering techniques
 */

class PerformanceOptimizer {
    constructor() {
        this.workers = new Map();
        this.virtualizedLists = new Map();
        this.observedElements = new Map();
        this.renderQueue = [];
        this.isProcessingQueue = false;
        this.enabledOptimizations = {
            virtualization: true,
            lazyLoading: true,
            webWorkers: true,
            batchRendering: true
        };
        
        // Initialize performance monitoring
        this.initPerformanceMonitoring();
    }
    
    /**
     * Initialize performance monitoring
     */
    initPerformanceMonitoring() {
        // Track long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 100) {
                            console.warn('Long task detected:', entry.duration.toFixed(2) + 'ms', entry);
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['longtask'] });
                
                console.log('Performance monitoring initialized');
            } catch (e) {
                console.error('Performance observer error:', e);
            }
        }
        
        // Process render queue on animation frames
        this.frameHandler = this.processRenderQueue.bind(this);
        requestAnimationFrame(this.frameHandler);
    }
    
    /**
     * Create a virtualized list for efficiently displaying large datasets
     * @param {Object} options Configuration options
     * @returns {Object} Control interface for the virtualized list
     */
    createVirtualizedList(options) {
        const {
            container, // Container element
            itemHeight = 50, // Height of each item in pixels
            overscan = 5, // Number of items to render off-screen
            renderItem, // Function to render a single item
            getItemKey, // Function to get unique key for an item
            onVisibilityChange, // Callback when items visibility changes
            id = 'vlist-' + Math.random().toString(36).substr(2, 9)
        } = options;
        
        if (!container || !renderItem) {
            throw new Error('Container and renderItem function are required');
        }
        
        // Ensure container has position relative or absolute
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
            container.style.position = 'relative';
        }
        
        // Create virtualized list controller
        const virtualizedList = {
            id,
            container,
            itemHeight,
            overscan,
            renderItem,
            getItemKey: getItemKey || (item => item.id),
            onVisibilityChange: onVisibilityChange || (() => {}),
            items: [],
            visibleStartIndex: 0,
            visibleEndIndex: 0,
            renderedItems: new Map(),
            scrollHandler: null,
            resizeObserver: null,
            placeholderElement: document.createElement('div'),
            
            /**
             * Initialize the virtualized list
             */
            initialize() {
                // Create placeholder for scroll area
                this.placeholderElement.style.width = '100%';
                this.placeholderElement.style.position = 'absolute';
                this.placeholderElement.style.top = '0';
                this.placeholderElement.style.left = '0';
                container.appendChild(this.placeholderElement);
                
                // Setup scroll handler
                this.scrollHandler = () => this.updateVisibleItems();
                container.addEventListener('scroll', this.scrollHandler, { passive: true });
                
                // Setup resize observer
                if ('ResizeObserver' in window) {
                    this.resizeObserver = new ResizeObserver(() => this.updateVisibleItems());
                    this.resizeObserver.observe(container);
                } else {
                    window.addEventListener('resize', this.scrollHandler, { passive: true });
                }
                
                return this;
            },
            
            /**
             * Set or update items in the virtualized list
             * @param {Array} newItems Array of items to display
             */
            setItems(newItems) {
                this.items = newItems || [];
                
                // Update placeholder height
                this.placeholderElement.style.height = `${this.items.length * this.itemHeight}px`;
                
                // Force update of visible items
                this.updateVisibleItems(true);
                
                return this;
            },
            
            /**
             * Update which items are currently visible
             * @param {boolean} forceUpdate Force re-render even if indices haven't changed
             */
            updateVisibleItems(forceUpdate = false) {
                const containerHeight = container.clientHeight;
                const scrollTop = container.scrollTop;
                
                const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
                const endIndex = Math.min(
                    this.items.length - 1,
                    Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.overscan
                );
                
                // If visible range hasn't changed and we're not forcing an update, do nothing
                if (!forceUpdate && startIndex === this.visibleStartIndex && endIndex === this.visibleEndIndex) {
                    return;
                }
                
                // Update visible indices
                this.visibleStartIndex = startIndex;
                this.visibleEndIndex = endIndex;
                
                // Notify about visibility changes
                this.onVisibilityChange({
                    startIndex,
                    endIndex,
                    visibleItems: this.items.slice(startIndex, endIndex + 1)
                });
                
                // Render visible items
                this.renderVisibleItems();
            },
            
            /**
             * Render the currently visible items
             */
            renderVisibleItems() {
                // Keep track of rendered item keys to remove stale ones
                const currentKeys = new Set();
                
                // Render or update visible items
                for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
                    if (i >= this.items.length) break;
                    
                    const item = this.items[i];
                    const key = this.getItemKey(item);
                    currentKeys.add(key);
                    
                    if (!this.renderedItems.has(key)) {
                        // Create new item element
                        const element = document.createElement('div');
                        element.style.position = 'absolute';
                        element.style.top = `${i * this.itemHeight}px`;
                        element.style.width = '100%';
                        element.style.height = `${this.itemHeight}px`;
                        
                        // Render item content
                        this.renderItem(element, item, i);
                        
                        // Add to container
                        container.appendChild(element);
                        this.renderedItems.set(key, { element, index: i });
                    } else {
                        // Update existing item if position changed
                        const renderedItem = this.renderedItems.get(key);
                        if (renderedItem.index !== i) {
                            renderedItem.element.style.top = `${i * this.itemHeight}px`;
                            renderedItem.index = i;
                        }
                    }
                }
                
                // Remove items that are no longer visible
                for (const [key, { element }] of this.renderedItems.entries()) {
                    if (!currentKeys.has(key)) {
                        element.remove();
                        this.renderedItems.delete(key);
                    }
                }
            },
            
            /**
             * Scroll to a specific item
             * @param {number} index Index of the item to scroll to
             * @param {string} position Where to position the item (start, center, end)
             */
            scrollToItem(index, position = 'start') {
                if (index < 0 || index >= this.items.length) return;
                
                const itemTop = index * this.itemHeight;
                
                switch (position) {
                    case 'center':
                        container.scrollTop = itemTop - (container.clientHeight / 2) + (this.itemHeight / 2);
                        break;
                    case 'end':
                        container.scrollTop = itemTop - container.clientHeight + this.itemHeight;
                        break;
                    case 'start':
                    default:
                        container.scrollTop = itemTop;
                        break;
                }
            },
            
            /**
             * Clean up resources used by the virtualized list
             */
            destroy() {
                if (this.scrollHandler) {
                    container.removeEventListener('scroll', this.scrollHandler);
                }
                
                if (this.resizeObserver) {
                    this.resizeObserver.disconnect();
                } else {
                    window.removeEventListener('resize', this.scrollHandler);
                }
                
                // Remove all rendered items
                for (const { element } of this.renderedItems.values()) {
                    element.remove();
                }
                
                this.placeholderElement.remove();
                this.renderedItems.clear();
            }
        };
        
        // Initialize the virtualized list
        virtualizedList.initialize();
        
        // Store reference to the list
        this.virtualizedLists.set(id, virtualizedList);
        
        return virtualizedList;
    }
    
    /**
     * Remove a virtualized list and clean up its resources
     * @param {string} id ID of the virtualized list to remove
     */
    removeVirtualizedList(id) {
        const list = this.virtualizedLists.get(id);
        if (list) {
            list.destroy();
            this.virtualizedLists.delete(id);
        }
    }
    
    /**
     * Create a web worker for background processing
     * @param {Function|string} workerCode Worker function or path to worker script
     * @param {string} id Unique identifier for this worker
     * @returns {Worker} The created Web Worker
     */
    createWorker(workerCode, id = 'worker-' + Math.random().toString(36).substr(2, 9)) {
        if (!this.enabledOptimizations.webWorkers) {
            return null;
        }
        
        let worker;
        
        if (typeof workerCode === 'function') {
            // Convert function to string and create a blob URL
            const blob = new Blob(
                [`(${workerCode.toString()})()`],
                { type: 'application/javascript' }
            );
            const url = URL.createObjectURL(blob);
            worker = new Worker(url);
            
            // Clean up the blob URL after the worker is created
            URL.revokeObjectURL(url);
        } else if (typeof workerCode === 'string') {
            // Assume workerCode is a URL to the worker script
            worker = new Worker(workerCode);
        } else {
            throw new Error('Worker code must be a function or string URL');
        }
        
        // Store reference to the worker
        this.workers.set(id, worker);
        
        return worker;
    }
    
    /**
     * Terminate a web worker and remove it
     * @param {string} id ID of the worker to terminate
     */
    terminateWorker(id) {
        const worker = this.workers.get(id);
        if (worker) {
            worker.terminate();
            this.workers.delete(id);
        }
    }
    
    /**
     * Create an intersection observer for lazy loading
     * @param {Function} callback Function to call when elements become visible
     * @param {Object} options Intersection observer options
     * @returns {IntersectionObserver} The created IntersectionObserver
     */
    createLazyLoader(callback, options = {}) {
        if (!this.enabledOptimizations.lazyLoading || !('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver
            return {
                observe: (element) => {
                    // Simply call the callback immediately
                    setTimeout(() => callback(element), 0);
                },
                unobserve: () => {},
                disconnect: () => {}
            };
        }
        
        const id = options.id || 'lazy-' + Math.random().toString(36).substr(2, 9);
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target, entry);
                    
                    // Unobserve after loading if specified
                    if (options.unobserveAfterLoad) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            root: options.root || null,
            rootMargin: options.rootMargin || '0px',
            threshold: options.threshold || 0
        });
        
        // Store reference to the observer
        this.observedElements.set(id, {
            observer,
            elements: new Set()
        });
        
        // Add convenience methods
        const enhancedObserver = {
            id,
            observe: (element) => {
                observer.observe(element);
                this.observedElements.get(id).elements.add(element);
            },
            unobserve: (element) => {
                observer.unobserve(element);
                this.observedElements.get(id).elements.delete(element);
            },
            disconnect: () => {
                observer.disconnect();
                this.observedElements.get(id).elements.clear();
            }
        };
        
        return enhancedObserver;
    }
    
    /**
     * Queue a render operation to be processed in the next animation frame
     * @param {Function} renderFn Function to call for rendering
     * @param {string} id Unique identifier for this render operation
     * @param {boolean} replace Whether to replace an existing operation with the same ID
     */
    queueRender(renderFn, id, replace = true) {
        if (!this.enabledOptimizations.batchRendering) {
            // If batch rendering is disabled, just execute immediately
            renderFn();
            return;
        }
        
        if (id && replace) {
            // Remove any existing render operation with the same ID
            const existingIndex = this.renderQueue.findIndex(item => item.id === id);
            if (existingIndex !== -1) {
                this.renderQueue.splice(existingIndex, 1);
            }
        }
        
        // Add new render operation to the queue
        this.renderQueue.push({ id, renderFn });
        
        // Start processing the queue if not already processing
        if (!this.isProcessingQueue) {
            this.isProcessingQueue = true;
            requestAnimationFrame(this.frameHandler);
        }
    }
    
    /**
     * Process the render queue in animation frames
     */
    processRenderQueue() {
        const startTime = performance.now();
        const timeLimit = 16; // Aim for 60fps (16ms per frame)
        
        // Process as many operations as we can within our time budget
        while (this.renderQueue.length > 0 && performance.now() - startTime < timeLimit) {
            const { renderFn } = this.renderQueue.shift();
            try {
                renderFn();
            } catch (error) {
                console.error('Error in render function:', error);
            }
        }
        
        // Update processing flag
        this.isProcessingQueue = this.renderQueue.length > 0;
        
        // Schedule next frame if needed
        if (this.isProcessingQueue) {
            requestAnimationFrame(this.frameHandler);
        }
    }
    
    /**
     * Split a large array into chunks for processing
     * @param {Array} array The array to chunk
     * @param {number} size Maximum chunk size
     * @returns {Array<Array>} Array of chunks
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Process a large array in chunks with a delay between chunks
     * @param {Array} array The array to process
     * @param {Function} processFn Function to process each item
     * @param {Object} options Processing options
     * @returns {Promise} Promise that resolves when processing is complete
     */
    processArrayInChunks(array, processFn, options = {}) {
        const {
            chunkSize = 100,
            chunkDelay = 10,
            onProgress = null,
            useWorker = false
        } = options;
        
        return new Promise((resolve, reject) => {
            if (useWorker && this.enabledOptimizations.webWorkers) {
                // Process in a worker if supported
                const worker = this.createWorker(function() {
                    self.onmessage = function(e) {
                        const { array, chunkSize, processFnStr } = e.data;
                        const processFn = new Function('return ' + processFnStr)();
                        
                        const results = [];
                        let processed = 0;
                        
                        for (let i = 0; i < array.length; i++) {
                            results.push(processFn(array[i], i));
                            processed++;
                            
                            if (processed % chunkSize === 0 || i === array.length - 1) {
                                self.postMessage({
                                    progress: processed / array.length,
                                    processed,
                                    total: array.length
                                });
                            }
                        }
                        
                        self.postMessage({
                            done: true,
                            results,
                            processed,
                            total: array.length
                        });
                    };
                });
                
                worker.onmessage = (e) => {
                    if (e.data.progress !== undefined && onProgress) {
                        onProgress(e.data.progress, e.data.processed, e.data.total);
                    }
                    
                    if (e.data.done) {
                        this.terminateWorker(worker.id);
                        resolve(e.data.results);
                    }
                };
                
                worker.onerror = (error) => {
                    this.terminateWorker(worker.id);
                    reject(error);
                };
                
                worker.postMessage({
                    array,
                    chunkSize,
                    processFnStr: processFn.toString()
                });
            } else {
                // Process in the main thread in chunks
                const chunks = this.chunkArray(array, chunkSize);
                const results = [];
                let processed = 0;
                
                const processChunk = (index) => {
                    if (index >= chunks.length) {
                        resolve(results);
                        return;
                    }
                    
                    const chunk = chunks[index];
                    
                    for (let i = 0; i < chunk.length; i++) {
                        results.push(processFn(chunk[i], processed + i));
                    }
                    
                    processed += chunk.length;
                    
                    if (onProgress) {
                        onProgress(processed / array.length, processed, array.length);
                    }
                    
                    setTimeout(() => processChunk(index + 1), chunkDelay);
                };
                
                processChunk(0);
            }
        });
    }
    
    /**
     * Debounce a function call
     * @param {Function} func The function to debounce
     * @param {number} wait Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle a function call
     * @param {Function} func The function to throttle
     * @param {number} limit Limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Enable or disable specific optimizations
     * @param {Object} options Optimization options
     */
    setOptimizations(options) {
        if (typeof options !== 'object') return;
        
        for (const [key, value] of Object.entries(options)) {
            if (this.enabledOptimizations.hasOwnProperty(key)) {
                this.enabledOptimizations[key] = !!value;
            }
        }
    }
    
    /**
     * Cleanup resources used by the optimizer
     */
    cleanup() {
        // Terminate all workers
        for (const [id, worker] of this.workers.entries()) {
            worker.terminate();
        }
        this.workers.clear();
        
        // Destroy all virtualized lists
        for (const [id, list] of this.virtualizedLists.entries()) {
            list.destroy();
        }
        this.virtualizedLists.clear();
        
        // Disconnect all observers
        for (const { observer } of this.observedElements.values()) {
            observer.disconnect();
        }
        this.observedElements.clear();
        
        // Clear render queue
        this.renderQueue = [];
        this.isProcessingQueue = false;
    }
}

// Create and export a singleton instance
const performanceOptimizer = new PerformanceOptimizer();
window.performanceOptimizer = performanceOptimizer;

export default performanceOptimizer; 