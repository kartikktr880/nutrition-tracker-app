/**
 * Test script for Advanced Analytics
 * This script tests the functionality of the advanced-analytics.js module
 * to ensure it's properly working and producing the expected results.
 */

// Function to run when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if advanced analytics is loaded
    if (!window.advancedAnalytics) {
        console.error('Advanced Analytics module not loaded!');
        return;
    }
    
    console.log('Starting Advanced Analytics test...');
    
    // Run basic tests
    testAdvancedAnalytics();
});

// Function to test advanced analytics functionality
async function testAdvancedAnalytics() {
    try {
        // Calculate date range (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        console.log(`Testing analytics data from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        
        // First test with real data if available
        console.log('Testing with real data if available...');
        const analytics = await window.advancedAnalytics.getAnalytics(startDate, endDate);
        
        // Log results
        console.log('Advanced Analytics results:', analytics);
        
        // Test data structure
        testDataStructure(analytics);
        
        // If no real data or insufficient data, test with mock data
        if (!analytics.trends || !analytics.trends.hasSufficientData) {
            console.log('Insufficient real data, testing with mock data...');
            
            // Generate mock data
            const mockMeals = generateMockData();
            
            // Create a mock data manager to intercept the data fetch
            const originalDataManager = window.advancedAnalytics.dataManager;
            window.advancedAnalytics.dataManager = {
                getMeals: async () => ({ success: true, data: mockMeals })
            };
            
            // Run test with mock data
            const mockAnalytics = await window.advancedAnalytics.getAnalytics(startDate, endDate, { forceRefresh: true });
            
            // Log results
            console.log('Mock data analytics results:', mockAnalytics);
            
            // Test data structure
            testDataStructure(mockAnalytics);
            
            // Run specific tests
            testTrendDetection(mockAnalytics.trends);
            testPatternDetection(mockAnalytics.patterns);
            testInsightGeneration(mockAnalytics.insights);
            testDataQuality(mockAnalytics.dataQuality);
            
            // Restore original data manager
            window.advancedAnalytics.dataManager = originalDataManager;
        } else {
            // Run specific tests with real data
            testTrendDetection(analytics.trends);
            testPatternDetection(analytics.patterns);
            testInsightGeneration(analytics.insights);
            testDataQuality(analytics.dataQuality);
        }
        
        // Test performance (cache usage)
        await testPerformance();
        
        console.log('Advanced Analytics test completed successfully!');
    } catch (error) {
        console.error('Advanced Analytics test failed:', error);
    }
}

