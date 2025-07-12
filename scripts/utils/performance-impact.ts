import { PerformanceHistory } from './performance-history';
import { PerformanceAnalytics } from './performance-analytics';
import { PerformanceUtils } from './performance-utils';

interface ImpactMetrics {
    fps: number;
    memory: number;
    cpu: number;
    timestamp: number;
}

interface ImpactAnalysis {
    before: ImpactMetrics;
    after: ImpactMetrics;
    improvement: {
        fps: number;
        memory: number;
        cpu: number;
    };
    percentageChange: {
        fps: number;
        memory: number;
        cpu: number;
    };
}

export class PerformanceImpact {
    private static instance: PerformanceImpact | undefined;
    private impactHistory: Map<string, ImpactAnalysis> = new Map();
    private baselineMetrics: Map<string, ImpactMetrics> = new Map();

    private constructor() {}

    static initialize(): PerformanceImpact {
        if (!PerformanceImpact.instance) {
            PerformanceImpact.instance = new PerformanceImpact();
        }
        return PerformanceImpact.instance;
    }

    static getInstance(): PerformanceImpact {
        if (!PerformanceImpact.instance) {
            throw new Error('PerformanceImpact must be initialized first');
        }
        return PerformanceImpact.instance;
    }

    setBaseline(optimizationId: string): void {
        const currentMetrics = PerformanceUtils.getMetrics();
        if (!currentMetrics) {
            throw new Error('No current metrics available for baseline');
        }

        this.baselineMetrics.set(optimizationId, {
            fps: currentMetrics.fps,
            memory: currentMetrics.memoryUsage,
            cpu: currentMetrics.cpuUsage,
            timestamp: Date.now()
        });
    }

    calculateImpact(optimizationId: string): ImpactAnalysis {
        const baseline = this.baselineMetrics.get(optimizationId);
        if (!baseline) {
            throw new Error(`No baseline metrics found for optimization ${optimizationId}`);
        }

        const currentMetrics = PerformanceUtils.getMetrics();
        if (!currentMetrics) {
            throw new Error('No current metrics available for impact calculation');
        }

        const after: ImpactMetrics = {
            fps: currentMetrics.fps,
            memory: currentMetrics.memoryUsage,
            cpu: currentMetrics.cpuUsage,
            timestamp: Date.now()
        };

        const improvement = {
            fps: after.fps - baseline.fps,
            memory: baseline.memory - after.memory,
            cpu: baseline.cpu - after.cpu
        };

        const percentageChange = {
            fps: (improvement.fps / baseline.fps) * 100,
            memory: (improvement.memory / baseline.memory) * 100,
            cpu: (improvement.cpu / baseline.cpu) * 100
        };

        const analysis: ImpactAnalysis = {
            before: baseline,
            after,
            improvement,
            percentageChange
        };

        this.impactHistory.set(optimizationId, analysis);
        return analysis;
    }

    getImpactHistory(): Map<string, ImpactAnalysis> {
        return new Map(this.impactHistory);
    }

    getOptimizationImpact(optimizationId: string): ImpactAnalysis | undefined {
        return this.impactHistory.get(optimizationId);
    }

    generateImpactReport(timeRange: { start: number; end: number }): {
        totalImprovements: {
            fps: number;
            memory: number;
            cpu: number;
        };
        averageImprovements: {
            fps: number;
            memory: number;
            cpu: number;
        };
        optimizationCount: number;
        significantImprovements: string[];
    } {
        const relevantImpacts = Array.from(this.impactHistory.values())
            .filter(impact => impact.after.timestamp >= timeRange.start && impact.after.timestamp <= timeRange.end);

        if (relevantImpacts.length === 0) {
            return {
                totalImprovements: { fps: 0, memory: 0, cpu: 0 },
                averageImprovements: { fps: 0, memory: 0, cpu: 0 },
                optimizationCount: 0,
                significantImprovements: []
            };
        }

        const totalImprovements = relevantImpacts.reduce((acc, impact) => ({
            fps: acc.fps + impact.improvement.fps,
            memory: acc.memory + impact.improvement.memory,
            cpu: acc.cpu + impact.improvement.cpu
        }), { fps: 0, memory: 0, cpu: 0 });

        const averageImprovements = {
            fps: totalImprovements.fps / relevantImpacts.length,
            memory: totalImprovements.memory / relevantImpacts.length,
            cpu: totalImprovements.cpu / relevantImpacts.length
        };

        const significantImprovements = relevantImpacts
            .filter(impact => 
                impact.percentageChange.fps > 10 ||
                impact.percentageChange.memory > 10 ||
                impact.percentageChange.cpu > 10
            )
            .map(impact => {
                const improvements = [];
                if (impact.percentageChange.fps > 10) {
                    improvements.push(`FPS improved by ${impact.percentageChange.fps.toFixed(1)}%`);
                }
                if (impact.percentageChange.memory > 10) {
                    improvements.push(`Memory usage reduced by ${impact.percentageChange.memory.toFixed(1)}%`);
                }
                if (impact.percentageChange.cpu > 10) {
                    improvements.push(`CPU usage reduced by ${impact.percentageChange.cpu.toFixed(1)}%`);
                }
                return improvements.join(', ');
            });

        return {
            totalImprovements,
            averageImprovements,
            optimizationCount: relevantImpacts.length,
            significantImprovements
        };
    }

    static destroy(): void {
        PerformanceImpact.instance = undefined;
    }
} 