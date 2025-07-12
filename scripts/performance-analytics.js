import { logError, logWarn, logInfo, logDebug } from '../utils/logger';

/**
 * Performance Analytics
 * Advanced analytics and optimization for performance monitoring
 */

class WaveletTransform {
    constructor() {
        this.scales = [1, 2, 4, 8, 16]; // Different scales for analysis
        this.threshold = 0.1; // Threshold for significant coefficients
    }

    /**
     * Placeholder for future DOM-dependent initialization.
     */
    init() {
        // No window/document code needed yet
    }

    // Mexican hat wavelet function
    mexicanHat(x) {
        return (1 - x * x) * Math.exp(-x * x / 2);
    }

    // Perform continuous wavelet transform
    transform(signal) {
        const n = signal.length;
        const coefficients = new Array(this.scales.length).fill(0).map(() => new Array(n).fill(0));

        for (let scaleIndex = 0; scaleIndex < this.scales.length; scaleIndex++) {
            const scale = this.scales[scaleIndex];
            for (let t = 0; t < n; t++) {
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    const x = (i - t) / scale;
                    sum += signal[i] * this.mexicanHat(x) / Math.sqrt(scale);
                }
                coefficients[scaleIndex][t] = sum;
            }
        }

        return coefficients;
    }

    // Detect significant features in the signal
    detectFeatures(coefficients) {
        const features = [];
        const n = coefficients[0].length;

        for (let t = 0; t < n; t++) {
            let maxCoeff = 0;
            let maxScale = 0;

            for (let scaleIndex = 0; scaleIndex < this.scales.length; scaleIndex++) {
                const coeff = Math.abs(coefficients[scaleIndex][t]);
                if (coeff > maxCoeff) {
                    maxCoeff = coeff;
                    maxScale = this.scales[scaleIndex];
                }
            }

            if (maxCoeff > this.threshold) {
                features.push({
                    time: t,
                    scale: maxScale,
                    magnitude: maxCoeff
                });
            }
        }

        return features;
    }

    // Analyze patterns in the signal
    analyzePatterns(signal) {
        const coefficients = this.transform(signal);
        const features = this.detectFeatures(coefficients);
        
        // Group features by scale to identify patterns
        const patterns = this.groupFeaturesByScale(features);
        
        return {
            features,
            patterns,
            coefficients
        };
    }

    // Group features by scale to identify patterns
    groupFeaturesByScale(features) {
        const patterns = {};
        
        features.forEach(feature => {
            if (!patterns[feature.scale]) {
                patterns[feature.scale] = [];
            }
            patterns[feature.scale].push(feature);
        });

        // Analyze each scale group for patterns
        Object.keys(patterns).forEach(scale => {
            const group = patterns[scale];
            patterns[scale] = this.analyzeScaleGroup(group);
        });

        return patterns;
    }

    // Analyze features within a scale group
    analyzeScaleGroup(features) {
        if (features.length < 2) return features;

        // Sort by time
        features.sort((a, b) => a.time - b.time);

        // Calculate time differences between consecutive features
        const intervals = [];
        for (let i = 1; i < features.length; i++) {
            intervals.push(features[i].time - features[i-1].time);
        }

        // Calculate average interval
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Group features with similar intervals
        const groups = [];
        let currentGroup = [features[0]];

        for (let i = 1; i < features.length; i++) {
            const interval = features[i].time - features[i-1].time;
            if (Math.abs(interval - avgInterval) < avgInterval * 0.2) {
                currentGroup.push(features[i]);
            } else {
                if (currentGroup.length > 1) {
                    groups.push(currentGroup);
                }
                currentGroup = [features[i]];
            }
        }

        if (currentGroup.length > 1) {
            groups.push(currentGroup);
        }

        return groups;
    }
}

