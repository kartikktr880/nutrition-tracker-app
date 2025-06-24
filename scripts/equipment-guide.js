class EquipmentGuide {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.equipmentCategories = {
            essential: [
                {
                    name: 'Chef\'s Knife',
                    description: 'A versatile knife for chopping, slicing, and dicing',
                    importance: 'Essential for most meal prep tasks',
                    alternatives: ['Santoku knife', 'Utility knife'],
                    estimatedCost: 30
                },
                {
                    name: 'Cutting Board',
                    description: 'A stable surface for food preparation',
                    importance: 'Essential for safe food preparation',
                    alternatives: ['Wooden board', 'Plastic board'],
                    estimatedCost: 20
                },
                {
                    name: 'Large Pot',
                    description: 'For boiling pasta, making soups, and cooking grains',
                    importance: 'Essential for many cooking methods',
                    alternatives: ['Dutch oven', 'Stock pot'],
                    estimatedCost: 40
                }
            ],
            recommended: [
                {
                    name: 'Food Processor',
                    description: 'For chopping, blending, and pureeing ingredients',
                    importance: 'Great for quick meal prep',
                    alternatives: ['Blender', 'Manual chopper'],
                    estimatedCost: 80
                },
                {
                    name: 'Storage Containers',
                    description: 'For storing prepped ingredients and meals',
                    importance: 'Essential for meal planning',
                    alternatives: ['Mason jars', 'Zip-lock bags'],
                    estimatedCost: 25
                }
            ],
            optional: [
                {
                    name: 'Instant Pot',
                    description: 'Multi-functional cooker for quick meals',
                    importance: 'Great for time-saving',
                    alternatives: ['Slow cooker', 'Pressure cooker'],
                    estimatedCost: 100
                },
                {
                    name: 'Food Scale',
                    description: 'For precise ingredient measurements',
                    importance: 'Helpful for portion control',
                    alternatives: ['Measuring cups', 'Volume measurements'],
                    estimatedCost: 20
                }
            ]
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add equipment guide button to meal planner
        const plannerHeader = document.querySelector('.planner-header');
        if (plannerHeader) {
            const guideBtn = document.createElement('button');
            guideBtn.className = 'btn btn-primary equipment-guide-btn';
            guideBtn.innerHTML = '<i class="fas fa-utensils"></i> Equipment Guide';
            guideBtn.addEventListener('click', () => this.showGuide());
            plannerHeader.appendChild(guideBtn);
        }

        this.isInitialized = true;
    }

    async showGuide() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.innerHTML = `
            <div class="modal-content equipment-guide-content">
                <div class="modal-header">
                    <h3>Meal Prep Equipment Guide</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="equipment-body">
                    ${this.renderEquipmentCategories()}
                    ${this.renderRecommendations()}
                    ${this.renderBudgetPlanner()}
                    ${this.renderMaintenanceGuide()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        
        // Initialize interactive features
        this.initializeEquipmentFilters();
        this.initializeBudgetCalculator();
    }

    renderEquipmentCategories() {
        return `
            <section class="equipment-section">
                <h4>Essential Equipment</h4>
                <div class="equipment-grid">
                    ${this.renderEquipmentItems(this.equipmentCategories.essential)}
                </div>
                
                <h4>Recommended Equipment</h4>
                <div class="equipment-grid">
                    ${this.renderEquipmentItems(this.equipmentCategories.recommended)}
                </div>
                
                <h4>Optional Equipment</h4>
                <div class="equipment-grid">
                    ${this.renderEquipmentItems(this.equipmentCategories.optional)}
                </div>
            </section>
        `;
    }

    renderEquipmentItems(items) {
        return items.map(item => `
            <div class="equipment-card">
                <div class="equipment-header">
                    <h5>${item.name}</h5>
                    <span class="estimated-cost">$${item.estimatedCost}</span>
                </div>
                <p class="equipment-description">${item.description}</p>
                <div class="equipment-details">
                    <div class="importance-tag">${item.importance}</div>
                    <div class="alternatives">
                        <span>Alternatives:</span>
                        ${item.alternatives.map(alt => `<span class="alternative-tag">${alt}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRecommendations() {
        return `
            <section class="equipment-section">
                <h4>Smart Recommendations</h4>
                <div class="recommendations-grid">
                    ${this.generateRecommendations().map(rec => `
                        <div class="recommendation-card">
                            <div class="recommendation-icon">
                                <i class="fas fa-${rec.icon}"></i>
                            </div>
                            <div class="recommendation-content">
                                <h5>${rec.title}</h5>
                                <p>${rec.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    generateRecommendations() {
        return [
            {
                icon: 'shopping-cart',
                title: 'Start with Essentials',
                description: 'Begin with basic equipment and expand as needed based on your cooking style.'
            },
            {
                icon: 'dollar-sign',
                title: 'Investment Strategy',
                description: 'Invest in high-quality versions of frequently used items for better longevity.'
            },
            {
                icon: 'box',
                title: 'Space Optimization',
                description: 'Choose multi-functional equipment to maximize kitchen space and utility.'
            },
            {
                icon: 'calendar',
                title: 'Seasonal Considerations',
                description: 'Adjust your equipment based on seasonal cooking patterns and needs.'
            }
        ];
    }

    renderBudgetPlanner() {
        return `
            <section class="equipment-section">
                <h4>Budget Planner</h4>
                <div class="budget-calculator">
                    <div class="calculator-controls">
                        <div class="control-group">
                            <label>Your Budget</label>
                            <input type="number" id="budgetInput" min="0" step="10" value="200">
                        </div>
                        <div class="control-group">
                            <label>Cooking Frequency</label>
                            <select id="cookingFrequency">
                                <option value="daily">Daily Cooking</option>
                                <option value="weekly">Weekly Meal Prep</option>
                                <option value="occasional">Occasional Cooking</option>
                            </select>
                        </div>
                    </div>
                    <div class="budget-recommendations">
                        <h5>Recommended Purchases</h5>
                        <ul id="budgetRecommendations" class="recommendations-list"></ul>
                    </div>
                    <div class="budget-chart">
                        <canvas id="budgetChart"></canvas>
                    </div>
                </div>
            </section>
        `;
    }

    renderMaintenanceGuide() {
        return `
            <section class="equipment-section">
                <h4>Maintenance Guide</h4>
                <div class="maintenance-grid">
                    ${this.generateMaintenanceTips().map(tip => `
                        <div class="maintenance-card">
                            <div class="maintenance-header">
                                <h5>${tip.title}</h5>
                                <span class="frequency-tag">${tip.frequency}</span>
                            </div>
                            <ul class="maintenance-steps">
                                ${tip.steps.map(step => `<li>${step}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    generateMaintenanceTips() {
        return [
            {
                title: 'Knife Care',
                frequency: 'Weekly',
                steps: [
                    'Hand wash and dry immediately after use',
                    'Sharpen regularly with a honing steel',
                    'Store in a knife block or magnetic strip'
                ]
            },
            {
                title: 'Cutting Board Care',
                frequency: 'After Each Use',
                steps: [
                    'Clean with hot, soapy water',
                    'Sanitize with vinegar solution',
                    'Oil wooden boards monthly'
                ]
            },
            {
                title: 'Cookware Maintenance',
                frequency: 'Monthly',
                steps: [
                    'Check for loose handles',
                    'Remove mineral deposits',
                    'Season cast iron if needed'
                ]
            }
        ];
    }

    initializeEquipmentFilters() {
        // Add filter functionality for equipment cards
        const cards = document.querySelectorAll('.equipment-card');
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search equipment...';
        searchInput.className = 'equipment-search';
        
        document.querySelector('.equipment-section').prepend(searchInput);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            cards.forEach(card => {
                const name = card.querySelector('h5').textContent.toLowerCase();
                const description = card.querySelector('.equipment-description').textContent.toLowerCase();
                card.style.display = name.includes(query) || description.includes(query) ? '' : 'none';
            });
        });
    }

    initializeBudgetCalculator() {
        const budgetInput = document.getElementById('budgetInput');
        const frequencySelect = document.getElementById('cookingFrequency');
        
        const updateRecommendations = () => {
            const budget = parseInt(budgetInput.value);
            const frequency = frequencySelect.value;
            
            const recommendations = this.generateBudgetRecommendations(budget, frequency);
            this.updateBudgetDisplay(recommendations);
            this.updateBudgetChart(recommendations);
        };

        budgetInput.addEventListener('input', updateRecommendations);
        frequencySelect.addEventListener('change', updateRecommendations);
        
        // Initial update
        updateRecommendations();
    }

    generateBudgetRecommendations(budget, frequency) {
        const recommendations = [];
        let remainingBudget = budget;

        // Prioritize based on cooking frequency
        const priorities = {
            daily: ['essential', 'recommended', 'optional'],
            weekly: ['essential', 'recommended'],
            occasional: ['essential']
        };

        for (const priority of priorities[frequency]) {
            for (const item of this.equipmentCategories[priority]) {
                if (item.estimatedCost <= remainingBudget) {
                    recommendations.push(item);
                    remainingBudget -= item.estimatedCost;
                }
            }
        }

        return recommendations;
    }

    updateBudgetDisplay(recommendations) {
        const list = document.getElementById('budgetRecommendations');
        if (!list) return;

        list.innerHTML = recommendations.map(item => `
            <li class="recommendation-item">
                <span class="item-name">${item.name}</span>
                <span class="item-cost">$${item.estimatedCost}</span>
            </li>
        `).join('');
    }

    updateBudgetChart(recommendations) {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        const totalCost = recommendations.reduce((sum, item) => sum + item.estimatedCost, 0);
        const categories = {};

        recommendations.forEach(item => {
            const category = Object.entries(this.equipmentCategories)
                .find(([_, items]) => items.includes(item))[0];
            categories[category] = (categories[category] || 0) + item.estimatedCost;
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FFC107'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
}

export const equipmentGuide = new EquipmentGuide(); 