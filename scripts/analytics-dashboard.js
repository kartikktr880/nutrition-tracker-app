/**
 * Enhanced Analytics Dashboard
 * Provides comprehensive visualization and analysis of nutrition data
 */

import dataManager from './data-manager.js';

class AnalyticsDashboard {
    constructor() {
        this.charts = new Map();
        this.insights = new Map();
        this.observers = new Set();
        this.resizeTimeout = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.errorMessages = {
            NO_DATA: 'No meal data found for the selected period. Start logging your meals to see analytics!',
            LOAD_ERROR: 'Unable to load meal data. Please try again.',
            NETWORK_ERROR: 'Network error. Please check your connection and try again.',
            SERVER_ERROR: 'Server error. Please try again later.',
            VALIDATION_ERROR: 'Invalid data format. Please contact support.'
        };
        this.initialize();
    }

    async initialize() {
        // Initialize dashboard components
        this.setupDashboard();
        this.setupEventListeners();
        this.loadData();
    }

    setupDashboard() {
        const dashboard = document.createElement('div');
        dashboard.className = 'analytics-dashboard';
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h2>Nutrition Analytics</h2>
                <div class="dashboard-controls">
                    <select id="timeRange">
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <button id="refreshData" class="btn btn-secondary">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-card overview">
                    <h3>Nutrition Overview</h3>
                    <div class="card-content">
                        <div class="nutrition-summary">
                            <div class="summary-item">
                                <span class="label">Average Calories</span>
                                <span class="value" id="avgCalories">-</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Protein Goal</span>
                                <span class="value" id="proteinGoal">-</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Carbs Goal</span>
                                <span class="value" id="carbsGoal">-</span>
                            </div>
                            <div class="summary-item">
                                <span class="label">Fat Goal</span>
                                <span class="value" id="fatGoal">-</span>
                            </div>
                        </div>
                        <canvas id="nutritionChart"></canvas>
                    </div>
                </div>
                <div class="dashboard-card trends">
                    <h3>Nutrition Trends</h3>
                    <div class="card-content">
                        <canvas id="trendsChart"></canvas>
                    </div>
                </div>
                <div class="dashboard-card meal-distribution">
                    <h3>Meal Distribution</h3>
                    <div class="card-content">
                        <canvas id="mealDistributionChart"></canvas>
                    </div>
                </div>
                <div class="dashboard-card insights">
                    <h3>Smart Insights</h3>
                    <div class="card-content">
                        <div id="insightsList"></div>
                    </div>
                </div>
                <div class="dashboard-card recommendations">
                    <h3>Recommendations</h3>
                    <div class="card-content">
                        <div id="recommendationsList"></div>
                    </div>
                </div>
                <div class="dashboard-card patterns">
                    <h3>Meal Patterns</h3>
                    <div class="card-content">
                        <canvas id="patternsChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dashboard);
    }

