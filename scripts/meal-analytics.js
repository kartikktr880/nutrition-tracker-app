class MealAnalytics {
    constructor() {
        this.cache = new Map();
        this.chartInstances = new Map();
        this.isInitialized = false;
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

        this.isInitialized = true;
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
            console.error('Error loading analytics:', error);
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