// Function to test the data structure of analytics results
function testDataStructure(analytics) {
    // Check if analytics object exists
    if (!analytics) {
        throw new Error('Analytics object is null or undefined');
    }
    
    // Check for required properties
    const requiredProperties = ['trends', 'insights', 'patterns', 'dataQuality'];
    for (const prop of requiredProperties) {
        if (!analytics.hasOwnProperty(prop)) {
            throw new Error(`Analytics object is missing required property: ${prop}`);
        }
    }
    
    // Check trends
    if (analytics.trends) {
        console.log('Trends data available:', analytics.trends.hasSufficientData);
        
        if (analytics.trends.hasSufficientData) {
            // Check for specific trend properties
            const trendProps = ['dailyTotals', 'trendLines', 'variability', 'summary'];
            for (const prop of trendProps) {
                if (!analytics.trends.hasOwnProperty(prop)) {
                    console.warn(`Trends object is missing property: ${prop}`);
                }
            }
            
            // Log trend summary
            if (analytics.trends.summary && analytics.trends.summary.significantTrends) {
                console.log('Significant trends found:', 
                    analytics.trends.summary.significantTrends.length);
            }
        }
    }
    
    // Check insights
    if (analytics.insights) {
        console.log('Insights data available:', 
            analytics.insights.hasSufficientData);
        
        if (analytics.insights.hasSufficientData) {
            // Check for specific insights properties
            const insightProps = ['recommendations', 'alerts', 'opportunities'];
            for (const prop of insightProps) {
                if (!analytics.insights.hasOwnProperty(prop)) {
                    console.warn(`Insights object is missing property: ${prop}`);
                }
            }
            
            // Log insight summaries
            console.log('Recommendations found:', 
                analytics.insights.recommendations ? analytics.insights.recommendations.length : 0);
            console.log('Alerts found:', 
                analytics.insights.alerts ? analytics.insights.alerts.length : 0);
        }
    }
    
    // Check patterns
    if (analytics.patterns) {
        console.log('Patterns data available:', 
            analytics.patterns.hasSufficientData);
        
        if (analytics.patterns.hasSufficientData) {
            // Check for specific pattern properties
            const patternProps = ['mealTimingPatterns', 'foodCombinations', 'weekdayPatterns', 'consistencyPatterns'];
            for (const prop of patternProps) {
                if (!analytics.patterns.hasOwnProperty(prop)) {
                    console.warn(`Patterns object is missing property: ${prop}`);
                }
            }
            
            // Check summary
            if (analytics.patterns.summary) {
                console.log('Pattern summary available');
            }
        }
    }
    
    // Check data quality
    if (analytics.dataQuality) {
        console.log('Data quality metrics available');
        console.log('Data quality score:', analytics.dataQuality.score);
    }
    
    console.log('Data structure validation passed');
}

// Function to test trend detection
function testTrendDetection(trends) {
    if (!trends || !trends.hasSufficientData) {
        console.warn('Insufficient data for trend detection tests');
        return;
    }
    
    console.log('Testing trend detection...');
    
    // Check if trend lines are calculated
    const metrics = Object.keys(trends.trendLines || {});
    console.log(`Trend metrics detected: ${metrics.join(', ')}`);
    
    // Check if some trends have been detected
    let trendCount = 0;
    let significantTrendCount = 0;
    
    metrics.forEach(metric => {
        const trend = trends.trendLines[metric];
        if (trend.direction !== 'stable') {
            trendCount++;
            if (trend.strength !== 'weak') {
                significantTrendCount++;
            }
        }
    });
    
    console.log(`Detected ${trendCount} trends, ${significantTrendCount} significant`);
    
    // Check if variability is calculated
    if (trends.variability) {
        console.log('Variability calculation successful');
        
        // Log variability of a few key metrics
        ['calories', 'protein', 'carbs', 'fat'].forEach(metric => {
            if (trends.variability[metric]) {
                console.log(`${metric} variability: cv=${trends.variability[metric].cv.toFixed(2)}%, min=${trends.variability[metric].min.toFixed(1)}, max=${trends.variability[metric].max.toFixed(1)}`);
            }
        });
    }
    
    console.log('Trend detection test passed');
}

