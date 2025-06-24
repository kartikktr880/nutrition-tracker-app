/**
 * Performance UI Component
 * Displays real-time performance metrics in a dashboard
 */

class PerformanceUI {
    constructor() {
        this.dashboard = null;
        this.metrics = new Map();
        this.charts = new Map();
        this.initialize();
    }

    initialize() {
        this.createDashboard();
        this.setupEventListeners();
        this.startMonitoring();
    }

    createDashboard() {
        // Create dashboard container
        this.dashboard = document.createElement('div');
        this.dashboard.className = 'performance-dashboard';
        this.dashboard.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Create header
        const header = document.createElement('div');
        header.className = 'dashboard-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        `;

        const title = document.createElement('h3');
        title.textContent = 'Performance Monitor';
        title.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            padding: 0 5px;
        `;
        closeButton.onclick = () => this.toggleDashboard();

        header.appendChild(title);
        header.appendChild(closeButton);
        this.dashboard.appendChild(header);

        // Create metrics container
        const metricsContainer = document.createElement('div');
        metricsContainer.className = 'metrics-container';
        this.dashboard.appendChild(metricsContainer);

        // Add to document
        document.body.appendChild(this.dashboard);
    }

    setupEventListeners() {
        // Listen for performance updates
        performanceDashboard.addObserver((type, data) => {
            if (type === 'metric') {
                this.updateMetric(data.name, data.value);
            } else if (type === 'warning' || type === 'critical') {
                this.showAlert(type, data);
            }
        });
    }

    startMonitoring() {
        // Update metrics every second
        setInterval(() => {
            const metrics = performanceDashboard.getMetrics();
            Object.entries(metrics).forEach(([name, value]) => {
                this.updateMetric(name, value);
            });
        }, 1000);
    }

    updateMetric(name, value) {
        const metric = this.metrics.get(name) || this.createMetricElement(name);
        this.metrics.set(name, metric);

        // Update metric value
        const valueElement = metric.querySelector('.metric-value');
        if (valueElement) {
            valueElement.textContent = this.formatValue(name, value.current);
            
            // Update color based on thresholds
            const thresholds = performanceDashboard.getThresholds()[name];
            if (thresholds) {
                if (value.current <= thresholds.critical) {
                    valueElement.style.color = '#ff4444';
                } else if (value.current <= thresholds.warning) {
                    valueElement.style.color = '#ffbb33';
                } else {
                    valueElement.style.color = '#00C851';
                }
            }
        }

        // Update chart if exists
        const chart = this.charts.get(name);
        if (chart) {
            this.updateChart(name, value);
        }
    }

    createMetricElement(name) {
        const metric = document.createElement('div');
        metric.className = 'metric';
        metric.style.cssText = `
            margin: 5px 0;
            padding: 5px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        `;

        const label = document.createElement('span');
        label.className = 'metric-label';
        label.textContent = this.formatLabel(name);
        label.style.marginRight = '10px';

        const value = document.createElement('span');
        value.className = 'metric-value';
        value.style.fontWeight = 'bold';

        metric.appendChild(label);
        metric.appendChild(value);

        // Add to dashboard
        const container = this.dashboard.querySelector('.metrics-container');
        container.appendChild(metric);

        return metric;
    }

    updateChart(name, value) {
        const chart = this.charts.get(name);
        if (!chart) return;

        // Add new data point
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(value.current);

        // Remove old data points
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update();
    }

    showAlert(type, data) {
        const alert = document.createElement('div');
        alert.className = `performance-alert ${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: #fff;
            font-family: monospace;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        alert.style.backgroundColor = type === 'critical' ? '#ff4444' : '#ffbb33';
        alert.textContent = `${type.toUpperCase()}: ${data.name} - ${this.formatValue(data.name, data.value)}`;

        document.body.appendChild(alert);

        // Remove after 5 seconds
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }

    toggleDashboard() {
        this.dashboard.style.display = 
            this.dashboard.style.display === 'none' ? 'block' : 'none';
    }

    formatLabel(name) {
        return name.split(/(?=[A-Z])/).join(' ').toUpperCase();
    }

    formatValue(name, value) {
        switch (name) {
            case 'fps':
                return `${value.toFixed(1)} FPS`;
            case 'memory':
                return `${value.toFixed(1)} MB`;
            case 'loadTime':
            case 'apiResponse':
                return `${value.toFixed(0)} ms`;
            default:
                return value.toString();
        }
    }

    cleanup() {
        // Remove dashboard
        if (this.dashboard) {
            this.dashboard.remove();
        }

        // Clear metrics and charts
        this.metrics.clear();
        this.charts.clear();
    }
}

// Create and export singleton instance
export const performanceUI = new PerformanceUI(); 