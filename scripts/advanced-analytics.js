/**
 * Advanced Analytics Module
 * Provides detailed trend analysis and nutritional insights
 */

class AdvancedAnalytics {
    constructor() {
        this.dataManager = window.dataManager;
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
            quarter: 90
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
        
        // Initialize insights engine
        this.initializeInsights();
    }
    
    /**
     * Initialize the insights engine
     */
    initializeInsights() {
        console.log('Advanced Analytics module initialized');
    }
    
    /**
     * Get comprehensive analytics for a date range
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @param {Object} options 
     * @returns {Promise<Object>} Analytics data
     */
    async getAnalytics(startDate, endDate, options = {}) {
        const {
            metrics = this.metrics,
            includeTrends = true,
            includeInsights = true,
            includePatterns = true,
            forceRefresh = false
        } = options;
        
        // Generate cache key
        const cacheKey = `${startDate.toISOString()}_${endDate.toISOString()}`;
        
        // Check cache if not forcing refresh
        if (!forceRefresh && this.cache.lastUpdate) {
            const cachedTrends = this.cache.trends.get(cacheKey);
            const cachedInsights = this.cache.insights.get(cacheKey);
            const cachedPatterns = this.cache.patterns.get(cacheKey);
            const cachedDataQuality = this.cache.dataQuality ? this.cache.dataQuality.get(cacheKey) : null;
            
            if (cachedTrends && cachedInsights && cachedPatterns) {
                return {
                    trends: includeTrends ? cachedTrends : null,
                    insights: includeInsights ? cachedInsights : null,
                    patterns: includePatterns ? cachedPatterns : null,
                    dataQuality: cachedDataQuality,
                    fromCache: true
                };
            }
        }
        
        // Fetch nutrition data for the specified period
        const meals = await this.fetchNutritionData(startDate, endDate);
        
        // Calculate analytics
        const trends = includeTrends ? this.calculateTrends(meals, metrics) : null;
        const insights = includeInsights ? this.generateInsights(meals, trends) : null;
        const patterns = includePatterns ? this.detectPatterns(meals) : null;
        
        // Calculate data quality score
        const dataQuality = this.calculateDataQuality(meals, startDate, endDate);
        
        // Initialize dataQuality cache if it doesn't exist
        if (!this.cache.dataQuality) {
            this.cache.dataQuality = new Map();
        }
        
        // Update cache
        this.cache.trends.set(cacheKey, trends);
        this.cache.insights.set(cacheKey, insights);
        this.cache.patterns.set(cacheKey, patterns);
        this.cache.dataQuality.set(cacheKey, dataQuality);
        this.cache.lastUpdate = new Date();
        
        return {
            trends,
            insights,
            patterns,
            dataQuality,
            fromCache: false
        };
    }
    
    /**
     * Fetch nutrition data for analysis
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array>} Meals data
     */
    async fetchNutritionData(startDate, endDate) {
        try {
            const response = await this.dataManager.getMeals(
                startDate.toISOString(),
                endDate.toISOString(),
                { bypassCache: true }
            );
            
            if (response.success) {
                return response.data;
            } else {
                console.error('Failed to fetch nutrition data:', response.error);
                return [];
            }
        } catch (error) {
            console.error('Error fetching nutrition data:', error);
            return [];
        }
    }
    
    /**
     * Calculate trends from meal data
     * @param {Array} meals 
     * @param {Array} metrics 
     * @returns {Object} Calculated trends
     */
    calculateTrends(meals, metrics) {
        // Return empty trends if no meals
        if (!meals || meals.length === 0) {
            return { 
                hasSufficientData: false,
                message: 'Insufficient data for trend analysis' 
            };
        }
        
        // Need at least 5 days of data for meaningful trends
        const uniqueDates = new Set(meals.map(meal => meal.date.split('T')[0]));
        if (uniqueDates.size < 5) {
            return {
                hasSufficientData: false,
                message: 'Need at least 5 days of data for trend analysis',
                dates: uniqueDates.size
            };
        }
        
        // Group meals by date
        const mealsByDate = this.groupMealsByDate(meals);
        const dates = Object.keys(mealsByDate).sort();
        
        // Calculate daily totals for each metric
        const dailyTotals = this.calculateDailyTotals(mealsByDate, metrics);
        
        // Calculate moving averages
        const movingAverages = this.calculateMovingAverages(dailyTotals, 3);
        
        // Calculate trend lines (linear regression)
        const trendLines = this.calculateTrendLines(dailyTotals, dates);
        
        // Calculate variability (standard deviation)
        const variability = this.calculateVariability(dailyTotals);
        
        // Calculate weekly changes
        const changes = this.calculateChanges(dailyTotals, dates);
        
        // Generate summary of significant trends
        const summary = this.generateTrendSummary(trendLines, changes, variability);
        
        return {
            hasSufficientData: true,
            dates,
            dailyTotals,
            movingAverages,
            trendLines,
            variability,
            changes,
            summary
        };
    }
    
    /**
     * Group meals by date
     * @param {Array} meals 
     * @returns {Object} Meals grouped by date
     */
    groupMealsByDate(meals) {
        const mealsByDate = {};
        
        meals.forEach(meal => {
            const date = meal.date.split('T')[0];
            if (!mealsByDate[date]) {
                mealsByDate[date] = [];
            }
            mealsByDate[date].push(meal);
        });
        
        return mealsByDate;
    }
    
