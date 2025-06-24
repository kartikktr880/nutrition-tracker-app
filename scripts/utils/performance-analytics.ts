import { PerformanceHistory } from './performance-history';

interface PerformanceReport {
    summary: {
        averageFps: number;
        averageFrameTime: number;
        averageMemoryUsage: number;
        averageCpuUsage: number;
        totalIssues: number;
    };
    trends: {
        fps: { trend: string; change: number };
        memory: { trend: string; change: number };
        cpu: { trend: string; change: number };
    };
    issues: {
        warnings: { count: number; trend: string };
        critical: { count: number; trend: string };
    };
    recommendations: string[];
}

export class PerformanceAnalytics {
    private static readonly FPS_THRESHOLD = 30;
    private static readonly MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
    private static readonly CPU_THRESHOLD = 80;

    static generateReport(timeRange: { start: number; end: number }): PerformanceReport {
        const records = PerformanceHistory.getRecords(timeRange);
        if (records.length === 0) {
            return this.generateEmptyReport();
        }

        const averages = PerformanceHistory.getAverageMetrics(timeRange);
        const trends = PerformanceHistory.getPerformanceTrends(timeRange);

        return {
            summary: {
                averageFps: averages.fps || 0,
                averageFrameTime: averages.frameTime || 0,
                averageMemoryUsage: averages.memoryUsage || 0,
                averageCpuUsage: averages.cpuUsage || 0,
                totalIssues: (averages.issues?.warnings || 0) + (averages.issues?.critical || 0)
            },
            trends: {
                fps: trends.fps,
                memory: trends.memory,
                cpu: trends.cpu
            },
            issues: this.analyzeIssues(records),
            recommendations: this.generateRecommendations(averages, trends)
        };
    }

    private static generateEmptyReport(): PerformanceReport {
        return {
            summary: {
                averageFps: 0,
                averageFrameTime: 0,
                averageMemoryUsage: 0,
                averageCpuUsage: 0,
                totalIssues: 0
            },
            trends: {
                fps: { trend: 'stable', change: 0 },
                memory: { trend: 'stable', change: 0 },
                cpu: { trend: 'stable', change: 0 }
            },
            issues: {
                warnings: { count: 0, trend: 'stable' },
                critical: { count: 0, trend: 'stable' }
            },
            recommendations: ['No performance data available for analysis']
        };
    }

    private static analyzeIssues(records: any[]): { warnings: { count: number; trend: string }; critical: { count: number; trend: string } } {
        const firstHalf = records.slice(0, Math.floor(records.length / 2));
        const secondHalf = records.slice(Math.floor(records.length / 2));

        const firstWarnings = firstHalf.reduce((sum, r) => sum + r.issues.warnings, 0);
        const secondWarnings = secondHalf.reduce((sum, r) => sum + r.issues.warnings, 0);
        const firstCritical = firstHalf.reduce((sum, r) => sum + r.issues.critical, 0);
        const secondCritical = secondHalf.reduce((sum, r) => sum + r.issues.critical, 0);

        return {
            warnings: {
                count: secondWarnings,
                trend: secondWarnings > firstWarnings ? 'increasing' : secondWarnings < firstWarnings ? 'decreasing' : 'stable'
            },
            critical: {
                count: secondCritical,
                trend: secondCritical > firstCritical ? 'increasing' : secondCritical < firstCritical ? 'decreasing' : 'stable'
            }
        };
    }

    private static generateRecommendations(averages: any, trends: any): string[] {
        const recommendations: string[] = [];

        // FPS recommendations
        if (averages.fps < this.FPS_THRESHOLD) {
            recommendations.push('Consider optimizing rendering performance to improve FPS');
        }
        if (trends.fps.trend === 'degrading') {
            recommendations.push('Investigate recent changes that may be causing FPS degradation');
        }

        // Memory recommendations
        if (averages.memoryUsage > this.MEMORY_THRESHOLD) {
            recommendations.push('Review memory usage patterns and implement memory optimization strategies');
        }
        if (trends.memory.trend === 'increasing') {
            recommendations.push('Monitor for potential memory leaks in recent changes');
        }

        // CPU recommendations
        if (averages.cpuUsage > this.CPU_THRESHOLD) {
            recommendations.push('Optimize CPU-intensive operations to reduce processor load');
        }
        if (trends.cpu.trend === 'increasing') {
            recommendations.push('Investigate processes causing increased CPU usage');
        }

        // Add positive feedback
        if (trends.fps.trend === 'improving') {
            recommendations.push('Recent performance optimizations are showing positive results');
        }
        if (trends.memory.trend === 'decreasing') {
            recommendations.push('Memory usage is trending in a positive direction');
        }

        return recommendations;
    }
} 