class PatternCorrelationAnalyzer {
    constructor() {
        this.correlationWindow = 60; // 1 minute window for correlation analysis
        this.minCorrelationStrength = 0.6;
        this.maxLag = 30; // Maximum time lag to consider (30 seconds)
        this.correlationCache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache timeout
        this.maxCacheSize = 1000; // Maximum number of cache entries
        this.patternThreshold = 0.7; // Threshold for pattern detection
        this.minPatternLength = 5; // Minimum length for pattern detection
        this.maxPatternLength = 30; // Maximum length for pattern detection
        this.cleanupInterval = 300000; // 5 minutes
        this.lastCleanup = Date.now();
        this.cleanupTimer = null;
        this.startCleanupTimer();
        this.patternConfig = {
            windowSize: 60,
            minPatternLength: 5,
            similarityThreshold: 0.85,
            maxPatterns: 10,
            anomalyThreshold: 2.0,
            predictionConfidence: 0.8,
            varianceThreshold: 0.1,
            stabilityThreshold: 0.05,
            adaptiveThresholds: {
                enabled: true,
                minConfidence: 0.6,
                maxConfidence: 0.95,
                confidenceStep: 0.05,
                stabilityWeight: 0.4,
                varianceWeight: 0.3,
                lengthWeight: 0.3
            }
        };
    }

    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(() => this.cleanupCache(), this.cleanupInterval);
    }

    cleanupCache() {
        try {
            const currentTime = Date.now();
            const entries = Array.from(this.correlationCache.entries());
            
            // Sort by timestamp (newest first)
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            // Keep only the most recent entries up to maxCacheSize
            const validEntries = entries
                .filter(([_, value]) => currentTime - value.timestamp <= this.cacheTimeout)
                .slice(0, this.maxCacheSize);
            
            // Update cache with valid entries
            this.correlationCache = new Map(validEntries);
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        } catch (error) {
            logError('Error cleaning up correlation cache:', error);
            // If cleanup fails, clear the entire cache to prevent memory issues
            this.correlationCache.clear();
        }
    }

    analyzeCorrelations(metrics) {
        try {
            const correlations = {};
            const metricNames = Object.keys(metrics);
            const currentTime = Date.now();

            // Periodic cleanup of cache
            if (currentTime - this.lastCleanup > this.cleanupInterval) {
                this.cleanupCache();
                this.lastCleanup = currentTime;
            }

            // Analyze correlations between all pairs of metrics
            for (let i = 0; i < metricNames.length; i++) {
                for (let j = i + 1; j < metricNames.length; j++) {
                    const metric1 = metricNames[i];
                    const metric2 = metricNames[j];
                    const cacheKey = `${metric1}-${metric2}`;
                    
                    // Check cache first
                    const cachedCorrelation = this.correlationCache.get(cacheKey);
                    if (cachedCorrelation && currentTime - cachedCorrelation.timestamp < this.cacheTimeout) {
                        correlations[cacheKey] = cachedCorrelation.correlation;
                        continue;
                    }

                    try {
                        const correlation = this.analyzeMetricPair(
                            metrics[metric1],
                            metrics[metric2]
                        );

                        if (correlation.strength >= this.minCorrelationStrength) {
                            correlations[cacheKey] = correlation;
                            // Cache the result
                            this.correlationCache.set(cacheKey, {
                                correlation,
                                timestamp: currentTime
                            });
                        }
                    } catch (error) {
                        logWarn(`Error analyzing correlation between ${metric1} and ${metric2}:`, error);
                        continue;
                    }
                }
            }

            return correlations;
        } catch (error) {
            logError('Error in correlation analysis:', error);
            return {};
        }
    }

    analyzeMetricPair(metric1, metric2) {
        try {
            const values1 = this.getRecentValues(metric1);
            const values2 = this.getRecentValues(metric2);

            if (values1.length < 10 || values2.length < 10) {
                return { strength: 0, lag: 0, type: 'none', patterns: [] };
            }

            // Find the best correlation with time lag
            let bestCorrelation = {
                strength: 0,
                lag: 0,
                type: 'none',
                patterns: []
            };

            // Check for both positive and negative lags
            for (let lag = -this.maxLag; lag <= this.maxLag; lag++) {
                const correlation = this.calculateCorrelationWithLag(values1, values2, lag);
                
                if (Math.abs(correlation) > Math.abs(bestCorrelation.strength)) {
                    const patterns = this.detectPatterns(values1, values2, lag);
                    bestCorrelation = {
                        strength: correlation,
                        lag: lag,
                        type: this.determineCorrelationType(correlation, lag),
                        patterns: patterns
                    };
                }
            }

            return bestCorrelation;
        } catch (error) {
            logError('Error in metric pair analysis:', error);
            return { strength: 0, lag: 0, type: 'none', patterns: [] };
        }
    }

    getRecentValues(metric) {
        return metric.history
            .slice(-this.correlationWindow)
            .map(h => h.value);
    }

    calculateCorrelationWithLag(values1, values2, lag) {
        const n = Math.min(values1.length, values2.length);
        if (n < 2) return 0;

        let x, y;
        if (lag >= 0) {
            x = values1.slice(0, n - lag);
            y = values2.slice(lag);
        } else {
            x = values1.slice(-lag);
            y = values2.slice(0, n + lag);
        }

        return this.calculatePearsonCorrelation(x, y);
    }

    calculatePearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);
        const sumYY = y.reduce((a, b) => a + b * b, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    determineCorrelationType(correlation, lag) {
        if (Math.abs(correlation) < this.minCorrelationStrength) {
            return 'none';
        }

        if (lag === 0) {
            return correlation > 0 ? 'direct' : 'inverse';
        }

        if (lag > 0) {
            return correlation > 0 ? 'leading' : 'inverse-leading';
        }

        return correlation > 0 ? 'lagging' : 'inverse-lagging';
    }

    detectPatterns(values1, values2, lag) {
        const patterns = [];
        const n = Math.min(values1.length, values2.length);
        
        // Normalize the values for pattern detection
        const normalized1 = this.normalizeValues(values1);
        const normalized2 = this.normalizeValues(values2);

        // Try different pattern lengths
        for (let length = this.minPatternLength; length <= this.maxPatternLength; length++) {
            const pattern1 = this.findPattern(normalized1, length);
            const pattern2 = this.findPattern(normalized2, length);

            if (pattern1 && pattern2) {
                const similarity = this.calculatePatternSimilarity(pattern1, pattern2, lag);
                if (similarity >= this.patternThreshold) {
                    patterns.push({
                        length,
                        similarity,
                        pattern1,
                        pattern2
                    });
                }
            }
        }

        return patterns;
    }

    normalizeValues(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
        return values.map(v => (v - mean) / std);
    }

    findPattern(values, length) {
        const n = values.length;
        if (n < length * 2) return null;

        let bestPattern = null;
        let bestScore = 0;

        // Try each possible starting position
        for (let start = 0; start < n - length; start++) {
            const pattern = values.slice(start, start + length);
            const score = this.evaluatePattern(pattern, values, start + length);
            
            if (score > bestScore) {
                bestScore = score;
                bestPattern = pattern;
            }
        }

        return bestScore >= this.patternThreshold ? bestPattern : null;
    }

    evaluatePattern(pattern, values, startPos) {
        const n = values.length;
        let matches = 0;
        let total = 0;

        // Check for pattern repetitions
        for (let i = startPos; i < n - pattern.length; i++) {
            let match = true;
            for (let j = 0; j < pattern.length; j++) {
                if (Math.abs(values[i + j] - pattern[j]) > 0.1) {
                    match = false;
                    break;
                }
            }
            if (match) matches++;
            total++;
        }

        return total > 0 ? matches / total : 0;
    }

    calculatePatternSimilarity(pattern1, pattern2, lag) {
        const n = Math.min(pattern1.length, pattern2.length);
        let sumSquaredDiff = 0;

        for (let i = 0; i < n; i++) {
            const j = (i + lag + n) % n;
            sumSquaredDiff += Math.pow(pattern1[i] - pattern2[j], 2);
        }

        return 1 - Math.sqrt(sumSquaredDiff / n);
    }

    generateCorrelationInsights(correlations) {
        const insights = [];
        
        Object.entries(correlations).forEach(([pair, correlation]) => {
            const [metric1, metric2] = pair.split('-');
            let insight = '';
            
            // Generate basic correlation insight
            switch (correlation.type) {
                case 'direct':
                    insight = `${metric1} and ${metric2} move together`;
                    break;
                case 'inverse':
                    insight = `${metric1} and ${metric2} move in opposite directions`;
                    break;
                case 'leading':
                    insight = `${metric1} leads ${metric2} by ${correlation.lag} seconds`;
                    break;
                case 'inverse-leading':
                    insight = `${metric1} leads ${metric2} in opposite direction by ${correlation.lag} seconds`;
                    break;
                case 'lagging':
                    insight = `${metric1} lags behind ${metric2} by ${Math.abs(correlation.lag)} seconds`;
                    break;
                case 'inverse-lagging':
                    insight = `${metric1} lags behind ${metric2} in opposite direction by ${Math.abs(correlation.lag)} seconds`;
                    break;
            }
            
            // Add pattern insights if patterns were detected
            if (correlation.patterns && correlation.patterns.length > 0) {
                const patternInsights = correlation.patterns.map(pattern => {
                    return `Found ${pattern.length}-point pattern with ${(pattern.similarity * 100).toFixed(1)}% similarity`;
                });
                insight += `. ${patternInsights.join('. ')}`;
            }
            
            if (insight) {
                insights.push({
                    metrics: [metric1, metric2],
                    insight,
                    strength: correlation.strength,
                    type: correlation.type,
                    lag: correlation.lag,
                    patterns: correlation.patterns
                });
            }
        });
        
        return insights;
    }
}