    /**
     * Calculate daily totals for each metric
     * @param {Object} mealsByDate 
     * @param {Array} metrics 
     * @returns {Object} Daily totals
     */
    calculateDailyTotals(mealsByDate, metrics) {
        const dailyTotals = {};
        
        // Initialize metrics
        metrics.forEach(metric => {
            dailyTotals[metric] = {};
        });
        
        // Calculate totals for each day
        Object.entries(mealsByDate).forEach(([date, meals]) => {
            metrics.forEach(metric => {
                if (metric === 'mealTiming') {
                    // Calculate average meal timing
                    const mealTimes = meals.map(meal => {
                        const mealDate = new Date(meal.date);
                        return mealDate.getHours() + mealDate.getMinutes() / 60;
                    });
                    
                    dailyTotals[metric][date] = this.calculateAverage(mealTimes);
                } else if (metric === 'mealSize') {
                    // Calculate average meal size (calories per meal)
                    const mealSizes = meals.map(meal => {
                        return this.getTotalNutrient(meal, 'calories');
                    });
                    
                    dailyTotals[metric][date] = this.calculateAverage(mealSizes);
                } else if (metric === 'waterIntake') {
                    // Water intake is tracked separately - this would need integration with water tracking
                    dailyTotals[metric][date] = 0; // Placeholder
                } else {
                    // Calculate total nutrient intake
                    let total = 0;
                    meals.forEach(meal => {
                        total += this.getTotalNutrient(meal, metric);
                    });
                    
                    dailyTotals[metric][date] = total;
                }
            });
        });
        
        return dailyTotals;
    }
    
    /**
     * Get total nutrient from a meal
     * @param {Object} meal 
     * @param {string} nutrient 
     * @returns {number} Total amount
     */
    getTotalNutrient(meal, nutrient) {
        let total = 0;
        
        if (meal.foods && Array.isArray(meal.foods)) {
            meal.foods.forEach(food => {
                if (food.nutrients && food.nutrients[nutrient] !== undefined) {
                    total += parseFloat(food.nutrients[nutrient]) * (food.quantity || 1);
                }
            });
        }
        
        return total;
    }
    
    /**
     * Calculate moving averages for smoothing trends
     * @param {Object} dailyTotals 
     * @param {number} windowSize 
     * @returns {Object} Moving averages
     */
    calculateMovingAverages(dailyTotals, windowSize) {
        const movingAverages = {};
        
        Object.keys(dailyTotals).forEach(metric => {
            movingAverages[metric] = {};
            
            const dates = Object.keys(dailyTotals[metric]).sort();
            
            dates.forEach((date, index) => {
                if (index < windowSize - 1) {
                    // Not enough data for window
                    movingAverages[metric][date] = dailyTotals[metric][date];
                } else {
                    // Calculate moving average
                    let sum = 0;
                    for (let i = 0; i < windowSize; i++) {
                        sum += dailyTotals[metric][dates[index - i]];
                    }
                    
                    movingAverages[metric][date] = sum / windowSize;
                }
            });
        });
        
        return movingAverages;
    }
    
    /**
     * Calculate trend lines using linear regression
     * @param {Object} dailyTotals 
     * @param {Array} dates 
     * @returns {Object} Trend lines
     */
    calculateTrendLines(dailyTotals, dates) {
        const trendLines = {};
        
        Object.keys(dailyTotals).forEach(metric => {
            // Convert dates to numerical x values (0, 1, 2, ...)
            const xValues = Array.from(Array(dates.length).keys());
            
            // Get y values (metric values)
            const yValues = dates.map(date => dailyTotals[metric][date] || 0);
            
            // Calculate linear regression
            const { slope, intercept } = this.linearRegression(xValues, yValues);
            
            // Generate trend line points
            const points = xValues.map(x => intercept + slope * x);
            
            // Calculate correlation coefficient
            const correlation = this.calculateCorrelation(xValues, yValues);
            
            // Calculate percent change from start to end
            const startValue = yValues[0] || 0.001; // Avoid division by zero
            const endValue = yValues[yValues.length - 1] || 0;
            const percentChange = ((endValue - startValue) / startValue) * 100;
            
            // Determine trend direction
            let direction = 'stable';
            if (percentChange > 5) direction = 'increasing';
            if (percentChange < -5) direction = 'decreasing';
            
            // Determine trend strength
            let strength = 'weak';
            const absCorrelation = Math.abs(correlation);
            if (absCorrelation > 0.5) strength = 'moderate';
            if (absCorrelation > 0.7) strength = 'strong';
            
            trendLines[metric] = {
                slope,
                intercept,
                points,
                correlation,
                percentChange,
                direction,
                strength
            };
        });
        
        return trendLines;
    }
    
    /**
     * Linear regression calculation
     * @param {Array} x X values
     * @param {Array} y Y values
     * @returns {Object} Slope and intercept
     */
    linearRegression(x, y) {
        const n = x.length;
        
        // Calculate means
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.reduce((sum, val) => sum + val, 0) / n;
        
        // Calculate slope
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (x[i] - meanX) * (y[i] - meanY);
            denominator += (x[i] - meanX) ** 2;
        }
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        // Calculate intercept
        const intercept = meanY - slope * meanX;
        
