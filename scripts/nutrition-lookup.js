import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { auth } from './auth-core.js';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from './firebase-config.js';
import { FoodTypeUtils } from './food-type-utils.js';

class NutritionLookup {
    constructor() {
        this.db = getFirestore(app);
        this.lookupCache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.foodTypeUtils = new FoodTypeUtils();
        this.maxCacheSize = 1000; // Prevent memory issues
        
        // Remove duplicate commonFoods database since it's now in FoodTypeUtils
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
        const nameInput = ingredientRow.querySelector('.ingredient-name');
        const amountInput = ingredientRow.querySelector('.ingredient-amount');
        const unitInput = ingredientRow.querySelector('.ingredient-unit');

        // Validate inputs exist
        if (!nameInput || !amountInput || !unitInput) {
            logError('Required input elements not found');
            this.showError('Error: Required form elements are missing');
            return;
        }

        const ingredientName = nameInput.value.toLowerCase();
        const amount = parseFloat(amountInput.value) || 0;
        const unit = unitInput.value.toLowerCase();

        // Validate input before proceeding
        if (!ingredientName.trim()) {
            this.showError('Please enter an ingredient name');
            nameInput.focus();
            return;
        }

        if (amount <= 0) {
            this.showError('Please enter a valid amount');
            amountInput.focus();
            return;
        }

        // Remove any existing popup
        this.removePopup();

        const popup = document.createElement('div');
        popup.className = 'nutrition-lookup-popup';
        popup.innerHTML = '<div class="lookup-loading"><i class="fas fa-spinner fa-spin"></i> Looking up nutrition info...</div>';

        // Position the popup with improved positioning logic
        const rect = ingredientRow.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const popupHeight = 300; // Approximate height of popup
        
        // Calculate position
        let top = rect.bottom + window.scrollY + 5;
        let left = rect.left + window.scrollX;
        
        // Check if popup would go below viewport
        if (top + popupHeight > viewportHeight + window.scrollY) {
            top = rect.top + window.scrollY - popupHeight - 5;
        }
        
        // Check if popup would go off right edge
        const viewportWidth = window.innerWidth;
        const popupWidth = 300; // Approximate width of popup
        if (left + popupWidth > viewportWidth) {
            left = viewportWidth - popupWidth - 10;
        }

        popup.style.position = 'absolute';
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;

        document.body.appendChild(popup);

        try {
            const nutrition = await this.lookupNutrition(ingredientName, amount, unit);
            if (nutrition) {
                popup.innerHTML = this.generateNutritionPopup(nutrition, ingredientName);
                this.setupPopupEvents(popup, nutrition);
            } else {
                popup.innerHTML = `
                    <div class="lookup-error">
                        <i class="fas fa-exclamation-circle"></i>
                        No nutrition information found for "${ingredientName}"
                        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="this.closest('.lookup-error').remove()">Close</button>
                    </div>`;
            }
        } catch (error) {
            logError('Error looking up nutrition:', error);
            popup.innerHTML = `
                <div class="lookup-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error looking up nutrition. Please try again.
                    <button class="btn btn-sm btn-outline-secondary mt-2" onclick="this.closest('.lookup-error').remove()">Close</button>
                </div>`;
        }

        // Close when clicking outside
        const closePopup = (e) => {
            if (!popup.contains(e.target) && !ingredientRow.contains(e.target)) {
                this.removePopup();
                document.removeEventListener('click', closePopup);
            }
        };
        document.addEventListener('click', closePopup);
    }

    /**
     * Show an error message to the user
     * @param {string} message - The error message to display
     * @param {string} [type='warning'] - The type of alert ('warning', 'error', 'info')
     * @param {number} [duration=5000] - Duration in milliseconds before auto-dismiss
     */
    showError(message, type = 'warning', duration = 5000) {
        // Validate input
        if (!message || typeof message !== 'string') {
            logError('Invalid error message provided');
            return;
        }

        // Remove any existing error messages of the same type
        const existingErrors = document.querySelectorAll(`.alert-${type}`);
        existingErrors.forEach(error => error.remove());

        const errorDiv = document.createElement('div');
        errorDiv.className = `alert alert-${type} alert-dismissible fade show`;
        
        // Add appropriate icon based on type
        const icon = type === 'error' ? 'exclamation-triangle' : 
                    type === 'info' ? 'info-circle' : 
                    'exclamation-circle';
        
        errorDiv.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Find a suitable container for the error message
        const container = document.querySelector('.nutrition-form') || document.body;
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto-dismiss after specified duration
        if (duration > 0) {
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, duration);
        }

