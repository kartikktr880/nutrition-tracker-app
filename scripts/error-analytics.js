/**
 * Error Analytics Dashboard
 * Provides visualization and analysis of error data
 */
import { errorHandler } from './error-handler.js';
import { errorMonitor } from './error-monitor.js';
import { errorReporter } from './error-reporter.js';

class ErrorAnalytics {
    constructor() {
        this.updateInterval = 30000; // Update every 30 seconds
        this.chartColors = {
            validation: '#ff6384',
            authentication: '#36a2eb',
            network: '#ffce56',
            database: '#4bc0c0',
            unknown: '#9966ff'
        };
        
        this.initializeDashboard();
    }

    /**
     * Initialize the analytics dashboard
     */
    initializeDashboard() {
        // Create dashboard container
        this.container = document.createElement('div');
        this.container.id = 'error-analytics-dashboard';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 15px;
            width: 300px;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            display: none;
        `;

        // Add toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = '📊';
        this.toggleButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #4a90e2;
            color: white;
            font-size: 20px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        this.toggleButton.onclick = () => this.toggleDashboard();

        // Add to document
        document.body.appendChild(this.container);
        document.body.appendChild(this.toggleButton);

        // Start periodic updates
        setInterval(() => this.updateDashboard(), this.updateInterval);
    }

    /**
     * Toggle dashboard visibility
     */
    toggleDashboard() {
        const isVisible = this.container.style.display === 'block';
        this.container.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            this.updateDashboard();
        }
    }

    /**
     * Update dashboard with latest data
     */
    updateDashboard() {
        const stats = errorHandler.getErrorStats();
        const monitorStats = errorMonitor.getStats();
        const reporterStats = errorReporter.getStats();

        // Create dashboard content
        this.container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px;">Error Analytics</h3>
                <div style="font-size: 12px; color: #666;">
                    Last updated: ${new Date().toLocaleTimeString()}
                </div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="font-size: 14px; margin-bottom: 5px;">Total Errors: ${stats.total}</div>
                <div style="font-size: 14px; margin-bottom: 5px;">Queue Size: ${reporterStats.queueSize}</div>
                <div style="font-size: 14px;">Active Errors: ${monitorStats.activeErrors}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="font-size: 14px; margin-bottom: 5px;">Error Types:</div>
                ${this.createErrorTypeChart(stats.byType)}
            </div>
            <div style="font-size: 12px; color: #666;">
                Click outside to close
            </div>
        `;

        // Add click outside handler
        document.addEventListener('click', this.handleClickOutside);
    }

    /**
     * Create error type chart
     * @param {Object} errorTypes - Error type counts
     */
    createErrorTypeChart(errorTypes) {
        const total = Object.values(errorTypes).reduce((a, b) => a + b, 0);
        return Object.entries(errorTypes)
            .map(([type, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                return `
                    <div style="margin-bottom: 5px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-size: 12px;">${type}</span>
                            <span style="font-size: 12px;">${percentage}%</span>
                        </div>
                        <div style="height: 4px; background: #eee; border-radius: 2px;">
                            <div style="width: ${percentage}%; height: 100%; background: ${this.chartColors[type] || '#999'}; border-radius: 2px;"></div>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    /**
     * Handle clicks outside the dashboard
     * @param {Event} event - Click event
     */
    handleClickOutside = (event) => {
        if (!this.container.contains(event.target) && event.target !== this.toggleButton) {
            this.container.style.display = 'none';
        }
    }
}

// Export singleton instance
export const errorAnalytics = new ErrorAnalytics(); 