        return { slope, intercept };
    }
    
    /**
     * Calculate correlation coefficient
     * @param {Array} x X values
     * @param {Array} y Y values
     * @returns {number} Correlation coefficient
     */
    calculateCorrelation(x, y) {
        const n = x.length;
        
        // Calculate means
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = y.reduce((sum, val) => sum + val, 0) / n;
        
        // Calculate variances and covariance
        let varX = 0;
        let varY = 0;
        let covar = 0;
        
        for (let i = 0; i < n; i++) {
            varX += (x[i] - meanX) ** 2;
            varY += (y[i] - meanY) ** 2;
            covar += (x[i] - meanX) * (y[i] - meanY);
        }
        
        // Calculate correlation
        return varX !== 0 && varY !== 0 ? covar / Math.sqrt(varX * varY) : 0;
    }
    
    /**
     * Calculate variability (standard deviation)
     * @param {Object} dailyTotals 
     * @returns {Object} Variability
     */
    calculateVariability(dailyTotals) {
        const variability = {};
        
        Object.keys(dailyTotals).forEach(metric => {
            const values = Object.values(dailyTotals[metric]);
            
            // Calculate standard deviation
            const mean = this.calculateAverage(values);
            const squaredDiffs = values.map(val => (val - mean) ** 2);
            const variance = this.calculateAverage(squaredDiffs);
            const stdDev = Math.sqrt(variance);
            
            // Calculate coefficient of variation
            const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;
            
            variability[metric] = {
                mean,
                stdDev,
                cv,
                min: Math.min(...values),
                max: Math.max(...values),
                range: Math.max(...values) - Math.min(...values)
            };
        });
        
        return variability;
    }
    
    /**
     * Calculate average
     * @param {Array} values 
     * @returns {number} Average
     */
    calculateAverage(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    /**
     * Calculate changes between weeks
     * @param {Object} dailyTotals 
     * @param {Array} dates 
     * @returns {Object} Changes
     */
    calculateChanges(dailyTotals, dates) {
        const changes = {};
        
        if (dates.length < 14) {
            // Need at least 2 weeks for comparison
            return {
                hasSufficientData: false,
                message: 'Need at least 2 weeks of data for change analysis'
            };
        }
        
        // Split dates into weeks
        const weeks = [];
        let currentWeek = [];
        
        dates.forEach(date => {
            currentWeek.push(date);
            
            if (currentWeek.length === 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        });
        
        if (currentWeek.length > 0) {
            weeks.push([...currentWeek]);
        }
        
        // Calculate weekly averages
        const weeklyAverages = {};
        
        Object.keys(dailyTotals).forEach(metric => {
            weeklyAverages[metric] = [];
            
            weeks.forEach(weekDates => {
                const values = weekDates.map(date => dailyTotals[metric][date] || 0);
                const average = this.calculateAverage(values);
                weeklyAverages[metric].push(average);
            });
        });
        
        // Calculate changes between consecutive weeks
        Object.keys(weeklyAverages).forEach(metric => {
            changes[metric] = [];
            
            for (let i = 1; i < weeklyAverages[metric].length; i++) {
                const prevWeek = weeklyAverages[metric][i - 1];
                const currWeek = weeklyAverages[metric][i];
                
                // Avoid division by zero
                const percentChange = prevWeek !== 0 
                    ? ((currWeek - prevWeek) / prevWeek) * 100 
                    : 0;
                
                changes[metric].push({
                    week: i,
                    previous: prevWeek,
                    current: currWeek,
                    change: currWeek - prevWeek,
                    percentChange: percentChange
                });
            }
        });
        
        return {
            hasSufficientData: true,
            weeklyAverages,
            changes
        };
    }
    
    /**
     * Generate a summary of the trends
     * @param {Object} trendLines 
     * @param {Object} changes 
     * @param {Object} variability 
     * @returns {Object} Summary
     */
    generateTrendSummary(trendLines, changes, variability) {
        const summary = {
            significantTrends: [],
            keyMetrics: {},
            weeklyChanges: []
        };
        
        // Find significant trends
        Object.entries(trendLines).forEach(([metric, trend]) => {
            if (Math.abs(trend.correlation) > 0.5) {
                summary.significantTrends.push({
                    metric,
                    direction: trend.direction,
                    strength: trend.strength,
                    percentChange: trend.percentChange.toFixed(1)
                });
            }
            
            // Add key metrics summary
            summary.keyMetrics[metric] = {
                mean: variability[metric].mean.toFixed(1),
                consistency: (100 - variability[metric].cv).toFixed(1) + '%',
                trend: trend.direction
            };
        });
        
        // Add significant weekly changes
        if (changes.hasSufficientData) {
            Object.entries(changes.changes).forEach(([metric, weekChanges]) => {
                const lastChange = weekChanges[weekChanges.length - 1];
                
                if (Math.abs(lastChange.percentChange) > 10) {
                    summary.weeklyChanges.push({
                        metric,
                        week: lastChange.week,
                        percentChange: lastChange.percentChange.toFixed(1),
                        direction: lastChange.percentChange > 0 ? 'increase' : 'decrease'
                    });
                }
            });
        }
        
        return summary;
    }
    
    /**
     * Generate insights based on trends
     * @param {Array} meals 
     * @param {Object} trends 
     * @returns {Object} Generated insights
     */
    generateInsights(meals, trends) {
        // Return empty insights if no meals or trends
        if (!meals || meals.length === 0 || !trends || !trends.hasSufficientData) {
            return { 
                hasSufficientData: false,
                message: 'Insufficient data for insights' 
            };
        }
        
        // Generate nutrition recommendations
        const recommendations = [];
        
        // Define target ranges
        const targets = {
            protein: { min: 0.8, max: 2.0, unit: 'g/kg', description: 'of body weight' },
            carbs: { min: 45, max: 65, unit: '%', description: 'of total calories' },
            fat: { min: 20, max: 35, unit: '%', description: 'of total calories' },
            fiber: { min: 25, max: 38, unit: 'g', description: 'per day' },
            sodium: { min: 1500, max: 2300, unit: 'mg', description: 'per day' },
            sugar: { min: 0, max: 50, unit: 'g', description: 'per day' }
        };
        
        // Check each nutrient against targets
        if (trends.variability) {
            Object.entries(targets).forEach(([nutrient, target]) => {
                if (trends.variability[nutrient]) {
                    const meanValue = trends.variability[nutrient].mean;
                    
                    // Skip if insufficient data
                    if (meanValue === 0) return;
                    
                    let recommendation = null;
                    
                    // Check if value is outside target range
                    if (meanValue < target.min) {
                        recommendation = {
                            type: 'increase',
                            nutrient,
                            currentValue: meanValue.toFixed(1),
                            targetValue: `${target.min}-${target.max} ${target.unit}`,
                            description: `Your average ${nutrient} intake is below recommendations. Consider increasing ${nutrient} intake to ${target.min}+ ${target.unit} ${target.description}.`,
                            priority: nutrient === 'protein' || nutrient === 'fiber' ? 'high' : 'medium'
                        };
                    } else if (meanValue > target.max) {
                        recommendation = {
                            type: 'decrease',
                            nutrient,
                            currentValue: meanValue.toFixed(1),
                            targetValue: `${target.min}-${target.max} ${target.unit}`,
                            description: `Your average ${nutrient} intake is above recommendations. Consider reducing ${nutrient} intake to below ${target.max} ${target.unit} ${target.description}.`,
                            priority: nutrient === 'sodium' || nutrient === 'sugar' ? 'high' : 'medium'
                        };
                    }
                    
                    if (recommendation) {
                        recommendations.push(recommendation);
                    }
                }
            });
        }
        
        // Generate alerts for concerning trends
        const alerts = [];
        
        // Check for significant negative trends
        if (trends.trendLines) {
            Object.entries(trends.trendLines).forEach(([metric, trend]) => {
                // Skip metrics that aren't nutrients
                if (['mealTiming', 'mealSize'].includes(metric)) return;
                
                // Check for strong negative trends in important nutrients
                if (trend.direction === 'decreasing' && 
                    trend.strength !== 'weak' && 
                    ['protein', 'fiber', 'calories'].includes(metric)) {
                    
                    alerts.push({
                        type: 'trend',
                        metric,
                        direction: 'decreasing',
                        change: Math.abs(trend.percentChange).toFixed(1) + '%',
                        description: `Your ${metric} intake is trending down significantly. Monitor to ensure this aligns with your goals.`,
                        priority: metric === 'calories' ? 'medium' : 'high'
                    });
                }
            });
        }
        
        // Generate opportunity areas for improvement
        const opportunities = [];
        
        return {
            hasSufficientData: true,
            recommendations: recommendations,
            alerts: alerts,
            opportunities: opportunities,
            summary: `${recommendations.length} nutrition recommendations and ${alerts.length} alerts available.`
        };
    }
    
    /**
     * Detect patterns in meal data
     * @param {Array} meals 
     * @returns {Object} Detected patterns
     */
    detectPatterns(meals) {
        // Return empty patterns if no meals
        if (!meals || meals.length === 0) {
            return { 
                hasSufficientData: false,
                message: 'Insufficient data for pattern detection' 
            };
        }
        
        // Need at least 7 days for pattern detection
        const uniqueDates = new Set(meals.map(meal => meal.date.split('T')[0]));
        if (uniqueDates.size < 7) {
            return {
                hasSufficientData: false,
                message: 'Need at least 7 days of data for pattern detection',
                dates: uniqueDates.size
            };
        }
        
        // Detect meal timing patterns
        const mealTimingPatterns = this.detectMealTimingPatterns(meals);
        
        // Detect food combinations
        const foodCombinations = this.detectFoodCombinations(meals);
        
        // Detect weekday patterns
        const weekdayPatterns = this.detectWeekdayPatterns(meals);
        
        // Detect consistency patterns
        const consistencyPatterns = this.detectConsistencyPatterns(meals);
        
        return {
            hasSufficientData: true,
            mealTimingPatterns,
            foodCombinations,
            weekdayPatterns,
            consistencyPatterns,
            summary: this.generatePatternSummary(
                mealTimingPatterns, 
                foodCombinations, 
                weekdayPatterns, 
                consistencyPatterns
            )
        };
    }
    
    /**
     * Detect meal timing patterns
     * @param {Array} meals 
     * @returns {Array} Meal timing patterns
     */
    detectMealTimingPatterns(meals) {
        // Group meals by meal type
        const mealsByType = {};
        
        meals.forEach(meal => {
            if (!meal.mealType) return;
            
            if (!mealsByType[meal.mealType]) {
                mealsByType[meal.mealType] = [];
            }
            
            // Add meal time
            const mealDate = new Date(meal.date);
            const time = mealDate.getHours() + mealDate.getMinutes() / 60;
            
            mealsByType[meal.mealType].push({
                date: meal.date.split('T')[0],
                time: time
            });
        });
        
        // Analyze timing patterns for each meal type
        const mealTimingPatterns = [];
        
        Object.entries(mealsByType).forEach(([mealType, meals]) => {
            // Need at least 5 instances of a meal type to detect patterns
            if (meals.length < 5) return;
            
            // Calculate average time
            const times = meals.map(meal => meal.time);
            const averageTime = this.calculateAverage(times);
            
            // Calculate standard deviation to measure consistency
            const squaredDiffs = times.map(time => (time - averageTime) ** 2);
            const variance = this.calculateAverage(squaredDiffs);
            const stdDev = Math.sqrt(variance);
            
            // Convert average time to readable format
            const hours = Math.floor(averageTime);
            const minutes = Math.round((averageTime - hours) * 60);
            const period = hours >= 12 ? 'PM' : 'AM';
            const hour12 = hours % 12 === 0 ? 12 : hours % 12;
            const timeString = `${hour12}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
            
            // Determine consistency level
            let consistency = 'variable';
            if (stdDev < 0.5) consistency = 'very consistent';
            else if (stdDev < 1) consistency = 'consistent';
            else if (stdDev < 2) consistency = 'somewhat consistent';
            
            mealTimingPatterns.push({
                mealType: mealType,
                averageTime: averageTime,
                time: timeString,
                stdDev: stdDev,
                consistency: consistency,
                sampleSize: meals.length
            });
        });
        
        // Sort by meal time
        mealTimingPatterns.sort((a, b) => a.averageTime - b.averageTime);
        
        return mealTimingPatterns;
    }
    
    /**
     * Detect common food combinations
     * @param {Array} meals 
     * @returns {Array} Food combinations
     */
    detectFoodCombinations(meals) {
        // Create a map to track food combinations
        const combinationsMap = new Map();
        const mealTypeCounts = {};
        
        meals.forEach(meal => {
            if (!meal.foods || meal.foods.length < 2 || !meal.mealType) return;
            
            // Keep track of meal type counts
            if (!mealTypeCounts[meal.mealType]) {
                mealTypeCounts[meal.mealType] = 0;
            }
            mealTypeCounts[meal.mealType]++;
            
            // Get all food names
            const foodNames = meal.foods.map(food => food.name);
            
            // Generate combinations (pairs for simplicity)
            for (let i = 0; i < foodNames.length; i++) {
                for (let j = i + 1; j < foodNames.length; j++) {
                    // Sort foods to ensure consistent key
                    const combo = [foodNames[i], foodNames[j]].sort();
                    const key = `${combo.join('-')}:${meal.mealType}`;
                    
                    if (!combinationsMap.has(key)) {
                        combinationsMap.set(key, {
                            foods: combo,
                            mealType: meal.mealType,
                            count: 0
                        });
                    }
                    
                    combinationsMap.get(key).count++;
                }
            }
        });
        
        // Convert map to array and calculate frequencies
        const combinations = [];
        
        combinationsMap.forEach(combo => {
            const frequency = (combo.count / mealTypeCounts[combo.mealType]) * 100;
            
            // Only include combinations that appear frequently (>20%)
            if (frequency >= 20) {
                combinations.push({
                    foods: combo.foods,
                    mealType: combo.mealType,
                    count: combo.count,
                    frequency: Math.round(frequency)
                });
            }
        });
        
        // Sort by frequency
        combinations.sort((a, b) => b.frequency - a.frequency);
        
        return combinations;
    }
    
    /**
     * Detect patterns based on day of the week
     * @param {Array} meals 
     * @returns {Object} Weekday patterns
     */
    detectWeekdayPatterns(meals) {
        // Group meals by day of week
        const mealsByDay = {
            0: [], // Sunday
            1: [], // Monday
            2: [], // Tuesday
            3: [], // Wednesday
            4: [], // Thursday
            5: [], // Friday
            6: []  // Saturday
        };
        
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        meals.forEach(meal => {
            const mealDate = new Date(meal.date);
            const dayOfWeek = mealDate.getDay();
            
            mealsByDay[dayOfWeek].push(meal);
        });
        
        // Calculate daily nutrition metrics
        const dailyMetrics = {};
        
        for (let day = 0; day < 7; day++) {
            const dayMeals = mealsByDay[day];
            
            if (dayMeals.length === 0) continue;
            
            // Calculate total calories and macros
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            
            dayMeals.forEach(meal => {
                if (!meal.foods) return;
                
                meal.foods.forEach(food => {
                    if (!food.nutrients) return;
                    
                    totalCalories += (food.nutrients.calories || 0) * (food.quantity || 1);
                    totalProtein += (food.nutrients.protein || 0) * (food.quantity || 1);
                    totalCarbs += (food.nutrients.carbs || 0) * (food.quantity || 1);
                    totalFat += (food.nutrients.fat || 0) * (food.quantity || 1);
                });
            });
            
            // Calculate averages
            const dayCount = new Set(dayMeals.map(meal => meal.date.split('T')[0])).size;
            
            dailyMetrics[day] = {
                day: dayNames[day],
                calories: dayCount > 0 ? totalCalories / dayCount : 0,
                protein: dayCount > 0 ? totalProtein / dayCount : 0,
                carbs: dayCount > 0 ? totalCarbs / dayCount : 0,
                fat: dayCount > 0 ? totalFat / dayCount : 0,
                mealCount: dayMeals.length,
                dayCount: dayCount
            };
        }
        
        // Check if we have enough data for each day
        const daysWithData = Object.values(dailyMetrics).filter(metric => metric.dayCount > 0);
        
        if (daysWithData.length < 5) {
            return null; // Not enough data for meaningful weekday patterns
        }
        
        // Calculate weekday vs weekend differences
        const weekdayMetrics = [];
        const weekendMetrics = [];
        
        for (let day = 0; day < 7; day++) {
            if (dailyMetrics[day] && dailyMetrics[day].dayCount > 0) {
                if (day === 0 || day === 6) {
                    weekendMetrics.push(dailyMetrics[day]);
                } else {
                    weekdayMetrics.push(dailyMetrics[day]);
                }
            }
        }
        
        // Calculate averages
        const calcAvgMetric = (metrics, property) => {
            const values = metrics.filter(m => m && m[property]).map(m => m[property]);
            return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        };
        
        const weekdayAvg = {
            calories: calcAvgMetric(weekdayMetrics, 'calories'),
            protein: calcAvgMetric(weekdayMetrics, 'protein'),
            carbs: calcAvgMetric(weekdayMetrics, 'carbs'),
            fat: calcAvgMetric(weekdayMetrics, 'fat')
        };
        
        const weekendAvg = {
            calories: calcAvgMetric(weekendMetrics, 'calories'),
            protein: calcAvgMetric(weekendMetrics, 'protein'),
            carbs: calcAvgMetric(weekendMetrics, 'carbs'),
            fat: calcAvgMetric(weekendMetrics, 'fat')
        };
        
        // Calculate percentage differences
        const calcPercentDiff = (weekend, weekday) => {
            return weekday !== 0 ? ((weekend - weekday) / weekday) * 100 : 0;
        };
        
        const differences = {
            calories: calcPercentDiff(weekendAvg.calories, weekdayAvg.calories),
            protein: calcPercentDiff(weekendAvg.protein, weekdayAvg.protein),
            carbs: calcPercentDiff(weekendAvg.carbs, weekdayAvg.carbs),
            fat: calcPercentDiff(weekendAvg.fat, weekdayAvg.fat)
        };
        
        // Find significant differences for specific days
        const specificDayPatterns = [];
        const allDaysAvg = {
            calories: calcAvgMetric(Object.values(dailyMetrics), 'calories'),
            protein: calcAvgMetric(Object.values(dailyMetrics), 'protein'),
            carbs: calcAvgMetric(Object.values(dailyMetrics), 'carbs'),
            fat: calcAvgMetric(Object.values(dailyMetrics), 'fat')
        };
        
        for (let day = 0; day < 7; day++) {
            if (!dailyMetrics[day] || dailyMetrics[day].dayCount < 2) continue;
            
            const calorieDiff = calcPercentDiff(dailyMetrics[day].calories, allDaysAvg.calories);
            const proteinDiff = calcPercentDiff(dailyMetrics[day].protein, allDaysAvg.protein);
            
            // Check for significant differences (>15%)
            if (Math.abs(calorieDiff) > 15 || Math.abs(proteinDiff) > 15) {
                const metric = Math.abs(calorieDiff) > Math.abs(proteinDiff) ? 'calories' : 'protein';
                const diff = metric === 'calories' ? calorieDiff : proteinDiff;
                const direction = diff > 0 ? 'more' : 'less';
                
                specificDayPatterns.push({
                    day: dayNames[day],
                    metric: metric,
                    difference: Math.abs(diff).toFixed(1) + '%',
                    description: `You typically consume ${direction} ${metric} on ${dayNames[day]}s compared to other days.`
                });
            }
        }
        
        return {
            weekdayAvg,
            weekendAvg,
            differences,
            hasWeekendPattern: Math.abs(differences.calories) > 10 || Math.abs(differences.protein) > 10,
            weekendDifference: differences.calories,
            specificDayPatterns: specificDayPatterns
        };
    }
    
    /**
     * Detect consistency patterns in eating habits
     * @param {Array} meals 
     * @returns {Object} Consistency patterns
     */
    detectConsistencyPatterns(meals) {
        // Group meals by date
        const mealsByDate = {};
        
        meals.forEach(meal => {
            const date = meal.date.split('T')[0];
            
            if (!mealsByDate[date]) {
                mealsByDate[date] = [];
            }
            
            mealsByDate[date].push(meal);
        });
        
        const dates = Object.keys(mealsByDate).sort();
        
        // Calculate metrics for each day
        const dailyMetrics = dates.map(date => {
            const dayMeals = mealsByDate[date];
            
            // Count meals by type
            const mealCounts = {};
            dayMeals.forEach(meal => {
                if (!meal.mealType) return;
                
                if (!mealCounts[meal.mealType]) {
                    mealCounts[meal.mealType] = 0;
                }
                
                mealCounts[meal.mealType]++;
            });
            
            // Calculate total calories
            let totalCalories = 0;
            
            dayMeals.forEach(meal => {
                if (!meal.foods) return;
                
                meal.foods.forEach(food => {
                    if (!food.nutrients) return;
                    
                    totalCalories += (food.nutrients.calories || 0) * (food.quantity || 1);
                });
            });
            
            return {
                date,
                mealCount: dayMeals.length,
                mealCounts,
                totalCalories
            };
        });
        
        // Calculate consistency metrics
        const mealCountArray = dailyMetrics.map(day => day.mealCount);
        const calorieArray = dailyMetrics.map(day => day.totalCalories);
        
        const mealCountStdDev = this.calculateStandardDeviation(mealCountArray);
        const calorieStdDev = this.calculateStandardDeviation(calorieArray);
        
        const mealCountAvg = this.calculateAverage(mealCountArray);
        const calorieAvg = this.calculateAverage(calorieArray);
        
        // Calculate coefficient of variation (CV) to measure consistency
        const mealCountCV = mealCountAvg !== 0 ? (mealCountStdDev / mealCountAvg) * 100 : 0;
        const calorieCV = calorieAvg !== 0 ? (calorieStdDev / calorieAvg) * 100 : 0;
        
        // Determine consistency levels
        const getMealConsistencyLevel = (cv) => {
            if (cv < 15) return 'very consistent';
            if (cv < 25) return 'consistent';
            if (cv < 35) return 'somewhat consistent';
            return 'variable';
        };
        
        const getCalorieConsistencyLevel = (cv) => {
            if (cv < 20) return 'very consistent';
            if (cv < 30) return 'consistent';
            if (cv < 40) return 'somewhat consistent';
            return 'variable';
        };
        
        return {
            mealCount: {
                average: mealCountAvg.toFixed(1),
                stdDev: mealCountStdDev.toFixed(1),
                cv: mealCountCV.toFixed(1),
                level: getMealConsistencyLevel(mealCountCV)
            },
            calories: {
                average: calorieAvg.toFixed(0),
                stdDev: calorieStdDev.toFixed(0),
                cv: calorieCV.toFixed(1),
                level: getCalorieConsistencyLevel(calorieCV)
            }
        };
    }
    
    /**
     * Calculate standard deviation
     * @param {Array} values 
     * @returns {number} Standard deviation
     */
    calculateStandardDeviation(values) {
        const mean = this.calculateAverage(values);
        const squaredDiffs = values.map(val => (val - mean) ** 2);
        const variance = this.calculateAverage(squaredDiffs);
        return Math.sqrt(variance);
    }
    
    /**
     * Generate a summary of detected patterns
     * @param {Array} mealTimingPatterns 
     * @param {Array} foodCombinations 
     * @param {Object} weekdayPatterns 
     * @param {Object} consistencyPatterns 
     * @returns {Object} Pattern summary
     */
    generatePatternSummary(mealTimingPatterns, foodCombinations, weekdayPatterns, consistencyPatterns) {
        const summary = {
            mealTiming: [],
            foodCombinations: [],
            weekdayPatterns: [],
            consistency: []
        };
        
        // Add meal timing patterns
        if (mealTimingPatterns && mealTimingPatterns.length > 0) {
            mealTimingPatterns.forEach(pattern => {
                summary.mealTiming.push({
                    mealType: pattern.mealType,
                    time: pattern.time,
                    consistency: pattern.consistency
                });
            });
        }
        
        // Add food combinations
        if (foodCombinations && foodCombinations.length > 0) {
            foodCombinations.forEach(combo => {
                summary.foodCombinations.push({
                    foods: combo.foods,
                    mealType: combo.mealType,
                    frequency: combo.frequency + '%'
                });
            });
        }
        
        // Add weekday patterns
        if (weekdayPatterns) {
            if (weekdayPatterns.hasWeekendPattern) {
                const direction = weekdayPatterns.weekendDifference > 0 ? 'more' : 'less';
                const nutrient = Math.abs(weekdayPatterns.differences.calories) > 
                                 Math.abs(weekdayPatterns.differences.protein) ? 
                                 'calories' : 'protein';
                
                summary.weekdayPatterns.push({
                    type: 'weekend',
                    description: `You tend to consume ${direction} ${nutrient} on weekends compared to weekdays (${Math.abs(weekdayPatterns.weekendDifference).toFixed(1)}% difference).`
                });
            }
            
            if (weekdayPatterns.specificDayPatterns) {
                weekdayPatterns.specificDayPatterns.forEach(dayPattern => {
                    summary.weekdayPatterns.push({
                        type: 'specificDay',
                        day: dayPattern.day,
                        description: dayPattern.description
                    });
                });
            }
        }
        
        // Add consistency insights
        if (consistencyPatterns) {
            summary.consistency.push({
                type: 'mealCount',
                level: consistencyPatterns.mealCount.level,
                description: `You have ${consistencyPatterns.mealCount.level} meal timing with an average of ${consistencyPatterns.mealCount.average} meals per day.`
            });
            
            summary.consistency.push({
                type: 'calories',
                level: consistencyPatterns.calories.level,
                description: `Your daily calorie intake is ${consistencyPatterns.calories.level} at around ${consistencyPatterns.calories.average} calories per day.`
            });
        }
        
        return summary;
    }
    
    /**
     * Calculate data quality score based on completeness, consistency, and recency
     * @param {Array} meals The meals data to analyze
     * @param {Date} startDate The start date of the analysis period
     * @param {Date} endDate The end date of the analysis period
     * @returns {Object} Data quality metrics
     */
    calculateDataQuality(meals, startDate, endDate) {
        if (!meals || meals.length === 0) {
            return {
                score: 1,
                completeness: 0,
                consistency: 0,
                detailLevel: 0,
                issues: ["No meal data available"]
            };
        }
        
        // Convert date objects to date strings for comparison
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        
        // Calculate total days in the period
        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Group meals by date
        const mealsByDate = {};
        meals.forEach(meal => {
            const date = meal.date.split('T')[0];
            if (!mealsByDate[date]) {
                mealsByDate[date] = [];
            }
            mealsByDate[date].push(meal);
        });
        
        // Get unique dates with logged meals
        const datesWithMeals = Object.keys(mealsByDate).filter(date => 
            date >= startStr && date <= endStr
        );
        
        // Calculate data completeness (% of days with at least one meal logged)
        const completeness = totalDays > 0 ? (datesWithMeals.length / totalDays) * 100 : 0;
        
        // Calculate logging consistency (regularity of logging)
        let consistency = 0;
        if (datesWithMeals.length > 1) {
            // Sort dates
            const sortedDates = datesWithMeals.sort();
            
            // Calculate gaps between consecutive logging days
            const gaps = [];
            for (let i = 1; i < sortedDates.length; i++) {
                const prevDate = new Date(sortedDates[i-1]);
                const currDate = new Date(sortedDates[i]);
                const gap = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
                gaps.push(gap);
            }
            
            // Calculate average gap
            const avgGap = this.calculateAverage(gaps);
            
            // Score consistency (1 is perfect - logging every day)
            // Higher gaps mean lower consistency
            consistency = Math.max(0, 100 - (avgGap - 1) * 25);
        }
        
        // Calculate detail level (average number of foods per meal and nutrient completeness)
        let detailLevel = 0;
        let totalFoods = 0;
        let totalNutrients = 0;
        let totalPossibleNutrients = 0;
        let mealCount = 0;
        
        // Key nutrients to check for completeness
        const keyNutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar'];
        
        for (const date in mealsByDate) {
            const dayMeals = mealsByDate[date];
            dayMeals.forEach(meal => {
                mealCount++;
                if (meal.foods && Array.isArray(meal.foods)) {
                    totalFoods += meal.foods.length;
                    
                    // Check nutrient completeness
                    meal.foods.forEach(food => {
                        if (food.nutrients) {
                            keyNutrients.forEach(nutrient => {
                                totalPossibleNutrients++;
                                if (food.nutrients[nutrient] !== undefined) {
                                    totalNutrients++;
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Calculate average foods per meal
        const avgFoodsPerMeal = mealCount > 0 ? totalFoods / mealCount : 0;
        
        // Calculate nutrient completeness
        const nutrientCompleteness = totalPossibleNutrients > 0 ? 
            (totalNutrients / totalPossibleNutrients) * 100 : 0;
        
        // Combine into detail level score
        detailLevel = (Math.min(avgFoodsPerMeal, 5) / 5 * 50) + (nutrientCompleteness * 0.5);
        
        // Identify quality issues
        const issues = [];
        
        if (completeness < 50) {
            issues.push("Low data completeness - logging on more days will improve insights");
        }
        
        if (consistency < 50) {
            issues.push("Irregular logging pattern - more consistent daily logging recommended");
        }
        
        if (detailLevel < 50) {
            issues.push("Low detail level - adding more food details and nutrients will improve analysis");
        }
        
        if (totalDays > 14 && datesWithMeals.length < 7) {
            issues.push("Insufficient data - at least 7 days of logs needed for reliable patterns");
        }
        
        // Calculate overall score (weighted average)
        const score = (completeness * 0.4 + consistency * 0.3 + detailLevel * 0.3) / 100;
        
        // Scale score from 0-5
        const scaledScore = Math.max(1, Math.min(5, Math.round(score * 5)));
        
        return {
            score: scaledScore,
            completeness: Math.round(completeness),
            consistency: Math.round(consistency),
            detailLevel: Math.round(detailLevel),
            issues
        };
    }
}

// Create and export instance
const advancedAnalytics = new AdvancedAnalytics();
window.advancedAnalytics = advancedAnalytics;

export default advancedAnalytics; 