    setupEventListeners() {
        // Time range change
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.updateTimeRange(e.target.value);
        });

        // Refresh data
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadData();
        });

        // Chart resize handling
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    async loadData() {
        try {
            const timeRange = document.getElementById('timeRange').value;
            const data = await this.fetchAnalyticsData(timeRange);
            this.updateDashboard(data);
        } catch (error) {
            console.error('Error loading analytics data:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async fetchAnalyticsData(timeRange) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(timeRange));

            const meals = await this.getMealsWithRetry(startDate, endDate);
            const goals = await this.getNutritionGoalsWithRetry();
            
            if (!meals || meals.length === 0) {
                this.showUserFriendlyError(this.errorMessages.NO_DATA);
                return null;
            }

            return {
                meals,
                goals,
                timeRange
            };
        } catch (error) {
            this.handleError(error);
            return null;
        }
    }

    async getMealsWithRetry(startDate, endDate, attempt = 1) {
        try {
            const result = await dataManager.getMeals(startDate, endDate);
            
            if (!result.success) {
                throw new Error(result.error || this.errorMessages.LOAD_ERROR);
            }

            if (!Array.isArray(result.data)) {
                throw new Error(this.errorMessages.VALIDATION_ERROR);
            }

            return result.data;
        } catch (error) {
            if (attempt < this.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.getMealsWithRetry(startDate, endDate, attempt + 1);
            }
            throw error;
        }
    }

    async getNutritionGoalsWithRetry(attempt = 1) {
        try {
            const goals = await dataManager.getNutritionGoals();
            if (!goals) {
                throw new Error(this.errorMessages.LOAD_ERROR);
            }
            return goals;
        } catch (error) {
            if (attempt < this.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.getNutritionGoalsWithRetry(attempt + 1);
            }
            throw error;
        }
    }

    handleError(error) {
        console.error('Analytics Error:', error);
        
        let userMessage = this.errorMessages.SERVER_ERROR;
        
        if (error.message.includes('Network')) {
            userMessage = this.errorMessages.NETWORK_ERROR;
        } else if (error.message.includes('Validation')) {
            userMessage = this.errorMessages.VALIDATION_ERROR;
        }
        
        this.showUserFriendlyError(userMessage);
    }

    showUserFriendlyError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'analytics-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button class="retry-btn">Try Again</button>
            </div>
        `;

        // Add retry functionality
        const retryBtn = errorContainer.querySelector('.retry-btn');
        retryBtn.addEventListener('click', () => {
            errorContainer.remove();
            this.fetchAnalyticsData(this.currentTimeRange);
        });

        // Add to DOM
        const container = document.querySelector('.analytics-container');
        if (container) {
            container.appendChild(errorContainer);
        }
    }

    updateDashboard(data) {
        this.updateNutritionOverview(data);
        this.updateTrendsChart(data);
        this.updateMealDistribution(data);
        this.updateInsights(data);
        this.updateRecommendations(data);
        this.updatePatternsChart(data);
    }

    updateNutritionOverview(data) {
        const { meals, goals } = data;
        
        // Calculate averages
        const averages = this.calculateAverages(meals);
        
        // Update summary values
        document.getElementById('avgCalories').textContent = Math.round(averages.calories);
        document.getElementById('proteinGoal').textContent = `${Math.round(averages.protein)}g / ${goals.protein}g`;
        document.getElementById('carbsGoal').textContent = `${Math.round(averages.carbs)}g / ${goals.carbs}g`;
        document.getElementById('fatGoal').textContent = `${Math.round(averages.fat)}g / ${goals.fat}g`;
        
        // Update nutrition chart
        this.updateNutritionChart(averages, goals);
    }

    updateNutritionChart(averages, goals) {
        const ctx = document.getElementById('nutritionChart').getContext('2d');
        
        if (this.charts.has('nutrition')) {
            this.charts.get('nutrition').destroy();
        }
        
        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Calories', 'Protein', 'Carbs', 'Fat'],
                datasets: [{
                    label: 'Actual',
                    data: [
                        (averages.calories / goals.calories) * 100,
                        (averages.protein / goals.protein) * 100,
                        (averages.carbs / goals.carbs) * 100,
                        (averages.fat / goals.fat) * 100
                    ],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                scale: {
                    ticks: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        
        this.charts.set('nutrition', chart);
    }

    updateTrendsChart(data) {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        if (this.charts.has('trends')) {
            this.charts.get('trends').destroy();
        }
        
        const trends = this.calculateTrends(data.meals);
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.dates,
                datasets: [{
                    label: 'Calories',
                    data: trends.calories,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                }, {
                    label: 'Protein',
                    data: trends.protein,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }, {
                    label: 'Carbs',
                    data: trends.carbs,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    fill: false
                }, {
                    label: 'Fat',
                    data: trends.fat,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        this.charts.set('trends', chart);
    }

    updateMealDistribution(data) {
        const ctx = document.getElementById('mealDistributionChart').getContext('2d');
        
        if (this.charts.has('mealDistribution')) {
            this.charts.get('mealDistribution').destroy();
        }
        
        const distribution = this.calculateMealDistribution(data.meals);
        
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(distribution),
                datasets: [{
                    data: Object.values(distribution),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
        
        this.charts.set('mealDistribution', chart);
    }

    updateInsights(data) {
        const insightsList = document.getElementById('insightsList');
        const insights = this.generateInsights(data);
        
        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon">
                    <i class="fas ${this.getInsightIcon(insight.type)}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
    }

    updateRecommendations(data) {
        const recommendationsList = document.getElementById('recommendationsList');
        const recommendations = this.generateRecommendations(data);
        
        recommendationsList.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <div class="recommendation-icon">
                    <i class="fas ${this.getRecommendationIcon(rec.type)}"></i>
                </div>
                <div class="recommendation-content">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    ${rec.action ? `<button class="btn btn-primary btn-sm">${rec.action}</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    updatePatternsChart(data) {
        const ctx = document.getElementById('patternsChart').getContext('2d');
        
        if (this.charts.has('patterns')) {
            this.charts.get('patterns').destroy();
        }
        
        const patterns = this.analyzeMealPatterns(data.meals);
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: patterns.labels,
                datasets: [{
                    label: 'Frequency',
                    data: patterns.data,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        this.charts.set('patterns', chart);
    }

    calculateAverages(meals) {
        if (!meals.length) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
        
        const totals = meals.reduce((acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fat: acc.fat + (meal.fat || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        return {
            calories: totals.calories / meals.length,
            protein: totals.protein / meals.length,
            carbs: totals.carbs / meals.length,
            fat: totals.fat / meals.length
        };
    }

    calculateTrends(meals) {
        const dates = [...new Set(meals.map(meal => new Date(meal.time).toISOString().split('T')[0]))].sort();
        
        return {
            dates,
            calories: dates.map(date => this.calculateDailyTotal(meals, date, 'calories')),
            protein: dates.map(date => this.calculateDailyTotal(meals, date, 'protein')),
            carbs: dates.map(date => this.calculateDailyTotal(meals, date, 'carbs')),
            fat: dates.map(date => this.calculateDailyTotal(meals, date, 'fat'))
        };
    }

    calculateDailyTotal(meals, date, nutrient) {
        return meals
            .filter(meal => new Date(meal.time).toISOString().split('T')[0] === date)
            .reduce((total, meal) => total + (meal[nutrient] || 0), 0);
    }

    calculateMealDistribution(meals) {
        const distribution = {};
        meals.forEach(meal => {
            distribution[meal.type] = (distribution[meal.type] || 0) + 1;
        });
        return distribution;
    }

    generateInsights(data) {
        const insights = [];
        const { meals, goals } = data;
        
        // Nutrition balance insight
        const averages = this.calculateAverages(meals);
        if (averages.protein < goals.protein * 0.8) {
            insights.push({
                type: 'nutrition',
                title: 'Protein Intake',
                description: 'Your protein intake is below your target. Consider adding more protein-rich foods to your meals.'
            });
        }
        
        // Meal timing insight
        const timing = this.analyzeMealTiming(meals);
        if (timing.irregular) {
            insights.push({
                type: 'timing',
                title: 'Meal Timing',
                description: 'Your meal times are irregular. Try to maintain consistent meal times for better metabolism.'
            });
        }
        
        // Variety insight
        const variety = this.analyzeMealVariety(meals);
        if (variety.score < 50) {
            insights.push({
                type: 'variety',
                title: 'Meal Variety',
                description: 'Your meals lack variety. Consider trying different types of foods and cuisines.'
            });
        }
        
        return insights;
    }

    generateRecommendations(data) {
        const recommendations = [];
        const { meals, goals } = data;
        
        // Nutrition recommendations
        const averages = this.calculateAverages(meals);
        if (averages.protein < goals.protein * 0.8) {
            recommendations.push({
                type: 'nutrition',
                title: 'Increase Protein',
                description: 'Add more protein-rich foods like lean meats, fish, eggs, and legumes to your meals.',
                action: 'View Protein-Rich Recipes'
            });
        }
        
        // Meal planning recommendations
        const planning = this.analyzeMealPlanning(meals);
        if (planning.needsImprovement) {
            recommendations.push({
                type: 'planning',
                title: 'Meal Planning',
                description: 'Plan your meals ahead to ensure balanced nutrition and save time.',
                action: 'Start Meal Planning'
            });
        }
        
        return recommendations;
    }

    analyzeMealPatterns(meals) {
        const patterns = {
            labels: [],
            data: []
        };
        
        // Group meals by hour
        const hourlyDistribution = {};
        meals.forEach(meal => {
            const hour = new Date(meal.time).getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });
        
        // Convert to chart data
        for (let hour = 0; hour < 24; hour++) {
            patterns.labels.push(`${hour}:00`);
            patterns.data.push(hourlyDistribution[hour] || 0);
        }
        
        return patterns;
    }

    analyzeMealTiming(meals) {
        const intervals = this.calculateMealIntervals(meals);
        const averageInterval = this.calculateAverageInterval(intervals);
        const variance = this.calculateVariance(intervals, averageInterval);
        
        return {
            averageInterval,
            variance,
            irregular: variance > averageInterval * 0.5
        };
    }

    analyzeMealVariety(meals) {
        const types = new Set(meals.map(meal => meal.type));
        const cuisines = new Set(meals.map(meal => meal.cuisine).filter(Boolean));
        
        return {
            score: (types.size / 5) * 50 + (cuisines.size / 10) * 50, // Assuming 5 meal types and 10 cuisine types
            types: Array.from(types),
            cuisines: Array.from(cuisines)
        };
    }

    analyzeMealPlanning(meals) {
        const plannedMeals = meals.filter(meal => meal.planned);
        const planningRate = plannedMeals.length / meals.length;
        
        return {
            planningRate,
            needsImprovement: planningRate < 0.5
        };
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

    calculateVariance(values, mean) {
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    }

    getInsightIcon(type) {
        switch (type) {
            case 'nutrition':
                return 'fa-chart-pie';
            case 'timing':
                return 'fa-clock';
            case 'variety':
                return 'fa-utensils';
            default:
                return 'fa-lightbulb';
        }
    }

    getRecommendationIcon(type) {
        switch (type) {
            case 'nutrition':
                return 'fa-apple-alt';
            case 'planning':
                return 'fa-calendar-alt';
            default:
                return 'fa-star';
        }
    }

    handleResize = () => {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.charts.forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 250);
    }

    showError(message) {
        // Show a visible error message in the dashboard
        let errorDiv = document.getElementById('dashboardError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'dashboardError';
            errorDiv.className = 'dashboard-error';
            const dashboard = document.querySelector('.analytics-dashboard');
            if (dashboard) {
                dashboard.prepend(errorDiv);
            } else {
                document.body.prepend(errorDiv);
            }
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    cleanup() {
        // Destroy all chart instances
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();

        // Clear insights
        this.insights.clear();

        // Remove all observers
        this.observers.clear();

        // Remove event listeners
        const timeRange = document.getElementById('timeRange');
        const refreshButton = document.getElementById('refreshData');
        if (timeRange) timeRange.removeEventListener('change', this.updateTimeRange);
        if (refreshButton) refreshButton.removeEventListener('click', this.loadData);
        window.removeEventListener('resize', this.handleResize);

        // Clear resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Remove dashboard from DOM
        const dashboard = document.querySelector('.analytics-dashboard');
        if (dashboard) dashboard.remove();
    }
}

export const analyticsDashboard = new AnalyticsDashboard(); 