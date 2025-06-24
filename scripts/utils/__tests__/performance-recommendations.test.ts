import { PerformanceRecommendations } from '../performance-recommendations';
import { PerformanceAnalytics } from '../performance-analytics';

jest.mock('../performance-analytics');

describe('PerformanceRecommendations', () => {
    let recommendations: PerformanceRecommendations;

    beforeEach(() => {
        jest.clearAllMocks();
        recommendations = PerformanceRecommendations.initialize();
    });

    afterEach(() => {
        recommendations.destroy();
    });

    it('should initialize as a singleton', () => {
        const instance1 = PerformanceRecommendations.initialize();
        const instance2 = PerformanceRecommendations.initialize();
        expect(instance1).toBe(instance2);
    });

    it('should throw error when getting instance before initialization', () => {
        recommendations.destroy();
        expect(() => PerformanceRecommendations.getInstance()).toThrow('PerformanceRecommendations must be initialized first');
    });

    it('should generate recommendations based on performance data', () => {
        (PerformanceAnalytics.generateReport as jest.Mock).mockReturnValue({
            summary: {
                averageFps: 25,
                averageMemoryUsage: 150 * 1024 * 1024,
                averageCpuUsage: 85
            }
        });

        const result = recommendations.generateRecommendations({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.summary.total).toBeGreaterThan(0);
        expect(result.recommendations[0].impact).toBeDefined();
        expect(result.recommendations[0].implementationSteps).toBeDefined();
    });

    it('should mark recommendations as implemented', () => {
        (PerformanceAnalytics.generateReport as jest.Mock).mockReturnValue({
            summary: {
                averageFps: 25,
                averageMemoryUsage: 150 * 1024 * 1024,
                averageCpuUsage: 85
            }
        });

        const result = recommendations.generateRecommendations({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        const recommendationId = result.recommendations[0].id;
        recommendations.markAsImplemented(recommendationId, {
            fps: 10,
            memory: 20 * 1024 * 1024,
            cpu: 5
        });

        const updatedResult = recommendations.getRecommendationResult();
        const updatedRecommendation = updatedResult.recommendations.find(r => r.id === recommendationId);

        expect(updatedRecommendation?.status).toBe('implemented');
        expect(updatedRecommendation?.result).toBeDefined();
        expect(updatedRecommendation?.result?.performanceImprovement).toBeDefined();
    });

    it('should mark recommendations as rejected', () => {
        (PerformanceAnalytics.generateReport as jest.Mock).mockReturnValue({
            summary: {
                averageFps: 25,
                averageMemoryUsage: 150 * 1024 * 1024,
                averageCpuUsage: 85
            }
        });

        const result = recommendations.generateRecommendations({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        const recommendationId = result.recommendations[0].id;
        recommendations.markAsRejected(recommendationId);

        const updatedResult = recommendations.getRecommendationResult();
        const updatedRecommendation = updatedResult.recommendations.find(r => r.id === recommendationId);

        expect(updatedRecommendation?.status).toBe('rejected');
    });

    it('should calculate average impact correctly', () => {
        (PerformanceAnalytics.generateReport as jest.Mock).mockReturnValue({
            summary: {
                averageFps: 25,
                averageMemoryUsage: 150 * 1024 * 1024,
                averageCpuUsage: 85
            }
        });

        const result = recommendations.generateRecommendations({
            start: Date.now() - 3600000,
            end: Date.now()
        });

        expect(result.summary.averageImpact).toBeGreaterThan(0);
        expect(result.summary.averageImpact).toBeLessThanOrEqual(3);
    });

    it('should limit maximum number of recommendations', () => {
        (PerformanceAnalytics.generateReport as jest.Mock).mockReturnValue({
            summary: {
                averageFps: 25,
                averageMemoryUsage: 150 * 1024 * 1024,
                averageCpuUsage: 85
            }
        });

        // Generate more recommendations than the maximum limit
        for (let i = 0; i < 150; i++) {
            recommendations.generateRecommendations({
                start: Date.now() - 3600000,
                end: Date.now()
            });
        }

        const result = recommendations.getRecommendationResult();
        expect(result.summary.total).toBeLessThanOrEqual(100);
    });
}); 