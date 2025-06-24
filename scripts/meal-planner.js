import StringFormatter from './string-formatter.js';

// Performance monitoring system
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observer = null;
    this.performanceThresholds = {
      critical: 100,    // ms
      warning: 50,      // ms
      optimal: 30       // ms
    };
    this.setupObserver();
  }

  setupObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.recordMetric(entry.name, entry.duration);
          }
        }
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    }
  }

  recordMetric(name, duration) {
    const timestamp = Date.now();
    this.metrics.set(name, { duration, timestamp });
  }

  getAverageDuration(windowMs = 300000) {
    const now = Date.now();
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => now - m.timestamp < windowMs);
    
    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
  }

  clearOldMetrics(windowMs = 300000) {
    const now = Date.now();
    for (const [key, value] of this.metrics.entries()) {
      if (now - value.timestamp > windowMs) {
        this.metrics.delete(key);
      }
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.metrics.clear();
  }

  getPerformanceStatus() {
    const avgDuration = this.getAverageDuration();
    return {
      status: avgDuration > this.performanceThresholds.critical ? 'critical' :
              avgDuration > this.performanceThresholds.warning ? 'warning' :
              avgDuration > this.performanceThresholds.optimal ? 'suboptimal' : 'optimal',
      averageDuration: avgDuration,
      metrics: {
        critical: this.performanceThresholds.critical,
        warning: this.performanceThresholds.warning,
        optimal: this.performanceThresholds.optimal
      }
    };
  }

  adjustThresholds(devicePerformance) {
    // Adjust thresholds based on device performance
    const factor = devicePerformance === 'low' ? 1.5 :
                  devicePerformance === 'high' ? 0.8 : 1;
    
    this.performanceThresholds = {
      critical: Math.round(100 * factor),
      warning: Math.round(50 * factor),
      optimal: Math.round(30 * factor)
    };
  }
}

// Error handling system
class ErrorHandler {
  constructor() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.errorWindow = 60000; // 1 minute
    this.maxErrors = 5;
    this.setupErrorBoundary();
  }

  setupErrorBoundary() {
    window.addEventListener('error', (event) => this.handleError(event.error));
    window.addEventListener('unhandledrejection', (event) => this.handleError(event.reason));
  }

  handleError(error) {
    const now = Date.now();
    
    // Reset error count if window has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 1;
    } else {
      this.errorCount++;
    }
    
    this.lastErrorTime = now;
    
    // Log error
    console.error('Application Error:', error);
    
    // Return error status
    return {
      shouldEnterSafeMode: this.errorCount >= this.maxErrors,
      errorCount: this.errorCount,
      timeSinceLastError: now - this.lastErrorTime
    };
  }

  reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  cleanup() {
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
  }
}

// Add MealPlanAnalytics class before MealPlanner class
class MealPlanAnalytics {
  constructor(mealPlanner) {
    this.mealPlanner = mealPlanner;
    this.analyticsCache = new Map();
    this.analyticsCacheTTL = 15 * 60 * 1000; // 15 minutes
    this.performanceMonitor = new PerformanceMonitor();
  }

  getWeeklyTrends() {
    const cacheKey = 'weekly_trends';
    return this.getCachedAnalytics(cacheKey, () => {
      const trends = {
        mealDistribution: this.calculateMealDistribution(),
        nutritionTrends: this.calculateNutritionTrends(),
        popularItems: this.findPopularItems(),
        mealVariety: this.calculateMealVariety()
      };
      return trends;
    });
  }

  calculateMealDistribution() {
    const distribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacks: 0
    };

    Object.values(this.mealPlanner.meals).forEach(dayMeals => {
      Object.entries(dayMeals).forEach(([mealType, meal]) => {
        if (meal) distribution[mealType]++;
      });
    });

