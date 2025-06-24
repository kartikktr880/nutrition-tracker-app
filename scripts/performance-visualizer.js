/**
 * Performance Visualizer
 * Provides real-time visualization of performance metrics using HTML5 Canvas
 */

class PerformanceVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.colors = {
            fps: '#4CAF50',
            memory: '#2196F3',
            animations: '#FFC107',
            errors: '#F44336',
            background: '#1E1E1E',
            grid: '#333333',
            text: '#FFFFFF'
        };

        this.metrics = {
            fps: { history: [], max: 60 },
            memory: { history: [], max: 100 * 1024 * 1024 }, // 100MB
            animations: { history: [], max: 20 }
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
        performanceDashboard.addObserver((data) => {
            if (data.type === 'metricUpdate') {
                this.updateMetric(data.metric, data.value);
            }
        });
    }

    updateMetric(metric, value) {
        if (!this.metrics[metric]) return;
        
        this.metrics[metric].history.push(value);
        if (this.metrics[metric].history.length > 60) {
            this.metrics[metric].history.shift();
        }
        
        this.draw();
    }

    draw() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw metrics
        this.drawMetric('fps', 0, height / 3);
        this.drawMetric('memory', height / 3, height / 3);
        this.drawMetric('animations', (height / 3) * 2, height / 3);
        
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

    drawMetric(metric, y, height) {
        const { width } = this.canvas;
        const ctx = this.ctx;
        const data = this.metrics[metric];
        
        if (data.history.length === 0) return;
        
        ctx.strokeStyle = this.colors[metric];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const xStep = width / (data.history.length - 1);
        const yScale = height / data.max;
        
        data.history.forEach((value, index) => {
            const x = index * xStep;
            const y = y + height - (value * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    drawLabels() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;
        
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        // FPS label
        ctx.fillText('FPS', 10, 20);
        ctx.fillText(this.metrics.fps.history[this.metrics.fps.history.length - 1]?.toFixed(1) || '0', 50, 20);
        
        // Memory label
        ctx.fillText('Memory', 10, height / 3 + 20);
        const memoryMB = (this.metrics.memory.history[this.metrics.memory.history.length - 1] || 0) / 1024 / 1024;
        ctx.fillText(`${memoryMB.toFixed(1)}MB`, 70, height / 3 + 20);
        
        // Animations label
        ctx.fillText('Animations', 10, (height / 3) * 2 + 20);
        ctx.fillText(this.metrics.animations.history[this.metrics.animations.history.length - 1] || '0', 90, (height / 3) * 2 + 20);
    }
}

// Export the class
export default PerformanceVisualizer; 