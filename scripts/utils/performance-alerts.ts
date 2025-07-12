import { logError, logWarn, logInfo, logDebug } from '../../utils/logger';
import { PerformanceUtils } from './performance-utils';

export interface AlertThreshold {
    fps: number;
    frameTime: number;
    memory: number;
    cpu: number;
}

export interface AlertCallback {
    (metric: string, value: number, threshold: number): void;
}

export class PerformanceAlerts {
    private static readonly DEFAULT_THRESHOLDS: AlertThreshold = {
        fps: 30,           // Warning if FPS drops below 30
        frameTime: 33.33,  // Warning if frame time exceeds 33.33ms (30fps)
        memory: 100,       // Warning if memory exceeds 100MB
        cpu: 80           // Warning if CPU usage exceeds 80%
    };

    private static thresholds: AlertThreshold = { ...this.DEFAULT_THRESHOLDS };
    private static callbacks: AlertCallback[] = [];
    private static isMonitoring: boolean = false;
    private static checkInterval: number = 1000; // Check every second

    static initialize(customThresholds?: Partial<AlertThreshold>): void {
        if (customThresholds) {
            this.thresholds = { ...this.DEFAULT_THRESHOLDS, ...customThresholds };
        }

        if (!this.isMonitoring) {
            this.startMonitoring();
        }
    }

    static addCallback(callback: AlertCallback): void {
        if (!this.callbacks.includes(callback)) {
            this.callbacks.push(callback);
        }
    }

    static removeCallback(callback: AlertCallback): void {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    static setThresholds(newThresholds: Partial<AlertThreshold>): void {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    static getThresholds(): AlertThreshold {
        return { ...this.thresholds };
    }

    static resetThresholds(): void {
        this.thresholds = { ...this.DEFAULT_THRESHOLDS };
    }

    static startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        setInterval(() => this.checkMetrics(), this.checkInterval);
    }

    static stopMonitoring(): void {
        this.isMonitoring = false;
    }

    static checkMetrics(): void {
        const metrics = PerformanceUtils.getMetrics();
        if (!metrics) return;

        // Check FPS
        if (metrics.fps < this.thresholds.fps) {
            this.notifyCallbacks('fps', metrics.fps, this.thresholds.fps);
        }

        // Check Frame Time
        if (metrics.frameTime > this.thresholds.frameTime) {
            this.notifyCallbacks('frameTime', metrics.frameTime, this.thresholds.frameTime);
        }

        // Check Memory (convert to MB)
        const memoryMB = metrics.memoryUsage / (1024 * 1024);
        if (memoryMB > this.thresholds.memory) {
            this.notifyCallbacks('memory', memoryMB, this.thresholds.memory);
        }

        // Check CPU
        if (metrics.cpuUsage > this.thresholds.cpu) {
            this.notifyCallbacks('cpu', metrics.cpuUsage, this.thresholds.cpu);
        }
    }

    private static notifyCallbacks(metric: string, value: number, threshold: number): void {
        this.callbacks.forEach(callback => {
            try {
                callback(metric, value, threshold);
            } catch (error) {
                logError(`Error in performance alert callback: ${error}`);
            }
        });
    }

    static destroy(): void {
        this.stopMonitoring();
        this.callbacks = [];
        this.thresholds = { ...this.DEFAULT_THRESHOLDS };
    }
} 