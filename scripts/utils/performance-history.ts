import { PerformanceUtils } from './performance-utils';

interface PerformanceRecord {
    timestamp: number;
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
    issues: {
        warnings: number;
        critical: number;
    };
}

export class PerformanceHistory {
    private static readonly MAX_RECORDS = 1000; // Store last 1000 records
    private static readonly CLEANUP_INTERVAL = 3600000; // Clean up every hour
    private static records: PerformanceRecord[] = [];
    private static cleanupTimer: number | null = null;

    static initialize(): void {
        if (!this.cleanupTimer) {
            this.cleanupTimer = window.setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
        }
    }

    static addRecord(): void {
        const metrics = PerformanceUtils.getMetrics();
        if (!metrics) return;

        const record: PerformanceRecord = {
            timestamp: Date.now(),
            fps: metrics.fps,
            frameTime: metrics.frameTime,
            memoryUsage: metrics.memoryUsage,
            cpuUsage: metrics.cpuUsage,
            issues: {
                warnings: 0,
                critical: 0
            }
        };

        this.records.push(record);
        this.cleanup();
    }

    static getRecords(timeRange: { start: number; end: number }): PerformanceRecord[] {
        return this.records.filter(record => 
            record.timestamp >= timeRange.start && 
            record.timestamp <= timeRange.end
        );
    }

    static getAverageMetrics(timeRange: { start: number; end: number }): Partial<PerformanceRecord> {
        const records = this.getRecords(timeRange);
        if (records.length === 0) return {};

        const sum = records.reduce((acc, record) => ({
            fps: acc.fps + record.fps,
            frameTime: acc.frameTime + record.frameTime,
            memoryUsage: acc.memoryUsage + record.memoryUsage,
            cpuUsage: acc.cpuUsage + record.cpuUsage,
            issues: {
                warnings: acc.issues.warnings + record.issues.warnings,
                critical: acc.issues.critical + record.issues.critical
            }
        }), {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            issues: { warnings: 0, critical: 0 }
        });

        const count = records.length;
        return {
            fps: sum.fps / count,
            frameTime: sum.frameTime / count,
            memoryUsage: sum.memoryUsage / count,
            cpuUsage: sum.cpuUsage / count,
            issues: {
                warnings: sum.issues.warnings / count,
                critical: sum.issues.critical / count
            }
        };
    }

    static getPerformanceTrends(timeRange: { start: number; end: number }): {
        fps: { trend: 'improving' | 'degrading' | 'stable'; change: number };
        memory: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
        cpu: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
    } {
        const records = this.getRecords(timeRange);
        if (records.length < 2) return {
            fps: { trend: 'stable', change: 0 },
            memory: { trend: 'stable', change: 0 },
            cpu: { trend: 'stable', change: 0 }
        };

        const first = records[0];
        const last = records[records.length - 1];

        const fpsChange = last.fps - first.fps;
        const memoryChange = last.memoryUsage - first.memoryUsage;
        const cpuChange = last.cpuUsage - first.cpuUsage;

        return {
            fps: {
                trend: fpsChange > 1 ? 'improving' : fpsChange < -1 ? 'degrading' : 'stable',
                change: fpsChange
            },
            memory: {
                trend: memoryChange > 1024 * 1024 ? 'increasing' : memoryChange < -1024 * 1024 ? 'decreasing' : 'stable',
                change: memoryChange
            },
            cpu: {
                trend: cpuChange > 5 ? 'increasing' : cpuChange < -5 ? 'decreasing' : 'stable',
                change: cpuChange
            }
        };
    }

    private static cleanup(): void {
        if (this.records.length > this.MAX_RECORDS) {
            this.records = this.records.slice(-this.MAX_RECORDS);
        }
    }

    static destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.records = [];
    }
} 