class FourierTransform {
    constructor() {
        this.minFrequency = 0.01; // Minimum frequency to consider (1/100 seconds)
        this.maxFrequency = 0.5;  // Maximum frequency to consider (1/2 seconds)
        this.amplitudeThreshold = 0.1; // Minimum amplitude to consider a frequency significant
    }

    transform(signal) {
        const n = signal.length;
        const fft = new Array(n).fill(0).map(() => ({ real: 0, imag: 0 }));
        
        // Copy input data to real part
        for (let i = 0; i < n; i++) {
            fft[i].real = signal[i];
        }
        
        // Perform FFT
        this.fftRecursive(fft, n);
        
        return fft;
    }

    fftRecursive(fft, n) {
        try {
            if (n <= 1) return;
            
            // Split into even and odd
            const even = new Array(n/2).fill(0).map(() => ({ real: 0, imag: 0 }));
            const odd = new Array(n/2).fill(0).map(() => ({ real: 0, imag: 0 }));
            
            for (let i = 0; i < n/2; i++) {
                even[i] = fft[2*i];
                odd[i] = fft[2*i + 1];
            }
            
            // Recursive FFT
            this.fftRecursive(even, n/2);
            this.fftRecursive(odd, n/2);
            
            // Combine results
            for (let k = 0; k < n/2; k++) {
                const angle = -2 * Math.PI * k / n;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                
                const tempReal = cos * odd[k].real - sin * odd[k].imag;
                const tempImag = sin * odd[k].real + cos * odd[k].imag;
                
                fft[k].real = even[k].real + tempReal;
                fft[k].imag = even[k].imag + tempImag;
                fft[k + n/2].real = even[k].real - tempReal;
                fft[k + n/2].imag = even[k].imag - tempImag;
            }
        } catch (error) {
            logError('Error in recursive FFT:', error);
        }
    }

    findSignificantFrequencies(fft) {
        const n = fft.length;
        const frequencies = [];
        
        // Calculate magnitude for each frequency
        for (let i = 0; i < n/2; i++) {
            const magnitude = Math.sqrt(fft[i].real * fft[i].real + fft[i].imag * fft[i].imag);
            const frequency = i / n;
            
            if (frequency >= this.minFrequency && frequency <= this.maxFrequency) {
                frequencies.push({
                    frequency,
                    amplitude: magnitude,
                    index: i
                });
            }
        }
        
        // Sort by amplitude and filter significant ones
        frequencies.sort((a, b) => b.amplitude - a.amplitude);
        
        // Return frequencies that exceed threshold
        return frequencies.filter(f => f.amplitude > this.amplitudeThreshold);
    }

    reconstructPattern(fft, freq, n) {
        const pattern = new Array(n).fill(0);
        
        // Reconstruct time domain signal using the significant frequency
        for (let t = 0; t < n; t++) {
            const angle = 2 * Math.PI * freq.frequency * t;
            pattern[t] = freq.amplitude * Math.cos(angle);
        }
        
        return this.normalizePattern(pattern);
    }

    normalizePattern(pattern) {
        const min = Math.min(...pattern);
        const max = Math.max(...pattern);
        const range = max - min;
        
        return pattern.map(v => (v - min) / range);
    }

    analyzePatterns(signal) {
        const fft = this.transform(signal);
        const frequencies = this.findSignificantFrequencies(fft);
        
        return frequencies.map(freq => ({
            frequency: freq.frequency,
            amplitude: freq.amplitude,
            period: 1 / freq.frequency,
            pattern: this.reconstructPattern(fft, freq, signal.length)
        }));
    }

    performFFT(values) {
        try {
            const n = values.length;
            if (n === 0) {
                logWarn('Empty values array provided to FFT');
                return [];
            }
            
            // Ensure n is a power of 2
            const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
            const fft = new Array(paddedLength).fill(0).map(() => ({ real: 0, imag: 0 }));
            
            // Copy input data to real part
            for (let i = 0; i < n; i++) {
                fft[i].real = values[i];
            }
            
            // Perform FFT
            this.fftRecursive(fft, paddedLength);
            
            return fft;
        } catch (error) {
            logError('Error in FFT calculation:', error);
            return [];
        }
    }
}

class PerformanceAnalytics {
    constructor() {
        this.metrics = {
            fps: { history: [], predictions: [], correlations: {} },
            memory: { history: [], predictions: [], correlations: {} },
            animations: { history: [], predictions: [], correlations: {} },
            timing: { history: [], predictions: [], correlations: {} }
        };

        this.analysisWindow = 300; // 5 minutes of data
        this.predictionHorizon = 60; // 1 minute prediction
        this.correlationThreshold = 0.7;
        
        this.observers = new Set();

        // Initialize ML models
        this.mlModels = {
            fps: null,
            memory: null,
            animations: null,
            timing: null
        };

        // Add anomaly detection
        this.anomalyDetector = {
            fps: { mean: 0, std: 0, history: [] },
            memory: { mean: 0, std: 0, history: [] },
            animations: { mean: 0, std: 0, history: [] },
            timing: { mean: 0, std: 0, history: [] }
        };

        this.patterns = {
            fps: [],
            memory: [],
            animations: [],
            timing: []
        };

        // Add wavelet transform
        this.waveletTransform = new WaveletTransform();

        // Add pattern correlation analyzer
        this.patternCorrelationAnalyzer = new PatternCorrelationAnalyzer();

        // Add Fourier transform
        this.fourierTransform = new FourierTransform();

        this.errorCount = 0;
        this.maxErrors = 5;
        this.errorResetInterval = 300000; // 5 minutes
        this.lastErrorReset = Date.now();
        this.recoveryMode = false;

        // Add memory management
        this.maxHistorySize = 1000; // Maximum number of history entries per metric
        this.cleanupInterval = 300000; // 5 minutes
        this.lastCleanup = Date.now();
        this.startCleanupTimer();

        // Add performance monitoring
        this.performanceMetrics = {
            patternDetectionTime: [],
            correlationAnalysisTime: [],
            fftComputationTime: []
        };

        this.initialize();
    }

