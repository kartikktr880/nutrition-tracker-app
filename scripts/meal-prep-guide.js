class MealPrepGuide {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add prep guide button to recipe cards
        document.querySelectorAll('.recipe-card').forEach(card => {
            const prepBtn = document.createElement('button');
            prepBtn.className = 'btn btn-icon prep-guide-btn';
            prepBtn.innerHTML = '<i class="fas fa-utensils"></i>';
            prepBtn.title = 'Prep Guide';
            prepBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPrepGuide(card.dataset.recipeId);
            });
            card.querySelector('.recipe-actions').appendChild(prepBtn);
        });

        this.isInitialized = true;
    }

    async showPrepGuide(recipeId) {
        const recipe = await this.fetchRecipeDetails(recipeId);
        
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.innerHTML = `
            <div class="modal-content prep-guide-content">
                <div class="modal-header">
                    <h3>Prep Guide: ${recipe.name}</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="prep-guide-body">
                    ${this.renderPrepSteps(recipe)}
                    ${this.renderStorageGuide(recipe)}
                    ${this.renderPrepTips(recipe)}
                    ${this.renderCleanupChecklist()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    }

    renderPrepSteps(recipe) {
        return `
            <section class="prep-section">
                <h4><i class="fas fa-list-ol"></i> Prep Steps</h4>
                <div class="prep-timeline">
                    ${this.generatePrepSteps(recipe).map((step, index) => `
                        <div class="prep-step">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-content">
                                <h5>${step.title}</h5>
                                <p>${step.description}</p>
                                ${step.tip ? `<div class="step-tip"><i class="fas fa-lightbulb"></i> ${step.tip}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderStorageGuide(recipe) {
        return `
            <section class="prep-section">
                <h4><i class="fas fa-box"></i> Storage Guide</h4>
                <div class="storage-info">
                    ${this.generateStorageGuide(recipe).map(item => `
                        <div class="storage-item">
                            <div class="storage-icon">
                                <i class="fas fa-${item.icon}"></i>
                            </div>
                            <div class="storage-details">
                                <h5>${item.title}</h5>
                                <p>${item.description}</p>
                                <span class="storage-duration">
                                    <i class="fas fa-clock"></i> ${item.duration}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderPrepTips(recipe) {
        const tips = this.generatePrepTips(recipe);
        return `
            <section class="prep-section">
                <h4><i class="fas fa-lightbulb"></i> Smart Tips</h4>
                <div class="tips-grid">
                    ${tips.map(tip => `
                        <div class="tip-card">
                            <i class="fas fa-${tip.icon}"></i>
                            <h5>${tip.title}</h5>
                            <p>${tip.description}</p>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderCleanupChecklist() {
        return `
            <section class="prep-section">
                <h4><i class="fas fa-broom"></i> Cleanup Checklist</h4>
                <div class="cleanup-list">
                    ${this.generateCleanupSteps().map(step => `
                        <label class="cleanup-item">
                            <input type="checkbox">
                            <span class="checkmark"></span>
                            <span class="cleanup-text">${step}</span>
                        </label>
                    `).join('')}
                </div>
            </section>
        `;
    }

    generatePrepSteps(recipe) {
        // Mock data - replace with actual recipe prep steps
        return [
            {
                title: 'Mise en Place',
                description: 'Gather and measure all ingredients before starting.',
                tip: 'Use small bowls to organize pre-measured ingredients'
            },
            {
                title: 'Prep Ingredients',
                description: 'Wash, chop, and prepare all ingredients as needed.',
                tip: 'Keep a bowl for scraps to reduce cleanup time'
            },
            {
                title: 'Equipment Check',
                description: 'Ensure all needed equipment is clean and ready.',
                tip: 'Preheat equipment if needed'
            }
        ];
    }

    generateStorageGuide(recipe) {
        // Mock data - replace with actual storage guidelines
        return [
            {
                icon: 'refrigerator',
                title: 'Refrigerator Storage',
                description: 'Store in an airtight container.',
                duration: '3-4 days'
            },
            {
                icon: 'snowflake',
                title: 'Freezer Storage',
                description: 'Wrap tightly in freezer-safe container.',
                duration: 'Up to 3 months'
            }
        ];
    }

    generatePrepTips(recipe) {
        // Mock data - replace with actual smart tips
        return [
            {
                icon: 'clock',
                title: 'Time Saving',
                description: 'Prep vegetables in advance for quicker cooking.'
            },
            {
                icon: 'temperature-high',
                title: 'Temperature Tip',
                description: 'Let ingredients reach room temperature before cooking.'
            },
            {
                icon: 'utensils',
                title: 'Equipment Tip',
                description: 'Use sharp knives for more efficient prep work.'
            }
        ];
    }

    generateCleanupSteps() {
        return [
            'Clear and wipe down prep surfaces',
            'Wash and dry all utensils',
            'Clean cutting boards thoroughly',
            'Wipe down stovetop/cooking surfaces',
            'Store leftover ingredients properly'
        ];
    }

    async fetchRecipeDetails(recipeId) {
        // Mock data - replace with actual API call
        return {
            id: recipeId,
            name: `Recipe ${recipeId}`,
            // Add other recipe details as needed
        };
    }
}

export const mealPrepGuide = new MealPrepGuide(); 