import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { APIUtils } from './utils/api-utils';
import { AnimationUtils } from './utils/animation-utils';
import { CSSUtils } from './utils/css-utils';
import { CSSOptimizer } from './css-optimizer';
import { ErrorUtils } from './utils/error-utils';
import { LoggingUtils } from './utils/logging-utils';
import { PerformanceUtils } from './utils/performance-utils';
import { StorageUtils } from './utils/storage-utils';
import { ValidationUtils } from './utils/validation-utils';
import { performanceDashboard } from './performance-dashboard';
import { performanceUI } from './performance-ui';
import { dataExportUtils } from './utils/data-export-utils';
import { dataExportUI } from './components/data-export-ui';
import animationSystem from './animation-system.js';

class App {
    private static instance: App;
    private initialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): App {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    async initialize(): Promise<void> {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    private async performInitialization(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            LoggingUtils.log('info', 'Initializing application...');

            // Initialize core systems first
            await Promise.all([
                this.initializeStorage(),
                this.initializeErrorHandling(),
                this.initializePerformanceMonitoring(),
                this.initializeDataExport()
            ]);

            // Initialize dependent systems
            await Promise.all([
                this.initializeAPI(),
                this.initializeAnimations(),
                this.initializeCSS()
            ]);

            // Set up event listeners last
            this.setupEventListeners();

            this.initialized = true;
            LoggingUtils.log('info', 'Application initialized successfully');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            LoggingUtils.log('error', `Failed to initialize application: ${errorMsg}`);
            this.initializationPromise = null;
            throw error;
        }
    }

    private async initializeStorage(): Promise<void> {
        // TODO: Implement isStorageAvailable or use alternative
        // if (!StorageUtils.isStorageAvailable(localStorage)) {
        //     throw new Error('Local storage is not available');
        // }
    }

    private async initializeErrorHandling(): Promise<void> {
        // TODO: Implement addObserver or use alternative
        // ErrorUtils.addObserver(this.handleError.bind(this));
    }

    private async initializePerformanceMonitoring(): Promise<void> {
        try {
            // Initialize performance monitoring
            await performanceDashboard.initialize();
            await performanceUI.initialize();

            // Add performance monitoring to error handling
            performanceDashboard.addObserver((type, data) => {
                if (type === 'error') {
                    this.handleError(data);
                }
            });

            logInfo('Performance monitoring initialized');
        } catch (error) {
            logError('Failed to initialize performance monitoring:', error);
            throw error;
        }
    }

    private async initializeAPI(): Promise<void> {
        // TODO: Implement addObserver or use alternative
        // APIUtils.addObserver(this.handleAPIError.bind(this));
    }

    private async initializeAnimations(): Promise<void> {
        // TODO: Implement addObserver or use alternative
        // AnimationUtils.addObserver(this.handleAnimationError.bind(this));
    }

    private async initializeCSS(): Promise<void> {
        await CSSOptimizer.optimize();
    }

    private async initializeDataExport(): Promise<void> {
        try {
            // Initialize data export UI
            dataExportUI.initialize();

            // Add data export button to settings menu
            this.addDataExportButton();

            logInfo('Data export/import initialized');
        } catch (error) {
            logError('Failed to initialize data export:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        // Handle window resize
        window.addEventListener('resize', PerformanceUtils.debounce(() => {
            this.handleResize();
        }, 250));

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleVisibilityChange(false);
            } else {
                this.handleVisibilityChange(true);
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', (event) => {
            this.handleBeforeUnload(event);
        });
    }

    private handlePerformanceIssues(data: any): void {
        if (data.type === 'performanceIssues') {
            const criticalIssues = data.issues.filter((issue: { severity: string }) => issue.severity === 'critical');
            if (criticalIssues.length > 0) {
                LoggingUtils.log('warn', 'Critical performance issues detected');
                this.enablePerformanceMode();
            }
        }
    }

    private handleError(data: any): void {
        // TODO: Implement handleError on performanceDashboard or use alternative
        // performanceDashboard.handleError(data);
        LoggingUtils.log('error', `Error occurred: ${data.error}`);
        if (data.severity === 'critical') {
            this.handleCriticalError(data);
        }
    }

    private handleAPIError(data: any): void {
        LoggingUtils.log('error', `API error: ${data.error}`);
        if (data.retryCount >= 3) {
            this.handleAPIFailure(data);
        }
    }

    private handleAnimationError(data: any): void {
        LoggingUtils.log('warn', `Animation error: ${data.error}`);
        if (data.type === 'animationError') {
            // TODO: Implement cancelAllAnimations or use alternative
            // AnimationUtils.cancelAllAnimations();
        }
    }

    private handleResize(): void {
        // Update layout and animations based on new window size
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update responsive styles
        CSSUtils.analyzeCSS(document.documentElement.style.cssText);
        
        // Adjust animations for performance
        if (width < 768) {
            this.enablePerformanceMode();
        }
    }

    private handleVisibilityChange(visible: boolean): void {
        if (visible) {
            // TODO: Implement cancelAllAnimations or use alternative
            // AnimationUtils.cancelAllAnimations();
        } else {
            // TODO: Implement cancelAllAnimations or use alternative
            // AnimationUtils.cancelAllAnimations();
        }
    }

    private handleBeforeUnload(event: BeforeUnloadEvent): void {
        // TODO: Implement setLocalItem or use alternative
        // StorageUtils.setLocalItem('lastSession', {
        //     timestamp: Date.now(),
        //     state: this.getCurrentState()
        // });
    }

    private handleCriticalError(data: any): void {
        // Implement critical error recovery
        LoggingUtils.log('error', 'Critical error occurred, attempting recovery...');
        
        // Clear caches
        APIUtils.clearCache();
        StorageUtils.clearAll();
        
        // Reset application state
        this.resetApplicationState();
        
        // Notify user
        this.showErrorNotification('A critical error occurred. The application has been reset.');
    }

    private handleAPIFailure(data: any): void {
        // Implement API failure handling
        LoggingUtils.log('error', 'API failure after multiple retries');
        
        // Switch to offline mode
        this.enableOfflineMode();
        
        // Notify user
        this.showErrorNotification('Unable to connect to the server. Working in offline mode.');
    }

    private enablePerformanceMode(): void {
        // TODO: Implement cancelAllAnimations or use alternative
        // AnimationUtils.cancelAllAnimations();
        // APIUtils.clearCache();
        // CSSUtils.generateOptimizedCSS();
    }

    private enableOfflineMode(): void {
        // TODO: Implement setLocalItem or use alternative
        // StorageUtils.setLocalItem('offlineMode', true);
        
        // Disable real-time updates
        APIUtils.setMaxRetries(0);
    }

    private resetApplicationState(): void {
        // Clear all state
        StorageUtils.clearAll();
        APIUtils.clearCache();
        animationSystem.cancelAllAnimations();
        
        // Reset counters
        APIUtils.resetRetryCount();
    }

    private getCurrentState(): any {
        // Get current application state
        return {
            timestamp: Date.now(),
            performanceMode: PerformanceUtils.getMetrics(),
            offlineMode: StorageUtils.getLocalItem('offlineMode') || false
        };
    }

    private showErrorNotification(message: string): void {
        // Implement error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    private addDataExportButton(): void {
        const settingsMenu = document.querySelector('.settings-menu');
        if (settingsMenu) {
            const exportButton = document.createElement('button');
            exportButton.className = 'settings-button';
            exportButton.innerHTML = `
                <i class="fas fa-file-export"></i>
                Export/Import Data
            `;
            exportButton.addEventListener('click', () => dataExportUI.show());
            settingsMenu.appendChild(exportButton);
        }
    }

    public cleanup(): void {
        // Cleanup performance monitoring
        performanceDashboard.cleanup();
        performanceUI.cleanup();

        // Cleanup data export
        dataExportUI.cleanup();

        // Existing cleanup logic
        // ... existing code ...
    }
}

// Export singleton instance
export const app = App.getInstance(); 