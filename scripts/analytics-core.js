/**
 * Analytics Core Module
 * A consolidated analytics system that combines basic, enhanced, and advanced analytics features
 */

import { auth } from './auth-core.js';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, limit, orderBy, startAfter, setDoc } from 'firebase/firestore';
import { app } from './firebase-config.js';
import dataManager from './data-manager.js';

class AnalyticsCore {
    constructor() {
        this.dataManager = null; // Set in init
        this.cache = {
            trends: new Map(),
            insights: new Map(),
            patterns: new Map(),
            lastUpdate: null
        };

        // Time periods for analysis
        this.periods = {
            week: 7,
            month: 30,
            quarter: 90,
            year: 365
        };

        // Nutrition metrics to analyze
        this.metrics = [
            'calories',
            'protein',
            'carbs',
            'fat',
            'fiber',
            'sodium',
            'sugar',
            'mealTiming',
            'mealSize',
            'waterIntake'
        ];

        // Performance monitoring
        this.performanceMetrics = {
            firstContentfulPaint: 0,
            timeToInteractive: 0,
            lastAnimationFrame: 0
        };

        // Feature detection
        this.features = {
            supportsIntersectionObserver: 'IntersectionObserver' in window,
            supportsResizeObserver: 'ResizeObserver' in window,
            supportsLocalStorage: this.checkLocalStorage(),
            supportsServiceWorker: 'serviceWorker' in navigator,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };

        // Initialize
        this.initialize();
    }

    /**
     * Call this method after instantiation to set up DOM-dependent features.
     */
    init() {
        if (typeof window !== 'undefined') {
            this.dataManager = window.dataManager;
        }
    }

    /**
     * Initialize the analytics system
     */
    initialize() {
        console.log('Analytics Core initialized');
        this.startPerformanceMonitoring();
        this.initializeInsights();
    }

    /**
     * Check if localStorage is available
     */
    checkLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        let frameCounter = 0;
        const monitorFrameRate = (timestamp) => {
            if (this.performanceMetrics.lastAnimationFrame) {
                const delta = timestamp - this.performanceMetrics.lastAnimationFrame;
                if (delta > 50) { // Frame drop detected (less than 20fps)
                    console.warn('Performance: Frame drop detected');
                    this.optimizeForPerformance();
                }
            }
            this.performanceMetrics.lastAnimationFrame = timestamp;
            frameCounter++;
            requestAnimationFrame(monitorFrameRate);
        };
        requestAnimationFrame(monitorFrameRate);
    }

    /**
     * Optimize performance when needed
     */
    optimizeForPerformance() {
        document.body.classList.add('reduce-animations');
        document.querySelectorAll('.progress-bar.high-progress').forEach(bar => {
            bar.style.animation = 'none';
        });
    }

    /**
     * Get comprehensive analytics for a date range
     */
    async getAnalytics(startDate, endDate, options = {}) {
        const cacheKey = `${startDate.toISOString()}-${endDate.toISOString()}`;
        
        // Check cache first
        if (!options.forceRefresh && this.cache.trends.has(cacheKey)) {
            return {
                ...this.cache.trends.get(cacheKey),
                fromCache: true
            };
        }

        // Fetch and analyze data
        const data = await this.fetchData(startDate, endDate);
        const analysis = await this.analyzeData(data, options);
        
        // Cache results
        this.cache.trends.set(cacheKey, analysis);
        this.cache.lastUpdate = new Date();
        
        return {
            ...analysis,
            fromCache: false
        };
    }

    /**
     * Fetch data for analysis
     */
    async fetchData(startDate, endDate) {
        // Implementation will be added
        return [];
    }

    /**
     * Analyze data and generate insights
     */
    async analyzeData(data, options) {
        const trends = await this.analyzeTrends(data);
        const patterns = await this.detectPatterns(data);
        const insights = await this.generateInsights(trends, patterns);
        const dataQuality = this.assessDataQuality(data);
        
        return {
            trends,
            patterns,
            insights,
            dataQuality,
            hasSufficientData: data.length >= 7 // Minimum 7 days of data
        };
    }

    /**
     * Analyze trends in the data
     */
    async analyzeTrends(data) {
        const trends = {};
        
        for (const metric of this.metrics) {
            const values = data.map(d => d[metric]);
            trends[metric] = {
                current: this.calculateCurrentValue(values),
                trend: this.calculateTrend(values),
                variability: this.calculateVariability(values),
                weeklyChange: this.calculateWeeklyChange(values)
            };
        }

        return trends;
    }

    /**
     * Detect patterns in the data
     */
    async detectPatterns(data) {
        // Implementation will be added
        return {};
    }

    /**
     * Generate insights from trends and patterns
     */
    async generateInsights(trends, patterns) {
        // Implementation will be added
        return [];
    }

    /**
     * Assess data quality
     */
    assessDataQuality(data) {
        // Implementation will be added
        return {
            completeness: 0,
            consistency: 0,
            reliability: 0
        };
    }

    /**
     * Calculate current value
     */
    calculateCurrentValue(values) {
        return values[values.length - 1] || 0;
    }

    /**
     * Calculate trend
     */
    calculateTrend(values) {
        // Implementation will be added
        return 0;
    }

    /**
     * Calculate variability
     */
    calculateVariability(values) {
        // Implementation will be added
        return 0;
    }

    /**
     * Calculate weekly change
     */
    calculateWeeklyChange(values) {
        // Implementation will be added
        return 0;
    }

    /**
     * Export data in specified format
     */
    exportData(format) {
        if (format === 'pdf') {
            this.exportInsightsPDF();
        } else {
            console.log(`Exporting data in ${format} format`);
        }
    }

    /**
     * Export insights as PDF
     */
    exportInsightsPDF() {
        // Implementation will be added
    }

    /**
     * Debounce function for performance optimization
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Create and export instance
const analyticsCore = new AnalyticsCore();
window.analyticsCore = analyticsCore;

export default analyticsCore; 