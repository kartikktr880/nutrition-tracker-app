class IngredientSubstitutions {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.substitutionsData = {
            // Common ingredient substitutions with nutrition info
            'butter': [
                { name: 'Greek Yogurt', ratio: '1:1', calories: -70, protein: 8, notes: 'Adds protein, reduces fat' },
                { name: 'Applesauce', ratio: '1:1', calories: -100, sugar: 5, notes: 'Best for baking' },
                { name: 'Avocado', ratio: '1:1', calories: -20, healthy_fats: 15, notes: 'Adds healthy fats' }
            ],
            'sugar': [
                { name: 'Stevia', ratio: '1:0.25', calories: -45, sugar: -12, notes: 'Zero-calorie natural sweetener' },
                { name: 'Monk Fruit', ratio: '1:0.25', calories: -45, sugar: -12, notes: 'Zero-calorie, good for baking' },
                { name: 'Honey', ratio: '1:0.75', calories: -20, minerals: 5, notes: 'Natural option, adds minerals' }
            ],
            'white flour': [
                { name: 'Almond Flour', ratio: '1:1', calories: 0, protein: 6, fiber: 3, notes: 'Adds protein and fiber' },
                { name: 'Coconut Flour', ratio: '1:0.25', calories: -20, fiber: 8, notes: 'Very absorbent, use less' },
                { name: 'Oat Flour', ratio: '1:1', calories: -10, fiber: 4, notes: 'High in fiber and nutrients' }
            ],
            'cream': [
                { name: 'Coconut Milk', ratio: '1:1', calories: -50, healthy_fats: 10, notes: 'Plant-based alternative' },
                { name: 'Cashew Cream', ratio: '1:1', calories: -40, protein: 4, notes: 'Rich and creamy texture' },
                { name: 'Greek Yogurt', ratio: '1:1', calories: -60, protein: 10, notes: 'High protein option' }
            ]
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add substitution button to ingredient rows
        const addSubstitutionButtons = () => {
            const ingredientRows = document.querySelectorAll('.ingredient-row');
            ingredientRows.forEach(row => {
                if (!row.querySelector('.substitute-btn')) {
                    const substituteBtn = document.createElement('button');
                    substituteBtn.type = 'button';
                    substituteBtn.className = 'btn btn-icon substitute-btn';
                    substituteBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
                    substituteBtn.title = 'Find healthy substitutes';
                    substituteBtn.addEventListener('click', () => {
                        const ingredientName = row.querySelector('.ingredient-name').value;
                        this.showSubstitutions(ingredientName, row);
                    });
                    
                    const actionsCell = row.querySelector('.ingredient-actions');
                    actionsCell.insertBefore(substituteBtn, actionsCell.firstChild);
                }
            });
        };

        // Watch for new ingredient rows
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    addSubstitutionButtons();
                }
            });
        });

        const ingredientsList = document.querySelector('.ingredients-list');
        if (ingredientsList) {
            observer.observe(ingredientsList, { childList: true, subtree: true });
            addSubstitutionButtons();
        }

        this.isInitialized = true;
    }

    async showSubstitutions(ingredient, targetRow) {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.style.display = 'flex';

        const substitutions = await this.findSubstitutions(ingredient);
        
        const content = `
            <div class="modal-content substitutions-content">
                <div class="modal-header">
                    <h3 class="modal-title">Healthy Substitutions for ${ingredient}</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="substitutions-body">
                    ${substitutions.length ? `
                        <div class="substitutions-grid">
                            ${substitutions.map(sub => `
                                <div class="substitution-card">
                                    <div class="substitution-header">
                                        <h4>${sub.name}</h4>
                                        <span class="ratio">Ratio: ${sub.ratio}</span>
                                    </div>
                                    <div class="nutrition-changes">
                                        ${this.formatNutritionChanges(sub)}
                                    </div>
                                    <p class="substitution-notes">${sub.notes}</p>
                                    <button class="btn btn-primary use-substitution" 
                                            data-name="${sub.name}" 
                                            data-ratio="${sub.ratio}">
                                        Use This Substitute
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-substitutions">
                            <p>No substitutions found for this ingredient.</p>
                            <p>Try searching with a more common ingredient name.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        // Close button handler
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Use substitution handlers
        modal.querySelectorAll('.use-substitution').forEach(button => {
            button.addEventListener('click', () => {
                const subName = button.dataset.name;
                const ratio = button.dataset.ratio;
                this.applySubstitution(targetRow, subName, ratio);
                modal.remove();
            });
        });
    }

    formatNutritionChanges(substitution) {
        const changes = [];
        for (const [key, value] of Object.entries(substitution)) {
            if (['name', 'ratio', 'notes'].includes(key)) continue;
            
            const formattedValue = value > 0 ? `+${value}` : value;
            const unit = key === 'calories' ? 'cal' : 'g';
            changes.push(`
                <div class="nutrition-change ${value > 0 ? 'increase' : 'decrease'}">
                    <span class="change-label">${key}:</span>
                    <span class="change-value">${formattedValue}${unit}</span>
                </div>
            `);
        }
        return changes.join('');
    }

    async findSubstitutions(ingredient) {
        const cacheKey = `sub-${ingredient.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Find closest matching ingredient
        const matchingIngredient = Object.keys(this.substitutionsData)
            .find(key => ingredient.toLowerCase().includes(key));

        const substitutions = matchingIngredient ? 
            this.substitutionsData[matchingIngredient] : [];

        // Cache for 5 minutes
        this.cache.set(cacheKey, substitutions);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

        return substitutions;
    }

    applySubstitution(targetRow, substituteName, ratio) {
        const [original, substitute] = ratio.split(':').map(Number);
        
        // Update ingredient name
        const nameInput = targetRow.querySelector('.ingredient-name');
        nameInput.value = substituteName;
        
        // Update amount based on ratio
        const amountInput = targetRow.querySelector('.ingredient-amount');
        const currentAmount = parseFloat(amountInput.value) || 0;
        const newAmount = (currentAmount * substitute) / original;
        amountInput.value = newAmount.toFixed(2);
        
        // Trigger change event to update nutrition calculations
        nameInput.dispatchEvent(new Event('change'));
        amountInput.dispatchEvent(new Event('change'));
    }
}

export const ingredientSubstitutions = new IngredientSubstitutions(); 