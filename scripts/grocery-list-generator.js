class GroceryListGenerator {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.categories = {
            produce: ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'potato', 'carrot'],
            dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
            meat: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'salmon'],
            pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'spices'],
            frozen: ['frozen vegetables', 'ice cream', 'frozen fruits', 'frozen meals'],
            beverages: ['water', 'juice', 'coffee', 'tea'],
            snacks: ['nuts', 'chips', 'crackers', 'cookies'],
            other: []
        };
        this.loadSavedLists();
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add grocery list button to meal planner
        const plannerHeader = document.querySelector('.planner-header');
        if (plannerHeader) {
            const groceryBtn = document.createElement('button');
            groceryBtn.className = 'btn btn-primary grocery-list-btn';
            groceryBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Generate Grocery List';
            groceryBtn.addEventListener('click', () => this.showGenerator());
            plannerHeader.appendChild(groceryBtn);
        }

        this.isInitialized = true;
    }

    loadSavedLists() {
        const savedLists = localStorage.getItem('groceryLists');
        if (savedLists) {
            try {
                this.savedLists = JSON.parse(savedLists);
            } catch (e) {
                console.error('Error loading saved grocery lists:', e);
                this.savedLists = [];
            }
        } else {
            this.savedLists = [];
        }
    }

    saveLists() {
        localStorage.setItem('groceryLists', JSON.stringify(this.savedLists));
    }

    async generateList(meals) {
        const ingredients = new Map();
        
        // Extract ingredients from meals
        meals.forEach(meal => {
            meal.ingredients.forEach(ingredient => {
                const existing = ingredients.get(ingredient.name);
                if (existing) {
                    existing.amount += ingredient.amount;
                    existing.unit = this.normalizeUnit(existing.unit, ingredient.unit);
                } else {
                    ingredients.set(ingredient.name, {
                        name: ingredient.name,
                        amount: ingredient.amount,
                        unit: ingredient.unit,
                        category: this.categorizeIngredient(ingredient.name)
                    });
                }
            });
        });

        // Sort ingredients by category
        const categorized = {};
        Object.keys(this.categories).forEach(category => {
            categorized[category] = [];
        });

        ingredients.forEach(ingredient => {
            categorized[ingredient.category].push(ingredient);
        });

        return categorized;
    }

    normalizeUnit(unit1, unit2) {
        // Return the more common unit between the two
        const unitPreference = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece'];
        const idx1 = unitPreference.indexOf(unit1);
        const idx2 = unitPreference.indexOf(unit2);
        return idx1 < idx2 ? unit1 : unit2;
    }

    categorizeIngredient(name) {
        const lowerName = name.toLowerCase();
        for (const [category, items] of Object.entries(this.categories)) {
            if (items.some(item => lowerName.includes(item.toLowerCase()))) {
                return category;
            }
        }
        return 'other';
    }

    optimizeList(ingredients) {
        // Sort items by store layout
        Object.keys(ingredients).forEach(category => {
            ingredients[category].sort((a, b) => a.name.localeCompare(b.name));
        });

        // Round quantities to reasonable amounts
        Object.values(ingredients).flat().forEach(ingredient => {
            ingredient.amount = this.roundAmount(ingredient.amount, ingredient.unit);
        });

        return ingredients;
    }

    roundAmount(amount, unit) {
        switch (unit) {
            case 'g':
                return Math.ceil(amount / 5) * 5;
            case 'ml':
                return Math.ceil(amount / 10) * 10;
            case 'cup':
            case 'tbsp':
            case 'tsp':
                return Math.ceil(amount * 2) / 2;
            default:
                return Math.ceil(amount);
        }
    }

    estimateCost(ingredients) {
        // Mock price data - replace with actual price database
        const prices = {
            produce: 2.5,
            dairy: 3.5,
            meat: 7.0,
            pantry: 4.0,
            frozen: 5.0,
            beverages: 3.0,
            snacks: 4.0,
            other: 5.0
        };

        let total = 0;
        Object.entries(ingredients).forEach(([category, items]) => {
            items.forEach(item => {
                total += (prices[category] * this.normalizeAmount(item.amount, item.unit));
            });
        });

        return total;
    }

    normalizeAmount(amount, unit) {
        // Convert amounts to a comparable unit
        switch (unit) {
            case 'kg':
                return amount * 1000;
            case 'l':
                return amount * 1000;
            case 'cup':
                return amount * 240;
            case 'tbsp':
                return amount * 15;
            case 'tsp':
                return amount * 5;
            default:
                return amount;
        }
    }

    async showGenerator() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.innerHTML = `
            <div class="modal-content grocery-list-content">
                <div class="modal-header">
                    <h3>Smart Grocery List Generator</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="grocery-body">
                    ${await this.renderGroceryList()}
                    ${this.renderOptimizationOptions()}
                    ${this.renderCostEstimate()}
                    ${this.renderSavedLists()}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="saveList">Save List</button>
                    <button class="btn btn-primary" id="exportList">Export List</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#saveList').addEventListener('click', () => this.saveCurrentList());
        modal.querySelector('#exportList').addEventListener('click', () => this.exportList());

        // Initialize optimization controls
        this.setupOptimizationListeners(modal);
    }

    async renderGroceryList() {
        const meals = await this.getCurrentMeals();
        const ingredients = await this.generateList(meals);
        const optimized = this.optimizeList(ingredients);

        return `
            <section class="grocery-section">
                <h4>Shopping List</h4>
                <div class="category-grid">
                    ${Object.entries(optimized).map(([category, items]) => `
                        <div class="category-card ${items.length === 0 ? 'empty' : ''}">
                            <div class="category-header">
                                <h5>${this.formatCategoryName(category)}</h5>
                                <span class="item-count">${items.length} items</span>
                            </div>
                            <ul class="ingredient-list">
                                ${items.map(item => `
                                    <li class="ingredient-item">
                                        <label class="checkbox-label">
                                            <input type="checkbox" class="ingredient-checkbox">
                                            <span class="ingredient-name">${item.name}</span>
                                            <span class="ingredient-amount">${item.amount} ${item.unit}</span>
                                        </label>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderOptimizationOptions() {
        return `
            <section class="grocery-section">
                <h4>Optimization Options</h4>
                <div class="optimization-controls">
                    <div class="control-group">
                        <label class="control-label">
                            <input type="checkbox" id="groupByStore" checked>
                            Group by store layout
                        </label>
                    </div>
                    <div class="control-group">
                        <label class="control-label">
                            <input type="checkbox" id="roundQuantities" checked>
                            Round quantities
                        </label>
                    </div>
                    <div class="control-group">
                        <label class="control-label">
                            <input type="checkbox" id="combineItems" checked>
                            Combine similar items
                        </label>
                    </div>
                </div>
            </section>
        `;
    }

    renderCostEstimate() {
        return `
            <section class="grocery-section">
                <h4>Cost Estimate</h4>
                <div class="cost-breakdown">
                    <div class="total-cost">
                        <span class="cost-label">Estimated Total:</span>
                        <span class="cost-value">$${this.currentEstimate.toFixed(2)}</span>
                    </div>
                    <div class="cost-chart">
                        <canvas id="costChart"></canvas>
                    </div>
                </div>
            </section>
        `;
    }

    renderSavedLists() {
        return `
            <section class="grocery-section">
                <h4>Saved Lists</h4>
                <div class="saved-lists">
                    ${this.savedLists.map(list => `
                        <div class="saved-list-card">
                            <div class="list-header">
                                <h5>${list.name}</h5>
                                <span class="list-date">${new Date(list.date).toLocaleDateString()}</span>
                            </div>
                            <div class="list-summary">
                                <span class="item-count">${list.itemCount} items</span>
                                <span class="list-cost">$${list.cost.toFixed(2)}</span>
                            </div>
                            <button class="btn btn-text load-list">Load List</button>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    async getCurrentMeals() {
        // Mock data - replace with actual meal data from the planner
        return [
            {
                name: 'Breakfast',
                ingredients: [
                    { name: 'eggs', amount: 2, unit: 'piece' },
                    { name: 'bread', amount: 2, unit: 'slice' },
                    { name: 'butter', amount: 1, unit: 'tbsp' }
                ]
            },
            // Add more meals...
        ];
    }

    setupOptimizationListeners(modal) {
        const controls = modal.querySelectorAll('.optimization-controls input');
        controls.forEach(control => {
            control.addEventListener('change', () => this.updateList());
        });
    }

    async updateList() {
        const listContainer = document.querySelector('.category-grid');
        if (listContainer) {
            const meals = await this.getCurrentMeals();
            const ingredients = await this.generateList(meals);
            const optimized = this.optimizeList(ingredients);
            
            // Update the list content
            listContainer.innerHTML = this.renderCategoryGrid(optimized);
            
            // Update cost estimate
            this.updateCostEstimate(optimized);
        }
    }

    renderCategoryGrid(optimized) {
        return Object.entries(optimized).map(([category, items]) => `
            <div class="category-card ${items.length === 0 ? 'empty' : ''}">
                <div class="category-header">
                    <h5>${this.formatCategoryName(category)}</h5>
                    <span class="item-count">${items.length} items</span>
                </div>
                <ul class="ingredient-list">
                    ${items.map(item => `
                        <li class="ingredient-item">
                            <label class="checkbox-label">
                                <input type="checkbox" class="ingredient-checkbox">
                                <span class="ingredient-name">${item.name}</span>
                                <span class="ingredient-amount">${item.amount} ${item.unit}</span>
                            </label>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }

    updateCostEstimate(ingredients) {
        const total = this.estimateCost(ingredients);
        const costValue = document.querySelector('.cost-value');
        if (costValue) {
            costValue.textContent = `$${total.toFixed(2)}`;
        }
        this.updateCostChart(ingredients);
    }

    updateCostChart(ingredients) {
        const ctx = document.getElementById('costChart');
        if (!ctx) return;

        const categoryTotals = {};
        Object.entries(ingredients).forEach(([category, items]) => {
            categoryTotals[category] = items.reduce((total, item) => {
                return total + this.estimateCost({ [category]: [item] });
            }, 0);
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals).map(this.formatCategoryName),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: [
                        '#4CAF50', '#2196F3', '#FFC107', '#9C27B0',
                        '#F44336', '#00BCD4', '#FF9800', '#795548'
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

    saveCurrentList() {
        const name = prompt('Enter a name for this grocery list:');
        if (!name) return;

        const currentList = {
            name,
            date: new Date().toISOString(),
            itemCount: this.getCurrentItemCount(),
            cost: this.currentEstimate,
            items: this.getCurrentItems()
        };

        this.savedLists.unshift(currentList);
        this.saveLists();
        this.updateSavedLists();
    }

    getCurrentItemCount() {
        return document.querySelectorAll('.ingredient-item').length;
    }

    getCurrentItems() {
        const items = [];
        document.querySelectorAll('.ingredient-item').forEach(item => {
            items.push({
                name: item.querySelector('.ingredient-name').textContent,
                amount: parseFloat(item.querySelector('.ingredient-amount').textContent.split(' ')[0]),
                unit: item.querySelector('.ingredient-amount').textContent.split(' ')[1],
                checked: item.querySelector('.ingredient-checkbox').checked
            });
        });
        return items;
    }

    updateSavedLists() {
        const container = document.querySelector('.saved-lists');
        if (container) {
            container.innerHTML = this.savedLists.map(list => `
                <div class="saved-list-card">
                    <div class="list-header">
                        <h5>${list.name}</h5>
                        <span class="list-date">${new Date(list.date).toLocaleDateString()}</span>
                    </div>
                    <div class="list-summary">
                        <span class="item-count">${list.itemCount} items</span>
                        <span class="list-cost">$${list.cost.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-text load-list">Load List</button>
                </div>
            `).join('');
        }
    }

    exportList() {
        const items = this.getCurrentItems();
        const categorized = {};
        
        items.forEach(item => {
            const category = this.categorizeIngredient(item.name);
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(item);
        });

        const content = Object.entries(categorized)
            .map(([category, items]) => {
                return `
${this.formatCategoryName(category)}:
${items.map(item => `- ${item.name}: ${item.amount} ${item.unit}`).join('\n')}
`;
            })
            .join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grocery-list.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatCategoryName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
}

export const groceryListGenerator = new GroceryListGenerator(); 