    initialize() {
        this.setupPerformanceObservers();
        this.startAnalysis();
    }

    setupPerformanceObservers() {
        performanceDashboard.addObserver((data) => {
            if (data.type === 'metricUpdate') {
                this.updateMetric(data.metric, data.value);
            }
        });
    }

    updateMetric(metric, value) {
        if (this.recoveryMode) {
            logWarn('Skipping metric update during recovery mode');
            return;
        }

        try {
            if (!this.metrics[metric]) return;

            const data = this.metrics[metric];
            const timestamp = Date.now();

            // Add new value with timestamp
            data.history.push({
                value,
                timestamp
            });

            // Enforce history size limit
            if (data.history.length > this.maxHistorySize) {
                data.history = data.history.slice(-this.maxHistorySize);
            }

            // Update predictions with performance monitoring
            const startTime = performance.now();
            this.updatePredictions(metric);
            this.performanceMetrics.predictionTime.push(performance.now() - startTime);

            // Update correlations with performance monitoring
            const correlationStartTime = performance.now();
            this.updateCorrelations(metric);
            this.performanceMetrics.correlationAnalysisTime.push(performance.now() - correlationStartTime);

            // Detect patterns with performance monitoring
            const patternStartTime = performance.now();
            this.detectPatterns(metric);
            this.performanceMetrics.patternDetectionTime.push(performance.now() - patternStartTime);

            this.notifyObservers({
                type: 'analyticsUpdate',
                metric,
                data: {
                    history: data.history,
                    predictions: data.predictions,
                    correlations: data.correlations,
                    performance: {
                        predictionTime: this.calculateAverage(this.performanceMetrics.predictionTime),
                        correlationTime: this.calculateAverage(this.performanceMetrics.correlationAnalysisTime),
                        patternDetectionTime: this.calculateAverage(this.performanceMetrics.patternDetectionTime)
                    }
                }
            });
        } catch (error) {
            this.handleError(error, 'updateMetric');
        }
    }

    updatePredictions(metric) {
        const data = this.metrics[metric];
        const values = data.history.map(h => h.value);
        
        if (values.length < 10) return;

        // Simple linear regression for prediction
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = values;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate predictions
        data.predictions = Array.from(
            {length: this.predictionHorizon},
            (_, i) => ({
                value: slope * (n + i) + intercept,
                timestamp: Date.now() + i * 1000
            })
        );
    }

    updateCorrelations(metric) {
        const data = this.metrics[metric];
        const values = data.history.map(h => h.value);

        // Update basic correlations
        Object.keys(this.metrics).forEach(otherMetric => {
            if (otherMetric === metric) return;

            const otherValues = this.metrics[otherMetric].history.map(h => h.value);
            if (otherValues.length < 10) return;

            const correlation = this.calculateCorrelation(values, otherValues);
            if (Math.abs(correlation) >= this.correlationThreshold) {
                data.correlations[otherMetric] = correlation;
            } else {
                delete data.correlations[otherMetric];
            }
        });

        // Update pattern correlations
        const patternCorrelations = this.patternCorrelationAnalyzer.analyzeCorrelations(this.metrics);
        this.updatePatternCorrelations(patternCorrelations);
    }

    updatePatternCorrelations(correlations) {
        Object.entries(correlations).forEach(([pair, correlation]) => {
            const [metric1, metric2] = pair.split('-');
            
            // Update correlation information in both metrics
            if (this.metrics[metric1] && this.metrics[metric2]) {
                this.metrics[metric1].patternCorrelations = this.metrics[metric1].patternCorrelations || {};
                this.metrics[metric2].patternCorrelations = this.metrics[metric2].patternCorrelations || {};

                this.metrics[metric1].patternCorrelations[metric2] = correlation;
                this.metrics[metric2].patternCorrelations[metric1] = {
                    ...correlation,
                    lag: -correlation.lag // Invert lag for the other direction
                };
            }
        });
    }

    calculateCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);
        const sumYY = y.reduce((a, b) => a + b * b, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateAdaptiveThresholds(metric) {
        try {
            const history = this.metrics[metric].history;
            if (history.length < 10) return this.patternConfig.adaptiveThresholds;

            const values = history.map(h => h.value);
            const mean = this.calculateMean(values);
            const std = this.calculateStandardDeviation(values, mean);
            
            // Calculate dynamic thresholds based on data characteristics
            const dynamicThresholds = {
                ...this.patternConfig.adaptiveThresholds,
                minConfidence: Math.max(
                    this.patternConfig.adaptiveThresholds.minConfidence,
                    Math.min(0.8, 0.6 + (std / mean) * 0.2)
                ),
                maxConfidence: Math.min(
                    this.patternConfig.adaptiveThresholds.maxConfidence,
                    Math.max(0.8, 0.9 - (std / mean) * 0.1)
                ),
                stabilityWeight: Math.max(
                    0.2,
                    Math.min(0.6, 0.4 + (std / mean) * 0.2)
                ),
                varianceWeight: Math.max(
                    0.2,
                    Math.min(0.5, 0.3 + (std / mean) * 0.2)
                ),
                lengthWeight: Math.max(
                    0.2,
                    Math.min(0.4, 0.3 - (std / mean) * 0.1)
                )
            };

            return dynamicThresholds;
        } catch (error) {
            logWarn('Error calculating adaptive thresholds:', error);
            return this.patternConfig.adaptiveThresholds;
        }
    }

    detectPatterns(metric) {
        try {
            if (this.recoveryMode) return [];

            const history = this.metrics[metric].history;
            if (history.length < this.patternConfig.minPatternLength) return [];

            const values = history.map(h => h.value);
            const adaptiveThresholds = this.calculateAdaptiveThresholds(metric);
            
            // Use adaptive thresholds for pattern detection
            const patterns = this.findPatterns(values, adaptiveThresholds);
            
            // Update pattern confidence using adaptive thresholds
            patterns.forEach(pattern => {
                pattern.confidence = this.calculatePatternConfidence(pattern.pattern, adaptiveThresholds);
            });

            return patterns.filter(p => p.confidence >= adaptiveThresholds.minConfidence);
        } catch (error) {
            this.handleError(error, 'detectPatterns');
            return [];
        }
    }

    findPatterns(values, thresholds) {
        try {
            const patterns = [];
            const memoizedSimilarity = new Map();
            
            // Early termination if not enough data
            if (values.length < this.patternConfig.minPatternLength) {
                return patterns;
            }

            // Quick check for obvious patterns
            const quickPatterns = this.findQuickPatterns(values);
            if (quickPatterns.length > 0) {
                patterns.push(...quickPatterns);
                if (patterns.length >= this.patternConfig.maxPatterns) {
                    return this.sortAndLimitPatterns(patterns);
                }
            }
            
            // 1. Sliding Window Pattern Detection with memoization
            const slidingPatterns = this.findSlidingPatterns(values, memoizedSimilarity);
            patterns.push(...slidingPatterns);
            
            if (this.shouldTerminateEarly(patterns)) {
                return this.sortAndLimitPatterns(patterns);
            }
            
            // 2. Fourier Transform Pattern Detection
            const fourierPatterns = this.fourierTransform.analyzePatterns(values);
            patterns.push(...fourierPatterns.map(pattern => ({
                sequence: pattern.pattern,
                length: pattern.pattern.length,
                similarity: this.calculatePatternSimilarity(values, pattern.pattern, memoizedSimilarity),
                confidence: pattern.amplitude,
                type: 'fourier',
                frequency: pattern.frequency,
                period: pattern.period
            })));
            
            if (this.shouldTerminateEarly(patterns)) {
                return this.sortAndLimitPatterns(patterns);
            }
            
            // 3. Statistical Pattern Detection
            const statisticalPatterns = this.findStatisticalPatterns(values);
            patterns.push(...statisticalPatterns);

            if (this.shouldTerminateEarly(patterns)) {
                return this.sortAndLimitPatterns(patterns);
            }

            // 4. Wavelet Transform Pattern Detection
            const waveletAnalysis = this.waveletTransform.analyzePatterns(values);
            const waveletPatterns = this.processWaveletPatterns(waveletAnalysis);
            patterns.push(...waveletPatterns);
            
            return this.sortAndLimitPatterns(patterns);
        } catch (error) {
            logError('Error in pattern detection:', error);
            return [];
        }
    }

    findQuickPatterns(values) {
        const patterns = [];
        const n = values.length;
        
        // Check for constant patterns
        const firstValue = values[0];
        const isConstant = values.every(v => Math.abs(v - firstValue) < 0.0001);
        if (isConstant) {
            patterns.push({
                sequence: values,
                length: n,
                similarity: 1.0,
                confidence: 1.0,
                type: 'constant'
            });
            return patterns;
        }

        // Check for linear patterns
        const linearity = this.checkLinearity(values);
        if (linearity > 0.95) {
            patterns.push({
                sequence: values,
                length: n,
                similarity: linearity,
                confidence: linearity,
                type: 'linear'
            });
        }

        return patterns;
    }

    checkLinearity(values) {
        const n = values.length;
        if (n < 2) return 0;

        const x = Array.from({length: n}, (_, i) => i);
        const y = values;

        // Calculate means
        const xMean = x.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;

        // Calculate slope and intercept
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (x[i] - xMean) * (y[i] - yMean);
            denominator += Math.pow(x[i] - xMean, 2);
        }

        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;

        // Calculate R-squared
        let ssTotal = 0;
        let ssResidual = 0;
        for (let i = 0; i < n; i++) {
            const predicted = slope * x[i] + intercept;
            ssTotal += Math.pow(y[i] - yMean, 2);
            ssResidual += Math.pow(y[i] - predicted, 2);
        }

        return 1 - (ssResidual / ssTotal);
    }

    shouldTerminateEarly(patterns) {
        if (patterns.length >= this.patternConfig.maxPatterns) {
            return true;
        }

        // Check if we have enough high-quality patterns
        const highQualityPatterns = patterns.filter(p => 
            p.similarity >= this.patternConfig.similarityThreshold && 
            p.confidence >= this.patternConfig.predictionConfidence
        );

        return highQualityPatterns.length >= this.patternConfig.maxPatterns / 2;
    }

    sortAndLimitPatterns(patterns) {
        return patterns
            .sort((a, b) => {
                // Sort by similarity first
                const similarityDiff = b.similarity - a.similarity;
                if (Math.abs(similarityDiff) > 0.01) {
                    return similarityDiff;
                }
                // Then by confidence
                return b.confidence - a.confidence;
            })
            .slice(0, this.patternConfig.maxPatterns);
    }

    findSlidingPatterns(values, memoizedSimilarity) {
        const patterns = [];
        const maxLength = Math.min(20, values.length / 2);
        
        for (let length = this.patternConfig.minPatternLength; length <= maxLength; length++) {
            const pattern = values.slice(-length);
            const similarity = this.findPatternSimilarity(values, pattern, memoizedSimilarity);
            
            if (similarity >= this.patternConfig.similarityThreshold) {
                patterns.push({
                    sequence: pattern,
                    length,
                    similarity,
                    confidence: this.calculatePatternConfidence(pattern),
                    type: 'sliding'
                });
            }
        }
        
        return patterns;
    }

    findFourierPatterns(values) {
        const patterns = [];
        const n = values.length;
        
        // Apply FFT to the time series data
        const fft = this.performFFT(values);
        
        // Find significant frequencies
        const significantFreqs = this.findSignificantFrequencies(fft);
        
        // Convert frequencies back to time domain patterns
        significantFreqs.forEach(freq => {
            const pattern = this.reconstructPattern(fft, freq, n);
            const similarity = this.calculatePatternSimilarity(values, pattern);
            
            if (similarity >= this.patternConfig.similarityThreshold) {
                patterns.push({
                    sequence: pattern,
                    length: pattern.length,
                    similarity,
                    confidence: this.calculatePatternConfidence(pattern),
                    type: 'fourier',
                    frequency: freq.frequency,
                    amplitude: freq.amplitude
                });
            }
        });
        
        return patterns;
    }

    performFFT(values) {
        try {
            const n = values.length;
            if (n === 0) {
                logWarn('Empty values array provided to FFT');
                return [];
            }
            
            // Ensure n is a power of 2
            const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
            const fft = new Array(paddedLength).fill(0).map(() => ({ real: 0, imag: 0 }));
            
            // Copy input data to real part
            for (let i = 0; i < n; i++) {
                fft[i].real = values[i];
            }
            
            // Perform FFT
            this.fftRecursive(fft, paddedLength);
            
            return fft;
        } catch (error) {
            logError('Error in FFT calculation:', error);
            return [];
        }
    }

    findSignificantFrequencies(fft) {
        const n = fft.length;
        const frequencies = [];
        
        // Calculate magnitude for each frequency
        for (let i = 0; i < n/2; i++) {
            const magnitude = Math.sqrt(fft[i].real * fft[i].real + fft[i].imag * fft[i].imag);
            const frequency = i / n;
            
            if (frequency >= this.minFrequency && frequency <= this.maxFrequency) {
                frequencies.push({
                    frequency,
                    amplitude: magnitude,
                    index: i
                });
            }
        }
        
        // Sort by amplitude and filter significant ones
        frequencies.sort((a, b) => b.amplitude - a.amplitude);
        
        // Return frequencies that exceed threshold
        return frequencies.filter(f => f.amplitude > this.amplitudeThreshold);
    }

    calculateAmplitudeThreshold(frequencies) {
        // Calculate threshold based on mean and standard deviation
        const amplitudes = frequencies.map(f => f.amplitude);
        const mean = this.calculateMean(amplitudes);
        const std = this.calculateStandardDeviation(amplitudes, mean);
        return mean + std;
    }

    reconstructPattern(fft, freq, n) {
        const pattern = new Array(n).fill(0);
        
        // Reconstruct time domain signal using the significant frequency
        for (let t = 0; t < n; t++) {
            const angle = 2 * Math.PI * freq.frequency * t;
            pattern[t] = freq.amplitude * Math.cos(angle);
        }
        
        // Normalize the pattern
        return this.normalizePattern(pattern);
    }

    normalizePattern(pattern) {
        const min = Math.min(...pattern);
        const max = Math.max(...pattern);
        const range = max - min;
        
        return pattern.map(v => (v - min) / range);
    }

    findStatisticalPatterns(values) {
        const patterns = [];
        const segments = this.segmentData(values);
        
        segments.forEach(segment => {
            const stats = this.calculateSegmentStatistics(segment);
            if (this.isSignificantPattern(stats)) {
                patterns.push({
                    sequence: segment,
                    length: segment.length,
                    similarity: stats.similarity,
                    confidence: stats.confidence,
                    type: 'statistical'
                });
            }
        });
        
        return patterns;
    }

    segmentData(values) {
        // Implement data segmentation for statistical analysis
        return [];
    }

    calculateSegmentStatistics(segment) {
        // Calculate statistical properties of a segment
        return {
            mean: 0,
            std: 0,
            similarity: 0,
            confidence: 0
        };
    }

    isSignificantPattern(stats) {
        // Determine if a statistical pattern is significant
        return false;
    }

    updateAnomalyDetection(metric, values) {
        const detector = this.anomalyDetector[metric];
        if (!detector) return;

        // Update history
        detector.history = detector.history.concat(values).slice(-this.patternConfig.windowSize);
        
        // Calculate new statistics
        detector.mean = this.calculateMean(detector.history);
        detector.std = this.calculateStandardDeviation(detector.history, detector.mean);
        
        // Detect anomalies
        const anomalies = this.detectAnomalies(values, detector);
        if (anomalies.length > 0) {
            this.notifyObservers({
                type: 'anomalyDetected',
                metric,
                anomalies
            });
        }
    }

    detectAnomalies(values, detector) {
        return values
            .map((value, index) => ({
                value,
                index,
                zScore: Math.abs((value - detector.mean) / detector.std)
            }))
            .filter(point => point.zScore > this.patternConfig.anomalyThreshold);
    }

    calculateMean(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateStandardDeviation(values, mean) {
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        return Math.sqrt(this.calculateMean(squareDiffs));
    }

    calculatePatternConfidence(pattern, thresholds) {
        try {
            if (!thresholds) {
                thresholds = this.patternConfig.adaptiveThresholds;
            }

            // Calculate individual confidence factors
            const lengthConfidence = this.calculateLengthConfidence(pattern);
            const stabilityConfidence = this.calculateStabilityConfidence(pattern);
            const varianceConfidence = this.calculateVarianceConfidence(pattern);

            // Apply weighted combination using adaptive weights
            const confidence = (
                lengthConfidence * thresholds.lengthWeight +
                stabilityConfidence * thresholds.stabilityWeight +
                varianceConfidence * thresholds.varianceWeight
            );

            // Ensure confidence is within adaptive bounds
            return Math.min(thresholds.maxConfidence, 
                   Math.max(thresholds.minConfidence, confidence));
        } catch (error) {
            logWarn('Error calculating pattern confidence:', error);
            return thresholds.minConfidence;
        }
    }

    calculateLengthConfidence(pattern) {
        const length = pattern.length;
        const maxLength = this.patternConfig.maxPatternLength;
        const minLength = this.patternConfig.minPatternLength;
        
        // Normalize length confidence between min and max lengths
        if (length < minLength) return 0;
        if (length > maxLength) return 1;
        return (length - minLength) / (maxLength - minLength);
    }

    calculateStabilityConfidence(pattern) {
        try {
            const n = pattern.length;
            if (n < 3) return 0;

            // Calculate moving average with adaptive window size
            const windowSize = Math.min(3, Math.floor(n / 3));
            const movingAvg = [];
            
            for (let i = 0; i <= n - windowSize; i++) {
                const window = pattern.slice(i, i + windowSize);
                const avg = window.reduce((a, b) => a + b, 0) / windowSize;
                movingAvg.push(avg);
            }

            // Calculate stability based on moving average variance
            const avgVariance = this.calculateVariance(movingAvg);
            const maxVariance = this.patternConfig.stabilityThreshold;
            
            return Math.max(0, 1 - (avgVariance / maxVariance));
        } catch (error) {
            logWarn('Error calculating stability confidence:', error);
            return 0;
        }
    }

    calculateVarianceConfidence(pattern) {
        try {
            const variance = this.calculateVariance(pattern);
            const maxVariance = this.patternConfig.varianceThreshold;
            
            // Higher variance means lower confidence
            return Math.max(0, 1 - (variance / maxVariance));
        } catch (error) {
            logWarn('Error calculating variance confidence:', error);
            return 0;
        }
    }

    calculateBasicConfidence(pattern) {
        const length = pattern.length;
        const variance = this.calculateVariance(pattern);
        const baseConfidence = Math.min(1, length / this.patternConfig.maxPatternLength);
        
        let confidence = baseConfidence;
        
        if (variance > this.patternConfig.varianceThreshold) {
            confidence *= 0.8;
        }
        
        if (this.isStablePattern(pattern)) {
            confidence *= 1.2;
        }
        
        return Math.min(1, Math.max(0, confidence));
    }

    isStablePattern(pattern) {
        try {
            const n = pattern.length;
            if (n < 3) return false;

            // Calculate moving average
            const windowSize = Math.min(3, n);
            const movingAvg = [];
            
            for (let i = 0; i <= n - windowSize; i++) {
                const window = pattern.slice(i, i + windowSize);
                const avg = window.reduce((a, b) => a + b, 0) / windowSize;
                movingAvg.push(avg);
            }

            // Check if moving average is relatively stable
            const avgVariance = this.calculateVariance(movingAvg);
            return avgVariance < this.patternConfig.stabilityThreshold;
        } catch (error) {
            logWarn('Error checking pattern stability:', error);
            return false;
        }
    }

    calculateVariance(values) {
        try {
            const n = values.length;
            if (n < 2) return 0;

            const mean = values.reduce((a, b) => a + b, 0) / n;
            const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
            return squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
        } catch (error) {
            logWarn('Error calculating variance:', error);
            return 0;
        }
    }

    addPattern(metric, pattern) {
        if (!this.patterns[metric]) return;
        
        // Remove old patterns
        this.patterns[metric] = this.patterns[metric].filter(p => 
            Date.now() - p.lastSeen < 300000 // 5 minutes
        );
        
        // Add new pattern if not too similar to existing ones
        const isUnique = !this.patterns[metric].some(existing => 
            this.calculatePatternSimilarity(existing.pattern, pattern.pattern) > 0.9
        );
        
        if (isUnique) {
            this.patterns[metric].push(pattern);
            
            // Keep only the most recent patterns
            if (this.patterns[metric].length > this.patternConfig.maxPatterns) {
                this.patterns[metric].sort((a, b) => b.lastSeen - a.lastSeen);
                this.patterns[metric] = this.patterns[metric].slice(0, this.patternConfig.maxPatterns);
            }
        }
    }

    getPatternAnalysis() {
        const analysis = {};
        
        Object.entries(this.patterns).forEach(([metric, patterns]) => {
            if (patterns.length > 0) {
                analysis[metric] = patterns.map(pattern => ({
                    length: pattern.length,
                    similarity: pattern.similarity,
                    lastSeen: pattern.lastSeen,
                    prediction: this.predictNextValue(pattern.pattern)
                }));
            }
        });
        
        return analysis;
    }

    predictNextValue(pattern) {
        if (pattern.length < 2) return null;
        
        // Simple linear prediction based on the last two points
        const lastTwo = pattern.slice(-2);
        const slope = lastTwo[1] - lastTwo[0];
        return lastTwo[1] + slope;
    }

    getOptimizationSuggestions() {
        const suggestions = [];
        const report = performanceDashboard.getPerformanceReport();

        // Analyze FPS trends
        const fpsData = this.metrics.fps;
        if (fpsData.history.length > 0) {
            const recentFPS = fpsData.history.slice(-10).map(h => h.value);
            const avgFPS = recentFPS.reduce((a, b) => a + b, 0) / recentFPS.length;
            
            if (avgFPS < 30) {
                suggestions.push({
                    type: 'fps',
                    priority: 'high',
                    message: 'Consider reducing animation complexity',
                    details: {
                        currentFPS: avgFPS.toFixed(1),
                        predictedFPS: fpsData.predictions[0]?.value.toFixed(1),
                        correlatedMetrics: Object.keys(fpsData.correlations)
                    }
                });
            }
        }

        // Analyze memory usage
        const memoryData = this.metrics.memory;
        if (memoryData.history.length > 0) {
            const recentMemory = memoryData.history.slice(-10).map(h => h.value);
            const avgMemory = recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length;
            
            if (avgMemory > 50 * 1024 * 1024) { // 50MB
                suggestions.push({
                    type: 'memory',
                    priority: 'medium',
                    message: 'Investigate memory usage patterns',
                    details: {
                        currentMemory: (avgMemory / 1024 / 1024).toFixed(1) + 'MB',
                        predictedMemory: (memoryData.predictions[0]?.value / 1024 / 1024).toFixed(1) + 'MB',
                        correlatedMetrics: Object.keys(memoryData.correlations)
                    }
                });
            }
        }

        return suggestions;
    }

    addObserver(observer) {
        this.observers.add(observer);
    }

    removeObserver(observer) {
        this.observers.delete(observer);
    }

    notifyObservers(data) {
        this.observers.forEach(observer => {
            try {
                observer(data);
            } catch (error) {
                logError('Error in analytics observer:', error);
            }
        });
    }

    getAnalyticsReport() {
        const report = {
            metrics: Object.fromEntries(
                Object.entries(this.metrics).map(([key, data]) => [
                    key,
                    {
                        current: data.history[data.history.length - 1]?.value,
                        average: this.calculateAverage(data.history),
                        trend: this.calculateTrend(data.history),
                        predictions: data.predictions,
                        correlations: data.correlations,
                        patternCorrelations: data.patternCorrelations || {},
                        anomalies: this.anomalyDetector[key].history
                            .filter((_, i) => this.detectAnomalies([this.anomalyDetector[key].history[i]], this.anomalyDetector[key]).length > 0)
                    }
                ])
            ),
            suggestions: this.getOptimizationSuggestions(),
            patterns: this.getPatternAnalysis(),
            anomalies: this.getAnomalyReport(),
            correlationInsights: this.patternCorrelationAnalyzer.generateCorrelationInsights(
                this.patternCorrelationAnalyzer.analyzeCorrelations(this.metrics)
            )
        };
        return report;
    }

    getAnomalyReport() {
        const report = {};
        Object.entries(this.anomalyDetector).forEach(([metric, detector]) => {
            report[metric] = {
                mean: detector.mean,
                std: detector.std,
                anomalies: this.detectAnomalies(detector.history, detector)
            };
        });
        return report;
    }

    calculateAverage(history) {
        if (history.length === 0) return 0;
        return history.reduce((a, b) => a + b.value, 0) / history.length;
    }

    calculateTrend(history) {
        if (history.length < 2) return 'stable';
        const recent = history.slice(-10);
        const values = recent.map(h => h.value);
        const trend = values[values.length - 1] - values[0];
        return trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
    }

    processWaveletPatterns(waveletAnalysis) {
        const patterns = [];
        
        // Process each scale group
        Object.entries(waveletAnalysis.patterns).forEach(([scale, groups]) => {
            groups.forEach(group => {
                if (group.length >= this.patternConfig.minPatternLength) {
                    const pattern = {
                        sequence: group.map(f => f.magnitude),
                        length: group.length,
                        similarity: this.calculatePatternSimilarity(
                            group.map(f => f.magnitude),
                            group.map(f => f.magnitude)
                        ),
                        confidence: this.calculatePatternConfidence(group.map(f => f.magnitude)),
                        type: 'wavelet',
                        scale: parseInt(scale),
                        timeRange: {
                            start: group[0].time,
                            end: group[group.length - 1].time
                        }
                    };
                    
                    if (pattern.similarity >= this.patternConfig.similarityThreshold) {
                        patterns.push(pattern);
                    }
                }
            });
        });
        
        return patterns;
    }

    calculatePatternSimilarity(pattern1, pattern2, memoizedSimilarity = new Map()) {
        const key = `${pattern1.join(',')}-${pattern2.join(',')}`;
        if (memoizedSimilarity.has(key)) {
            return memoizedSimilarity.get(key);
        }

        const n = Math.min(pattern1.length, pattern2.length);
        let sumSquaredDiff = 0;

        for (let i = 0; i < n; i++) {
            sumSquaredDiff += Math.pow(pattern1[i] - pattern2[i], 2);
        }

        const similarity = 1 - Math.sqrt(sumSquaredDiff / n);
        memoizedSimilarity.set(key, similarity);
        return similarity;
    }

    handleError(error, context) {
        logError(`Error in ${context}:`, error);
        
        const currentTime = Date.now();
        if (currentTime - this.lastErrorReset > this.errorResetInterval) {
            this.errorCount = 0;
            this.lastErrorReset = currentTime;
        }
        
        this.errorCount++;
        
        // Enhanced error handling
        if (this.errorCount >= this.maxErrors) {
            this.enterRecoveryMode();
        } else {
            // Attempt to recover from specific error types
            if (error instanceof RangeError) {
                this.handleRangeError(error);
            } else if (error instanceof TypeError) {
                this.handleTypeError(error);
            } else {
                this.handleGenericError(error);
            }
        }
    }

    handleRangeError(error) {
        // Handle array bounds or numeric range errors
        this.cleanupOldData();
        this.resetMetrics();
    }

    handleTypeError(error) {
        // Handle type-related errors
        this.reinitializeComponents();
    }

    handleGenericError(error) {
        // Handle other types of errors
        logWarn('Generic error occurred:', error);
    }

    resetMetrics() {
        Object.keys(this.metrics).forEach(metric => {
            this.metrics[metric].history = [];
            this.metrics[metric].predictions = [];
            this.metrics[metric].correlations = {};
        });
    }

    enterRecoveryMode() {
        this.recoveryMode = true;
        logWarn('Entering recovery mode due to multiple errors');
        
        // Clear problematic data
        this.clearProblematicData();
        
        // Reset error count
        this.errorCount = 0;
        
        // Attempt to reinitialize critical components
        this.reinitializeComponents();
        
        // Exit recovery mode after a delay
        setTimeout(() => {
            this.recoveryMode = false;
            console.info('Exited recovery mode');
        }, 60000); // 1 minute
    }

    clearProblematicData() {
        // Clear potentially corrupted data
        Object.keys(this.metrics).forEach(metric => {
            this.metrics[metric].history = [];
            this.metrics[metric].predictions = [];
            this.metrics[metric].correlations = {};
        });
        
        // Reset anomaly detection
        Object.keys(this.anomalyDetector).forEach(metric => {
            this.anomalyDetector[metric] = { mean: 0, std: 0, history: [] };
        });
    }

    reinitializeComponents() {
        try {
            // Reinitialize ML models
            Object.keys(this.mlModels).forEach(metric => {
                this.mlModels[metric] = null;
            });
            
            // Reset pattern correlation analyzer
            this.patternCorrelationAnalyzer = new PatternCorrelationAnalyzer();
            
            // Reset Fourier transform
            this.fourierTransform = new FourierTransform();
            
            // Reset wavelet transform
            this.waveletTransform = new WaveletTransform();
        } catch (error) {
            logError('Error during component reinitialization:', error);
        }
    }

    startCleanupTimer() {
        setInterval(() => this.cleanupOldData(), this.cleanupInterval);
    }

    cleanupOldData() {
        try {
            const currentTime = Date.now();
            
            // Cleanup metrics history
            Object.keys(this.metrics).forEach(metric => {
                const data = this.metrics[metric];
                if (data.history.length > this.maxHistorySize) {
                    data.history = data.history.slice(-this.maxHistorySize);
                }
                
                // Remove old predictions
                data.predictions = data.predictions.filter(p => 
                    currentTime - p.timestamp < this.predictionHorizon * 1000
                );
            });

            // Cleanup performance metrics
            Object.keys(this.performanceMetrics).forEach(metric => {
                if (this.performanceMetrics[metric].length > 100) {
                    this.performanceMetrics[metric] = this.performanceMetrics[metric].slice(-100);
                }
            });

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        } catch (error) {
            logError('Error during data cleanup:', error);
            this.handleError(error, 'cleanupOldData');
        }
    }
}

// Create singleton instance
const performanceAnalytics = new PerformanceAnalytics();

// Export singleton instance
export default performanceAnalytics; 