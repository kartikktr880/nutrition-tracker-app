class NutritionAnalytics {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.chartInstances = new Map();
        this.defaultMetrics = {
            calories: { daily: 2000, warning: 2500 },
            protein: { daily: 50, warning: 60 },
            carbs: { daily: 275, warning: 325 },
            fat: { daily: 55, warning: 70 },
            fiber: { daily: 25, warning: 30 }
        };
        this.isLoading = false;
        this.intersectionObserver = null;
        this.chartInitQueue = new Set();
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add analytics button to header
        const header = document.querySelector('.planner-header');
        if (header) {
            const analyticsBtn = document.createElement('button');
            analyticsBtn.className = 'btn btn-primary analytics-btn';
            analyticsBtn.innerHTML = '<i class="fas fa-chart-line"></i> Smart Analytics';
            analyticsBtn.addEventListener('click', () => this.showDashboard());
            header.appendChild(analyticsBtn);
        }

        // Initialize intersection observer for lazy loading
        this.setupIntersectionObserver();

        // Initialize data listeners
        this.setupDataListeners();
        this.isInitialized = true;
    }

    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.chartInitQueue.has(entry.target.id)) {
                    this.initializeChartById(entry.target.id);
                    this.chartInitQueue.delete(entry.target.id);
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });
    }

    async initializeChartById(chartId) {
        const chartElement = document.getElementById(chartId);
        if (!chartElement || this.chartInstances.has(chartId)) return;

        switch (chartId) {
            case 'nutritionChart':
                await this.initializeNutritionChart();
                break;
            case 'trendChart':
                await this.initializeTrendChart();
                break;
            case 'prepChart':
                await this.initializePrepChart();
                break;
            case 'shoppingChart':
                await this.initializeShoppingChart();
                break;
        }
    }

    getCachedData(key, ttl = 300000) { // 5 minutes TTL
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async calculateNutritionStats() {
        const cacheKey = 'nutritionStats';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        // Simulate API call or data calculation
        const stats = {
            calories: 1850,
            protein: 45,
            carbs: 250,
            fat: 50,
            fiber: 22
        };

        this.setCachedData(cacheKey, stats);
        return stats;
    }

    async showDashboard() {
        const modal = document.createElement('div');
        modal.className = 'analytics-modal';
        
        this.isLoading = true;
        modal.innerHTML = `
            <div class="modal-content analytics-content">
                <div class="modal-header">
                    <h3>Smart Nutrition Analytics</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="analytics-body">
                    <div class="loading-overlay ${this.isLoading ? 'active' : ''}">
                        <div class="loading-spinner"></div>
                        <p>Loading your nutrition insights...</p>
                    </div>
                    <div class="analytics-content ${this.isLoading ? 'hidden' : ''}">
                        ${await this.renderNutritionOverview()}
                        ${this.renderTrendAnalysis()}
                        ${this.renderMealPrepInsights()}
                        ${this.renderShoppingAnalytics()}
                        ${this.renderRecommendations()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.cleanupDashboard(modal);
            modal.remove();
        });
        
        // Queue charts for lazy loading
        ['nutritionChart', 'trendChart', 'prepChart', 'shoppingChart'].forEach(chartId => {
            const chartElement = modal.querySelector(`#${chartId}`);
            if (chartElement) {
                this.chartInitQueue.add(chartId);
                this.intersectionObserver.observe(chartElement);
            }
        });

        // Show content after initial render
        setTimeout(() => {
            this.isLoading = false;
            modal.querySelector('.loading-overlay').classList.remove('active');
            modal.querySelector('.analytics-content').classList.remove('hidden');
        }, 300);
        
        this.setupInteractions(modal);
    }

    cleanupDashboard(modal) {
        // Cleanup chart instances
        this.chartInstances.forEach((chart, key) => {
            chart.destroy();
            this.chartInstances.delete(key);
        });

        // Cleanup intersection observers
        ['nutritionChart', 'trendChart', 'prepChart', 'shoppingChart'].forEach(chartId => {
            const element = modal.querySelector(`#${chartId}`);
            if (element) {
                this.intersectionObserver.unobserve(element);
            }
        });

        this.chartInitQueue.clear();
    }

    setupDataListeners() {
        // Listen for meal additions
        document.addEventListener('mealAdded', (e) => {
            this.updateAnalytics(e.detail);
        });

        // Listen for meal prep completions
        document.addEventListener('prepCompleted', (e) => {
            this.updatePrepStats(e.detail);
        });

        // Listen for grocery list updates
        document.addEventListener('groceryUpdated', (e) => {
            this.updateShoppingMetrics(e.detail);
        });
    }

    async renderNutritionOverview() {
        const stats = await this.calculateNutritionStats();
        
        return `
            <section class="analytics-section">
                <h4>Nutrition Overview</h4>
                <div class="nutrition-overview">
                    <div class="overview-stats">
                        ${Object.entries(stats).map(([nutrient, value]) => `
                            <div class="stat-card ${this.getStatClass(nutrient, value)}">
                                <div class="stat-icon">
                                    <i class="fas ${this.getNutrientIcon(nutrient)}"></i>
                                </div>
                                <div class="stat-content">
                                    <h5>${this.formatNutrientName(nutrient)}</h5>
                                    <span class="stat-value">${value}${this.getNutrientUnit(nutrient)}</span>
                                    <div class="stat-progress">
                                        <div class="progress-bar" style="width: ${this.calculateProgress(nutrient, value)}%"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="overview-chart">
                        <canvas id="nutritionChart"></canvas>
                    </div>
                </div>
            </section>
        `;
    }

    renderTrendAnalysis() {
        return `
            <section class="analytics-section">
                <h4>Trend Analysis</h4>
                <div class="trend-analysis">
                    <div class="trend-filters">
                        <button class="trend-btn active" data-period="week">Week</button>
                        <button class="trend-btn" data-period="month">Month</button>
                        <button class="trend-btn" data-period="year">Year</button>
                    </div>
                    <div class="trend-chart">
                        <canvas id="trendChart"></canvas>
                    </div>
                    <div class="trend-insights">
                        ${this.generateTrendInsights().map(insight => `
                            <div class="insight-card ${insight.type}">
                                <div class="insight-icon">
                                    <i class="fas ${this.getInsightIcon(insight.type)}"></i>
                                </div>
                                <div class="insight-content">
                                    <h6>${insight.title}</h6>
                                    <p>${insight.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    renderMealPrepInsights() {
        const prepStats = this.analyzePrepEfficiency();
        
        return `
            <section class="analytics-section">
                <h4>Meal Prep Analytics</h4>
                <div class="prep-analytics">
                    <div class="prep-efficiency">
                        <div class="efficiency-chart">
                            <canvas id="prepChart"></canvas>
                        </div>
                        <div class="efficiency-stats">
                            ${Object.entries(prepStats).map(([metric, value]) => `
                                <div class="efficiency-stat">
                                    <span class="stat-label">${this.formatPrepMetric(metric)}</span>
                                    <span class="stat-value">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="prep-recommendations">
                        ${this.generatePrepRecommendations().map(rec => `
                            <div class="prep-recommendation">
                                <i class="fas ${this.getPrepIcon(rec.type)}"></i>
                                <span>${rec.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    renderShoppingAnalytics() {
        const shoppingStats = this.analyzeShoppingPatterns();
        
        return `
            <section class="analytics-section">
                <h4>Shopping Analytics</h4>
                <div class="shopping-analytics">
                    <div class="shopping-patterns">
                        <div class="patterns-chart">
                            <canvas id="shoppingChart"></canvas>
                        </div>
                        <div class="patterns-stats">
                            ${Object.entries(shoppingStats).map(([category, data]) => `
                                <div class="pattern-stat">
                                    <div class="stat-header">
                                        <h6>${category}</h6>
                                        <span class="trend ${data.trend}">${this.formatTrend(data.trend)}</span>
                                    </div>
                                    <div class="stat-details">
                                        <span>Avg. Spend: $${data.avgSpend}</span>
                                        <span>Frequency: ${data.frequency}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="shopping-optimization">
                        ${this.generateShoppingOptimizations().map(opt => `
                            <div class="optimization-card">
                                <div class="optimization-header">
                                    <i class="fas ${this.getOptimizationIcon(opt.type)}"></i>
                                    <h6>${opt.title}</h6>
                                </div>
                                <p>${opt.description}</p>
                                <div class="potential-savings">
                                    Potential Savings: $${opt.savings}/month
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    renderRecommendations() {
        const recommendations = this.generateSmartRecommendations();
        
        return `
            <section class="analytics-section">
                <h4>Smart Recommendations</h4>
                <div class="recommendations-grid">
                    ${recommendations.map(rec => `
                        <div class="recommendation-card ${rec.priority}">
                            <div class="recommendation-header">
                                <div class="rec-icon">
                                    <i class="fas ${this.getRecommendationIcon(rec.type)}"></i>
                                </div>
                                <h5>${rec.title}</h5>
                            </div>
                            <p>${rec.description}</p>
                            <div class="recommendation-actions">
                                ${rec.actions.map(action => `
                                    <button class="action-btn" data-action="${action.type}">
                                        ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    getStatClass(nutrient, value) {
        const target = this.defaultMetrics[nutrient];
        if (!target) return '';
        
        const percentage = (value / target.daily) * 100;
        if (percentage >= (target.warning / target.daily) * 100) return 'warning';
        if (percentage >= 90) return 'success';
        if (percentage <= 50) return 'alert';
        return 'normal';
    }

    getNutrientIcon(nutrient) {
        const icons = {
            calories: 'fa-fire',
            protein: 'fa-dumbbell',
            carbs: 'fa-bread-slice',
            fat: 'fa-cheese',
            fiber: 'fa-seedling'
        };
        return icons[nutrient] || 'fa-chart-pie';
    }

    formatNutrientName(nutrient) {
        return nutrient.charAt(0).toUpperCase() + nutrient.slice(1);
    }

    getNutrientUnit(nutrient) {
        return nutrient === 'calories' ? 'kcal' : 'g';
    }

    calculateProgress(nutrient, value) {
        const target = this.defaultMetrics[nutrient]?.daily || 100;
        return Math.min((value / target) * 100, 100);
    }

    generateTrendInsights() {
        // Mock insights - replace with actual analysis
        return [
            {
                type: 'positive',
                title: 'Protein Intake Improving',
                description: 'Your protein intake has increased by 15% this week.'
            },
            {
                type: 'warning',
                title: 'High Sodium Days',
                description: 'Sodium intake exceeded recommendations 3 times this week.'
            },
            {
                type: 'neutral',
                title: 'Consistent Meal Times',
                description: 'Your meal timing has been very consistent this week.'
            }
        ];
    }

    getInsightIcon(type) {
        const icons = {
            positive: 'fa-arrow-trend-up',
            warning: 'fa-triangle-exclamation',
            neutral: 'fa-equals'
        };
        return icons[type] || 'fa-info-circle';
    }

    analyzePrepEfficiency() {
        // Mock data - replace with actual analysis
        return {
            timePerMeal: '25 mins',
            batchEfficiency: '85%',
            wasteReduction: '30%',
            prepCompletion: '92%'
        };
    }

    formatPrepMetric(metric) {
        return metric
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    generatePrepRecommendations() {
        // Mock recommendations - replace with actual analysis
        return [
            {
                type: 'time',
                text: 'Batch cook grains to save 45 minutes weekly'
            },
            {
                type: 'storage',
                text: 'Use smaller containers to reduce unused portions'
            },
            {
                type: 'efficiency',
                text: 'Prep vegetables for multiple meals simultaneously'
            }
        ];
    }

    getPrepIcon(type) {
        const icons = {
            time: 'fa-clock',
            storage: 'fa-box',
            efficiency: 'fa-bolt'
        };
        return icons[type] || 'fa-lightbulb';
    }

    analyzeShoppingPatterns() {
        // Mock data - replace with actual analysis
        return {
            'Fresh Produce': {
                trend: 'up',
                avgSpend: 45,
                frequency: 'Weekly'
            },
            'Protein Sources': {
                trend: 'stable',
                avgSpend: 65,
                frequency: 'Bi-weekly'
            },
            'Pantry Items': {
                trend: 'down',
                avgSpend: 30,
                frequency: 'Monthly'
            }
        };
    }

    formatTrend(trend) {
        const symbols = {
            up: '↑',
            down: '↓',
            stable: '→'
        };
        return symbols[trend] || '→';
    }

    generateShoppingOptimizations() {
        // Mock optimizations - replace with actual analysis
        return [
            {
                type: 'bulk',
                title: 'Bulk Purchase Opportunities',
                description: 'Buy these 5 items in bulk to save money',
                savings: 25
            },
            {
                type: 'seasonal',
                title: 'Seasonal Produce Switch',
                description: 'Switch to seasonal vegetables for better value',
                savings: 15
            }
        ];
    }

    getOptimizationIcon(type) {
        const icons = {
            bulk: 'fa-boxes-stacked',
            seasonal: 'fa-leaf'
        };
        return icons[type] || 'fa-money-bill-trend-up';
    }

    generateSmartRecommendations() {
        // Mock recommendations - replace with actual analysis
        return [
            {
                type: 'nutrition',
                priority: 'high',
                title: 'Increase Fiber Intake',
                description: 'Add more whole grains and legumes to meet fiber goals.',
                actions: [
                    { type: 'viewRecipes', label: 'View High-Fiber Recipes' },
                    { type: 'addToList', label: 'Add to Shopping List' }
                ]
            },
            {
                type: 'meal-prep',
                priority: 'medium',
                title: 'Optimize Prep Schedule',
                description: 'Batch cook these items to save 2 hours next week.',
                actions: [
                    { type: 'viewPlan', label: 'View Prep Plan' },
                    { type: 'schedule', label: 'Schedule Prep' }
                ]
            }
        ];
    }

    getRecommendationIcon(type) {
        const icons = {
            nutrition: 'fa-apple-whole',
            'meal-prep': 'fa-kitchen-set'
        };
        return icons[type] || 'fa-star';
    }

    initializeCharts() {
        this.initializeNutritionChart();
        this.initializeTrendChart();
        this.initializePrepChart();
        this.initializeShoppingChart();
    }

    initializeNutritionChart() {
        const ctx = document.getElementById('nutritionChart');
        if (!ctx) return;

        this.chartInstances.set('nutrition', new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber'],
                datasets: [{
                    label: 'Current',
                    data: [85, 90, 75, 80, 70],
                    backgroundColor: 'rgba(65, 184, 131, 0.2)',
                    borderColor: 'rgba(65, 184, 131, 1)',
                    pointBackgroundColor: 'rgba(65, 184, 131, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }));
    }

    initializeTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        this.chartInstances.set('trend', new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Calories',
                    data: [1800, 2100, 1950, 2000, 1850, 1900, 2050],
                    borderColor: 'rgba(65, 184, 131, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        }));
    }

    initializePrepChart() {
        const ctx = document.getElementById('prepChart');
        if (!ctx) return;

        this.chartInstances.set('prep', new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Planned'],
                datasets: [{
                    data: [70, 20, 10],
                    backgroundColor: [
                        'rgba(65, 184, 131, 0.8)',
                        'rgba(84, 153, 199, 0.8)',
                        'rgba(245, 171, 53, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }));
    }

    initializeShoppingChart() {
        const ctx = document.getElementById('shoppingChart');
        if (!ctx) return;

        this.chartInstances.set('shopping', new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Produce', 'Protein', 'Grains', 'Dairy', 'Other'],
                datasets: [{
                    label: 'Current Month',
                    data: [45, 65, 30, 25, 20],
                    backgroundColor: 'rgba(65, 184, 131, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Spending ($)'
                        }
                    }
                }
            }
        }));
    }

    setupInteractions(modal) {
        // Trend period buttons
        const trendBtns = modal.querySelectorAll('.trend-btn');
        trendBtns.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                trendBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateTrendChart(e.target.dataset.period);
            });

            // Add keyboard navigation
            btn.setAttribute('tabindex', '0');
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextBtn = trendBtns[index + 1] || trendBtns[0];
                    nextBtn.focus();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevBtn = trendBtns[index - 1] || trendBtns[trendBtns.length - 1];
                    prevBtn.focus();
                }
            });
        });

        // Recommendation actions
        const actionBtns = modal.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleRecommendationAction(e.target.dataset.action);
            });
            
            // Add keyboard support
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('role', 'button');
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        // Add escape key handler
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.querySelector('.close-modal').click();
            }
        });

        // Trap focus within modal
        const focusableElements = modal.querySelectorAll('button, [tabindex="0"]');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });

        // Focus first interactive element when modal opens
        firstFocusable.focus();
    }

    updateTrendChart(period) {
        const chart = this.chartInstances.get('trend');
        if (!chart) return;

        // Mock data update - replace with actual data fetching
        const data = this.getTrendData(period);
        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.values;
        chart.update();
    }

    getTrendData(period) {
        // Mock data - replace with actual data
        switch (period) {
            case 'month':
                return {
                    labels: Array.from({length: 30}, (_, i) => i + 1),
                    values: Array.from({length: 30}, () => Math.floor(Math.random() * 500) + 1500)
                };
            case 'year':
                return {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    values: Array.from({length: 12}, () => Math.floor(Math.random() * 500) + 1500)
                };
            default: // week
                return {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    values: Array.from({length: 7}, () => Math.floor(Math.random() * 500) + 1500)
                };
        }
    }

    handleRecommendationAction(action) {
        switch (action) {
            case 'viewRecipes':
                // Implement recipe view logic
                break;
            case 'addToList':
                // Implement shopping list addition logic
                break;
            case 'viewPlan':
                // Implement meal plan view logic
                break;
            case 'schedule':
                // Implement scheduling logic
                break;
        }
    }

    updateAnalytics(mealData) {
        // Update nutrition stats and charts
        this.updateNutritionChart(mealData);
        this.updateTrendChart('week'); // Refresh current view
    }

    updatePrepStats(prepData) {
        // Update prep efficiency metrics and charts
        this.updatePrepChart(prepData);
    }

    updateShoppingMetrics(shoppingData) {
        // Update shopping patterns and optimization suggestions
        this.updateShoppingChart(shoppingData);
    }

    updateNutritionChart(data) {
        const chart = this.chartInstances.get('nutrition');
        if (!chart) return;

        // Update chart with new data
        chart.update();
    }

    updatePrepChart(data) {
        const chart = this.chartInstances.get('prep');
        if (!chart) return;

        // Update chart with new data
        chart.update();
    }

    updateShoppingChart(data) {
        const chart = this.chartInstances.get('shopping');
        if (!chart) return;

        // Update chart with new data
        chart.update();
    }

    /**
     * Calculate BMI (Body Mass Index)
     * 
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @param {string} weightUnit - Weight unit ('kg' or 'lbs')
     * @param {string} heightUnit - Height unit ('cm' or 'ft')
     * @returns {number} - BMI value
     */
    static calculateBMI(weight, height, weightUnit = 'kg', heightUnit = 'cm') {
        // Convert weight to kg if necessary
        if (weightUnit === 'lbs') {
            weight = weight * 0.453592; // lbs to kg
        }
        
        // Convert height to meters from cm or ft
        let heightInMeters;
        if (heightUnit === 'cm') {
            heightInMeters = height / 100;
        } else if (heightUnit === 'ft') {
            heightInMeters = height * 0.3048; // ft to meters
        }
        
        // Calculate BMI: weight (kg) / height² (m²)
        return weight / (heightInMeters * heightInMeters);
    }
    
    /**
     * Calculate TDEE (Total Daily Energy Expenditure)
     * 
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @param {number} age - Age in years
     * @param {string} gender - 'male' or 'female'
     * @param {string} activityLevel - Activity level
     * @param {string} weightUnit - Weight unit ('kg' or 'lbs')
     * @param {string} heightUnit - Height unit ('cm' or 'ft')
     * @returns {number} - TDEE in calories
     */
    static calculateTDEE(weight, height, age, gender, activityLevel, weightUnit = 'kg', heightUnit = 'cm') {
        // Convert weight to kg if necessary
        if (weightUnit === 'lbs') {
            weight = weight * 0.453592; // lbs to kg
        }
        
        // Convert height to cm if necessary
        if (heightUnit === 'ft') {
            height = height * 30.48; // ft to cm
        }
        
        // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
        let bmr;
        if (gender === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        // Apply activity multiplier to get TDEE
        const activityMultipliers = {
            'sedentary': 1.2,       // Little or no exercise
            'light': 1.375,         // Light exercise 1-3 days/week
            'moderate': 1.55,       // Moderate exercise 3-5 days/week
            'very': 1.725,          // Hard exercise 6-7 days/week
            'extra': 1.9            // Very hard exercise & physical job
        };
        
        const multiplier = activityMultipliers[activityLevel] || 1.2;
        return Math.round(bmr * multiplier);
    }
    
    /**
     * Calculate macro targets based on calorie goal and ratio
     * 
     * @param {number} calories - Daily calorie target
     * @param {Object} ratio - Macro ratio (protein, carbs, fat percentages)
     * @returns {Object} - Macro targets in grams
     */
    static calculateMacroTargets(calories, ratio = { protein: 30, carbs: 40, fat: 30 }) {
        // Validate ratio adds up to 100%
        const total = ratio.protein + ratio.carbs + ratio.fat;
        if (total !== 100) {
            // Normalize to 100%
            ratio.protein = (ratio.protein / total) * 100;
            ratio.carbs = (ratio.carbs / total) * 100;
            ratio.fat = (ratio.fat / total) * 100;
        }
        
        // Calculate grams based on caloric ratio
        // Protein: 4 calories per gram
        // Carbs: 4 calories per gram
        // Fat: 9 calories per gram
        const macros = {
            protein: Math.round((calories * (ratio.protein / 100)) / 4),
            carbs: Math.round((calories * (ratio.carbs / 100)) / 4),
            fat: Math.round((calories * (ratio.fat / 100)) / 9)
        };
        
        return macros;
    }
}

// Export the static calculation functions
export const calculateBMI = NutritionAnalytics.calculateBMI;
export const calculateTDEE = NutritionAnalytics.calculateTDEE;
export const calculateMacroTargets = NutritionAnalytics.calculateMacroTargets;

// Export the class
export default NutritionAnalytics; 