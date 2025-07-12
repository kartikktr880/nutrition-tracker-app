import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Error Reporter
 * Provides centralized error reporting and analytics capabilities
 */
class ErrorReporter {
    constructor() {
        this.reportQueue = [];
        this.maxQueueSize = 50;
        this.reportEndpoint = '/api/error-reports';
        this.reportInterval = 60000; // Report every minute
        this.isReporting = false;
        
        this.timers = new Set();
        this.eventListeners = new Map();
        
        this.initializeReporting();
    }

    /**
     * Initialize error reporting
     */
    initializeReporting() {
        this.setupEventListeners();
        this.startPeriodicReporting();
    }

    setupEventListeners() {
        const handlers = {
            'error': this.handleError.bind(this),
            'unhandledrejection': this.handleUnhandledRejection.bind(this),
            'beforeunload': this.cleanup.bind(this)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
            this.eventListeners.set(event, handler);
        });
    }

    startPeriodicReporting() {
        // Clear any existing timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Set up new reporting timer
        const reportTimer = setInterval(() => {
            this.processReportQueue();
        }, this.reportInterval);

        this.timers.add(reportTimer);
    }

    cleanup() {
        // Remove all event listeners
        this.eventListeners.forEach((handler, event) => {
            window.removeEventListener(event, handler);
        });
        this.eventListeners.clear();

        // Clear all timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Clear any other resources
        this.reportQueue = [];
        this.isReporting = false;
    }

    /**
     * Add error to report queue
     * @param {Object} error - Error object from ErrorHandler
     */
    queueError(error) {
        // Add error to queue
        this.reportQueue.push({
            ...error,
            queuedAt: new Date().toISOString()
        });

        // Maintain queue size
        if (this.reportQueue.length > this.maxQueueSize) {
            this.reportQueue.shift();
        }

        // Store queue in localStorage for persistence
        this.saveQueue();
    }

    /**
     * Process report queue
     * @param {boolean} [force] - Force immediate processing
     */
    async processReportQueue(force = false) {
        if (this.isReporting || (!force && this.reportQueue.length === 0)) {
            return;
        }

        this.isReporting = true;

        try {
            // Get errors to report
            const errorsToReport = [...this.reportQueue];
            this.reportQueue = [];

            // Group errors by type for better analysis
            const groupedErrors = this.groupErrors(errorsToReport);

            // Prepare report data
            const reportData = {
                timestamp: new Date().toISOString(),
                errors: groupedErrors,
                environment: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            };

            // Send report
            await this.sendReport(reportData);

            // Clear saved queue
            this.clearSavedQueue();
        } catch (error) {
            logWarn('Error reporting failed:', error);
            // Restore queue on failure
            this.loadSavedQueue();
        } finally {
            this.isReporting = false;
        }
    }

    /**
     * Group errors by type
     * @param {Array} errors - Array of error objects
     */
    groupErrors(errors) {
        return errors.reduce((groups, error) => {
            const key = error.type;
            if (!groups[key]) {
                groups[key] = {
                    count: 0,
                    examples: [],
                    firstSeen: error.timestamp,
                    lastSeen: error.timestamp
                };
            }

            groups[key].count++;
            groups[key].lastSeen = error.timestamp;
            
            // Keep up to 3 examples
            if (groups[key].examples.length < 3) {
                groups[key].examples.push({
                    message: error.message,
                    context: error.context,
                    timestamp: error.timestamp
                });
            }

            return groups;
        }, {});
    }

    /**
     * Send error report
     * @param {Object} reportData - Report data to send
     */
    async sendReport(reportData) {
        try {
            const response = await fetch(this.reportEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            logWarn('Failed to send error report:', error);
            throw error;
        }
    }

    /**
     * Save queue to localStorage
     */
    saveQueue() {
        try {
            localStorage.setItem('errorReportQueue', JSON.stringify(this.reportQueue));
        } catch (e) {
            logWarn('Could not save error report queue:', e);
        }
    }

    /**
     * Load saved queue from localStorage
     */
    loadSavedQueue() {
        try {
            const saved = localStorage.getItem('errorReportQueue');
            if (saved) {
                this.reportQueue = JSON.parse(saved);
            }
        } catch (e) {
            logWarn('Could not load error report queue:', e);
        }
    }

    /**
     * Clear saved queue from localStorage
     */
    clearSavedQueue() {
        localStorage.removeItem('errorReportQueue');
    }

    /**
     * Get reporting statistics
     */
    getStats() {
        return {
            queueSize: this.reportQueue.length,
            lastReported: this.lastReported,
            totalReported: this.totalReported
        };
    }
}

// Export singleton instance
export const errorReporter = new ErrorReporter(); 