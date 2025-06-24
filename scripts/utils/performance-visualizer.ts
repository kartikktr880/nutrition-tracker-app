import { PerformanceUtils } from './performance-utils';

export class PerformanceVisualizer {
    private static readonly CHART_COLORS = {
        fps: '#4CAF50',
        frameTime: '#2196F3',
        memory: '#FFC107',
        cpu: '#F44336',
        warning: '#FF9800',
        critical: '#D32F2F'
    };

    private static readonly CHART_OPTIONS = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    private static charts: Map<string, any> = new Map();
    private static container: HTMLElement | null = null;

    static initialize(containerId: string): void {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id ${containerId} not found`);
            return;
        }

        this.container = container;
        this.createCharts();
        this.startUpdates();
    }

    private static createCharts(): void {
        if (!this.container) return;

        // Create chart containers
        const chartContainers = {
            metrics: document.createElement('div'),
            issues: document.createElement('div'),
            trends: document.createElement('div')
        };

        // Style containers
        Object.values(chartContainers).forEach(container => {
            container.style.height = '300px';
            container.style.marginBottom = '20px';
            this.container?.appendChild(container);
        });

        // Initialize charts
        this.initializeMetricsChart(chartContainers.metrics);
        this.initializeIssuesChart(chartContainers.issues);
        this.initializeTrendsChart(chartContainers.trends);
    }

    private static initializeMetricsChart(container: HTMLElement): void {
        const ctx = document.createElement('canvas');
        container.appendChild(ctx);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'FPS',
                        data: [],
                        borderColor: this.CHART_COLORS.fps,
                        tension: 0.4
                    },
                    {
                        label: 'Frame Time (ms)',
                        data: [],
                        borderColor: this.CHART_COLORS.frameTime,
                        tension: 0.4
                    },
                    {
                        label: 'Memory (MB)',
                        data: [],
                        borderColor: this.CHART_COLORS.memory,
                        tension: 0.4
                    },
                    {
                        label: 'CPU (%)',
                        data: [],
                        borderColor: this.CHART_COLORS.cpu,
                        tension: 0.4
                    }
                ]
            },
            options: this.CHART_OPTIONS
        });

        this.charts.set('metrics', chart);
    }

    private static initializeIssuesChart(container: HTMLElement): void {
        const ctx = document.createElement('canvas');
        container.appendChild(ctx);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Warnings',
                        data: [],
                        backgroundColor: this.CHART_COLORS.warning
                    },
                    {
                        label: 'Critical Issues',
                        data: [],
                        backgroundColor: this.CHART_COLORS.critical
                    }
                ]
            },
            options: this.CHART_OPTIONS
        });

        this.charts.set('issues', chart);
    }

    private static initializeTrendsChart(container: HTMLElement): void {
        const ctx = document.createElement('canvas');
        container.appendChild(ctx);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Performance Trend',
                        data: [],
                        borderColor: this.CHART_COLORS.fps,
                        tension: 0.4
                    }
                ]
            },
            options: this.CHART_OPTIONS
        });

        this.charts.set('trends', chart);
    }

    private static startUpdates(): void {
        setInterval(() => this.updateCharts(), 1000);
    }

    private static updateCharts(): void {
        const history = PerformanceUtils.getPerformanceHistory();
        const analytics = PerformanceUtils.getPerformanceAnalytics();
        const trends = PerformanceUtils.getPerformanceTrends();

        this.updateMetricsChart(history);
        this.updateIssuesChart(history);
        this.updateTrendsChart(trends);
    }

    private static updateMetricsChart(history: any[]): void {
        const chart = this.charts.get('metrics');
        if (!chart) return;

        const timestamps = history.map(entry => new Date(entry.timestamp).toLocaleTimeString());
        const fpsData = history.map(entry => entry.metrics.fps);
        const frameTimeData = history.map(entry => entry.metrics.frameTime);
        const memoryData = history.map(entry => entry.metrics.memoryUsage / (1024 * 1024));
        const cpuData = history.map(entry => entry.metrics.cpuUsage);

        chart.data.labels = timestamps;
        chart.data.datasets[0].data = fpsData;
        chart.data.datasets[1].data = frameTimeData;
        chart.data.datasets[2].data = memoryData;
        chart.data.datasets[3].data = cpuData;

        chart.update();
    }

    private static updateIssuesChart(history: any[]): void {
        const chart = this.charts.get('issues');
        if (!chart) return;

        const timestamps = history.map(entry => new Date(entry.timestamp).toLocaleTimeString());
        const warnings = history.map(entry => 
            entry.issues.filter((issue: any) => issue.severity === 'warning').length
        );
        const critical = history.map(entry => 
            entry.issues.filter((issue: any) => issue.severity === 'critical').length
        );

        chart.data.labels = timestamps;
        chart.data.datasets[0].data = warnings;
        chart.data.datasets[1].data = critical;

        chart.update();
    }

    private static updateTrendsChart(trends: any): void {
        const chart = this.charts.get('trends');
        if (!chart) return;

        const labels = ['FPS', 'Memory', 'CPU', 'Issues'];
        const data = [
            trends.fps.change,
            trends.memory.change,
            trends.cpu.change,
            trends.issues.change
        ];

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;

        chart.update();
    }

    static destroy(): void {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        this.container = null;
    }
} 