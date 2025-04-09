class PortionCalculator {
    constructor() {
        this.commonPortions = {
            // Volume measurements
            cup: { ml: 240, oz: 8 },
            tablespoon: { ml: 15, oz: 0.5 },
            teaspoon: { ml: 5, oz: 0.17 },
            
            // Weight measurements
            gram: { g: 1, oz: 0.035 },
            ounce: { g: 28.35, oz: 1 },
            pound: { g: 453.6, oz: 16 },

            // Common food portions
            serving: {
                rice: { cooked: { g: 150, description: "¾ cup cooked" }},
                pasta: { cooked: { g: 140, description: "1 cup cooked" }},
                meat: { cooked: { g: 85, description: "size of a deck of cards" }},
                fish: { cooked: { g: 140, description: "size of a checkbook" }},
                vegetables: { raw: { g: 85, description: "1 cup raw leafy or ½ cup others" }},
                fruit: { whole: { g: 120, description: "1 medium piece" }},
                nuts: { raw: { g: 30, description: "small handful" }},
                cheese: { slice: { g: 30, description: "size of 4 stacked dice" }}
            }
        };

        this.visualReferences = {
            "1 cup": "baseball",
            "½ cup": "tennis ball",
            "¼ cup": "large egg",
            "2 tablespoons": "ping pong ball",
            "1 tablespoon": "thumb tip",
            "1 teaspoon": "fingertip",
            "3 ounces": "deck of cards",
            "1 ounce": "four dice"
        };
    }

    initialize() {
        this.setupPortionHelper();
    }

    setupPortionHelper() {
        // Add portion helper button to ingredient rows
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const amountInput = row.querySelector('.ingredient-amount');
            if (!amountInput) return;

            const helperBtn = document.createElement('button');
            helperBtn.type = 'button';
            helperBtn.className = 'portion-helper';
            helperBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            helperBtn.title = 'Portion Helper';
            
            helperBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPortionHelper(row);
            });

            amountInput.parentNode.insertBefore(helperBtn, amountInput.nextSibling);
        });

        // Add portion helper to the "Add Ingredient" button click event
        const addIngredientBtn = document.getElementById('addIngredient');
        if (addIngredientBtn) {
            const originalClick = addIngredientBtn.onclick;
            addIngredientBtn.onclick = (e) => {
                if (originalClick) originalClick(e);
                this.setupPortionHelper();
            };
        }
    }

    showPortionHelper(ingredientRow) {
        const ingredientName = ingredientRow.querySelector('.ingredient-name').value.toLowerCase();
        const amountInput = ingredientRow.querySelector('.ingredient-amount');
        const unitInput = ingredientRow.querySelector('.ingredient-unit');

        const helper = document.createElement('div');
        helper.className = 'portion-helper-popup';
        helper.innerHTML = this.generateHelperContent(ingredientName);

        // Position the helper popup
        const rect = amountInput.getBoundingClientRect();
        helper.style.position = 'absolute';
        helper.style.top = `${rect.bottom + window.scrollY + 5}px`;
        helper.style.left = `${rect.left + window.scrollX}px`;

        // Add click handlers for portion options
        helper.addEventListener('click', (e) => {
            const option = e.target.closest('.portion-option');
            if (option) {
                const amount = option.dataset.amount;
                const unit = option.dataset.unit;
                amountInput.value = amount;
                unitInput.value = unit;
                this.removeHelper();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!helper.contains(e.target) && !ingredientRow.contains(e.target)) {
                this.removeHelper();
            }
        });

        // Remove any existing helper
        this.removeHelper();

        // Add to document
        document.body.appendChild(helper);
    }

    generateHelperContent(ingredientName) {
        let content = `
            <div class="helper-header">
                <h4>Portion Helper</h4>
                <button class="close-helper">×</button>
            </div>
            <div class="helper-content">
        `;

        // Add common measurement options
        content += '<div class="helper-section"><h5>Common Measurements</h5>';
        for (const [visual, reference] of Object.entries(this.visualReferences)) {
            content += `
                <div class="portion-option" data-amount="${visual.split(' ')[0]}" data-unit="${visual.split(' ')[1] || ''}">
                    <i class="fas fa-ruler"></i>
                    <span class="option-text">${visual}</span>
                    <small>(like a ${reference})</small>
                </div>
            `;
        }
        content += '</div>';

        // Add food-specific portions if available
        const foodType = this.findFoodType(ingredientName);
        if (foodType && this.commonPortions.serving[foodType]) {
            content += '<div class="helper-section"><h5>Suggested Portion</h5>';
            const portion = this.commonPortions.serving[foodType];
            for (const [state, details] of Object.entries(portion)) {
                content += `
                    <div class="portion-option" data-amount="1" data-unit="serving">
                        <i class="fas fa-utensils"></i>
                        <span class="option-text">1 serving</span>
                        <small>(${details.description})</small>
                    </div>
                `;
            }
            content += '</div>';
        }

        content += `
            </div>
            <div class="helper-footer">
                <small>Click an option to apply</small>
            </div>
        `;

        return content;
    }

    findFoodType(ingredientName) {
        const foodTypes = {
            rice: ['rice', 'risotto'],
            pasta: ['pasta', 'noodle', 'spaghetti', 'macaroni'],
            meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb'],
            fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia'],
            vegetables: ['lettuce', 'spinach', 'carrot', 'broccoli', 'pepper'],
            fruit: ['apple', 'banana', 'orange', 'pear', 'berry'],
            nuts: ['almond', 'walnut', 'cashew', 'peanut'],
            cheese: ['cheese', 'cheddar', 'mozzarella', 'parmesan']
        };

        for (const [type, keywords] of Object.entries(foodTypes)) {
            if (keywords.some(keyword => ingredientName.includes(keyword))) {
                return type;
            }
        }
        return null;
    }

    removeHelper() {
        const existing = document.querySelector('.portion-helper-popup');
        if (existing) {
            existing.remove();
        }
    }

    convertPortion(amount, fromUnit, toUnit) {
        // Convert between common measurements
        if (this.commonPortions[fromUnit] && this.commonPortions[toUnit]) {
            const baseValue = amount * this.commonPortions[fromUnit].ml;
            return baseValue / this.commonPortions[toUnit].ml;
        }
        return amount;
    }
}

export const portionCalculator = new PortionCalculator(); 