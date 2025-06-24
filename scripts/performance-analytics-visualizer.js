/**
 * Performance Analytics Visualizer
 * Advanced visualization of performance analytics data
 */

class PerformanceAnalyticsVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.colors = {
            fps: { line: '#4CAF50', highlight: 'rgba(76, 175, 80, 0.2)', prediction: 'rgba(76, 175, 80, 0.5)' },
            memory: { line: '#2196F3', highlight: 'rgba(33, 150, 243, 0.2)', prediction: 'rgba(33, 150, 243, 0.5)' },
            animations: { line: '#FFC107', highlight: 'rgba(255, 193, 7, 0.2)', prediction: 'rgba(255, 193, 7, 0.5)' },
            timing: { line: '#9C27B0', highlight: 'rgba(156, 39, 176, 0.2)', prediction: 'rgba(156, 39, 176, 0.5)' },
            anomaly: { line: '#F44336', highlight: 'rgba(244, 67, 54, 0.2)' },
            pattern: { line: '#FF9800', highlight: 'rgba(255, 152, 0, 0.2)' },
            background: '#1E1E1E',
            grid: '#2D2D2D',
            text: '#B0B0B0'
        };

        this.metrics = {
            fps: { history: [], predictions: [], correlations: {} },
            memory: { history: [], predictions: [], correlations: {} },
            animations: { history: [], predictions: [], correlations: {} },
            timing: { history: [], predictions: [], correlations: {} }
        };

        this.patternData = {
            fps: [],
            memory: [],
            animations: [],
            timing: []
        };

        this.anomalyData = {
            fps: [],
            memory: [],
            animations: [],
            timing: []
        };

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        this.resize();
        this.setupEventListeners();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        this.ctx.scale(dpr, dpr);
        
        this.draw();
    }

    setupEventListeners() {
        performanceAnalytics.addObserver((data) => {
            if (data.type === 'analyticsUpdate') {
                this.updateMetric(data.metric, data.data);
                this.draw();
            } else if (data.type === 'patternDetected') {
                this.updatePatternData(data.metric, data.pattern);
                this.draw();
            } else if (data.type === 'anomalyDetected') {
                this.updateAnomalyData(data.metric, data.anomalies);
                this.draw();
            }
        });
    }

    updateMetric(metric, data) {
        if (!this.metrics[metric]) return;
        
        this.metrics[metric] = {
            history: data.history,
            predictions: data.predictions,
            correlations: data.correlations
        };
    }

    updatePatternData(metric, pattern) {
        if (!this.patternData[metric]) return;
        
        this.patternData[metric].push({
            pattern: pattern.sequence,
            confidence: pattern.confidence,
            type: pattern.type,
            timestamp: Date.now()
        });

        // Keep only recent patterns
        this.patternData[metric] = this.patternData[metric].slice(-5);
    }

    updateAnomalyData(metric, anomalies) {
        if (!this.anomalyData[metric]) return;
        
        this.anomalyData[metric].push(...anomalies.map(anomaly => ({
            value: anomaly.value,
            zScore: anomaly.zScore,
            timestamp: Date.now()
        })));

        // Keep only recent anomalies
        this.anomalyData[metric] = this.anomalyData[metric].slice(-10);
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid();

        // Draw metrics
        Object.entries(this.metrics).forEach(([metric, data]) => {
            this.drawMetric(metric, data);
            this.drawPatterns(metric);
            this.drawAnomalies(metric);
        });

        // Draw labels
        this.drawLabels();
    }

    drawGrid() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;
        
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < width; x += width / 10) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < height; y += height / 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    drawMetric(metric, data) {
        const { width } = this.canvas;
        const ctx = this.ctx;
        
        if (!data.history.length) return;
        
        // Draw history
        ctx.strokeStyle = this.colors[metric].line;
        ctx.lineWidth = 2;
        this.drawLine(data.history, 0, width);
        
        // Draw predictions
        if (data.predictions && data.predictions.length > 0) {
            this.drawPredictions(metric, data.predictions);
        }

        // Draw patterns if available
        this.drawPatterns(metric);
    }

    drawLine(data, y, width) {
        const ctx = this.ctx;
        
        if (data.length === 0) return;
        
        const xStep = width / (data.length - 1);
        const yScale = width / this.getMaxValue(data);
        
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = index * xStep;
            const yPos = y + width - (point.value * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, yPos);
            } else {
                ctx.lineTo(x, yPos);
            }
        });
        
        ctx.stroke();
    }

    drawPatterns(metric) {
        const patterns = this.patternData[metric];
        if (!patterns || patterns.length === 0) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        patterns.forEach(pattern => {
            const color = this.colors.pattern;
            
            // Draw pattern highlight
            ctx.fillStyle = color.highlight;
            const xStep = width / (pattern.pattern.length - 1);
            const yScale = height / this.getMaxValue(metric);
            
            ctx.beginPath();
            pattern.pattern.forEach((value, i) => {
                const x = i * xStep;
                const y = height - (value * yScale);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.strokeStyle = color.line;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw pattern confidence indicator
            const confidence = pattern.confidence;
            ctx.fillStyle = `rgba(255, 152, 0, ${confidence})`;
            ctx.fill();
        });
    }

    drawAnomalies(metric) {
        const anomalies = this.anomalyData[metric];
        if (!anomalies || anomalies.length === 0) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const color = this.colors.anomaly;

        anomalies.forEach(anomaly => {
            const x = (anomaly.timestamp % width);
            const y = height - (anomaly.value * height / this.getMaxValue(metric));

            // Draw anomaly marker
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color.line;
            ctx.fill();

            // Draw anomaly highlight
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = color.highlight;
            ctx.fill();

            // Draw z-score indicator
            ctx.fillStyle = this.colors.text;
            ctx.font = '10px Arial';
            ctx.fillText(`z: ${anomaly.zScore.toFixed(1)}`, x + 10, y - 10);
        });
    }

    drawPredictions(metric, predictions) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const color = this.colors[metric];

        const xStep = width / (predictions.length - 1);
        const yScale = height / this.getMaxValue(metric);

        ctx.beginPath();
        predictions.forEach((prediction, i) => {
            const x = i * xStep;
            const y = height - (prediction.value * yScale);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = color.prediction;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawLabels() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        Object.entries(this.metrics).forEach(([metric, data]) => {
            const color = this.colors[metric];
            const value = data.history[data.history.length - 1]?.value;
            const patterns = this.patternData[metric];
            const anomalies = this.anomalyData[metric];

            // Draw current value
            ctx.fillStyle = color.line;
            ctx.font = '12px Arial';
            ctx.fillText(`${metric.toUpperCase()}: ${value?.toFixed(1)}`, 10, 20 + Object.keys(this.metrics).indexOf(metric) * 20);

            // Draw pattern info
            if (patterns && patterns.length > 0) {
                const latestPattern = patterns[patterns.length - 1];
                ctx.fillStyle = this.colors.pattern.line;
                ctx.fillText(`Pattern: ${latestPattern.type} (${(latestPattern.confidence * 100).toFixed(0)}% conf)`, 10, 40 + Object.keys(this.metrics).indexOf(metric) * 20);
            }

            // Draw anomaly info
            if (anomalies && anomalies.length > 0) {
                const latestAnomaly = anomalies[anomalies.length - 1];
                ctx.fillStyle = this.colors.anomaly.line;
                ctx.fillText(`Anomaly: z=${latestAnomaly.zScore.toFixed(1)}`, 10, 60 + Object.keys(this.metrics).indexOf(metric) * 20);
            }
        });
    }

    getMaxValue(data) {
        if (!data.length) return 1;
        return Math.max(
            ...data.map(point => point.value),
            ...this.metrics[data[0].metric]?.predictions.map(p => p.value) || []
        );
    }
}

// Export the class
export default PerformanceAnalyticsVisualizer; 