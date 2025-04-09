class MealPrepOptimizer {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.commonTasks = {
            chopping: ['onion', 'garlic', 'carrot', 'celery', 'potato', 'tomato'],
            marinating: ['chicken', 'beef', 'pork', 'fish', 'tofu'],
            cooking: ['rice', 'pasta', 'quinoa', 'beans'],
            roasting: ['vegetables', 'potato', 'sweet potato', 'squash']
        };
        // Add prep stations for better organization
        this.prepStations = {
            cutting: {
                name: 'Cutting Station',
                tools: ['knife', 'cutting board'],
                ingredients: ['vegetables', 'fruits', 'herbs']
            },
            cooking: {
                name: 'Cooking Station',
                tools: ['stove', 'pots', 'pans'],
                ingredients: ['meats', 'grains', 'sauces']
            },
            prep: {
                name: 'Prep Station',
                tools: ['bowls', 'measuring cups'],
                ingredients: ['spices', 'marinades', 'dressings']
            }
        };

        // Add storage recommendations
        this.storageGuide = {
            refrigerator: {
                name: 'Refrigerator',
                maxDays: 5,
                items: ['prepared vegetables', 'cooked meats', 'sauces', 'marinades']
            },
            freezer: {
                name: 'Freezer',
                maxDays: 30,
                items: ['raw meats', 'cooked grains', 'prepared meals']
            },
            pantry: {
                name: 'Pantry',
                maxDays: 14,
                items: ['spices', 'dry goods', 'canned items']
            }
        };

        // Add cleanup tasks
        this.cleanupTasks = {
            immediate: [
                'Wipe down prep stations',
                'Wash cutting boards and knives',
                'Store prepped ingredients'
            ],
            endOfSession: [
                'Clean stovetop and oven',
                'Sanitize work surfaces',
                'Empty compost bin'
            ],
            weekly: [
                'Deep clean appliances',
                'Organize storage containers',
                'Check ingredient freshness'
            ]
        };

        this.defaultSettings = {
            batchCooking: true,
            prepTime: 60, // minutes
            storageTime: 5, // days
            containers: ['glass', 'plastic', 'silicone'],
            portions: 4
        };
        this.loadSavedSettings();
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add meal prep optimizer button to meal planner
        const plannerHeader = document.querySelector('.planner-header');
        if (plannerHeader) {
            const optimizerBtn = document.createElement('button');
            optimizerBtn.className = 'btn btn-primary meal-prep-btn';
            optimizerBtn.innerHTML = '<i class="fas fa-tasks"></i> Meal Prep Optimizer';
            optimizerBtn.addEventListener('click', () => this.showOptimizer());
            plannerHeader.appendChild(optimizerBtn);
        }

        this.isInitialized = true;
    }

    loadSavedSettings() {
        const savedSettings = localStorage.getItem('mealPrepSettings');
        if (savedSettings) {
            try {
                this.settings = JSON.parse(savedSettings);
            } catch (e) {
                console.error('Error loading saved settings:', e);
                this.settings = { ...this.defaultSettings };
            }
        } else {
            this.settings = { ...this.defaultSettings };
        }
    }

    saveSettings() {
        localStorage.setItem('mealPrepSettings', JSON.stringify(this.settings));
    }

    async showOptimizer() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.innerHTML = `
            <div class="modal-content meal-prep-content">
                <div class="modal-header">
                    <h3>Smart Meal Prep Optimizer</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="meal-prep-body">
                    ${await this.renderPrepOverview()}
                    ${this.renderPrepSchedule()}
                    ${this.renderStorageGuide()}
                    ${this.renderCleanupChecklist()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        this.setupOptimizationListeners(modal);
        
        // Initialize charts
        this.initializePrepChart();
    }

    async renderPrepOverview() {
        const meals = await this.getWeeklyMeals();
        const prepPlan = this.generatePrepPlan(meals);
        
        return `
            <section class="prep-section">
                <h4>Prep Overview</h4>
                <div class="prep-overview">
                    <div class="prep-stats">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-clock"></i></div>
                            <div class="stat-content">
                                <h5>Total Prep Time</h5>
                                <span class="stat-value">${prepPlan.totalPrepTime} mins</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-utensils"></i></div>
                            <div class="stat-content">
                                <h5>Total Meals</h5>
                                <span class="stat-value">${prepPlan.totalMeals}</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
                            <div class="stat-content">
                                <h5>Batch Cooking</h5>
                                <span class="stat-value">${prepPlan.batchOptions.length} options</span>
                            </div>
                        </div>
                    </div>
                    <div class="prep-chart">
                        <canvas id="prepChart"></canvas>
                    </div>
                </div>
            </section>
        `;
    }

    renderPrepSchedule() {
        return `
            <section class="prep-section">
                <h4>Optimized Prep Schedule</h4>
                <div class="prep-timeline">
                    ${this.renderPrepTimeline()}
                </div>
                <div class="batch-suggestions">
                    <h5>Batch Cooking Suggestions</h5>
                    ${this.renderBatchSuggestions()}
                </div>
            </section>
        `;
    }

    renderStorageGuide() {
        return `
            <section class="prep-section">
                <h4>Storage Guide</h4>
                <div class="storage-grid">
                    ${this.generateStorageGuide().map(guide => `
                        <div class="storage-card">
                            <div class="storage-icon">
                                <i class="fas fa-${guide.icon}"></i>
                            </div>
                            <div class="storage-content">
                                <h5>${guide.title}</h5>
                                <p>${guide.description}</p>
                                <div class="storage-tips">
                                    ${guide.tips.map(tip => `
                                        <div class="tip-item">
                                            <i class="fas fa-check"></i>
                                            <span>${tip}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderCleanupChecklist() {
        return `
            <section class="prep-section">
                <h4>Cleanup Checklist</h4>
                <div class="cleanup-list">
                    ${this.generateCleanupSteps().map(step => `
                        <div class="cleanup-item">
                            <label class="checkbox-label">
                                <input type="checkbox" class="cleanup-checkbox">
                                <span class="cleanup-text">${step}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    async getWeeklyMeals() {
        // Mock data - replace with actual meal data
        return [
            {
                name: 'Chicken Stir-Fry',
                prepTime: 20,
                ingredients: ['chicken', 'vegetables', 'rice'],
                portions: 4
            },
            {
                name: 'Quinoa Bowl',
                prepTime: 15,
                ingredients: ['quinoa', 'chickpeas', 'vegetables'],
                portions: 4
            }
        ];
    }

    generatePrepPlan(meals) {
        const commonIngredients = this.findCommonIngredients(meals);
        const batchOptions = this.createBatchOptions(commonIngredients, meals);
        const schedule = this.optimizeSchedule(meals, batchOptions);

        return {
            totalPrepTime: this.calculateTotalPrepTime(meals, batchOptions),
            totalMeals: meals.length,
            batchOptions,
            schedule
        };
    }

    findCommonIngredients(meals) {
        const ingredientCount = new Map();
        meals.forEach(meal => {
            meal.ingredients.forEach(ingredient => {
                ingredientCount.set(ingredient, (ingredientCount.get(ingredient) || 0) + 1);
            });
        });

        return Array.from(ingredientCount.entries())
            .filter(([_, count]) => count > 1)
            .map(([ingredient]) => ingredient);
    }

    createBatchOptions(commonIngredients, meals) {
        return commonIngredients.map(ingredient => {
            const relatedMeals = meals.filter(meal => 
                meal.ingredients.includes(ingredient)
            );
            return {
                ingredient,
                meals: relatedMeals,
                totalPortions: relatedMeals.reduce((sum, meal) => sum + meal.portions, 0),
                prepTime: Math.max(...relatedMeals.map(meal => meal.prepTime))
            };
        });
    }

    optimizeSchedule(meals, batchOptions) {
        // Group tasks by day to distribute workload
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        const schedule = {};

        // Assign batch cooking to earlier days
        batchOptions.forEach((option, index) => {
            const day = days[index % 3]; // Spread across first 3 days
            if (!schedule[day]) schedule[day] = [];
            schedule[day].push({
                type: 'batch',
                item: option.ingredient,
                time: option.prepTime,
                meals: option.meals.map(m => m.name)
            });
        });

        // Distribute remaining meal prep
        meals.forEach(meal => {
            const day = this.findOptimalPrepDay(schedule, days, meal);
            if (!schedule[day]) schedule[day] = [];
            schedule[day].push({
                type: 'meal',
                item: meal.name,
                time: meal.prepTime
            });
        });

        return schedule;
    }

    findOptimalPrepDay(schedule, days, meal) {
        return days.reduce((bestDay, day) => {
            const currentDayTime = (schedule[day] || [])
                .reduce((sum, task) => sum + task.time, 0);
            const bestDayTime = (schedule[bestDay] || [])
                .reduce((sum, task) => sum + task.time, 0);
            return currentDayTime < bestDayTime ? day : bestDay;
        });
    }

    calculateTotalPrepTime(meals, batchOptions) {
        const regularPrepTime = meals.reduce((sum, meal) => sum + meal.prepTime, 0);
        const batchPrepTime = batchOptions.reduce((sum, option) => sum + option.prepTime, 0);
        const timeSaved = batchOptions.reduce((sum, option) => 
            sum + (option.meals.length - 1) * option.prepTime, 0);
        
        return regularPrepTime - timeSaved + batchPrepTime;
    }

    renderPrepTimeline() {
        const schedule = this.optimizeSchedule([], []);
        return Object.entries(schedule).map(([day, tasks]) => `
            <div class="timeline-day">
                <div class="day-header">
                    <h5>${day}</h5>
                    <span class="total-time">${this.calculateDayTime(tasks)} mins</span>
                </div>
                <div class="day-tasks">
                    ${tasks.map(task => `
                        <div class="task-item ${task.type}">
                            <div class="task-time">${task.time} mins</div>
                            <div class="task-content">
                                <h6>${task.item}</h6>
                                ${task.type === 'batch' ? `
                                    <div class="task-meals">
                                        For: ${task.meals.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderBatchSuggestions() {
        const suggestions = [
            {
                ingredient: 'Rice',
                meals: ['Stir-Fry', 'Buddha Bowl'],
                tips: ['Cook extra for fried rice', 'Freeze in portions']
            },
            {
                ingredient: 'Chicken',
                meals: ['Stir-Fry', 'Salad'],
                tips: ['Season differently for variety', 'Slice after cooling']
            }
        ];

        return `
            <div class="batch-grid">
                ${suggestions.map(suggestion => `
                    <div class="batch-card">
                        <h6>${suggestion.ingredient}</h6>
                        <div class="batch-meals">Used in: ${suggestion.meals.join(', ')}</div>
                        <ul class="batch-tips">
                            ${suggestion.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateStorageGuide() {
        return [
            {
                icon: 'temperature-low',
                title: 'Refrigerator Storage',
                description: 'Optimal storage for 3-5 days',
                tips: [
                    'Use airtight containers',
                    'Label with date and contents',
                    'Store raw ingredients separately'
                ]
            },
            {
                icon: 'snowflake',
                title: 'Freezer Storage',
                description: 'Extended storage up to 3 months',
                tips: [
                    'Use freezer-safe containers',
                    'Remove excess air',
                    'Portion before freezing'
                ]
            },
            {
                icon: 'box',
                title: 'Pantry Storage',
                description: 'Dry goods and shelf-stable items',
                tips: [
                    'Keep in cool, dry place',
                    'Use original packaging or airtight containers',
                    'Check expiration dates'
                ]
            }
        ];
    }

    generateCleanupSteps() {
        return [
            'Clean and sanitize work surfaces',
            'Wash all used utensils and equipment',
            'Wipe down appliances',
            'Clean and organize refrigerator',
            'Take out trash and recycling',
            'Sweep and mop floor',
            'Launder kitchen towels and aprons',
            'Check and refill cleaning supplies'
        ];
    }

    calculateDayTime(tasks) {
        return tasks.reduce((sum, task) => sum + task.time, 0);
    }

    setupOptimizationListeners(modal) {
        // Add event listeners for interactive features
        const checkboxes = modal.querySelectorAll('.cleanup-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const item = e.target.closest('.cleanup-item');
                if (item) {
                    item.classList.toggle('completed', e.target.checked);
                }
            });
        });
    }

    initializePrepChart() {
        const ctx = document.getElementById('prepChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Prep Time', 'Cooking Time', 'Cleanup Time'],
                datasets: [{
                    data: [30, 45, 15],
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
        });
    }
}

export const mealPrepOptimizer = new MealPrepOptimizer(); 