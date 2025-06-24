class RecipeScaling {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.commonServings = [2, 4, 6, 8, 10, 12];
        this.portionSizes = [
            { name: 'Small', factor: 0.75, icon: 'utensils' },
            { name: 'Regular', factor: 1, icon: 'plate-wheat' },
            { name: 'Large', factor: 1.25, icon: 'bowl-food' }
        ];
        this.measurementUnits = {
            volume: ['tsp', 'tbsp', 'cup', 'ml', 'l', 'fl oz'],
            weight: ['g', 'kg', 'oz', 'lb'],
            count: ['piece', 'slice', 'whole']
        };
    }

    initialize() {
        if (this.isInitialized) return;

        // Add scaling button to recipe forms
        const recipeForms = document.querySelectorAll('.recipe-form');
        recipeForms.forEach(form => {
            const scaleBtn = document.createElement('button');
            scaleBtn.type = 'button';
            scaleBtn.className = 'btn btn-secondary scale-recipe';
            scaleBtn.innerHTML = '<i class="fas fa-balance-scale"></i> Scale Recipe';
            form.querySelector('.form-actions').prepend(scaleBtn);
        });

        // Set up event listeners
        document.addEventListener('click', e => {
            if (e.target.closest('.scale-recipe')) {
                const recipeForm = e.target.closest('.recipe-form');
                this.showScalingModal(recipeForm);
            }
        });

        // Listen for recipe updates
        document.addEventListener('recipeUpdated', e => {
            this.cache.delete(e.detail.recipeId);
        });

        // Listen for serving size changes
        document.addEventListener('servingSizeChanged', e => {
            const { recipeId, newServings } = e.detail;
            if (this.cache.has(recipeId)) {
                this.updateScaledRecipe(recipeId, newServings);
            }
        });

        // Listen for scale button clicks in meal form
        document.addEventListener('click', e => {
            if (e.target.closest('.scale-recipe')) {
                const form = e.target.closest('.meal-form');
                if (form) {
                    this.handleMealFormScaling(form);
                }
            }
        });

        this.isInitialized = true;
    }

    showScalingModal(recipeForm, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'scaling-modal';
        // Store options for future reference
        modal._scaleOptions = options;
        
        modal.innerHTML = `
            <div class="scaling-content">
                <div class="scaling-body">
                    <div class="scaling-section">
                        <h4>Adjust Servings</h4>
                        <div class="servings-adjuster">
                            <div class="servings-input">
                                <div class="number-input">
                                    <button type="button" class="decrease">-</button>
                                    <input type="number" min="1" value="${options.currentServings || 4}" id="servingCount">
                                    <button type="button" class="increase">+</button>
                                </div>
                                <span>servings</span>
                            </div>
                            <div class="common-servings">
                                ${this.commonServings.map(count => 
                                    `<button type="button" class="serving-preset" data-servings="${count}">
                                        ${count} servings
                                    </button>`
                                ).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="scaling-section">
                        <h4>Portion Size</h4>
                        <div class="portion-selector">
                            ${this.portionSizes.map(size => `
                                <label class="portion-option">
                                    <input type="radio" name="portionSize" value="${size.factor}"
                                        ${size.name === 'Regular' ? 'checked' : ''}>
                                    <div class="portion-label">
                                        <i class="fas fa-${size.icon}"></i>
                                        <span>${size.name}</span>
                                        <span class="portion-factor">${size.factor}x</span>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="scaling-section">
                        <h4>Scaled Ingredients</h4>
                        <div class="ingredients-table">
                            <div class="ingredients-header">
                                <span>Ingredient</span>
                                <span>Original</span>
                                <span>Scaled</span>
                            </div>
                            <div class="ingredients-list"></div>
                        </div>
                    </div>

                    <div class="scaling-section">
                        <h4>Nutrition Preview</h4>
                        <div class="nutrition-preview">
                            <div class="nutrition-chart">
                                <canvas id="nutritionChart"></canvas>
                            </div>
                            <div class="nutrition-comparison"></div>
                        </div>
                    </div>

                    <div class="scaling-section">
                        <h4>Scaling Tips</h4>
                        <div class="scaling-tips"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelScaling">Cancel</button>
                    <button type="button" class="btn btn-primary" id="applyScaling">Apply Changes</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        if (recipeForm) {
            this.setupModalInteractions(modal, recipeForm);
            this.renderIngredientScaling(recipeForm);
            this.renderNutritionPreview(recipeForm);
        } else if (options) {
            this.setupModalInteractionsWithOptions(modal, options);
            this.renderIngredientScalingWithOptions(modal, options);
            this.renderNutritionPreviewWithOptions(modal, options);
        }
        
        this.renderScalingTips();
        requestAnimationFrame(() => modal.style.opacity = '1');
    }

    setupModalInteractions(modal, recipeForm) {
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('#cancelScaling').addEventListener('click', closeModal);
        modal.querySelector('#applyScaling').addEventListener('click', () => {
            this.applyScaling(recipeForm);
            closeModal();
            this.showConfirmation();
        });

        // Serving size controls
        const servingInput = modal.querySelector('#servingCount');
        modal.querySelectorAll('.serving-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                servingInput.value = btn.dataset.servings;
                this.updateScaledAmounts(modal, recipeForm);
            });
        });

        modal.querySelector('.decrease').addEventListener('click', () => {
            if (servingInput.value > 1) {
                servingInput.value--;
                this.updateScaledAmounts(modal, recipeForm);
            }
        });

        modal.querySelector('.increase').addEventListener('click', () => {
            servingInput.value++;
            this.updateScaledAmounts(modal, recipeForm);
        });

        servingInput.addEventListener('change', () => {
            this.updateScaledAmounts(modal, recipeForm);
        });

        // Portion size controls
        modal.querySelectorAll('input[name="portionSize"]').forEach(input => {
            input.addEventListener('change', () => {
                this.updateScaledAmounts(modal, recipeForm);
            });
        });
    }

    setupModalInteractionsWithOptions(modal, options) {
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('#cancelScaling').addEventListener('click', closeModal);
        modal.querySelector('#applyScaling').addEventListener('click', () => {
            const scalingFactor = this.calculateScalingFactor(options.currentServings);
            if (options.onApply) {
                options.onApply(scalingFactor);
            }
            closeModal();
            this.showConfirmation();
        });

        // Serving size controls
        const servingInput = modal.querySelector('#servingCount');
        modal.querySelectorAll('.serving-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                servingInput.value = btn.dataset.servings;
                this.updateScaledAmounts(modal, null);
            });
        });

        modal.querySelector('.decrease').addEventListener('click', () => {
            if (servingInput.value > 1) {
                servingInput.value--;
                this.updateScaledAmounts(modal, null);
            }
        });

        modal.querySelector('.increase').addEventListener('click', () => {
            servingInput.value++;
            this.updateScaledAmounts(modal, null);
        });

        servingInput.addEventListener('change', () => {
            this.updateScaledAmounts(modal, null);
        });

        // Portion size controls
        modal.querySelectorAll('input[name="portionSize"]').forEach(input => {
            input.addEventListener('change', () => {
                this.updateScaledAmounts(modal, null);
            });
        });
    }

    updateScaledAmounts(modal, recipeForm) {
        // Get the modal element if not provided
        const modalElement = modal || document.querySelector('.scaling-modal');
        
        if (!modalElement) return;
        
        // Add transition effect to scaled amounts
        const scaledAmounts = modalElement.querySelectorAll('.scaled-amount');
        scaledAmounts.forEach(el => {
            el.style.transition = 'color 0.3s ease';
            el.style.color = 'var(--accent-color)';
            setTimeout(() => {
                el.style.color = 'var(--primary-color)';
            }, 300);
        });
        
        if (recipeForm) {
            this.renderIngredientScaling(recipeForm);
            this.renderNutritionPreview(recipeForm);
        } else {
            // Find options in the DOM
            const options = modalElement._scaleOptions;
            
            if (options) {
                // Update the scaling factor display
                const scalingFactor = this.calculateScalingFactor(options.currentServings);
                const factorDisplay = modalElement.querySelector('.scaling-factor-display');
                if (factorDisplay) {
                    factorDisplay.textContent = `${scalingFactor.toFixed(2)}x`;
                } else {
                    // Create factor display if it doesn't exist
                    const header = modalElement.querySelector('.scaling-section h4');
                    if (header) {
                        const span = document.createElement('span');
                        span.className = 'scaling-factor-display';
                        span.textContent = `${scalingFactor.toFixed(2)}x`;
                        span.style.marginLeft = '10px';
                        span.style.fontSize = '0.9em';
                        span.style.color = 'var(--accent-color)';
                        header.appendChild(span);
                    }
                }
                
                this.renderIngredientScalingWithOptions(modalElement, options);
                this.renderNutritionPreviewWithOptions(modalElement, options);
            }
        }
    }

    renderIngredientScaling(recipeForm) {
        const ingredients = Array.from(recipeForm.querySelectorAll('.ingredient-row')).map(row => ({
            name: row.querySelector('.ingredient-name').value,
            amount: parseFloat(row.querySelector('.ingredient-amount').value),
            unit: row.querySelector('.ingredient-unit').value
        }));

        const scalingFactor = this.calculateScalingFactor();
        const ingredientsList = document.querySelector('.ingredients-list');
        ingredientsList.innerHTML = ingredients.map(ingredient => `
            <div class="ingredient-row">
                <span class="ingredient-name">${ingredient.name}</span>
                <span class="original-amount">${ingredient.amount} ${ingredient.unit}</span>
                <span class="scaled-amount">${this.formatAmount(ingredient.amount * scalingFactor)} ${ingredient.unit}</span>
            </div>
        `).join('');
    }

    renderIngredientScalingWithOptions(modal, options) {
        const { ingredients = [] } = options;
        const scalingFactor = this.calculateScalingFactor(options.currentServings);
        const ingredientsList = modal.querySelector('.ingredients-list');
        
        if (ingredients.length === 0) {
            ingredientsList.innerHTML = '<div class="empty-state">No ingredients to display</div>';
            return;
        }
        
        ingredientsList.innerHTML = ingredients.map(ingredient => `
            <div class="ingredient-row">
                <span class="ingredient-name">${ingredient.name}</span>
                <span class="original-amount">${ingredient.amount} ${ingredient.unit}</span>
                <span class="scaled-amount">${this.formatAmount(ingredient.amount * scalingFactor)} ${ingredient.unit}</span>
            </div>
        `).join('');
    }

    renderNutritionPreview(recipeForm) {
        const nutritionValues = {
            calories: parseFloat(recipeForm.querySelector('#calories').value) || 0,
            protein: parseFloat(recipeForm.querySelector('#protein').value) || 0,
            carbs: parseFloat(recipeForm.querySelector('#carbs').value) || 0,
            fat: parseFloat(recipeForm.querySelector('#fat').value) || 0
        };

        const scalingFactor = this.calculateScalingFactor();
        const scaledValues = Object.fromEntries(
            Object.entries(nutritionValues).map(([key, value]) => [key, value * scalingFactor])
        );

        this.renderNutrientComparison(nutritionValues, scaledValues);
        this.renderNutritionChart(nutritionValues, scaledValues);
    }

    renderNutritionPreviewWithOptions(modal, options) {
        const { nutritionValues = {} } = options;
        const scalingFactor = this.calculateScalingFactor(options.currentServings);

        // Default to zero for missing values
        const nutritionData = {
            calories: nutritionValues.calories || 0,
            protein: nutritionValues.protein || 0,
            carbs: nutritionValues.carbs || 0,
            fat: nutritionValues.fat || 0,
            fiber: nutritionValues.fiber || 0,
            sugar: nutritionValues.sugar || 0
        };

        const scaledValues = Object.fromEntries(
            Object.entries(nutritionData).map(([key, value]) => [key, value * scalingFactor])
        );

        this.renderNutrientComparison(nutritionData, scaledValues);
        this.renderNutritionChart(nutritionData, scaledValues);
    }

    renderNutrientComparison(original, scaled) {
        const comparison = document.querySelector('.nutrition-comparison');
        comparison.innerHTML = `
            <div class="nutrient-grid">
                ${Object.entries(original).map(([nutrient, value]) => `
                    <div class="nutrient-row">
                        <span class="nutrient-name">${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)}</span>
                        <div class="nutrient-values">
                            <span>${value.toFixed(1)}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span>${scaled[nutrient].toFixed(1)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNutritionChart(original, scaled) {
        const ctx = document.getElementById('nutritionChart').getContext('2d');
        const labels = Object.keys(original).map(key => key.charAt(0).toUpperCase() + key.slice(1));
        const originalData = Object.values(original);
        const scaledData = Object.values(scaled);

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Original',
                        data: originalData,
                        backgroundColor: 'rgba(61, 90, 128, 0.5)',
                        borderColor: 'rgba(61, 90, 128, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Scaled',
                        data: scaledData,
                        backgroundColor: 'rgba(26, 60, 52, 0.5)',
                        borderColor: 'rgba(26, 60, 52, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderScalingTips() {
        const tips = [
            {
                icon: 'scale-balanced',
                text: 'Adjust seasonings gradually and taste as you go when scaling up.'
            },
            {
                icon: 'temperature-half',
                text: 'Cooking times may need adjustment when scaling. Monitor food closely.'
            },
            {
                icon: 'clock',
                text: 'Prep time might increase with larger quantities. Plan accordingly.'
            }
        ];

        const tipsContainer = document.querySelector('.scaling-tips');
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="scaling-tip">
                <i class="fas fa-${tip.icon}"></i>
                <p>${tip.text}</p>
            </div>
        `).join('');
    }

    calculateScalingFactor(currentServings) {
        const newServings = parseInt(document.querySelector('#servingCount').value);
        const portionFactor = parseFloat(document.querySelector('input[name="portionSize"]:checked').value);
        const originalServings = currentServings || 4; // Default serving size
        return (newServings * portionFactor) / originalServings;
    }

    formatAmount(amount) {
        return Math.round(amount * 100) / 100;
    }

    applyScaling(recipeForm) {
        const scalingFactor = this.calculateScalingFactor();
        
        // Update ingredient amounts
        recipeForm.querySelectorAll('.ingredient-row').forEach(row => {
            const amountInput = row.querySelector('.ingredient-amount');
            const originalAmount = parseFloat(amountInput.value);
            amountInput.value = this.formatAmount(originalAmount * scalingFactor);
        });

        // Update nutrition values
        ['calories', 'protein', 'carbs', 'fat'].forEach(nutrient => {
            const input = recipeForm.querySelector(`#${nutrient}`);
            const originalValue = parseFloat(input.value) || 0;
            input.value = this.formatAmount(originalValue * scalingFactor);
        });

        // Update serving size
        const newServings = document.querySelector('#servingCount').value;
        recipeForm.querySelector('#servings').value = newServings;
    }

    applyMealFormScaling(form, scalingFactor) {
        // Update servings
        const servingsInput = form.querySelector('#servings');
        servingsInput.value = Math.round(parseFloat(servingsInput.value) * scalingFactor);

        // Update ingredient amounts
        form.querySelectorAll('.ingredient-row').forEach(row => {
            const amountInput = row.querySelector('.ingredient-amount');
            const originalAmount = parseFloat(amountInput.value);
            amountInput.value = this.formatAmount(originalAmount * scalingFactor);
        });

        // Update nutrition values
        ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'].forEach(nutrient => {
            const input = form.querySelector(`#${nutrient}`);
            if (input) {
                const originalValue = parseFloat(input.value) || 0;
                input.value = this.formatAmount(originalValue * scalingFactor);
            }
        });

        // Dispatch form change event
        form.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Dispatch a custom event to notify the meal planner
        const mealScaledEvent = new CustomEvent('mealScaled', {
            bubbles: true,
            detail: {
                scalingFactor,
                mealForm: form,
                mealId: form.dataset.mealId,
                date: form.querySelector('#mealDate').value,
                mealType: form.querySelector('#mealType').value
            }
        });
        form.dispatchEvent(mealScaledEvent);
        
        // Log scaling action for analytics
        console.log(`Meal scaled by factor of ${scalingFactor.toFixed(2)}`);
    }

    showConfirmation() {
        const toast = document.createElement('div');
        toast.className = 'scaling-toast';
        toast.textContent = 'Recipe scaled successfully!';
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleMealFormScaling(form) {
        // Extract current meal form data
        const currentServings = parseInt(form.querySelector('#servings').value) || 1;
        
        // Extract ingredient data
        const ingredients = Array.from(form.querySelectorAll('.ingredient-row')).map(row => ({
            name: row.querySelector('.ingredient-name').value || 'Ingredient',
            amount: parseFloat(row.querySelector('.ingredient-amount').value) || 0,
            unit: row.querySelector('.ingredient-unit').value || 'unit'
        }));

        // Extract nutrition data
        const nutritionValues = {
            calories: parseFloat(form.querySelector('#calories').value) || 0,
            protein: parseFloat(form.querySelector('#protein').value) || 0,
            carbs: parseFloat(form.querySelector('#carbs').value) || 0,
            fat: parseFloat(form.querySelector('#fat').value) || 0,
            fiber: parseFloat(form.querySelector('#fiber').value) || 0,
            sugar: parseFloat(form.querySelector('#sugar').value) || 0
        };

        // Initialize serving input value to the current servings
        this.showScalingModal(null, {
            currentServings,
            ingredients,
            nutritionValues,
            onApply: (scalingFactor) => this.applyMealFormScaling(form, scalingFactor)
        });
    }
}

// Initialize the recipe scaling functionality
const recipeScaling = new RecipeScaling();
recipeScaling.initialize();

export default recipeScaling; 