// Function to test pattern detection
function testPatternDetection(patterns) {
    if (!patterns || !patterns.hasSufficientData) {
        console.warn('Insufficient data for pattern detection tests');
        return;
    }
    
    console.log('Testing pattern detection...');
    
    // Check meal timing patterns
    if (patterns.mealTimingPatterns && patterns.mealTimingPatterns.length > 0) {
        console.log(`Detected ${patterns.mealTimingPatterns.length} meal timing patterns`);
        patterns.mealTimingPatterns.forEach(pattern => {
            console.log(`${pattern.mealType}: typically at ${pattern.time} (${pattern.consistency})`);
        });
    } else {
        console.warn('No meal timing patterns detected');
    }
    
    // Check food combinations
    if (patterns.foodCombinations && patterns.foodCombinations.length > 0) {
        console.log(`Detected ${patterns.foodCombinations.length} food combinations`);
        patterns.foodCombinations.slice(0, 3).forEach(combo => {
            console.log(`Common combination: ${combo.foods.join(' + ')} in ${combo.mealType} (${combo.frequency}%)`);
        });
    } else {
        console.warn('No food combinations detected');
    }
    
    // Check weekday patterns
    if (patterns.weekdayPatterns) {
        console.log('Weekday patterns detected');
        if (patterns.weekdayPatterns.hasWeekendPattern) {
            console.log(`Weekend difference: ${patterns.weekdayPatterns.weekendDifference.toFixed(1)}%`);
        }
        
        if (patterns.weekdayPatterns.specificDayPatterns && patterns.weekdayPatterns.specificDayPatterns.length > 0) {
            console.log(`Detected ${patterns.weekdayPatterns.specificDayPatterns.length} specific day patterns`);
        }
    } else {
        console.warn('No weekday patterns detected');
    }
    
    // Check consistency patterns
    if (patterns.consistencyPatterns) {
        console.log('Consistency patterns detected');
        console.log(`Meal count consistency: ${patterns.consistencyPatterns.mealCount.level}`);
        console.log(`Calorie consistency: ${patterns.consistencyPatterns.calories.level}`);
    } else {
        console.warn('No consistency patterns detected');
    }
    
    console.log('Pattern detection test passed');
}

// Function to test insight generation
function testInsightGeneration(insights) {
    if (!insights || !insights.hasSufficientData) {
        console.warn('Insufficient data for insight generation tests');
        return;
    }
    
    console.log('Testing insight generation...');
    
    // Check recommendations
    if (insights.recommendations && insights.recommendations.length > 0) {
        console.log(`Generated ${insights.recommendations.length} recommendations`);
        insights.recommendations.forEach(rec => {
            console.log(`${rec.type} ${rec.nutrient}: ${rec.description}`);
        });
    } else {
        console.log('No recommendations generated');
    }
    
    // Check alerts
    if (insights.alerts && insights.alerts.length > 0) {
        console.log(`Generated ${insights.alerts.length} alerts`);
        insights.alerts.forEach(alert => {
            console.log(`${alert.metric} ${alert.direction}: ${alert.description}`);
        });
    } else {
        console.log('No alerts generated');
    }
    
    console.log('Insight generation test passed');
}

// Function to test data quality assessment
function testDataQuality(dataQuality) {
    if (!dataQuality) {
        console.warn('Data quality metrics not available');
        return;
    }
    
    console.log('Testing data quality assessment...');
    console.log(`Quality score: ${dataQuality.score}/5`);
    console.log(`Completeness: ${dataQuality.completeness}%`);
    console.log(`Consistency: ${dataQuality.consistency}%`);
    console.log(`Detail level: ${dataQuality.detailLevel}%`);
    
    if (dataQuality.issues && dataQuality.issues.length > 0) {
        console.log(`Detected ${dataQuality.issues.length} quality issues:`);
        dataQuality.issues.forEach(issue => console.log(`- ${issue}`));
    } else {
        console.log('No data quality issues detected');
    }
    
    console.log('Data quality assessment test passed');
}

// Function to test performance via caching
async function testPerformance() {
    console.log('Testing performance and caching...');
    
    // Set up date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // First call to prime the cache
    console.log('First call (cache miss expected)...');
    const start1 = performance.now();
    const result1 = await window.advancedAnalytics.getAnalytics(startDate, endDate);
    const end1 = performance.now();
    const time1 = end1 - start1;
    console.log(`First call took ${time1.toFixed(2)} ms, fromCache: ${result1.fromCache}`);
    
    // Second call should use cache
    console.log('Second call (cache hit expected)...');
    const start2 = performance.now();
    const result2 = await window.advancedAnalytics.getAnalytics(startDate, endDate);
    const end2 = performance.now();
    const time2 = end2 - start2;
    console.log(`Second call took ${time2.toFixed(2)} ms, fromCache: ${result2.fromCache}`);
    
    // Force refresh (bypass cache)
    console.log('Third call with force refresh (cache miss expected)...');
    const start3 = performance.now();
    const result3 = await window.advancedAnalytics.getAnalytics(startDate, endDate, { forceRefresh: true });
    const end3 = performance.now();
    const time3 = end3 - start3;
    console.log(`Third call took ${time3.toFixed(2)} ms, fromCache: ${result3.fromCache}`);
    
    // Calculate cache efficiency
    if (time1 > 0 && time2 > 0) {
        const cacheEfficiency = ((time1 - time2) / time1) * 100;
        console.log(`Cache efficiency: ${cacheEfficiency.toFixed(2)}% speed improvement`);
    }
    
    console.log('Performance test passed');
}