        // Add fade-out animation
        errorDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-close')) {
                errorDiv.classList.add('fade-out');
                setTimeout(() => errorDiv.remove(), 300);
            }
        });
    }

    /**
     * Look up nutrition information for an ingredient
     * @param {string} ingredientName - The name of the ingredient
     * @param {number} amount - The amount of the ingredient
     * @param {string} unit - The unit of measurement
     * @returns {Object|null} Nutrition information or null if not found
     */
    async lookupNutrition(ingredientName, amount = 100, unit = 'g') {
        // Enhanced input validation
        if (!ingredientName || typeof ingredientName !== 'string') {
            logError('Invalid ingredient name provided');
            this.showError('Please enter a valid ingredient name');
            return null;
        }

        // Normalize input
        ingredientName = ingredientName.trim().toLowerCase();
        amount = parseFloat(amount);
        unit = unit.toLowerCase();

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            logError('Invalid amount provided');
            this.showError('Please enter a valid amount');
            return null;
        }

        // Validate unit
        if (!this.foodTypeUtils.getUnitMultiplier(unit)) {
            logError('Invalid unit provided');
            this.showError(`Unsupported unit: ${unit}`);
            return null;
        }

        const cacheKey = `${ingredientName}-${amount}-${unit}`;
        const cached = this.lookupCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            logInfo('Retrieved nutrition data from cache');
            return cached.data;
        }

        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;
        let recoveryAttempted = false;
        
        while (attempts < maxAttempts) {
            try {
                // First try to get nutrition info from FoodTypeUtils
                const nutritionInfo = this.foodTypeUtils.getNutritionInfo(ingredientName, amount, unit);
                if (nutritionInfo) {
                    logInfo('Retrieved nutrition data from FoodTypeUtils');
                    this.cacheResult(cacheKey, nutritionInfo);
                    return nutritionInfo;
                }

                // If not found in FoodTypeUtils, proceed with API lookup
                if (!this.appId || !this.appKey) {
                    throw new Error('API credentials not configured');
                }

                const response = await fetch(`https://api.edamam.com/api/food-database/v2/parser?app_id=${this.appId}&app_key=${this.appKey}&ingr=${encodeURIComponent(ingredientName)}`);
                
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                
                const data = await response.json();
                if (data.hints && data.hints.length > 0) {
                    const food = data.hints[0].food;
                    const adjustedNutrition = this.adjustNutritionForAmount(food.nutrients, amount, unit);
                    logInfo('Retrieved nutrition data from API');
                    this.cacheResult(cacheKey, adjustedNutrition);
                return adjustedNutrition;
            }

                // No results found
                logInfo(`No nutrition data found for ${ingredientName}`);
                return null;
        } catch (error) {
                lastError = error;
                logError(`Error looking up nutrition (attempt ${attempts + 1}/${maxAttempts}):`, error);
                
                if (attempts < maxAttempts - 1) {
                    // Wait before retrying, with exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                    continue;
                }
                
                // If all retries failed and we haven't tried cache recovery yet
                if (!recoveryAttempted) {
                    recoveryAttempted = true;
                    logInfo('Attempting cache recovery...');
                    
                    // Try to find similar items in cache
                    const similarItems = Array.from(this.lookupCache.entries())
                        .filter(([key]) => {
                            const [cachedName] = key.split('-');
                            return cachedName.includes(ingredientName) || 
                                   ingredientName.includes(cachedName);
                        })
                        .sort((a, b) => b[1].timestamp - a[1].timestamp);

                    if (similarItems.length > 0) {
                        const [_, cachedData] = similarItems[0];
                        logInfo('Recovered nutrition data from cache after API failure');
                        this.showError(`Using cached data for similar ingredient. Results may not be exact.`);
                        return cachedData.data;
                    }
                }

                // If we get here, all attempts failed and no cache recovery was possible
                this.showError(`Unable to find nutrition data for ${ingredientName}. Please try again later.`);
                return null;
            }
        }

        // If we get here, all attempts failed
        if (lastError) {
            this.showError(`Error looking up nutrition: ${lastError.message}`);
        }
        return null;
    }

    /**
     * Adjust nutrition values based on amount and unit with enhanced error handling
     * @param {Object} nutrition - The nutrition information
     * @param {number} amount - The amount
     * @param {string} unit - The unit of measurement
     * @returns {Object} Adjusted nutrition information
     * @throws {Error} If nutrition data is invalid
     */
    adjustNutritionForAmount(nutrition, amount, unit) {
        if (!nutrition || typeof nutrition !== 'object') {
            throw new Error('Invalid nutrition data provided');
        }

        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            throw new Error('Invalid amount provided');
        }

        const multiplier = this.foodTypeUtils.getUnitMultiplier(unit);
        if (multiplier === null) {
            throw new Error(`Unsupported unit: ${unit}`);
        }

        const adjustedAmount = amount * multiplier;
        
        try {
            return {
                calories: Math.round(nutrition.calories * adjustedAmount / 100),
                protein: Math.round(nutrition.protein * adjustedAmount / 100 * 10) / 10,
                carbs: Math.round(nutrition.carbs * adjustedAmount / 100 * 10) / 10,
                fat: Math.round(nutrition.fat * adjustedAmount / 100 * 10) / 10,
                fiber: Math.round(nutrition.fiber * adjustedAmount / 100 * 10) / 10,
                sugar: Math.round(nutrition.sugar * adjustedAmount / 100 * 10) / 10
            };
        } catch (error) {
            logError('Error adjusting nutrition values:', error);
            throw new Error('Failed to adjust nutrition values');
        }
    }

    /**
     * Cache the result of a nutrition lookup
     * @param {string} key - The cache key
     * @param {Object} data - The nutrition data
     */
    cacheResult(key, data) {
        // Validate input
        if (!key || !data) {
            logWarn('Invalid cache key or data provided');
            return;
        }

        // Validate nutrition data structure
        const requiredFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
        const isValidData = requiredFields.every(field => 
            typeof data[field] === 'number' && 
            !isNaN(data[field]) && 
            data[field] >= 0
        );

        if (!isValidData) {
            logWarn('Invalid nutrition data structure, skipping cache');
            return;
        }

        // Manage cache size
        if (this.lookupCache.size >= this.maxCacheSize) {
            // Remove oldest entries when cache is full
            const entriesToRemove = Math.ceil(this.maxCacheSize * 0.2); // Remove 20% of entries
            const sortedEntries = Array.from(this.lookupCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < entriesToRemove; i++) {
                this.lookupCache.delete(sortedEntries[i][0]);
            }
        }

        // Add to cache with timestamp
        this.lookupCache.set(key, {
            data,
            timestamp: Date.now()
        });
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

        // Validate ingredients
        const invalidIngredients = ingredients.filter(ing => !ing.name.trim() || ing.amount <= 0);
        if (invalidIngredients.length > 0) {
            this.showError(`Please check ${invalidIngredients.length} ingredient${invalidIngredients.length > 1 ? 's' : ''} with missing or invalid values`);
            return;
        }

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
        lookupBtn.disabled = true;

        try {
            // Create progress container
            const progressContainer = document.createElement('div');
            progressContainer.className = 'lookup-progress mt-2';
            lookupBtn.parentNode.insertBefore(progressContainer, lookupBtn.nextSibling);

            for (let i = 0; i < ingredients.length; i++) {
                const ingredient = ingredients[i];
                // Update progress
                progressContainer.innerHTML = `Looking up ${i + 1} of ${ingredients.length}: ${ingredient.name}`;
                
                const nutrition = await this.lookupNutrition(ingredient.name, ingredient.amount, ingredient.unit);
                if (nutrition) {
                    for (const [key, value] of Object.entries(nutrition)) {
                        totalNutrition[key] += value;
                    }
                } else {
                    logWarn(`No nutrition data found for ${ingredient.name}`);
                }
            }

            // Adjust for servings
            for (const key of Object.keys(totalNutrition)) {
                totalNutrition[key] = key === 'calories' 
                    ? Math.round(totalNutrition[key] / servings)
                    : +(totalNutrition[key] / servings).toFixed(1);
            }

            this.applyNutritionToForm(totalNutrition);
            
            // Show success message
            progressContainer.innerHTML = '<div class="text-success"><i class="fas fa-check-circle"></i> Nutrition lookup complete</div>';
            setTimeout(() => progressContainer.remove(), 3000);
        } catch (error) {
            logError('Error looking up full meal nutrition:', error);
            this.showError('Error looking up nutrition. Please try again.');
        } finally {
            lookupBtn.innerHTML = originalText;
            lookupBtn.disabled = false;
        }
    }

    removePopup() {
        const existing = document.querySelector('.nutrition-lookup-popup');
        if (existing) {
            existing.remove();
        }
    }
}

export default NutritionLookup; 