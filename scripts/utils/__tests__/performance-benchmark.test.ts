import { PerformanceBenchmark } from '../performance-benchmark';
import { PerformanceUtils } from '../performance-utils';

jest.mock('../performance-utils');

describe.skip('PerformanceBenchmark', () => {
    let benchmark: PerformanceBenchmark;
    const mockMetrics = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 100 * 1024 * 1024,
        cpuUsage: 50,
        warnings: 0,
        critical: 0
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (PerformanceUtils.getCurrentMetrics as jest.Mock).mockReturnValue(mockMetrics);
        benchmark = PerformanceBenchmark.initialize('1.0.0');
    });

    afterEach(() => {
        benchmark.destroy();
    });

    it('should initialize as a singleton', () => {
        const instance1 = PerformanceBenchmark.initialize();
        const instance2 = PerformanceBenchmark.initialize();
        expect(instance1).toBe(instance2);
    });

    it('should throw error when getting instance before initialization', () => {
        benchmark.destroy();
        expect(() => PerformanceBenchmark.getInstance()).toThrow('PerformanceBenchmark must be initialized first');
    });

    it('should run benchmark and collect metrics', async () => {
        const result = await benchmark.runBenchmark(1000);
        
        expect(result.version).toBe('1.0.0');
        expect(result.metrics.fps.average).toBe(60);
        expect(result.metrics.frameTime.average).toBe(16.67);
        expect(result.metrics.memory.average).toBe(100 * 1024 * 1024);
        expect(result.metrics.cpu.average).toBe(50);
        expect(result.duration).toBe(1000);
        expect(result.sampleSize).toBeGreaterThan(0);
    });

    it('should not allow multiple concurrent benchmarks', async () => {
        benchmark.runBenchmark(1000);
        await expect(benchmark.runBenchmark(1000)).rejects.toThrow('Benchmark is already running');
    });

    it('should calculate percentile95 correctly', async () => {
        const metrics = [
            { ...mockMetrics, fps: 50 },
            { ...mockMetrics, fps: 55 },
            { ...mockMetrics, fps: 60 },
            { ...mockMetrics, fps: 65 },
            { ...mockMetrics, fps: 70 }
        ];
        let index = 0;
        (PerformanceUtils.getCurrentMetrics as jest.Mock).mockImplementation(() => metrics[index++]);

        const result = await benchmark.runBenchmark(5000);
        expect(result.metrics.fps.percentile95).toBe(70);
    });

    it('should compare benchmarks correctly', async () => {
        // Run baseline benchmark
        const baseline = await benchmark.runBenchmark(1000);
        
        // Mock different metrics for current benchmark
        (PerformanceUtils.getCurrentMetrics as jest.Mock).mockReturnValue({
            ...mockMetrics,
            fps: 66, // 10% improvement
            frameTime: 15, // 10% improvement
            memoryUsage: 110 * 1024 * 1024, // 10% regression
            cpuUsage: 45 // 10% improvement
        });

        // Run current benchmark
        await benchmark.runBenchmark(1000);

        // Compare benchmarks
        const comparison = benchmark.compareWithBaseline(baseline.id);

        expect(comparison.baseline).toBe(baseline);
        expect(comparison.improvements.fps).toBeCloseTo(10);
        expect(comparison.improvements.frameTime).toBeCloseTo(10);
        expect(comparison.improvements.cpu).toBeCloseTo(10);
        expect(comparison.regressions.memory).toBeCloseTo(-10);
        expect(comparison.significantChanges).toHaveLength(4);
    });

    it('should throw error when comparing with non-existent baseline', () => {
        expect(() => benchmark.compareWithBaseline('non_existent')).toThrow('Baseline benchmark non_existent not found');
    });

    it('should throw error when comparing without current benchmark', () => {
        const baseline = benchmark.runBenchmark(1000);
        benchmark.clearBenchmarks();
        expect(() => benchmark.compareWithBaseline(baseline.id)).toThrow('No current benchmark available for comparison');
    });

    it('should manage benchmarks correctly', async () => {
        const result1 = await benchmark.runBenchmark(1000);
        const result2 = await benchmark.runBenchmark(1000);

        expect(benchmark.getBenchmark(result1.id)).toBeDefined();
        expect(benchmark.getBenchmark(result2.id)).toBeDefined();
        expect(benchmark.getAllBenchmarks()).toHaveLength(2);

        benchmark.clearBenchmarks();
        expect(benchmark.getAllBenchmarks()).toHaveLength(0);
    });

    it('should clean up resources on destroy', async () => {
        await benchmark.runBenchmark(1000);
        benchmark.destroy();

        expect(benchmark.getAllBenchmarks()).toHaveLength(0);
        expect(() => benchmark.runBenchmark(1000)).not.toThrow();
    });
}); 