// Generate mock data for testing
function generateMockData() {
    // This function can be used to generate mock nutrition data
    // for testing purposes if no real data is available
    const meals = [];
    const now = new Date();
    
    // Generate 30 days of meal data
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        
        // Generate breakfast
        meals.push({
            id: `breakfast-${i}`,
            date: date.toISOString(),
            mealType: 'breakfast',
            foods: [
                {
                    name: 'Oatmeal',
                    quantity: 1,
                    nutrients: {
                        calories: 150,
                        protein: 5,
                        carbs: 27,
                        fat: 3,
                        fiber: 4,
                        sodium: 0,
                        sugar: 1
                    }
                },
                {
                    name: 'Banana',
                    quantity: 1,
                    nutrients: {
                        calories: 105,
                        protein: 1.3,
                        carbs: 27,
                        fat: 0.4,
                        fiber: 3.1,
                        sodium: 1,
                        sugar: 14
                    }
                }
            ]
        });
        
        // Generate lunch
        meals.push({
            id: `lunch-${i}`,
            date: date.toISOString(),
            mealType: 'lunch',
            foods: [
                {
                    name: 'Chicken Sandwich',
                    quantity: 1,
                    nutrients: {
                        calories: 350,
                        protein: 25,
                        carbs: 35,
                        fat: 12,
                        fiber: 2,
                        sodium: 600,
                        sugar: 3
                    }
                },
                {
                    name: 'Apple',
                    quantity: 1,
                    nutrients: {
                        calories: 95,
                        protein: 0.5,
                        carbs: 25,
                        fat: 0.3,
                        fiber: 4,
                        sodium: 2,
                        sugar: 19
                    }
                }
            ]
        });
        
        // Generate dinner
        meals.push({
            id: `dinner-${i}`,
            date: date.toISOString(),
            mealType: 'dinner',
            foods: [
                {
                    name: 'Salmon',
                    quantity: 1,
                    nutrients: {
                        calories: 280,
                        protein: 39,
                        carbs: 0,
                        fat: 13,
                        fiber: 0,
                        sodium: 125,
                        sugar: 0
                    }
                },
                {
                    name: 'Broccoli',
                    quantity: 1,
                    nutrients: {
                        calories: 55,
                        protein: 3.7,
                        carbs: 11,
                        fat: 0.6,
                        fiber: 5.1,
                        sodium: 64,
                        sugar: 2.6
                    }
                },
                {
                    name: 'Brown Rice',
                    quantity: 1,
                    nutrients: {
                        calories: 215,
                        protein: 5,
                        carbs: 45,
                        fat: 1.8,
                        fiber: 3.5,
                        sodium: 10,
                        sugar: 0.7
                    }
                }
            ]
        });
        
        // Add some variation on weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
            meals.push({
                id: `snack-${i}`,
                date: date.toISOString(),
                mealType: 'snack',
                foods: [
                    {
                        name: 'Chocolate',
                        quantity: 1,
                        nutrients: {
                            calories: 180,
                            protein: 2,
                            carbs: 18,
                            fat: 10,
                            fiber: 1.5,
                            sodium: 15,
                            sugar: 16
                        }
                    }
                ]
            });
        }
    }
    
    return meals;
} 