    return distribution;
  }

  calculateNutritionTrends() {
    const trends = {
      calories: [],
      protein: [],
      carbs: [],
      fat: []
    };

    const dates = Object.keys(this.mealPlanner.meals).sort();
    dates.forEach(date => {
      const dayTotals = this.calculateDayTotals(date);
      trends.calories.push(dayTotals.calories);
      trends.protein.push(dayTotals.protein);
      trends.carbs.push(dayTotals.carbs);
      trends.fat.push(dayTotals.fat);
    });

    return trends;
  }

  calculateDayTotals(date) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dayMeals = this.mealPlanner.meals[date] || {};

    Object.values(dayMeals).forEach(meal => {
      if (meal) {
        totals.calories += meal.calories || 0;
        totals.protein += meal.protein || 0;
        totals.carbs += meal.carbs || 0;
        totals.fat += meal.fat || 0;
      }
    });

    return totals;
  }

  findPopularItems() {
    const itemCounts = new Map();
    
    Object.values(this.mealPlanner.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal && meal.items) {
          meal.items.forEach(item => {
            const count = itemCounts.get(item.name) || 0;
            itemCounts.set(item.name, count + 1);
          });
        }
      });
    });

    return Array.from(itemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  calculateMealVariety() {
    const uniqueMeals = new Set();
    let totalMeals = 0;

    Object.values(this.mealPlanner.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal) {
          totalMeals++;
          uniqueMeals.add(meal.name);
        }
      });
    });

    return {
      uniqueMeals: uniqueMeals.size,
      totalMeals,
      varietyScore: totalMeals > 0 ? (uniqueMeals.size / totalMeals) * 100 : 0
    };
  }

  getCachedAnalytics(key, fn) {
    const now = Date.now();
    const cached = this.analyticsCache.get(key);

    if (cached && (now - cached.timestamp) < this.analyticsCacheTTL) {
      return cached.data;
    }

    const data = fn();
    this.analyticsCache.set(key, { data, timestamp: now });
    return data;
  }

  clearCache() {
    this.analyticsCache.clear();
  }

  async getDetailedAnalytics() {
    const cacheKey = 'detailed_analytics';
    return this.getCachedAnalytics(cacheKey, () => {
      const trends = this.getWeeklyTrends();
      return {
        ...trends,
        nutritionalBalance: this.calculateNutritionalBalance(),
        mealPatterns: this.analyzeMealPatterns(),
        goalProgress: this.calculateGoalProgress(),
        recommendations: this.generateRecommendations()
      };
    });
  }

  calculateNutritionalBalance() {
    const trends = this.calculateNutritionTrends();
    const balance = {
      protein: this.calculateMacroBalance(trends.protein),
      carbs: this.calculateMacroBalance(trends.carbs),
      fat: this.calculateMacroBalance(trends.fat),
      calories: this.calculateCalorieBalance(trends.calories)
    };
    return balance;
  }

  calculateMacroBalance(values) {
    if (!values.length) return { average: 0, consistency: 0 };
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - average, 2), 0) / values.length;
    const consistency = Math.max(0, 100 - (Math.sqrt(variance) / average * 100));
    return { average, consistency };
  }

  calculateCalorieBalance(values) {
    if (!values.length) return { average: 0, deficit: 0 };
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const target = this.mealPlanner.nutritionGoals?.calories || 2000;
    const deficit = target - average;
    return { average, deficit };
  }

  analyzeMealPatterns() {
    const patterns = {
      mealTiming: this.analyzeMealTiming(),
      mealCombinations: this.analyzeMealCombinations(),
      varietyScore: this.calculateVarietyScore()
    };
    return patterns;
  }

  analyzeMealTiming() {
    const timing = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    };

    Object.entries(this.mealPlanner.meals).forEach(([date, dayMeals]) => {
      Object.entries(dayMeals).forEach(([mealType, meal]) => {
        if (meal && meal.time) {
          timing[mealType].push(meal.time);
        }
      });
    });

    return timing;
  }

  analyzeMealCombinations() {
    const combinations = new Map();
    
    Object.values(this.mealPlanner.meals).forEach(dayMeals => {
      const dayMealTypes = Object.keys(dayMeals).filter(type => dayMeals[type]);
      const key = dayMealTypes.sort().join('-');
      combinations.set(key, (combinations.get(key) || 0) + 1);
    });

    return Array.from(combinations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  calculateVarietyScore() {
    const uniqueMeals = new Set();
    let totalMeals = 0;
    let varietyScore = 0;

    Object.values(this.mealPlanner.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal) {
          totalMeals++;
          uniqueMeals.add(meal.name);
        }
      });
    });

    if (totalMeals > 0) {
      varietyScore = (uniqueMeals.size / totalMeals) * 100;
    }

    return {
      score: varietyScore,
      uniqueMeals: uniqueMeals.size,
      totalMeals
    };
  }

  calculateGoalProgress() {
    const goals = this.mealPlanner.nutritionGoals;
    if (!goals) return null;

    const trends = this.calculateNutritionTrends();
    const progress = {
      calories: this.calculateProgress(trends.calories, goals.calories),
      protein: this.calculateProgress(trends.protein, goals.protein),
      carbs: this.calculateProgress(trends.carbs, goals.carbs),
      fat: this.calculateProgress(trends.fat, goals.fat)
    };

    return progress;
  }

  calculateProgress(values, target) {
    if (!values.length || !target) return { progress: 0, status: 'unknown' };
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const progress = (average / target) * 100;
    
    let status = 'on-track';
    if (progress < 90) status = 'below-target';
    if (progress > 110) status = 'above-target';
    
    return { progress, status };
  }

  generateRecommendations() {
    const trends = this.getWeeklyTrends();
    const balance = this.calculateNutritionalBalance();
    const patterns = this.analyzeMealPatterns();
    const goals = this.calculateGoalProgress();

    const recommendations = [];

    // Nutritional balance recommendations
    if (balance.protein.consistency < 70) {
      recommendations.push({
        type: 'nutrition',
        priority: 'high',
        message: 'Consider planning protein-rich meals more consistently'
      });
    }

    // Meal variety recommendations
    if (patterns.varietyScore.score < 60) {
      recommendations.push({
        type: 'variety',
        priority: 'medium',
        message: 'Try incorporating more diverse meals into your plan'
      });
    }

    // Goal progress recommendations
    if (goals) {
      Object.entries(goals).forEach(([macro, data]) => {
        if (data.status === 'below-target') {
          recommendations.push({
            type: 'goals',
            priority: 'high',
            message: `Increase ${macro} intake to meet your goals`
          });
        }
      });
    }

    return recommendations;
  }
}

// Add SmartMealSuggestions class before MealPlanner class
class SmartMealSuggestions {
  constructor(mealPlanner) {
    this.mealPlanner = mealPlanner;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.loadingStates = new Map();
    this.userFeedback = new Map();
    this.nutritionGoals = null;
  }

  async initialize() {
    try {
      // Load user's nutrition goals
      const goals = await this.mealPlanner.dataManager.getGoals();
      if (goals.success) {
        this.nutritionGoals = goals.data;
      }
    } catch (error) {
      console.error('Error initializing SmartMealSuggestions:', error);
    }
  }

  async getSuggestions(mealType, date) {
    const key = `${mealType}-${date}`;
    
    if (this.loadingStates.get(key)) {
      return null;
    }

    try {
      this.loadingStates.set(key, true);
      this.mealPlanner.showToast('Generating personalized suggestions...', 'info');
      
      const suggestions = await this.getCachedSuggestions(key, async () => {
        const trends = await this.mealPlanner.analytics.getWeeklyTrends();
        const goals = await this.mealPlanner.dataManager.getGoals();
        return this.generateSuggestions(mealType, trends, goals.data);
      });

      this.loadingStates.delete(key);
      return suggestions;
    } catch (error) {
      this.loadingStates.delete(key);
      this.mealPlanner.handleError(error);
      return null;
    }
  }

