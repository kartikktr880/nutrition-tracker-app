import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from './firebase-config.js';

class NutritionLookup {
    constructor() {
        this.auth = getAuth(app);
        this.db = getFirestore(app);
        this.lookupCache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.commonFoods = {
            // Common ingredients with their nutrition per 100g
            fruits: {
                apple: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10.4 },
                banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12.2 },
                orange: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9.4 }
            },
            vegetables: {
                carrot: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7 },
                broccoli: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7 },
                spinach: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4 }
            },
            proteins: {
                chicken_breast: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
                salmon: { calories: 208, protein: 22, carbs: 0, fat: 13, fiber: 0, sugar: 0 },
                egg: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1 }
            },
            grains: {
                rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
                bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5.1 },
                pasta: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, sugar: 0.6 }
            }
        };
    }

    initialize() {
        // Add lookup button to ingredient rows
        document.querySelectorAll('.ingredient-row').forEach(row => {
            this.addLookupButton(row);
        });

        // Add lookup button to new ingredient rows
        const addIngredientBtn = document.getElementById('addIngredient');
        if (addIngredientBtn) {
            const originalClick = addIngredientBtn.onclick;
            addIngredientBtn.onclick = (e) => {
                if (originalClick) originalClick(e);
                const newRow = document.querySelector('.ingredient-row:last-child');
                this.addLookupButton(newRow);
            };
        }

        // Add event listener for the main lookup button
        const lookupBtn = document.getElementById('lookupNutrition');
        if (lookupBtn) {
            lookupBtn.addEventListener('click', () => this.lookupFullMeal());
        }
    }

    addLookupButton(row) {
        const nameInput = row.querySelector('.ingredient-name');
        if (!nameInput) return;

        const lookupBtn = document.createElement('button');
        lookupBtn.type = 'button';
        lookupBtn.className = 'nutrition-lookup';
        lookupBtn.innerHTML = '<i class="fas fa-search"></i>';
        lookupBtn.title = 'Look up nutrition';
        
        lookupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showNutritionLookup(row);
        });

        nameInput.parentNode.insertBefore(lookupBtn, nameInput.nextSibling);
    }

    async showNutritionLookup(ingredientRow) {
        const ingredientName = ingredientRow.querySelector('.ingredient-name').value.toLowerCase();
        const amount = parseFloat(ingredientRow.querySelector('.ingredient-amount').value) || 0;
        const unit = ingredientRow.querySelector('.ingredient-unit').value.toLowerCase();

        const popup = document.createElement('div');
        popup.className = 'nutrition-lookup-popup';
        popup.innerHTML = '<div class="lookup-loading">Looking up nutrition info...</div>';

        // Position the popup
        const rect = ingredientRow.getBoundingClientRect();
        popup.style.position = 'absolute';
        popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;

        document.body.appendChild(popup);

        try {
            const nutrition = await this.lookupNutrition(ingredientName, amount, unit);
            if (nutrition) {
                popup.innerHTML = this.generateNutritionPopup(nutrition, ingredientName);
                this.setupPopupEvents(popup, nutrition);
            } else {
                popup.innerHTML = '<div class="lookup-error">No nutrition information found</div>';
            }
        } catch (error) {
            console.error('Error looking up nutrition:', error);
            popup.innerHTML = '<div class="lookup-error">Error looking up nutrition</div>';
        }

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target) && !ingredientRow.contains(e.target)) {
                this.removePopup();
            }
        });
    }

    async lookupNutrition(ingredientName, amount = 100, unit = 'g') {
        const cacheKey = `${ingredientName}-${amount}-${unit}`;
        const cached = this.lookupCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        // First check our common foods database
        const nutrition = this.findInCommonFoods(ingredientName);
        if (nutrition) {
            // Adjust for amount and unit
            const adjustedNutrition = this.adjustNutritionValues(nutrition, amount, unit);
            
            // Cache the result
            this.lookupCache.set(cacheKey, {
                timestamp: Date.now(),
                data: adjustedNutrition
            });

            return adjustedNutrition;
        }

        // If not found in common foods, check Firebase
        try {
            const nutritionRef = collection(this.db, 'nutritionData');
            const q = query(
                nutritionRef,
                where('name', '==', ingredientName),
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                const adjustedNutrition = this.adjustNutritionValues(data, amount, unit);
                
                this.lookupCache.set(cacheKey, {
                    timestamp: Date.now(),
                    data: adjustedNutrition
                });

                return adjustedNutrition;
            }
        } catch (error) {
            console.error('Error querying nutrition data:', error);
        }

        return null;
    }

    findInCommonFoods(ingredientName) {
        for (const category of Object.values(this.commonFoods)) {
            for (const [food, nutrition] of Object.entries(category)) {
                if (ingredientName.includes(food.replace('_', ' '))) {
                    return nutrition;
                }
            }
        }
        return null;
    }

    adjustNutritionValues(nutrition, amount, unit) {
        const baseAmount = 100; // Our nutrition values are per 100g
        let factor = amount / baseAmount;

        // Convert common units to grams
        if (unit !== 'g') {
            const conversions = {
                oz: 28.35,
                lb: 453.6,
                kg: 1000,
                cup: 240, // This is approximate and depends on the ingredient
                tbsp: 15,
                tsp: 5,
                ml: 1
            };

            if (conversions[unit]) {
                factor = (amount * conversions[unit]) / baseAmount;
            }
        }

        return {
            calories: Math.round(nutrition.calories * factor),
            protein: +(nutrition.protein * factor).toFixed(1),
            carbs: +(nutrition.carbs * factor).toFixed(1),
            fat: +(nutrition.fat * factor).toFixed(1),
            fiber: +(nutrition.fiber * factor).toFixed(1),
            sugar: +(nutrition.sugar * factor).toFixed(1)
        };
    }

    generateNutritionPopup(nutrition, ingredientName) {
        return `
            <div class="lookup-content">
                <div class="lookup-header">
                    <h4>Nutrition Facts</h4>
                    <small>${ingredientName}</small>
                    <button class="close-lookup">×</button>
                </div>
                <div class="nutrition-facts">
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.calories}</span>
                        <span class="fact-label">Calories</span>
                    </div>
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.protein}g</span>
                        <span class="fact-label">Protein</span>
                    </div>
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.carbs}g</span>
                        <span class="fact-label">Carbs</span>
                    </div>
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.fat}g</span>
                        <span class="fact-label">Fat</span>
                    </div>
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.fiber}g</span>
                        <span class="fact-label">Fiber</span>
                    </div>
                    <div class="nutrition-fact">
                        <span class="fact-value">${nutrition.sugar}g</span>
                        <span class="fact-label">Sugar</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm apply-nutrition">Apply to Recipe</button>
            </div>
        `;
    }

    setupPopupEvents(popup, nutrition) {
        const closeBtn = popup.querySelector('.close-lookup');
        const applyBtn = popup.querySelector('.apply-nutrition');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.removePopup());
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyNutritionToForm(nutrition);
                this.removePopup();
            });
        }
    }

    applyNutritionToForm(nutrition) {
        const form = document.getElementById('mealForm');
        if (!form) return;

        const servings = parseInt(form.querySelector('#servings').value) || 1;
        const perServing = {
            calories: Math.round(nutrition.calories / servings),
            protein: +(nutrition.protein / servings).toFixed(1),
            carbs: +(nutrition.carbs / servings).toFixed(1),
            fat: +(nutrition.fat / servings).toFixed(1),
            fiber: +(nutrition.fiber / servings).toFixed(1),
            sugar: +(nutrition.sugar / servings).toFixed(1)
        };

        for (const [key, value] of Object.entries(perServing)) {
            const input = form.querySelector(`#${key}`);
            if (input) {
                input.value = value;
            }
        }
    }

    async lookupFullMeal() {
        const ingredients = Array.from(document.querySelectorAll('.ingredient-row')).map(row => ({
            name: row.querySelector('.ingredient-name').value.toLowerCase(),
            amount: parseFloat(row.querySelector('.ingredient-amount').value) || 0,
            unit: row.querySelector('.ingredient-unit').value.toLowerCase()
        }));

        const servings = parseInt(document.getElementById('servings').value) || 1;
        let totalNutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0
        };

        // Show loading state
        const lookupBtn = document.getElementById('lookupNutrition');
        const originalText = lookupBtn.innerHTML;
        lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';

        try {
            for (const ingredient of ingredients) {
                const nutrition = await this.lookupNutrition(ingredient.name, ingredient.amount, ingredient.unit);
                if (nutrition) {
                    for (const [key, value] of Object.entries(nutrition)) {
                        totalNutrition[key] += value;
                    }
                }
            }

            // Adjust for servings
            for (const key of Object.keys(totalNutrition)) {
                totalNutrition[key] = key === 'calories' 
                    ? Math.round(totalNutrition[key] / servings)
                    : +(totalNutrition[key] / servings).toFixed(1);
            }

            this.applyNutritionToForm(totalNutrition);
        } catch (error) {
            console.error('Error looking up full meal nutrition:', error);
        } finally {
            lookupBtn.innerHTML = originalText;
        }
    }

    removePopup() {
        const existing = document.querySelector('.nutrition-lookup-popup');
        if (existing) {
            existing.remove();
        }
    }
}

export const nutritionLookup = new NutritionLookup(); 