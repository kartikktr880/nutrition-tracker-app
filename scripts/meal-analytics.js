import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Enhanced Meal Analytics
 * Provides sophisticated meal analysis and suggestions
 */

class MealAnalytics {
    constructor() {
        this.cache = new Map();
        this.patterns = new Map();
        this.preferences = new Map();
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        // Add analytics button to header
        const headerActions = document.querySelector('.planner-actions');
        const analyticsButton = document.createElement('button');
        analyticsButton.className = 'btn btn-secondary';
        analyticsButton.innerHTML = '<i class="fas fa-chart-line"></i> View Insights';
        analyticsButton.addEventListener('click', () => this.showAnalytics());
        headerActions.appendChild(analyticsButton);

        // Initialize pattern detection
        this.initializePatternDetection();
        
        // Load user preferences
        await this.loadUserPreferences();
        
        this.isInitialized = true;
    }

    initializePatternDetection() {
        // Define pattern types
        this.patternTypes = {
            MEAL_TIMING: 'mealTiming',
            NUTRITION_BALANCE: 'nutritionBalance',
            INGREDIENT_COMBINATIONS: 'ingredientCombinations',
            SEASONAL_PREFERENCES: 'seasonalPreferences',
            MEAL_VARIETY: 'mealVariety'
        };

        // Initialize pattern analyzers
        this.patternAnalyzers = new Map([
            [this.patternTypes.MEAL_TIMING, this.analyzeMealTiming.bind(this)],
            [this.patternTypes.NUTRITION_BALANCE, this.analyzeNutritionBalance.bind(this)],
            [this.patternTypes.INGREDIENT_COMBINATIONS, this.analyzeIngredientCombinations.bind(this)],
            [this.patternTypes.SEASONAL_PREFERENCES, this.analyzeSeasonalPreferences.bind(this)],
            [this.patternTypes.MEAL_VARIETY, this.analyzeMealVariety.bind(this)]
        ]);
    }

    async loadUserPreferences() {
        try {
            const storedPreferences = localStorage.getItem('userPreferences');
            if (storedPreferences) {
                this.preferences = new Map(Object.entries(JSON.parse(storedPreferences)));
            } else {
                // Initialize default preferences
                this.preferences = new Map([
                    ['dietaryRestrictions', []],
                    ['favoriteIngredients', []],
                    ['dislikedIngredients', []],
                    ['mealPreferences', {}],
                    ['nutritionGoals', {
                        calories: 2000,
                        protein: 50,
                        carbs: 250,
                        fat: 70
                    }]
                ]);
            }
        } catch (error) {
            logError('Error loading user preferences:', error);
            this.preferences = new Map();
        }
    }

    async analyzeMealPatterns(meals) {
        const patterns = {};
        
        // Run all pattern analyzers
        for (const [type, analyzer] of this.patternAnalyzers) {
            patterns[type] = await analyzer(meals);
        }

        // Store patterns
        this.patterns = new Map(Object.entries(patterns));
        
        return patterns;
    }

    async analyzeMealTiming(meals) {
        const timingPatterns = {
            averageIntervals: {},
            commonTimes: {},
            consistency: 0
        };

        // Group meals by type
        const mealsByType = this.groupMealsByType(meals);
        
        // Analyze timing for each meal type
        for (const [type, typeMeals] of Object.entries(mealsByType)) {
            const intervals = this.calculateMealIntervals(typeMeals);
            timingPatterns.averageIntervals[type] = this.calculateAverageInterval(intervals);
            timingPatterns.commonTimes[type] = this.findCommonMealTimes(typeMeals);
        }

        // Calculate consistency score
        timingPatterns.consistency = this.calculateTimingConsistency(timingPatterns.averageIntervals);

        return timingPatterns;
    }