  generateSuggestions(mealType, trends, goals) {
    const suggestions = [];
    const popularItems = trends.popularItems;
    const mealDistribution = trends.mealDistribution;
    const nutritionTrends = trends.nutritionTrends;
    const avgNutrition = this.calculateAverageNutrition(mealType);

    // Enhanced suggestion generation
    popularItems.forEach(item => {
      if (this.isItemSuitable(item, mealType, avgNutrition, goals)) {
        const suggestion = {
          name: item.name,
          type: mealType,
          nutrition: this.estimateNutrition(item),
          confidence: this.calculateConfidence(item, trends, goals),
          tags: this.generateTags(item, trends, goals),
          reason: this.generateSuggestionReason(item, trends, goals)
        };
        suggestions.push(suggestion);
      }
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  generateTags(item, trends, goals) {
    const tags = [];
    const nutrition = this.estimateNutrition(item);

    // Add nutritional tags
    if (nutrition.protein > 20) tags.push('high-protein');
    if (nutrition.carbs < 30) tags.push('low-carb');
    if (nutrition.fat < 10) tags.push('low-fat');

    // Add meal type tags
    if (item.type === 'breakfast') tags.push('breakfast');
    if (item.type === 'lunch') tags.push('lunch');
    if (item.type === 'dinner') tags.push('dinner');

    // Add popularity tags
    if (trends.popularItems.find(p => p.name === item.name)) {
      tags.push('popular');
    }

    return tags;
  }

  generateSuggestionReason(item, trends, goals) {
    const reasons = [];
    const nutrition = this.estimateNutrition(item);

    // Add nutritional reasons
    if (nutrition.protein > goals.protein * 0.8) {
      reasons.push('High in protein');
    }
    if (nutrition.carbs < goals.carbs * 0.7) {
      reasons.push('Low in carbs');
    }

    // Add variety reasons
    if (!trends.recentMeals.includes(item.name)) {
      reasons.push('Adds variety to your diet');
    }

    return reasons.join(', ');
  }

  isItemSuitable(item, mealType, avgNutrition, goals) {
    if (!avgNutrition || !goals) return true;

    const estimatedNutrition = this.estimateNutrition(item);
    const nutritionDiff = {
      calories: Math.abs(estimatedNutrition.calories - avgNutrition.calories),
      protein: Math.abs(estimatedNutrition.protein - avgNutrition.protein),
      carbs: Math.abs(estimatedNutrition.carbs - avgNutrition.carbs),
      fat: Math.abs(estimatedNutrition.fat - avgNutrition.fat)
    };

    // Enhanced tolerance based on goals
    const tolerance = {
      calories: 0.2,
      protein: 0.3,
      carbs: 0.25,
      fat: 0.25
    };

    return (
      nutritionDiff.calories <= avgNutrition.calories * tolerance.calories &&
      nutritionDiff.protein <= avgNutrition.protein * tolerance.protein &&
      nutritionDiff.carbs <= avgNutrition.carbs * tolerance.carbs &&
      nutritionDiff.fat <= avgNutrition.fat * tolerance.fat
    );
  }

  calculateConfidence(item, trends, goals) {
    let confidence = 0;

    // Factor 1: Popularity (0-30 points)
    const popularityScore = (item.count / trends.mealVariety.totalMeals) * 30;
    confidence += popularityScore;

    // Factor 2: Nutritional Balance (0-40 points)
    const nutritionScore = this.calculateNutritionScore(item, goals);
    confidence += nutritionScore;

    // Factor 3: Variety (0-30 points)
    const varietyScore = this.calculateVarietyScore(item, trends);
    confidence += varietyScore;

    return Math.min(Math.round(confidence), 100);
  }

  calculateNutritionScore(item, goals) {
    const nutrition = this.estimateNutrition(item);
    if (!goals) return 30;

    const score = 40 - (
      Math.abs(nutrition.protein - goals.protein) * 0.4 +
      Math.abs(nutrition.carbs - goals.carbs) * 0.3 +
      Math.abs(nutrition.fat - goals.fat) * 0.3
    );

    return Math.max(0, score);
  }

  calculateVarietyScore(item, trends) {
    const uniqueMeals = trends.mealVariety.uniqueMeals;
    const totalMeals = trends.mealVariety.totalMeals;
    
    if (totalMeals === 0) return 30;

    const varietyRatio = uniqueMeals / totalMeals;
    return Math.round(varietyRatio * 30);
  }

  getCachedSuggestions(key, fn) {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const data = fn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  clearCache() {
    this.cache.clear();
  }

  async recordUserFeedback(suggestionId, isHelpful) {
    try {
      const feedback = {
        timestamp: Date.now(),
        isHelpful,
        suggestionId
      };

      // Store feedback locally
      this.userFeedback.set(suggestionId, feedback);

      // Update confidence score based on feedback
      const suggestion = this.cache.get(suggestionId);
      if (suggestion) {
        suggestion.confidence = isHelpful ? 
          Math.min(suggestion.confidence + 10, 100) : 
          Math.max(suggestion.confidence - 10, 0);
      }

      // Show feedback confirmation
      this.mealPlanner.showToast(
        isHelpful ? 'Thanks for your feedback!' : 'Thanks for helping us improve!',
        'success'
      );
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  async retryFailedSuggestion(suggestionId) {
    const suggestion = this.cache.get(suggestionId);
    if (!suggestion) return null;

    try {
      const newSuggestion = await this.generateSuggestions(
        suggestion.mealType,
        await this.mealPlanner.analytics.getWeeklyTrends(),
        await this.mealPlanner.dataManager.getGoals()
      );
      
      if (newSuggestion) {
        this.cache.set(suggestionId, newSuggestion);
        return newSuggestion;
      }
    } catch (error) {
      this.mealPlanner.handleError(error);
    }
    return null;
  }
}

// Initialize Meal Planner functionality
class MealPlanner {
  constructor() {
    this.currentDate = new Date();
    this.meals = JSON.parse(localStorage.getItem('mealPlan')) || {};
    this.mealTemplates = JSON.parse(localStorage.getItem('mealTemplates')) || [];
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheSize = 0;
    this.maxCacheSize = 100;
    this.cacheTTL = 5 * 60 * 1000;
    this.cacheCleanupInterval = 60 * 1000;
    this.errorRetryAttempts = 3;
    this.errorRetryDelay = 1000;
    this.debounceTimers = new Map();
    this.templateObserver = null;
    this.templatesPerPage = 6;
    this.currentTemplatePage = 1;
    this.visibleDays = new Set();
    this.calendarObserver = null;
    this.isProcessing = false;
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.performanceMetrics = new Map();
    
    // Initialize monitoring systems
    this.performanceMonitor = new PerformanceMonitor();
    this.errorHandler = new ErrorHandler();
    
    // Initialize analytics
    this.analytics = new MealPlanAnalytics(this);
    
    // Initialize smart suggestions
    this.smartSuggestions = new SmartMealSuggestions(this);
    
    this.initElements();
    this.initEventListeners();
    this.setupErrorBoundary();
    this.setupPerformanceMonitoring();
    this.renderCalendar();
    this.renderTemplates();
    this.updateWeeklyStats();
    this.setupCalendarVirtualization();
    
    // Initialize cache cleanup
    this.setupCacheManagement();
    
    // Add device performance detection
    this.detectDevicePerformance();
    
    // Add analytics button to UI
    this.initAnalyticsButton();
  }

  initElements() {
    // Calendar elements
    this.calendarDays = document.getElementById('calendar-days');
    this.calendarMeals = document.getElementById('calendar-meals');
    this.currentWeekDisplay = document.getElementById('current-week-display');
    this.prevWeekBtn = document.getElementById('prev-week');
    this.nextWeekBtn = document.getElementById('next-week');
    this.todayBtn = document.getElementById('today-btn');
    
    // Templates elements
    this.templatesGrid = document.getElementById('templates-grid');
    this.templatesEmpty = document.getElementById('templates-empty');
    this.createTemplateBtn = document.getElementById('create-template-btn');
    this.createFirstTemplateBtn = document.getElementById('create-first-template-btn');
    
    // Modals
    this.addMealModal = document.getElementById('add-meal-modal');
    this.templateModal = document.getElementById('template-modal');
    
    // Weekly stats
    this.weeklyCalories = document.getElementById('weekly-calories');
    this.weeklyProtein = document.getElementById('weekly-protein');
    this.weeklyCarbs = document.getElementById('weekly-carbs');
    this.weeklyFat = document.getElementById('weekly-fat');
    
    // Progress bars
    this.caloriesProgress = document.getElementById('calories-progress');
    this.proteinProgress = document.getElementById('protein-progress');
    this.carbsProgress = document.getElementById('carbs-progress');
    this.fatProgress = document.getElementById('fat-progress');
    
    // Buttons
    this.generateShoppingListBtn = document.getElementById('generate-shopping-list');
  }

  initEventListeners() {
    // Use event delegation for all click handlers
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Handle meal slot clicks
      const mealSlot = target.closest('.meal-slot');
      if (mealSlot) {
        const date = mealSlot.dataset.date;
        const mealType = mealSlot.dataset.mealType;
        
        if (mealSlot.classList.contains('empty')) {
          this.openAddMealModal(date, mealType);
        } else {
          this.viewMeal(date, mealType);
        }
        return;
      }
      
      // Handle template actions
      const useTemplateBtn = target.closest('.use-template');
      if (useTemplateBtn) {
        const index = parseInt(useTemplateBtn.dataset.index);
        this.useTemplate(index);
        return;
      }
      
      const deleteTemplateBtn = target.closest('.delete-template');
      if (deleteTemplateBtn) {
        const index = parseInt(deleteTemplateBtn.dataset.index);
        this.deleteTemplate(index);
        return;
      }
      
      // Handle navigation
      if (target === this.prevWeekBtn) {
        this.changeWeek(-1);
      } else if (target === this.nextWeekBtn) {
        this.changeWeek(1);
      } else if (target === this.todayBtn) {
        this.goToToday();
      }
    });

    // Debounced search with error handling
    const searchInput = document.getElementById('food-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.debounce('search', () => {
          try {
            this.handleSearch(e.target.value);
          } catch (error) {
            this.handleError(error);
          }
      });
    });
    }

    // Handle modal close buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('.close-modal')) {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      }
    });

    // Handle tab switching
    document.addEventListener('click', (e) => {
      if (e.target.matches('.tab-btn')) {
        const tabId = e.target.getAttribute('data-tab');
        this.switchTab(tabId);
      }
    });
  }

  formatDate(date) {
    return StringFormatter.formatDate(date);
  }

  parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
  }

  renderCalendar() {
    const weekKey = this.formatDate(this.currentDate);
    const cachedWeek = this.getCached(`week_${weekKey}`, () => {
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
      const weekData = {
        firstDay: firstDayOfWeek,
        lastDay: new Date(firstDayOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
        days: []
      };

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(firstDayOfWeek);
        currentDay.setDate(firstDayOfWeek.getDate() + i);
        weekData.days.push({
          date: currentDay,
          dateKey: this.formatDate(currentDay),
          isToday: currentDay.toDateString() === new Date().toDateString()
        });
      }

      return weekData;
    });

    // Update week display
    this.currentWeekDisplay.textContent = this.formatWeekDisplay(cachedWeek.firstDay, cachedWeek.lastDay);

    // Render days with virtualization
    this.renderDays(cachedWeek.days);
  }

  renderDays(days) {
    const fragment = document.createDocumentFragment();
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = day;
      fragment.appendChild(dayHeader);
    });

    // Add day numbers with virtualization setup
    days.forEach(day => {
      const dayElement = document.createElement('div');
      dayElement.className = `calendar-day${day.isToday ? ' today' : ''}`;
      dayElement.dataset.date = day.dateKey;
      
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-date';
      dayNumber.textContent = day.date.getDate();
      dayElement.appendChild(dayNumber);
      
      // Add meal slots container
      const mealSlotsContainer = document.createElement('div');
      mealSlotsContainer.className = 'meal-slots-container';
      mealSlotsContainer.dataset.date = day.dateKey;
      dayElement.appendChild(mealSlotsContainer);
      
      fragment.appendChild(dayElement);
      
      // Observe the day element for virtualization
      this.calendarObserver.observe(dayElement);
    });

    this.calendarDays.innerHTML = '';
    this.calendarDays.appendChild(fragment);
  }

  renderMealForDay(dateKey) {
    const mealSlotsContainer = document.querySelector(`.meal-slots-container[data-date="${dateKey}"]`);
    if (!mealSlotsContainer) return;

      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const fragment = document.createDocumentFragment();

      mealTypes.forEach(mealType => {
        const mealSlot = document.createElement('div');
        mealSlot.className = 'meal-slot';
      mealSlot.dataset.date = dateKey;
      mealSlot.dataset.mealType = mealType;
        
        const mealTypeEl = document.createElement('div');
        mealTypeEl.className = 'meal-type';
        mealTypeEl.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        mealSlot.appendChild(mealTypeEl);
        
        if (this.meals[dateKey] && this.meals[dateKey][mealType]) {
          const meal = this.meals[dateKey][mealType];
          const mealItem = document.createElement('div');
          mealItem.className = 'meal-item';
          mealItem.innerHTML = `
            <div class="meal-name">${meal.name}</div>
            <div class="meal-calories">${meal.calories || 0} cal</div>
          `;
          mealSlot.appendChild(mealItem);
            } else {
          mealSlot.classList.add('empty');
        }
        
      fragment.appendChild(mealSlot);
      });

    mealSlotsContainer.innerHTML = '';
    mealSlotsContainer.appendChild(fragment);
  }

  renderTemplates() {
    if (this.mealTemplates.length === 0) {
      if (this.templatesEmpty) {
        this.templatesEmpty.style.display = 'flex';
      }
      if (this.templatesGrid) {
        this.templatesGrid.style.display = 'none';
      }
      return;
    }
    
    if (this.templatesEmpty) {
      this.templatesEmpty.style.display = 'none';
    }
    if (this.templatesGrid) {
      this.templatesGrid.style.display = 'grid';
      
      // Calculate templates to show for current page
      const startIndex = 0;
      const endIndex = this.currentTemplatePage * this.templatesPerPage;
      const templatesToShow = this.mealTemplates.slice(startIndex, endIndex);
      
      // Create fragment for better performance
      const fragment = document.createDocumentFragment();
      
      templatesToShow.forEach((template, index) => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        
        templateCard.innerHTML = `
          <div class="template-header">
            <h3 class="template-name">${template.name}</h3>
            <span class="template-type">${template.type || 'Custom'}</span>
          </div>
          <div class="template-nutrition">
            <div class="template-nutrition-item">${template.calories || 0} cal</div>
            <div class="template-nutrition-item">${template.protein || 0}g protein</div>
            <div class="template-nutrition-item">${template.carbs || 0}g carbs</div>
            <div class="template-nutrition-item">${template.fat || 0}g fat</div>
          </div>
          <div class="template-actions">
            <button class="template-action use-template" data-index="${index}">Use</button>
            <button class="template-action delete-template" data-index="${index}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        
        // Add event listeners
        const useBtn = templateCard.querySelector('.use-template');
        const deleteBtn = templateCard.querySelector('.delete-template');
        
        useBtn.addEventListener('click', () => this.useTemplate(index));
        deleteBtn.addEventListener('click', () => this.deleteTemplate(index));
        
        fragment.appendChild(templateCard);
      });
      
      // Clear existing content and append new content
      this.templatesGrid.innerHTML = '';
      this.templatesGrid.appendChild(fragment);
      
      // Set up infinite scroll if we have more templates to show
      if (endIndex < this.mealTemplates.length) {
        this.setupInfiniteScroll();
      } else if (this.templateObserver) {
        this.templateObserver.disconnect();
        this.templateObserver = null;
      }
    }
  }

  setupInfiniteScroll() {
    // Clean up existing observer
    if (this.templateObserver) {
      this.templateObserver.disconnect();
    }
    
    // Create new observer
    this.templateObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.currentTemplatePage++;
          this.renderTemplates();
        }
      });
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    });
    
    // Observe the last template card
    const lastCard = this.templatesGrid.lastElementChild;
    if (lastCard) {
      this.templateObserver.observe(lastCard);
    }
  }

  setupCacheManagement() {
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.cacheCleanupInterval);
    
    // Setup cache size monitoring
    this.monitorCacheSize();
  }

  monitorCacheSize() {
    if (this.cacheSize > this.maxCacheSize * 0.8) { // 80% threshold
      this.cleanupCache(true); // Force cleanup
    }
  }

  cleanupCache(force = false) {
    const now = Date.now();
    let entriesRemoved = 0;

    for (const [key, timestamp] of this.cacheTimestamps) {
      if (force || (now - timestamp > this.cacheTTL)) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        this.cacheSize--;
        entriesRemoved++;
      }
    }

    if (entriesRemoved > 0) {
      console.debug(`Cache cleanup: removed ${entriesRemoved} entries`);
    }
  }

  async getCachedData(key, fetchFn, retryCount = 0) {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        const timestamp = this.cacheTimestamps.get(key);
        if (Date.now() - timestamp < this.cacheTTL) {
          return this.cache.get(key);
        }
      }

      // Fetch fresh data
      const data = await fetchFn();
      
      // Update cache
      this.cache.set(key, data);
      this.cacheTimestamps.set(key, Date.now());
      this.cacheSize++;
      
      // Monitor cache size
      this.monitorCacheSize();
      
      return data;
    } catch (error) {
      if (retryCount < this.errorRetryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.errorRetryDelay));
        return this.getCachedData(key, fetchFn, retryCount + 1);
      }
      throw new Error(`Failed to fetch data after ${this.errorRetryAttempts} attempts: ${error.message}`);
    }
  }

  invalidateCache(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      this.cacheSize--;
    }
  }

  changeWeek(offset) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + (offset * 7));
    this.currentDate = newDate;
    this.renderCalendar();
    this.updateWeeklyStats();
  }

  goToToday() {
    this.currentDate = new Date();
    this.renderCalendar();
    this.updateWeeklyStats();
  }

  openAddMealModal(date, mealType) {
    // Set values in hidden fields
    const mealDateField = document.getElementById('meal-date');
    const mealTypeField = document.getElementById('meal-type');
    
    if (mealDateField) mealDateField.value = date;
    if (mealTypeField) mealTypeField.value = mealType;
    
    // Set modal title
    const modalTitle = document.getElementById('meal-modal-title');
    if (modalTitle) {
      const displayDate = new Date(this.parseDate(date));
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = displayDate.toLocaleDateString('en-US', options);
      
      modalTitle.textContent = `Add ${StringFormatter.formatMealType(mealType)} for ${formattedDate}`;
    }
    
    // Clear any previously selected items
    const selectedItemsContainer = document.getElementById('selected-items');
    if (selectedItemsContainer) {
      selectedItemsContainer.innerHTML = '';
    }
    
    // Update nutrition summary
    this.updateMealNutrition();
    
    // Reset tab to food search
    this.switchTab('food-search');
    
    // Show suggestions
    this.showMealSuggestions(date, mealType);
    
    // Show modal
    this.addMealModal.classList.add('active');
  }

  openTemplateModal(templateIndex = null) {
    const modalTitle = document.getElementById('template-modal-title');
    const templateNameField = document.getElementById('template-name');
    const templateTypeField = document.getElementById('template-type');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    
    if (modalTitle) {
      modalTitle.textContent = templateIndex !== null ? 'Edit Meal Template' : 'Create Meal Template';
    }
    
    if (templateIndex !== null && this.mealTemplates[templateIndex]) {
      const template = this.mealTemplates[templateIndex];
      
      if (templateNameField) templateNameField.value = template.name;
      if (templateTypeField) templateTypeField.value = template.type || 'Custom';
      
      // Populate template items
      // This part depends on your template structure
      
      if (saveTemplateBtn) {
        saveTemplateBtn.setAttribute('data-index', templateIndex);
                }
            } else {
      if (templateNameField) templateNameField.value = '';
      if (templateTypeField) templateTypeField.value = 'Custom';
      
      // Clear template items
      
      if (saveTemplateBtn) {
        saveTemplateBtn.removeAttribute('data-index');
      }
    }
    
    // Show modal
    this.templateModal.classList.add('active');
  }

  async saveMeal() {
    await this.safeOperation(async () => {
    const date = document.getElementById('meal-date').value;
    const mealType = document.getElementById('meal-type').value;
    const mealName = document.getElementById('meal-name').value;
    const mealNotes = document.getElementById('meal-notes').value;
    
    // Get selected items
    const selectedItems = Array.from(document.querySelectorAll('.selected-item'))
      .map(item => {
        const itemId = item.getAttribute('data-id');
        const itemName = item.querySelector('.selected-item-name').textContent;
        const calories = parseInt(item.getAttribute('data-calories') || '0');
        const protein = parseFloat(item.getAttribute('data-protein') || '0');
        const carbs = parseFloat(item.getAttribute('data-carbs') || '0');
        const fat = parseFloat(item.getAttribute('data-fat') || '0');
        
        return { id: itemId, name: itemName, calories, protein, carbs, fat };
      });
    
    // Calculate totals
    const totals = selectedItems.reduce((acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Create meal object
    const meal = {
      name: mealName,
      notes: mealNotes,
      items: selectedItems,
      ...totals
    };
    
    // Save to state
    if (!this.meals[date]) {
      this.meals[date] = {};
    }
    
    this.meals[date][mealType] = meal;
    
    // Save to localStorage
    localStorage.setItem('mealPlan', JSON.stringify(this.meals));
    
    // Close modal and update UI
    this.addMealModal.classList.remove('active');
    this.renderCalendar();
    this.updateWeeklyStats();
    
    // Show success notification
    this.showToast(`${mealName} added to your meal plan!`);
      
      // Invalidate relevant caches
      this.invalidateCache('week_');
      this.invalidateCache('stats_');
    });
  }

  async saveTemplate() {
    await this.safeOperation(async () => {
    const templateNameField = document.getElementById('template-name');
    const templateTypeField = document.getElementById('template-type');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    
    if (!templateNameField || !templateNameField.value.trim()) {
      this.showToast('Please enter a template name', 'error');
            return;
        }
        
    // Get template info
    const templateName = templateNameField.value.trim();
    const templateType = templateTypeField ? templateTypeField.value : 'Custom';
    
    // Get template items - this should be adapted to your UI
    const templateItems = [];
    
    // Calculate totals
    const totals = templateItems.reduce((acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Create template object
    const template = {
      name: templateName,
      type: templateType,
      items: templateItems,
      ...totals
    };
    
    // Check if we're editing or creating
    if (saveTemplateBtn && saveTemplateBtn.hasAttribute('data-index')) {
      const index = parseInt(saveTemplateBtn.getAttribute('data-index'));
      this.mealTemplates[index] = template;
    } else {
      this.mealTemplates.push(template);
    }
    
    // Save to localStorage
    localStorage.setItem('mealTemplates', JSON.stringify(this.mealTemplates));
    
    // Close modal and update UI
    this.templateModal.classList.remove('active');
    this.renderTemplates();
    
    // Show success notification
    this.showToast(`Template "${templateName}" saved successfully!`);
      
      // Invalidate template cache
      this.invalidateCache('templates_');
    });
  }

  viewMeal(date, mealType) {
    if (this.meals[date] && this.meals[date][mealType]) {
      const meal = this.meals[date][mealType];
      
      // Populate modal with meal details
      // This implementation depends on your modal structure
      
      // For now, we'll just show a temporary message
      this.showToast(`Viewing ${mealType} for ${date}`);
      
      // In a real implementation, you would populate the modal fields and show it
      // this.mealDetailsModal.classList.add('active');
    }
  }

  async deleteMeal(date, mealType) {
    await this.safeOperation(async () => {
    if (this.meals[date] && this.meals[date][mealType]) {
      const mealName = this.meals[date][mealType].name;
      
      // Remove the meal
      delete this.meals[date][mealType];
      
      // If no more meals for this date, clean up
      if (Object.keys(this.meals[date]).length === 0) {
        delete this.meals[date];
      }
      
      // Save to localStorage
      localStorage.setItem('mealPlan', JSON.stringify(this.meals));
      
      // Update UI
      this.renderCalendar();
      this.updateWeeklyStats();
      
      // Show success notification
      this.showToast(`"${mealName}" removed from your meal plan`);
        
        // Invalidate relevant caches
        this.invalidateCache('week_');
        this.invalidateCache('stats_');
    }
    });
  }

  useTemplate(index) {
    if (this.mealTemplates[index]) {
      // This would typically open the add meal modal and pre-populate it
      // with the template content
      this.showToast(`Using template: ${this.mealTemplates[index].name}`);
      
      // In a real implementation, you would call openAddMealModal
      // and then populate the selected items from the template
    }
  }

  async deleteTemplate(index) {
    await this.safeOperation(async () => {
    if (this.mealTemplates[index]) {
      const templateName = this.mealTemplates[index].name;
      
      // Remove template
      this.mealTemplates.splice(index, 1);
      
      // Save to localStorage
      localStorage.setItem('mealTemplates', JSON.stringify(this.mealTemplates));
      
      // Update UI
      this.renderTemplates();
      
      // Show success notification
      this.showToast(`Template "${templateName}" deleted`);
        
        // Invalidate template cache
        this.invalidateCache('templates_');
    }
    });
  }

  updateWeeklyStats() {
    const weekKey = this.formatDate(this.currentDate);
    const stats = this.getCached(`stats_${weekKey}`, () => {
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateKey = this.formatDate(currentDay);
      
      if (this.meals[dateKey]) {
        Object.values(this.meals[dateKey]).forEach(meal => {
          totals.calories += meal.calories || 0;
          totals.protein += meal.protein || 0;
          totals.carbs += meal.carbs || 0;
          totals.fat += meal.fat || 0;
        });
      }
    }
    
      return totals;
    });

    // Update UI with cached stats
    if (this.weeklyCalories) this.weeklyCalories.textContent = Math.round(stats.calories);
    if (this.weeklyProtein) this.weeklyProtein.textContent = `${Math.round(stats.protein)}g`;
    if (this.weeklyCarbs) this.weeklyCarbs.textContent = `${Math.round(stats.carbs)}g`;
    if (this.weeklyFat) this.weeklyFat.textContent = `${Math.round(stats.fat)}g`;

    // Update progress bars
    this.updateProgressBars(stats);
  }

  generateShoppingList() {
    // Get first day of current week (Sunday)
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    // Extract all items from the current week's meals
    const mealPlanItems = [];
    
    // Loop through each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateKey = this.formatDate(currentDay);
      
      // Check if we have meals for this day
      if (this.meals[dateKey]) {
        // Add items from all meals for this day
        Object.values(this.meals[dateKey]).forEach(meal => {
          if (meal.items && meal.items.length > 0) {
            meal.items.forEach(item => {
              // Convert meal item to shopping list item
              mealPlanItems.push({
                name: item.name,
                quantity: '1 serving', // Default quantity
                category: this.determineCategory(item.name)
              });
            });
          }
        });
      }
    }

    // Save weekly meal plan to localStorage for shopping list to use
    const weeklyMealPlan = {
      startDate: this.formatDate(firstDayOfWeek),
      endDate: this.formatDate(new Date(firstDayOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)),
      items: mealPlanItems
    };
    
    localStorage.setItem('currentWeekMealPlan', JSON.stringify(weeklyMealPlan));
    
    // Redirect to shopping list page
    if (mealPlanItems.length > 0) {
      window.location.href = 'shopping-list.html?source=mealplan';
      return;
    }
    
    // Show a message if no items found
    this.showToast('No food items found in the meal plan. Add meals with ingredients first.', 'warning');
  }
  
  determineCategory(itemName) {
    // Simple logic to categorize items based on name
    itemName = itemName.toLowerCase();
    
    // Define category patterns
    const categories = {
      meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'shrimp', 'salmon', 'tuna'],
      dairy: ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'egg'],
      produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'cucumber', 'carrot', 'onion', 'garlic', 'potato', 'broccoli', 'spinach'],
      pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'spice', 'herb', 'sauce', 'soup', 'bread'],
      frozen: ['frozen', 'ice cream'],
    };
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => itemName.includes(keyword))) {
        return category;
      }
    }
    
    // Default category
    return 'other';
  }

  switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `${tabId}-tab`) {
        content.classList.add('active');
        } else {
        content.classList.remove('active');
      }
    });
  }

  updateMealNutrition() {
    // Calculate totals from selected items
    const selectedItems = document.querySelectorAll('.selected-item');
    
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    selectedItems.forEach(item => {
      totals.calories += parseInt(item.getAttribute('data-calories') || '0');
      totals.protein += parseFloat(item.getAttribute('data-protein') || '0');
      totals.carbs += parseFloat(item.getAttribute('data-carbs') || '0');
      totals.fat += parseFloat(item.getAttribute('data-fat') || '0');
    });
    
    // Update UI
    const mealCalories = document.getElementById('meal-calories');
    const mealProtein = document.getElementById('meal-protein');
    const mealCarbs = document.getElementById('meal-carbs');
    const mealFat = document.getElementById('meal-fat');
    
    if (mealCalories) mealCalories.textContent = Math.round(totals.calories);
    if (mealProtein) mealProtein.textContent = `${Math.round(totals.protein)}g`;
    if (mealCarbs) mealCarbs.textContent = `${Math.round(totals.carbs)}g`;
    if (mealFat) mealFat.textContent = `${Math.round(totals.fat)}g`;
  }

  showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Debounce helper
  debounce(key, fn, delay = 300) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    this.debounceTimers.set(key, setTimeout(fn, delay));
  }

  // Helper methods
  formatWeekDisplay(firstDay, lastDay) {
    const formatDateForDisplay = (date) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    
    return `${formatDateForDisplay(firstDay)} - ${formatDateForDisplay(lastDay)}, ${lastDay.getFullYear()}`;
  }

  updateProgressBars(stats) {
    const goals = {
      calories: 14000,
      protein: 490,
      carbs: 1750,
      fat: 385
    };

    const calculatePercentage = (value, goal) => {
      return Math.min(Math.round((value / goal) * 100), 100);
    };

    if (this.caloriesProgress) {
      this.caloriesProgress.style.width = `${calculatePercentage(stats.calories, goals.calories)}%`;
    }
    if (this.proteinProgress) {
      this.proteinProgress.style.width = `${calculatePercentage(stats.protein, goals.protein)}%`;
    }
    if (this.carbsProgress) {
      this.carbsProgress.style.width = `${calculatePercentage(stats.carbs, goals.carbs)}%`;
    }
    if (this.fatProgress) {
      this.fatProgress.style.width = `${calculatePercentage(stats.fat, goals.fat)}%`;
    }
  }

  setupCalendarVirtualization() {
    if (this.calendarObserver) {
      this.calendarObserver.disconnect();
    }

    this.calendarObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const date = entry.target.dataset.date;
        if (entry.isIntersecting) {
          this.visibleDays.add(date);
          this.renderMealForDay(date);
        } else {
          this.visibleDays.delete(date);
        }
      });
    }, {
      root: this.calendarMeals,
      rootMargin: '100px',
      threshold: 0.1
    });
  }

  setupErrorBoundary() {
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }

  setupPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.performanceMetrics.set(entry.name, {
              duration: entry.duration,
              timestamp: Date.now()
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  handleError(error) {
    const now = Date.now();
    this.errorCount++;
    
    // Reset error count if more than 1 minute has passed
    if (now - this.lastErrorTime > 60000) {
      this.errorCount = 1;
    }
    
    this.lastErrorTime = now;

    // Log error
    console.error('Meal Planner Error:', error);

    // Show user-friendly error message
    this.showToast('An error occurred. Please try again.', 'error');

    // If too many errors in short time, enter safe mode
    if (this.errorCount > 5) {
      this.enterSafeMode();
    }
  }

  enterSafeMode() {
    // Disable non-essential features
    this.isProcessing = true;
    
    // Clear caches
    this.cleanup();
    
    // Show safe mode message
    this.showToast('Entering safe mode. Some features may be limited.', 'warning');
    
    // Re-enable after 5 minutes
    setTimeout(() => {
      this.isProcessing = false;
      this.errorCount = 0;
      this.showToast('Safe mode disabled. All features restored.', 'success');
    }, 300000);
  }

  checkPerformance() {
    const performanceStatus = this.performanceMonitor.getPerformanceStatus();
    
    switch (performanceStatus.status) {
      case 'critical':
        this.optimizePerformance('aggressive');
        break;
      case 'warning':
        this.optimizePerformance('moderate');
        break;
      case 'suboptimal':
        this.optimizePerformance('light');
        break;
    }
    
    this.performanceMonitor.clearOldMetrics();
  }

  optimizePerformance(intensity = 'moderate') {
    const reductionFactors = {
      aggressive: { cache: 0.5, templates: 0.5 },
      moderate: { cache: 0.7, templates: 0.7 },
      light: { cache: 0.9, templates: 0.9 }
    };
    
    const factor = reductionFactors[intensity];
    
    // Reduce cache size
    this.maxCacheSize = Math.max(20, Math.round(this.maxCacheSize * factor.cache));
    
    // Clear old cache entries
    this.cleanupCache();
    
    // Reduce template page size
    this.templatesPerPage = Math.max(4, Math.round(this.templatesPerPage * factor.templates));
    
    // Re-render with new settings
    this.renderTemplates();
    
    // Log optimization
    console.log(`Performance optimization applied: ${intensity}`, {
      newCacheSize: this.maxCacheSize,
      newTemplatesPerPage: this.templatesPerPage
    });
  }

  async safeOperation(operation) {
    if (this.isProcessing) {
      this.showToast('Please wait for the current operation to complete.', 'warning');
      return;
    }

    try {
      this.isProcessing = true;
      await operation();
    } catch (error) {
      const errorStatus = this.errorHandler.handleError(error);
      
      if (errorStatus.shouldEnterSafeMode) {
        await this.enterSafeMode();
      }
      
      this.showToast('An error occurred. Please try again.', 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  cleanup() {
    if (this.templateObserver) {
      this.templateObserver.disconnect();
      this.templateObserver = null;
    }
    if (this.calendarObserver) {
      this.calendarObserver.disconnect();
      this.calendarObserver = null;
    }
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.cacheSize = 0;
    this.visibleDays.clear();
    this.performanceMetrics.clear();
    this.isProcessing = false;
    this.errorCount = 0;
    this.lastErrorTime = 0;
    if (this.analytics) {
      this.analytics.clearCache();
    }
  }

  detectDevicePerformance() {
    // Simple device performance detection
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += i;
    }
    const duration = performance.now() - start;
    
    const devicePerformance = duration > 100 ? 'low' :
                             duration > 50 ? 'medium' : 'high';
    
    this.performanceMonitor.adjustThresholds(devicePerformance);
  }

  initAnalyticsButton() {
    const analyticsBtn = document.createElement('button');
    analyticsBtn.className = 'analytics-btn';
    analyticsBtn.innerHTML = '<i class="fas fa-chart-line"></i> View Analytics';
    analyticsBtn.addEventListener('click', () => this.showAnalytics());
    
    // Add button to the header
    const header = document.querySelector('.meal-planner-header');
    if (header) {
      header.appendChild(analyticsBtn);
    }
  }

  showAnalytics() {
    const trends = this.analytics.getWeeklyTrends();
    
    // Create analytics modal
    const modal = document.createElement('div');
    modal.className = 'modal analytics-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Meal Plan Analytics</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analytics-section">
            <h3>Meal Distribution</h3>
            <div class="meal-distribution-chart"></div>
          </div>
          <div class="analytics-section">
            <h3>Nutrition Trends</h3>
            <div class="nutrition-trends-chart"></div>
          </div>
          <div class="analytics-section">
            <h3>Popular Items</h3>
            <div class="popular-items-list"></div>
          </div>
          <div class="analytics-section">
            <h3>Meal Variety</h3>
            <div class="meal-variety-stats"></div>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.appendChild(modal);
    modal.classList.add('active');

    // Render charts and data
    this.renderAnalyticsCharts(modal, trends);

    // Handle modal close
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });
  }

  renderAnalyticsCharts(modal, trends) {
    // Render meal distribution
    const distributionChart = modal.querySelector('.meal-distribution-chart');
    this.renderMealDistributionChart(distributionChart, trends.mealDistribution);

    // Render nutrition trends
    const trendsChart = modal.querySelector('.nutrition-trends-chart');
    this.renderNutritionTrendsChart(trendsChart, trends.nutritionTrends);

    // Render popular items
    const popularItems = modal.querySelector('.popular-items-list');
    this.renderPopularItems(popularItems, trends.popularItems);

    // Render meal variety
    const varietyStats = modal.querySelector('.meal-variety-stats');
    this.renderMealVariety(varietyStats, trends.mealVariety);
  }

  renderMealDistributionChart(container, distribution) {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    container.innerHTML = Object.entries(distribution)
      .map(([mealType, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return `
          <div class="meal-distribution-item">
            <div class="meal-type">${mealType}</div>
            <div class="meal-count">${count} meals</div>
            <div class="meal-percentage">
              <div class="percentage-bar" style="width: ${percentage}%"></div>
              <span>${Math.round(percentage)}%</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderNutritionTrendsChart(container, trends) {
    const maxValue = Math.max(
      ...Object.values(trends).flat()
    );

    container.innerHTML = `
      <div class="nutrition-trends">
        ${Object.entries(trends).map(([nutrient, values]) => `
          <div class="nutrient-trend">
            <div class="nutrient-name">${nutrient}</div>
            <div class="nutrient-bars">
              ${values.map(value => `
                <div class="nutrient-bar" style="height: ${(value / maxValue) * 100}%">
                  <span class="nutrient-value">${Math.round(value)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderPopularItems(container, items) {
    container.innerHTML = items
      .map(item => `
        <div class="popular-item">
          <div class="item-name">${item.name}</div>
          <div class="item-count">${item.count} times</div>
        </div>
      `)
      .join('');
  }

  renderMealVariety(container, variety) {
    container.innerHTML = `
      <div class="variety-stats">
        <div class="variety-stat">
          <div class="stat-label">Unique Meals</div>
          <div class="stat-value">${variety.uniqueMeals}</div>
        </div>
        <div class="variety-stat">
          <div class="stat-label">Total Meals</div>
          <div class="stat-value">${variety.totalMeals}</div>
        </div>
        <div class="variety-stat">
          <div class="stat-label">Variety Score</div>
          <div class="stat-value">${Math.round(variety.varietyScore)}%</div>
        </div>
      </div>
    `;
  }

  // Add method to show suggestions in the add meal modal
  showMealSuggestions(date, mealType) {
    const suggestionsContainer = document.getElementById('meal-suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '<div class="loading-suggestions">Generating personalized suggestions...</div>';

    this.smartSuggestions.getSuggestions(mealType, date).then(suggestions => {
      if (!suggestions || suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<div class="no-suggestions">No suggestions available</div>';
        return;
      }

      suggestionsContainer.innerHTML = suggestions.map(suggestion => `
        <div class="meal-suggestion" data-suggestion-id="${suggestion.id}">
          <div class="suggestion-header">
            <h4>${suggestion.name}</h4>
            <span class="confidence-score">${suggestion.confidence}% match</span>
          </div>
          <div class="suggestion-nutrition">
            <span>Cal: ${suggestion.nutrition.calories}</span>
            <span>Protein: ${suggestion.nutrition.protein}g</span>
            <span>Carbs: ${suggestion.nutrition.carbs}g</span>
          </div>
          <div class="suggestion-actions">
            <button class="use-suggestion-btn" onclick="mealPlanner.useSuggestion('${suggestion.name}', '${date}', '${mealType}')">
              Use This Meal
            </button>
            <div class="feedback-buttons">
              <button class="feedback-btn helpful" onclick="mealPlanner.suggestions.recordUserFeedback('${suggestion.id}', true)">
                <i class="fas fa-thumbs-up"></i>
              </button>
              <button class="feedback-btn not-helpful" onclick="mealPlanner.suggestions.recordUserFeedback('${suggestion.id}', false)">
                <i class="fas fa-thumbs-down"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }).catch(error => {
      suggestionsContainer.innerHTML = `
        <div class="suggestion-error">
          <p>Failed to load suggestions</p>
          <button onclick="mealPlanner.showMealSuggestions('${date}', '${mealType}')">
            Try Again
          </button>
        </div>
      `;
    });
  }

  useSuggestion(mealName, date, mealType) {
    // Create a meal object from the suggestion
    const meal = {
      name: mealName,
      items: [{ name: mealName }],
      ...this.smartSuggestions.estimateNutrition({ name: mealName })
    };

    // Save the meal
    if (!this.meals[date]) {
      this.meals[date] = {};
    }
    this.meals[date][mealType] = meal;

    // Save to localStorage
    localStorage.setItem('mealPlan', JSON.stringify(this.meals));

    // Close modal and update UI
    this.addMealModal.classList.remove('active');
    this.renderCalendar();
    this.updateWeeklyStats();

    // Show success notification
    this.showToast(`${mealName} added to your meal plan!`);
  }
}

// Initialize the meal planner when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const mealPlanner = new MealPlanner();
});