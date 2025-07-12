import { PerformanceUtils } from './performance-utils';
import { PerformanceHistory } from './performance-history';
import { PerformanceAnalytics } from './performance-analytics';

interface BenchmarkResult {
    id: string;
    timestamp: number;
    version: string;
    metrics: {
        fps: {
            average: number;
            min: number;
            max: number;
            percentile95: number;
        };
        frameTime: {
            average: number;
            min: number;
            max: number;
            percentile95: number;
        };
        memory: {
            average: number;
            min: number;
            max: number;
            peak: number;
        };
        cpu: {
            average: number;
            min: number;
            max: number;
            peak: number;
        };
    };
    issues: {
        warnings: number;
        critical: number;
    };
    duration: number;
    sampleSize: number;
}

interface BenchmarkComparison {
    baseline: BenchmarkResult;
    current: BenchmarkResult;
    improvements: {
        fps: number;
        frameTime: number;
        memory: number;
        cpu: number;
    };
    regressions: {
        fps: number;
        frameTime: number;
        memory: number;
        cpu: number;
    };
    significantChanges: string[];
}

export class PerformanceBenchmark {
    private static instance: PerformanceBenchmark;
    private benchmarks: Map<string, BenchmarkResult> = new Map();
    private isRunning: boolean = false;
    private startTime: number = 0;
    private metrics: any[] = [];
    private version: string = '1.0.0';

    private constructor() {}

    public static initialize(version: string = '1.0.0'): PerformanceBenchmark {
        if (!PerformanceBenchmark.instance) {
            PerformanceBenchmark.instance = new PerformanceBenchmark();
            PerformanceBenchmark.instance.version = version;
        }
        return PerformanceBenchmark.instance;
    }

    public static getInstance(): PerformanceBenchmark {
        if (!PerformanceBenchmark.instance) {
            throw new Error('PerformanceBenchmark must be initialized first');
        }
        return PerformanceBenchmark.instance;
    }

    public async runBenchmark(duration: number = 60000): Promise<BenchmarkResult> {
        if (this.isRunning) {
            throw new Error('Benchmark is already running');
        }

        this.isRunning = true;
        this.startTime = Date.now();
        this.metrics = [];

        // Start collecting metrics
        const interval = setInterval(() => {
            if (Date.now() - this.startTime >= duration) {
                clearInterval(interval);
                this.isRunning = false;
                return;
            }

            const metrics = PerformanceUtils.getMetrics();
            this.metrics.push(metrics);
        }, 1000);

        // Wait for benchmark duration
        await new Promise(resolve => setTimeout(resolve, duration));

        // Calculate results
        const result = this.calculateResults(duration);
        this.benchmarks.set(result.id, result);

        return result;
    }

    private calculateResults(duration: number): BenchmarkResult {
        const fpsValues = this.metrics.map(m => m.fps);
        const frameTimeValues = this.metrics.map(m => m.frameTime);
        const memoryValues = this.metrics.map(m => m.memoryUsage);
        const cpuValues = this.metrics.map(m => m.cpuUsage);

        const calculatePercentile95 = (values: number[]): number => {
            const sorted = [...values].sort((a, b) => a - b);
            const index = Math.ceil(sorted.length * 0.95) - 1;
            return sorted[index];
        };

        return {
            id: `benchmark_${Date.now()}`,
            timestamp: Date.now(),
            version: this.version,
            metrics: {
                fps: {
                    average: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
                    min: Math.min(...fpsValues),
                    max: Math.max(...fpsValues),
                    percentile95: calculatePercentile95(fpsValues)
                },
                frameTime: {
                    average: frameTimeValues.reduce((a, b) => a + b, 0) / frameTimeValues.length,
                    min: Math.min(...frameTimeValues),
                    max: Math.max(...frameTimeValues),
                    percentile95: calculatePercentile95(frameTimeValues)
                },
                memory: {
                    average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
                    min: Math.min(...memoryValues),
                    max: Math.max(...memoryValues),
                    peak: Math.max(...memoryValues)
                },
                cpu: {
                    average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
                    min: Math.min(...cpuValues),
                    max: Math.max(...cpuValues),
                    peak: Math.max(...cpuValues)
                }
            },
            issues: {
                warnings: this.metrics.reduce((sum, m) => sum + m.warnings, 0),
                critical: this.metrics.reduce((sum, m) => sum + m.critical, 0)
            },
            duration,
            sampleSize: this.metrics.length
        };
    }

    public compareWithBaseline(baselineId: string): BenchmarkComparison {
        const baseline = this.benchmarks.get(baselineId);
        if (!baseline) {
            throw new Error(`Baseline benchmark ${baselineId} not found`);
        }

        const current = this.benchmarks.get(Array.from(this.benchmarks.keys()).pop()!);
        if (!current) {
            throw new Error('No current benchmark available for comparison');
        }

        const improvements: any = {};
        const regressions: any = {};
        const significantChanges: string[] = [];

        // Compare metrics
        (Object.keys(current.metrics) as Array<keyof BenchmarkResult['metrics']>).forEach(metric => {
            const currentValue = current.metrics[metric].average;
            const baselineValue = baseline.metrics[metric].average;
            const change = ((currentValue - baselineValue) / baselineValue) * 100;

            if (change > 5) {
                improvements[metric] = change;
                significantChanges.push(`${metric} improved by ${change.toFixed(2)}%`);
            } else if (change < -5) {
                regressions[metric] = change;
                significantChanges.push(`${metric} regressed by ${Math.abs(change).toFixed(2)}%`);
            }
        });

        return {
            baseline,
            current,
            improvements,
            regressions,
            significantChanges
        };
    }

    public getBenchmark(id: string): BenchmarkResult | undefined {
        return this.benchmarks.get(id);
    }

    public getAllBenchmarks(): BenchmarkResult[] {
        return Array.from(this.benchmarks.values());
    }

    public clearBenchmarks(): void {
        this.benchmarks.clear();
    }

    public destroy(): void {
        this.clearBenchmarks();
        this.isRunning = false;
        this.metrics = [];
        (PerformanceBenchmark as any).instance = null;
    }
} 