    async analyzeNutritionBalance(meals) {
        const balance = {
            macroDistribution: {},
            dailyAverages: {},
            consistency: 0,
            gaps: []
        };

        // Calculate daily nutrition totals
        const dailyTotals = this.calculateDailyNutritionTotals(meals);
        
        // Analyze macro distribution
        balance.macroDistribution = this.calculateMacroDistribution(dailyTotals);
        
        // Calculate daily averages
        balance.dailyAverages = this.calculateDailyAverages(dailyTotals);
        
        // Identify nutrition gaps
        balance.gaps = this.identifyNutritionGaps(balance.dailyAverages);
        
        // Calculate consistency score
        balance.consistency = this.calculateNutritionConsistency(dailyTotals);

        return balance;
    }

    async analyzeIngredientCombinations(meals) {
        const combinations = {
            frequentPairs: [],
            successfulCombinations: [],
            seasonalIngredients: {},
            varietyScore: 0
        };

        // Extract all ingredients
        const allIngredients = this.extractIngredients(meals);
        
        // Find frequent ingredient pairs
        combinations.frequentPairs = this.findFrequentPairs(allIngredients);
        
        // Identify successful combinations
        combinations.successfulCombinations = this.identifySuccessfulCombinations(meals);
        
        // Analyze seasonal ingredients
        combinations.seasonalIngredients = this.analyzeSeasonalIngredients(allIngredients);
        
        // Calculate variety score
        combinations.varietyScore = this.calculateIngredientVariety(allIngredients);

        return combinations;
    }

    async analyzeSeasonalPreferences(meals) {
        const preferences = {
            seasonalTrends: {},
            seasonalIngredients: {},
            seasonalMeals: {},
            consistency: 0
        };

        // Group meals by season
        const mealsBySeason = this.groupMealsBySeason(meals);
        
        // Analyze seasonal trends
        preferences.seasonalTrends = this.analyzeSeasonalTrends(mealsBySeason);
        
        // Identify seasonal ingredients
        preferences.seasonalIngredients = this.identifySeasonalIngredients(mealsBySeason);
        
        // Find seasonal meal patterns
        preferences.seasonalMeals = this.findSeasonalMealPatterns(mealsBySeason);
        
        // Calculate seasonal consistency
        preferences.consistency = this.calculateSeasonalConsistency(preferences.seasonalTrends);

        return preferences;
    }

    async analyzeMealVariety(meals) {
        const variety = {
            mealTypeDistribution: {},
            cuisineTypes: {},
            preparationMethods: {},
            varietyScore: 0
        };

        // Analyze meal type distribution
        variety.mealTypeDistribution = this.analyzeMealTypeDistribution(meals);
        
        // Identify cuisine types
        variety.cuisineTypes = this.identifyCuisineTypes(meals);
        
        // Analyze preparation methods
        variety.preparationMethods = this.analyzePreparationMethods(meals);
        
        // Calculate overall variety score
        variety.varietyScore = this.calculateOverallVarietyScore(variety);

        return variety;
    }

    generateMealSuggestions(patterns, preferences) {
        const suggestions = [];
        
        // Generate suggestions based on patterns
        for (const [type, pattern] of this.patterns) {
            const typeSuggestions = this.generateTypeSpecificSuggestions(type, pattern, preferences);
            suggestions.push(...typeSuggestions);
        }

        // Score and rank suggestions
        const scoredSuggestions = this.scoreSuggestions(suggestions, patterns, preferences);
        
        // Filter and return top suggestions
        return this.filterTopSuggestions(scoredSuggestions);
    }

    generateTypeSpecificSuggestions(type, pattern, preferences) {
        switch (type) {
            case this.patternTypes.MEAL_TIMING:
                return this.generateTimingBasedSuggestions(pattern, preferences);
            case this.patternTypes.NUTRITION_BALANCE:
                return this.generateNutritionBasedSuggestions(pattern, preferences);
            case this.patternTypes.INGREDIENT_COMBINATIONS:
                return this.generateIngredientBasedSuggestions(pattern, preferences);
            case this.patternTypes.SEASONAL_PREFERENCES:
                return this.generateSeasonalSuggestions(pattern, preferences);
            case this.patternTypes.MEAL_VARIETY:
                return this.generateVarietyBasedSuggestions(pattern, preferences);
            default:
                return [];
        }
    }

