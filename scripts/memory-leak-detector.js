class MemoryLeakDetector {
    constructor() {
        this.snapshots = new Map();
        this.leakThreshold = 1024 * 1024; // 1MB
        this.checkInterval = 30000; // 30 seconds
        this.timers = new Set();
        this.eventListeners = new Map();
    }

    init() {
        if (typeof performance !== 'undefined' && performance.memory) {
            this.setupEventListeners();
            this.startMonitoring();
        } else {
            console.warn('Memory API not supported in this environment');
        }
    }

    setupEventListeners() {
        const handlers = {
            'beforeunload': this.cleanup.bind(this),
            'visibilitychange': this.handleVisibilityChange.bind(this)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
            this.eventListeners.set(event, handler);
        });
    }

    startMonitoring() {
        // Clear any existing timers
        this.timers.forEach(timer => clearInterval(timer));
        this.timers.clear();

        // Take initial snapshot
        this.takeSnapshot('initial');

        // Set up monitoring timer
        const monitorTimer = setInterval(() => {
            this.checkMemoryUsage();
        }, this.checkInterval);

        this.timers.add(monitorTimer);
    }

    takeSnapshot(label) {
        if (performance.memory) {
            const snapshot = {
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
            this.snapshots.set(label, snapshot);
            return snapshot;
        }
        return null;
    }

    checkMemoryUsage() {
        const currentSnapshot = this.takeSnapshot('current');
        const previousSnapshot = this.snapshots.get('previous');

        if (currentSnapshot && previousSnapshot) {
            const memoryGrowth = currentSnapshot.usedJSHeapSize - previousSnapshot.usedJSHeapSize;
            
            if (memoryGrowth > this.leakThreshold) {
                this.reportPotentialLeak(memoryGrowth, currentSnapshot, previousSnapshot);
            }
        }

        // Update previous snapshot
        this.snapshots.set('previous', currentSnapshot);
    }

    reportPotentialLeak(growth, current, previous) {
        const report = {
            timestamp: new Date().toISOString(),
            memoryGrowth: growth,
            growthPercentage: (growth / previous.usedJSHeapSize) * 100,
            currentUsage: current.usedJSHeapSize,
            previousUsage: previous.usedJSHeapSize,
            timeElapsed: current.timestamp - previous.timestamp
        };

        console.warn('Potential memory leak detected:', report);
        
        // Store report for analysis
        this.storeLeakReport(report);
    }

    storeLeakReport(report) {
        const reports = JSON.parse(localStorage.getItem('memoryLeakReports') || '[]');
        reports.push(report);
        localStorage.setItem('memoryLeakReports', JSON.stringify(reports));
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, take a snapshot
            this.takeSnapshot('hidden');
        } else {
            // Page is visible again, check for leaks
            const hiddenSnapshot = this.snapshots.get('hidden');
            if (hiddenSnapshot) {
                const currentSnapshot = this.takeSnapshot('visible');
                const memoryGrowth = currentSnapshot.usedJSHeapSize - hiddenSnapshot.usedJSHeapSize;
                
                if (memoryGrowth > this.leakThreshold) {
                    this.reportPotentialLeak(memoryGrowth, currentSnapshot, hiddenSnapshot);
                }
            }
        }
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

        // Take final snapshot
        this.takeSnapshot('final');

        // Clear snapshots
        this.snapshots.clear();
    }
}

// Export singleton instance
const memoryLeakDetector = new MemoryLeakDetector();
export default memoryLeakDetector; 