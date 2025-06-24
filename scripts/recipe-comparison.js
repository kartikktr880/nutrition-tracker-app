class RecipeComparison {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.compareButton = null;
        this.selectedRecipes = new Set();
        this.comparisonMetrics = {
            calories: { name: 'Calories', unit: 'kcal', icon: 'fire' },
            protein: { name: 'Protein', unit: 'g', icon: 'dumbbell' },
            carbs: { name: 'Carbs', unit: 'g', icon: 'bread-slice' },
            fat: { name: 'Fat', unit: 'g', icon: 'oil-can' },
            fiber: { name: 'Fiber', unit: 'g', icon: 'seedling' },
            prepTime: { name: 'Prep Time', unit: 'min', icon: 'clock' },
            cost: { name: 'Est. Cost', unit: '$', icon: 'dollar-sign' }
        };

        // Add recommendation categories
        this.recommendationTypes = {
            similar: { name: 'Similar Recipes', icon: 'clone' },
            healthier: { name: 'Healthier Options', icon: 'heart' },
            quicker: { name: 'Quick Alternatives', icon: 'bolt' },
            budget: { name: 'Budget-Friendly', icon: 'piggy-bank' }
        };

        // Add filter categories with smart ranges
        this.filterCategories = {
            calories: { ranges: ['Under 300', '300-500', 'Over 500'] },
            prepTime: { ranges: ['Under 15min', '15-30min', 'Over 30min'] },
            cost: { ranges: ['Under $5', '$5-$10', 'Over $10'] }
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add floating compare button
        this.compareButton = document.createElement('button');
        this.compareButton.className = 'compare-btn';
        this.compareButton.innerHTML = `
            <i class="fas fa-balance-scale"></i>
            <span class="compare-count">0</span>
        `;
        this.compareButton.addEventListener('click', () => this.showComparison());
        document.body.appendChild(this.compareButton);

        // Add compare checkboxes to recipe cards
        document.querySelectorAll('.recipe-card').forEach(card => {
            const compareBox = document.createElement('div');
            compareBox.className = 'compare-box';
            compareBox.innerHTML = `
                <input type="checkbox" id="compare_${card.dataset.recipeId}">
                <label for="compare_${card.dataset.recipeId}">Compare</label>
            `;
            compareBox.querySelector('input').addEventListener('change', (e) => {
                this.toggleRecipeComparison(card.dataset.recipeId, e.target.checked);
            });
            card.querySelector('.recipe-actions').appendChild(compareBox);
        });

        this.isInitialized = true;
    }

    toggleRecipeComparison(recipeId, isSelected) {
        if (isSelected) {
            if (this.selectedRecipes.size >= 3) {
                alert('You can compare up to 3 recipes at a time');
                return false;
            }
            this.selectedRecipes.add(recipeId);
        } else {
            this.selectedRecipes.delete(recipeId);
        }

        // Update compare button count
        this.compareButton.querySelector('.compare-count').textContent = this.selectedRecipes.size;
        this.compareButton.style.display = this.selectedRecipes.size > 0 ? 'flex' : 'none';

        return true;
    }

    async showComparison() {
        if (this.selectedRecipes.size < 2) {
            alert('Please select at least 2 recipes to compare');
            return;
        }

        const recipes = await Promise.all(
            Array.from(this.selectedRecipes).map(id => this.fetchRecipeDetails(id))
        );

        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.innerHTML = `
            <div class="modal-content comparison-content">
                <div class="modal-header">
                    <h3>Recipe Comparison</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="comparison-body">
                    ${this.renderComparisonGrid(recipes)}
                    ${this.renderNutritionComparison(recipes)}
                    ${this.renderMetricsComparison(recipes)}
                    ${this.renderSmartInsights(recipes)}
                    ${this.renderRecommendations(recipes)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
            this.selectedRecipes.clear();
            document.querySelectorAll('.compare-box input').forEach(input => input.checked = false);
            this.compareButton.style.display = 'none';
        });

        // Initialize charts and setup filters
        this.initializeCharts(recipes);
        this.setupFilterListeners();
    }

    renderComparisonGrid(recipes) {
        return `
            <div class="comparison-grid">
                <div class="comparison-header">
                    <div class="metric-label"></div>
                    ${recipes.map(recipe => `
                        <div class="recipe-header">
                            <h4>${recipe.name}</h4>
                            <img src="${recipe.image}" alt="${recipe.name}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
                <div class="comparison-metrics">
                    ${this.renderMetricRows(recipes)}
                </div>
            </div>
        `;
    }

    renderMetricRows(recipes) {
        const metrics = [
            { label: 'Calories', key: 'calories', unit: 'kcal' },
            { label: 'Protein', key: 'protein', unit: 'g' },
            { label: 'Carbs', key: 'carbs', unit: 'g' },
            { label: 'Fat', key: 'fat', unit: 'g' },
            { label: 'Fiber', key: 'fiber', unit: 'g' },
            { label: 'Prep Time', key: 'prepTime', unit: 'min' },
            { label: 'Cost', key: 'cost', unit: '$' }
        ];

        return metrics.map(metric => `
            <div class="metric-row">
                <div class="metric-label">${metric.label}</div>
                ${recipes.map(recipe => `
                    <div class="metric-value ${this.getMetricClass(recipe[metric.key], metric.key, recipes)}">
                        ${recipe[metric.key]}${metric.unit}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    getMetricClass(value, metric, recipes) {
        const values = recipes.map(r => r[metric]);
        const isHigherBetter = ['protein', 'fiber'].includes(metric);
        const isLowerBetter = ['calories', 'fat', 'cost', 'prepTime'].includes(metric);

        if (isHigherBetter && value === Math.max(...values)) return 'metric-best';
        if (isLowerBetter && value === Math.min(...values)) return 'metric-best';
        return '';
    }

    renderNutritionComparison(recipes) {
        return `
            <div class="nutrition-comparison">
                <h4>Nutrition Comparison</h4>
                <div class="chart-container">
                    <canvas id="nutritionChart"></canvas>
                </div>
            </div>
        `;
    }

    renderMetricsComparison(recipes) {
        return `
            <div class="metrics-grid">
                <div class="metric-card prep-time">
                    <h5>Prep Time Comparison</h5>
                    <div class="metric-chart">
                        <canvas id="prepTimeChart"></canvas>
                    </div>
                </div>
                <div class="metric-card cost">
                    <h5>Cost Comparison</h5>
                    <div class="metric-chart">
                        <canvas id="costChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    renderSmartInsights(recipes) {
        const insights = this.generateInsights(recipes);
        return `
            <div class="smart-insights">
                <h4>Smart Insights</h4>
                <div class="insights-grid">
                    ${insights.map(insight => `
                        <div class="insight-card">
                            <i class="fas fa-${insight.icon}"></i>
                            <h5>${insight.title}</h5>
                            <p>${insight.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateInsights(recipes) {
        const insights = [];
        
        // Nutrition insights
        const bestProtein = this.findBestForMetric(recipes, 'protein', true);
        const lowestCalories = this.findBestForMetric(recipes, 'calories', false);
        
        insights.push({
            icon: 'dumbbell',
            title: 'Protein Champion',
            description: `${bestProtein.name} has the highest protein content with ${bestProtein.protein}g per serving.`
        });

        insights.push({
            icon: 'fire',
            title: 'Calorie Conscious',
            description: `${lowestCalories.name} is the lightest option with ${lowestCalories.calories} calories.`
        });

        // Time and cost insights
        const quickest = this.findBestForMetric(recipes, 'prepTime', false);
        const mostAffordable = this.findBestForMetric(recipes, 'cost', false);

        insights.push({
            icon: 'clock',
            title: 'Time Saver',
            description: `${quickest.name} is the quickest to prepare, taking only ${quickest.prepTime} minutes.`
        });

        insights.push({
            icon: 'piggy-bank',
            title: 'Budget Friendly',
            description: `${mostAffordable.name} is the most economical choice at $${mostAffordable.cost}.`
        });

        return insights;
    }

    findBestForMetric(recipes, metric, higher = true) {
        return recipes.reduce((best, current) => {
            if (higher) {
                return current[metric] > best[metric] ? current : best;
            }
            return current[metric] < best[metric] ? current : best;
        }, recipes[0]);
    }

    async initializeCharts(recipes) {
        // Nutrition radar chart
        const nutritionCtx = document.getElementById('nutritionChart').getContext('2d');
        new Chart(nutritionCtx, {
            type: 'radar',
            data: {
                labels: ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber'],
                datasets: recipes.map((recipe, index) => ({
                    label: recipe.name,
                    data: [recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.fiber],
                    borderColor: this.getChartColor(index),
                    backgroundColor: this.getChartColor(index, 0.2)
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Prep time comparison
        const prepTimeCtx = document.getElementById('prepTimeChart').getContext('2d');
        new Chart(prepTimeCtx, {
            type: 'bar',
            data: {
                labels: recipes.map(r => r.name),
                datasets: [{
                    label: 'Prep Time (minutes)',
                    data: recipes.map(r => r.prepTime),
                    backgroundColor: recipes.map((_, i) => this.getChartColor(i))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Cost comparison
        const costCtx = document.getElementById('costChart').getContext('2d');
        new Chart(costCtx, {
            type: 'bar',
            data: {
                labels: recipes.map(r => r.name),
                datasets: [{
                    label: 'Cost ($)',
                    data: recipes.map(r => r.cost),
                    backgroundColor: recipes.map((_, i) => this.getChartColor(i))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    getChartColor(index, alpha = 1) {
        const colors = [
            `rgba(65, 184, 131, ${alpha})`,
            `rgba(84, 153, 199, ${alpha})`,
            `rgba(245, 166, 35, ${alpha})`
        ];
        return colors[index % colors.length];
    }

    async fetchRecipeDetails(recipeId) {
        // Check cache first
        if (this.cache.has(recipeId)) {
            return this.cache.get(recipeId);
        }

        // Mock data - replace with actual API call
        const mockRecipe = {
            id: recipeId,
            name: `Recipe ${recipeId}`,
            image: 'placeholder.jpg',
            calories: Math.floor(Math.random() * 400 + 200),
            protein: Math.floor(Math.random() * 30 + 10),
            carbs: Math.floor(Math.random() * 50 + 20),
            fat: Math.floor(Math.random() * 20 + 5),
            fiber: Math.floor(Math.random() * 10 + 2),
            prepTime: Math.floor(Math.random() * 30 + 15),
            cost: Math.floor(Math.random() * 15 + 5)
        };

        // Cache the result
        this.cache.set(recipeId, mockRecipe);
        return mockRecipe;
    }

    renderRecommendations(recipes) {
        return `
            <div class="recipe-recommendations">
                <h4>Smart Recommendations</h4>
                <div class="recommendation-filters">
                    ${this.renderFilters()}
                </div>
                <div class="recommendation-sections">
                    ${Object.entries(this.recommendationTypes).map(([type, info]) => `
                        <div class="recommendation-section">
                            <div class="section-header">
                                <h5><i class="fas fa-${info.icon}"></i> ${info.name}</h5>
                            </div>
                            <div class="recommended-recipes" id="${type}Recommendations">
                                ${this.getRecommendations(recipes, type).map(recipe => `
                                    <div class="recipe-card mini" data-recipe-id="${recipe.id}">
                                        <div class="recipe-info">
                                            <h6>${recipe.name}</h6>
                                            <div class="recipe-stats">
                                                <span><i class="fas fa-fire"></i> ${recipe.calories}kcal</span>
                                                <span><i class="far fa-clock"></i> ${recipe.prepTime}m</span>
                                                <span><i class="fas fa-dollar-sign"></i> ${recipe.cost}</span>
                                            </div>
                                        </div>
                                        <button class="add-to-compare" title="Add to comparison">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderFilters() {
        return `
            <div class="filter-groups">
                ${Object.entries(this.filterCategories).map(([category, data]) => `
                    <div class="filter-group">
                        <label class="filter-label">${this.formatCategoryName(category)}</label>
                        <div class="filter-options">
                            ${data.ranges.map(range => `
                                <button class="filter-btn" data-category="${category}" data-value="${range}">
                                    ${range}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getRecommendations(recipes, type) {
        // Get average metrics from compared recipes
        const avgMetrics = this.calculateAverageMetrics(recipes);
        
        // Generate recommendations based on type
        return Array(4).fill(null).map((_, index) => {
            const variation = Math.random() * 0.3 - 0.15; // ±15% variation
            
            return {
                id: `rec_${type}_${index}`,
                name: `${this.recommendationTypes[type].name.slice(0, -1)} ${index + 1}`,
                calories: Math.round(avgMetrics.calories * (1 + (type === 'healthier' ? -0.2 : variation))),
                prepTime: Math.round(avgMetrics.prepTime * (1 + (type === 'quicker' ? -0.3 : variation))),
                cost: Math.round(avgMetrics.cost * (1 + (type === 'budget' ? -0.25 : variation)))
            };
        });
    }

    calculateAverageMetrics(recipes) {
        const sum = recipes.reduce((acc, recipe) => ({
            calories: acc.calories + recipe.calories,
            prepTime: acc.prepTime + recipe.prepTime,
            cost: acc.cost + recipe.cost
        }), { calories: 0, prepTime: 0, cost: 0 });

        return {
            calories: Math.round(sum.calories / recipes.length),
            prepTime: Math.round(sum.prepTime / recipes.length),
            cost: Math.round(sum.cost / recipes.length)
        };
    }

    setupFilterListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                this.applyFilters();
            });
        });

        // Add click listeners for recommendation cards
        document.querySelectorAll('.add-to-compare').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.recipe-card');
                if (card) {
                    this.toggleRecipeComparison(card.dataset.recipeId, true);
                }
            });
        });
    }

    applyFilters() {
        const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active')).map(btn => ({
            category: btn.dataset.category,
            value: btn.dataset.value
        }));

        document.querySelectorAll('.recipe-card.mini').forEach(card => {
            const matches = this.matchesFilters(card, activeFilters);
            card.style.display = matches || activeFilters.length === 0 ? 'flex' : 'none';
        });
    }

    matchesFilters(card, filters) {
        return filters.every(filter => {
            const value = card.querySelector(`.recipe-stats span:nth-child(${this.getStatIndex(filter.category)})`).textContent;
            return this.valueMatchesRange(value, filter.value);
        });
    }

    getStatIndex(category) {
        const indices = {
            calories: 1,
            prepTime: 2,
            cost: 3
        };
        return indices[category] || 1;
    }

    valueMatchesRange(value, range) {
        const numValue = parseInt(value);
        const [min, max] = this.parseRange(range);
        return numValue >= min && numValue <= max;
    }

    parseRange(range) {
        if (range.startsWith('Under')) {
            const limit = parseInt(range.split(' ')[1]);
            return [0, limit];
        }
        if (range.startsWith('Over')) {
            const limit = parseInt(range.split(' ')[1]);
            return [limit, Infinity];
        }
        const [min, max] = range.split('-').map(v => parseInt(v));
        return [min, max];
    }

    formatCategoryName(category) {
        return category
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }
}

export const recipeComparison = new RecipeComparison(); 