    scoreSuggestions(suggestions, patterns, preferences) {
        return suggestions.map(suggestion => ({
            ...suggestion,
            score: this.calculateSuggestionScore(suggestion, patterns, preferences)
        }));
    }

    calculateSuggestionScore(suggestion, patterns, preferences) {
        let score = 0;
        
        // Score based on nutrition balance
        score += this.scoreNutritionBalance(suggestion, patterns.nutritionBalance);
        
        // Score based on timing
        score += this.scoreMealTiming(suggestion, patterns.mealTiming);
        
        // Score based on preferences
        score += this.scoreUserPreferences(suggestion, preferences);
        
        // Score based on variety
        score += this.scoreMealVariety(suggestion, patterns.mealVariety);
        
        return score;
    }

    filterTopSuggestions(suggestions, limit = 5) {
        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // Helper methods
    groupMealsByType(meals) {
        const grouped = {};
        meals.forEach(meal => {
            if (!grouped[meal.type]) {
                grouped[meal.type] = [];
            }
            grouped[meal.type].push(meal);
        });
        return grouped;
    }

    calculateMealIntervals(meals) {
        return meals
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .map((meal, index, array) => {
                if (index === 0) return null;
                return new Date(meal.time) - new Date(array[index - 1].time);
            })
            .filter(interval => interval !== null);
    }

    calculateAverageInterval(intervals) {
        if (!intervals.length) return 0;
        return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    findCommonMealTimes(meals) {
        const timeCounts = {};
        meals.forEach(meal => {
            const hour = new Date(meal.time).getHours();
            timeCounts[hour] = (timeCounts[hour] || 0) + 1;
        });
        return Object.entries(timeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    }

    calculateTimingConsistency(intervals) {
        if (!Object.keys(intervals).length) return 0;
        const values = Object.values(intervals);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
        return Math.max(0, 100 - (Math.sqrt(variance) / average * 100));
    }

    calculateDailyNutritionTotals(meals) {
        const dailyTotals = {};
        meals.forEach(meal => {
            const date = new Date(meal.time).toISOString().split('T')[0];
            if (!dailyTotals[date]) {
                dailyTotals[date] = {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                };
            }
            dailyTotals[date].calories += meal.calories || 0;
            dailyTotals[date].protein += meal.protein || 0;
            dailyTotals[date].carbs += meal.carbs || 0;
            dailyTotals[date].fat += meal.fat || 0;
        });
        return dailyTotals;
    }

    calculateMacroDistribution(dailyTotals) {
        const distribution = {
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        const days = Object.keys(dailyTotals).length;
        if (!days) return distribution;

        Object.values(dailyTotals).forEach(day => {
            distribution.protein += day.protein;
            distribution.carbs += day.carbs;
            distribution.fat += day.fat;
        });

        // Calculate percentages
        const total = distribution.protein + distribution.carbs + distribution.fat;
        if (total > 0) {
            distribution.protein = (distribution.protein / total) * 100;
            distribution.carbs = (distribution.carbs / total) * 100;
            distribution.fat = (distribution.fat / total) * 100;
        }

        return distribution;
    }

    calculateDailyAverages(dailyTotals) {
        const days = Object.keys(dailyTotals).length;
        if (!days) return {};

        return Object.values(dailyTotals).reduce((averages, day) => ({
            calories: averages.calories + day.calories / days,
            protein: averages.protein + day.protein / days,
            carbs: averages.carbs + day.carbs / days,
            fat: averages.fat + day.fat / days
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }

    identifyNutritionGaps(averages) {
        const gaps = [];
        const goals = this.preferences.get('nutritionGoals') || {};

        if (averages.protein < goals.protein * 0.8) {
            gaps.push({ nutrient: 'protein', current: averages.protein, target: goals.protein });
        }
        if (averages.carbs < goals.carbs * 0.8) {
            gaps.push({ nutrient: 'carbs', current: averages.carbs, target: goals.carbs });
        }
        if (averages.fat < goals.fat * 0.8) {
            gaps.push({ nutrient: 'fat', current: averages.fat, target: goals.fat });
        }

        return gaps;
    }

    calculateNutritionConsistency(dailyTotals) {
        if (!Object.keys(dailyTotals).length) return 0;

        const nutrients = ['calories', 'protein', 'carbs', 'fat'];
        const consistencies = nutrients.map(nutrient => {
            const values = Object.values(dailyTotals).map(day => day[nutrient]);
            const average = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
            return Math.max(0, 100 - (Math.sqrt(variance) / average * 100));
        });

        return consistencies.reduce((sum, val) => sum + val, 0) / consistencies.length;
    }

    extractIngredients(meals) {
        const ingredients = new Set();
        meals.forEach(meal => {
            if (meal.ingredients) {
                meal.ingredients.forEach(ingredient => ingredients.add(ingredient));
            }
        });
        return Array.from(ingredients);
    }

    findFrequentPairs(ingredients) {
        const pairs = new Map();
        ingredients.forEach((ingredient1, i) => {
            ingredients.slice(i + 1).forEach(ingredient2 => {
                const pair = [ingredient1, ingredient2].sort().join('|');
                pairs.set(pair, (pairs.get(pair) || 0) + 1);
            });
        });
        return Array.from(pairs.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pair, count]) => ({
                ingredients: pair.split('|'),
                frequency: count
            }));
    }

    identifySuccessfulCombinations(meals) {
        return meals
            .filter(meal => meal.rating >= 4)
            .map(meal => ({
                ingredients: meal.ingredients || [],
                rating: meal.rating,
                type: meal.type
            }));
    }

    analyzeSeasonalIngredients(ingredients) {
        const seasonal = {};
        const currentSeason = this.getCurrentSeason();
        
        ingredients.forEach(ingredient => {
            const season = this.getIngredientSeason(ingredient);
            if (season) {
                if (!seasonal[season]) {
                    seasonal[season] = [];
                }
                seasonal[season].push(ingredient);
            }
        });

        return seasonal;
    }

    calculateIngredientVariety(ingredients) {
        const categories = this.categorizeIngredients(ingredients);
        const totalCategories = Object.keys(categories).length;
        const maxCategories = 10; // Assuming 10 possible categories
        return (totalCategories / maxCategories) * 100;
    }

    categorizeIngredients(ingredients) {
        const categories = {};
        ingredients.forEach(ingredient => {
            const category = this.getIngredientCategory(ingredient);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(ingredient);
        });
        return categories;
    }

    getIngredientCategory(ingredient) {
        // Implement ingredient categorization logic
        return 'other';
    }

    getIngredientSeason(ingredient) {
        // Implement seasonal ingredient detection logic
        return null;
    }

    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    groupMealsBySeason(meals) {
        const seasonal = {
            spring: [],
            summer: [],
            fall: [],
            winter: []
        };

        meals.forEach(meal => {
            const season = this.getMealSeason(meal);
            if (season) {
                seasonal[season].push(meal);
            }
        });

        return seasonal;
    }

    getMealSeason(meal) {
        const date = new Date(meal.time);
        const month = date.getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    analyzeSeasonalTrends(mealsBySeason) {
        const trends = {};
        for (const [season, meals] of Object.entries(mealsBySeason)) {
            trends[season] = {
                mealCount: meals.length,
                commonIngredients: this.findCommonIngredients(meals),
                averageRating: this.calculateAverageRating(meals)
            };
        }
        return trends;
    }

    findCommonIngredients(meals) {
        const ingredientCounts = {};
        meals.forEach(meal => {
            if (meal.ingredients) {
                meal.ingredients.forEach(ingredient => {
                    ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
                });
            }
        });
        return Object.entries(ingredientCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([ingredient, count]) => ({ ingredient, count }));
    }

    calculateAverageRating(meals) {
        if (!meals.length) return 0;
        const total = meals.reduce((sum, meal) => sum + (meal.rating || 0), 0);
        return total / meals.length;
    }

    calculateSeasonalConsistency(trends) {
        const seasons = Object.keys(trends);
        if (!seasons.length) return 0;

        const mealCounts = seasons.map(season => trends[season].mealCount);
        const average = mealCounts.reduce((sum, count) => sum + count, 0) / seasons.length;
        const variance = mealCounts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / seasons.length;
        return Math.max(0, 100 - (Math.sqrt(variance) / average * 100));
    }

    analyzeMealTypeDistribution(meals) {
        const distribution = {};
        meals.forEach(meal => {
            distribution[meal.type] = (distribution[meal.type] || 0) + 1;
        });
        return distribution;
    }

    identifyCuisineTypes(meals) {
        const cuisines = {};
        meals.forEach(meal => {
            if (meal.cuisine) {
                cuisines[meal.cuisine] = (cuisines[meal.cuisine] || 0) + 1;
            }
        });
        return cuisines;
    }

    analyzePreparationMethods(meals) {
        const methods = {};
        meals.forEach(meal => {
            if (meal.preparationMethod) {
                methods[meal.preparationMethod] = (methods[meal.preparationMethod] || 0) + 1;
            }
        });
        return methods;
    }

    calculateOverallVarietyScore(variety) {
        const scores = [
            this.calculateDistributionScore(variety.mealTypeDistribution),
            this.calculateCuisineScore(variety.cuisineTypes),
            this.calculateMethodScore(variety.preparationMethods)
        ];
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    calculateDistributionScore(distribution) {
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        if (!total) return 0;
        const ideal = total / Object.keys(distribution).length;
        const variance = Object.values(distribution).reduce((sum, count) => 
            sum + Math.pow(count - ideal, 2), 0) / Object.keys(distribution).length;
        return Math.max(0, 100 - (Math.sqrt(variance) / ideal * 100));
    }

    calculateCuisineScore(cuisines) {
        const total = Object.values(cuisines).reduce((sum, count) => sum + count, 0);
        if (!total) return 0;
        return (Object.keys(cuisines).length / 10) * 100; // Assuming 10 possible cuisine types
    }

    calculateMethodScore(methods) {
        const total = Object.values(methods).reduce((sum, count) => sum + count, 0);
        if (!total) return 0;
        return (Object.keys(methods).length / 5) * 100; // Assuming 5 possible preparation methods
    }

    generateTimingBasedSuggestions(pattern, preferences) {
        const suggestions = [];
        const commonTimes = pattern.commonTimes;
        
        for (const [mealType, times] of Object.entries(commonTimes)) {
            times.forEach(time => {
                suggestions.push({
                    type: 'timing',
                    mealType,
                    suggestedTime: time.hour,
                    confidence: time.count / pattern.consistency,
                    reason: `Based on your common ${mealType} time at ${time.hour}:00`
                });
            });
        }
        
        return suggestions;
    }

    generateNutritionBasedSuggestions(pattern, preferences) {
        const suggestions = [];
        const gaps = pattern.gaps;
        
        gaps.forEach(gap => {
            suggestions.push({
                type: 'nutrition',
                nutrient: gap.nutrient,
                current: gap.current,
                target: gap.target,
                confidence: (gap.target - gap.current) / gap.target * 100,
                reason: `Help meet your ${gap.nutrient} goals`
            });
        });
        
        return suggestions;
    }

    generateIngredientBasedSuggestions(pattern, preferences) {
        const suggestions = [];
        const frequentPairs = pattern.frequentPairs;
        
        frequentPairs.forEach(pair => {
            suggestions.push({
                type: 'ingredient',
                ingredients: pair.ingredients,
                confidence: pair.frequency * 10,
                reason: 'Frequently used ingredient combination'
            });
        });
        
        return suggestions;
    }

    generateSeasonalSuggestions(pattern, preferences) {
        const suggestions = [];
        const currentSeason = this.getCurrentSeason();
        const seasonalTrends = pattern.seasonalTrends;
        
        if (seasonalTrends[currentSeason]) {
            const commonIngredients = seasonalTrends[currentSeason].commonIngredients;
            commonIngredients.forEach(ingredient => {
                suggestions.push({
                    type: 'seasonal',
                    ingredient: ingredient.ingredient,
                    confidence: ingredient.count * 10,
                    reason: `Popular ${currentSeason} ingredient`
                });
            });
        }
        
        return suggestions;
    }

    generateVarietyBasedSuggestions(pattern, preferences) {
        const suggestions = [];
        const distribution = pattern.mealTypeDistribution;
        
        // Find underrepresented meal types
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        const average = total / Object.keys(distribution).length;
        
        Object.entries(distribution).forEach(([type, count]) => {
            if (count < average * 0.5) {
                suggestions.push({
                    type: 'variety',
                    mealType: type,
                    confidence: (average - count) / average * 100,
                    reason: `Add more variety to your ${type} meals`
                });
            }
        });
        
        return suggestions;
    }

    scoreNutritionBalance(suggestion, pattern) {
        if (suggestion.type !== 'nutrition') return 0;
        const gap = pattern.gaps.find(g => g.nutrient === suggestion.nutrient);
        if (!gap) return 0;
        return (gap.target - gap.current) / gap.target * 100;
    }

    scoreMealTiming(suggestion, pattern) {
        if (suggestion.type !== 'timing') return 0;
        return suggestion.confidence;
    }

    scoreUserPreferences(suggestion, preferences) {
        let score = 0;
        
        // Check dietary restrictions
        const restrictions = preferences.get('dietaryRestrictions') || [];
        if (restrictions.some(r => suggestion.ingredients?.includes(r))) {
            return 0;
        }
        
        // Check favorite ingredients
        const favorites = preferences.get('favoriteIngredients') || [];
        if (suggestion.ingredients) {
            score += suggestion.ingredients.filter(i => favorites.includes(i)).length * 20;
        }
        
        // Check meal preferences
        const mealPrefs = preferences.get('mealPreferences') || {};
        if (suggestion.mealType && mealPrefs[suggestion.mealType]) {
            score += mealPrefs[suggestion.mealType] * 10;
        }
        
        return score;
    }

    scoreMealVariety(suggestion, pattern) {
        if (suggestion.type !== 'variety') return 0;
        return suggestion.confidence;
    }

    async showAnalytics() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.id = 'analyticsModal';
        modal.style.display = 'flex';

        const content = `
            <div class="modal-content analytics-content">
                <div class="modal-header">
                    <h3 class="modal-title">Meal Planning Insights</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="analytics-body">
                    <div class="analytics-summary">
                        <div class="summary-card">
                            <h4>Weekly Overview</h4>
                            <div class="summary-stats" id="weeklyStats">
                                Loading...
                            </div>
                        </div>
                        <div class="summary-card">
                            <h4>Nutrition Balance</h4>
                            <canvas id="macroChart"></canvas>
                        </div>
                    </div>
                    <div class="analytics-details">
                        <div class="detail-card">
                            <h4>Meal Distribution</h4>
                            <canvas id="mealTypeChart"></canvas>
                        </div>
                        <div class="detail-card">
                            <h4>Top Ingredients</h4>
                            <div id="topIngredients">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        // Close button handler
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
            this.destroyCharts();
        });

        // Load and display analytics data
        await this.loadAnalytics();
    }

    async loadAnalytics() {
        const cacheKey = 'weekly-analytics';
        if (this.cache.has(cacheKey)) {
            this.displayAnalytics(this.cache.get(cacheKey));
            return;
        }

        try {
            // Get current week's meals
            const meals = await this.getCurrentWeekMeals();
            const analytics = this.processAnalytics(meals);
            
            // Cache for 5 minutes
            this.cache.set(cacheKey, analytics);
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
            
            this.displayAnalytics(analytics);
        } catch (error) {
            logError('Error loading analytics:', error);
            document.getElementById('weeklyStats').innerHTML = 'Error loading analytics';
        }
    }

    processAnalytics(meals) {
        const analytics = {
            totalMeals: meals.length,
            mealTypes: {},
            macroTotals: {
                protein: 0,
                carbs: 0,
                fat: 0
            },
            ingredients: new Map()
        };

        meals.forEach(meal => {
            // Count meal types
            analytics.mealTypes[meal.type] = (analytics.mealTypes[meal.type] || 0) + 1;

            // Sum up macros
            analytics.macroTotals.protein += meal.nutrition?.protein || 0;
            analytics.macroTotals.carbs += meal.nutrition?.carbs || 0;
            analytics.macroTotals.fat += meal.nutrition?.fat || 0;

            // Track ingredients
            meal.ingredients?.forEach(ing => {
                const count = analytics.ingredients.get(ing.name) || 0;
                analytics.ingredients.set(ing.name, count + 1);
            });
        });

        return analytics;
    }

    displayAnalytics(analytics) {
        // Update weekly stats
        const weeklyStats = document.getElementById('weeklyStats');
        weeklyStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${analytics.totalMeals}</span>
                <span class="stat-label">Meals Planned</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${Math.round(analytics.macroTotals.protein)}g</span>
                <span class="stat-label">Total Protein</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${Object.keys(analytics.mealTypes).length}</span>
                <span class="stat-label">Different Meal Types</span>
            </div>
        `;

        // Display macro distribution chart
        this.displayMacroChart(analytics.macroTotals);
        
        // Display meal type distribution
        this.displayMealTypeChart(analytics.mealTypes);
        
        // Display top ingredients
        this.displayTopIngredients(analytics.ingredients);
    }

    displayMacroChart(macros) {
        const ctx = document.getElementById('macroChart');
        const total = macros.protein + macros.carbs + macros.fat;
        
        const data = {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [
                    Math.round(macros.protein / total * 100),
                    Math.round(macros.carbs / total * 100),
                    Math.round(macros.fat / total * 100)
                ],
                backgroundColor: ['#48BB78', '#F6AD55', '#F56565']
            }]
        };

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.chartInstances.set('macro', chart);
    }

    displayMealTypeChart(mealTypes) {
        const ctx = document.getElementById('mealTypeChart');
        
        const data = {
            labels: Object.keys(mealTypes),
            datasets: [{
                data: Object.values(mealTypes),
                backgroundColor: [
                    '#48BB78',
                    '#F6AD55',
                    '#F56565',
                    '#9F7AEA'
                ]
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.chartInstances.set('mealType', chart);
    }

    displayTopIngredients(ingredients) {
        const topIngredients = Array.from(ingredients.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const container = document.getElementById('topIngredients');
        container.innerHTML = `
            <ul class="ingredients-list">
                ${topIngredients.map(([name, count]) => `
                    <li class="ingredient-item">
                        <span class="ingredient-name">${name}</span>
                        <span class="ingredient-count">${count} times</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    destroyCharts() {
        for (const chart of this.chartInstances.values()) {
            chart.destroy();
        }
        this.chartInstances.clear();
    }

    async getCurrentWeekMeals() {
        // This would be replaced with actual data fetching logic
        // For now, returning mock data
        return [
            {
                type: 'breakfast',
                nutrition: { protein: 20, carbs: 30, fat: 10 },
                ingredients: [
                    { name: 'Eggs' },
                    { name: 'Bread' }
                ]
            },
            // Add more mock meals as needed
        ];
    }
}

export const mealAnalytics = new MealAnalytics(); 