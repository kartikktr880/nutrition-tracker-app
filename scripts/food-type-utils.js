// Food Type Utilities
// This module consolidates food type related functions from across the codebase

export class FoodTypeUtils {
    constructor() {
        this.foodTypes = {
            // Main categories with enhanced subcategories
            grains: {
                rice: ['white rice', 'brown rice', 'wild rice', 'basmati', 'jasmine'],
                pasta: ['spaghetti', 'penne', 'fettuccine', 'macaroni', 'lasagna'],
                bread: ['white bread', 'whole wheat', 'sourdough', 'rye', 'pita'],
                cereal: ['oats', 'corn flakes', 'bran flakes', 'granola', 'muesli'],
                other: ['quinoa', 'barley', 'couscous', 'bulgur', 'polenta']
            },
            proteins: {
                meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb'],
                fish: ['salmon', 'tuna', 'cod', 'tilapia', 'trout'],
                plant: ['tofu', 'tempeh', 'seitan', 'legumes', 'beans'],
                eggs: ['chicken eggs', 'quail eggs', 'duck eggs'],
                dairy: ['milk', 'cheese', 'yogurt', 'cottage cheese']
            },
            vegetables: {
                leafy: ['lettuce', 'spinach', 'kale', 'arugula', 'cabbage'],
                root: ['carrot', 'potato', 'sweet potato', 'beet', 'turnip'],
                cruciferous: ['broccoli', 'cauliflower', 'brussels sprouts'],
                nightshade: ['tomato', 'eggplant', 'bell pepper', 'potato'],
                other: ['cucumber', 'zucchini', 'asparagus', 'green beans']
            },
            fruits: {
                citrus: ['orange', 'lemon', 'lime', 'grapefruit', 'tangerine'],
                berries: ['strawberry', 'blueberry', 'raspberry', 'blackberry'],
                tropical: ['banana', 'mango', 'pineapple', 'papaya', 'kiwi'],
                stone: ['apple', 'pear', 'peach', 'plum', 'cherry'],
                melons: ['watermelon', 'cantaloupe', 'honeydew']
            },
            dairy: {
                milk: ['whole milk', 'skim milk', 'almond milk', 'soy milk'],
                cheese: ['cheddar', 'mozzarella', 'feta', 'parmesan', 'brie'],
                yogurt: ['greek yogurt', 'regular yogurt', 'plant-based yogurt'],
                other: ['butter', 'cream', 'sour cream', 'cottage cheese']
            },
            nuts: {
                tree: ['almond', 'walnut', 'cashew', 'pecan', 'pistachio'],
                seeds: ['sunflower', 'pumpkin', 'chia', 'flax', 'sesame'],
                legumes: ['peanut', 'soybean', 'lentil', 'chickpea']
            },
            fats: {
                oils: ['olive oil', 'vegetable oil', 'coconut oil', 'avocado oil'],
                spreads: ['butter', 'margarine', 'nut butter', 'hummus'],
                other: ['avocado', 'olives', 'coconut']
            },
            beverages: {
                hot: ['coffee', 'tea', 'hot chocolate', 'herbal tea'],
                cold: ['water', 'juice', 'smoothie', 'soda', 'milk'],
                other: ['sports drink', 'energy drink', 'alcohol']
            }
        };

        // Enhanced type cache with better error handling
        this.typeCache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.maxCacheSize = 1000; // Prevent memory issues

        this.commonPortions = {
            // Volume measurements
            cup: { ml: 240, oz: 8 },
            tablespoon: { ml: 15, oz: 0.5 },
            teaspoon: { ml: 5, oz: 0.17 },
            
            // Weight measurements
            gram: { g: 1, oz: 0.035 },
            ounce: { g: 28.35, oz: 1 },
            pound: { g: 453.6, oz: 16 },

            // Common food portions with enhanced descriptions
            serving: {
                grains: {
                    cooked: { g: 150, description: "¾ cup cooked", visual: "tennis ball" },
                    raw: { g: 100, description: "½ cup raw", visual: "large egg" }
                },
                proteins: {
                    cooked: { g: 85, description: "size of a deck of cards", visual: "deck of cards" },
                    raw: { g: 115, description: "size of a smartphone", visual: "smartphone" }
                },
                vegetables: {
                    raw: { g: 85, description: "1 cup raw leafy or ½ cup others", visual: "baseball" },
                    cooked: { g: 100, description: "½ cup cooked", visual: "tennis ball" }
                },
                fruits: {
                    whole: { g: 120, description: "1 medium piece", visual: "tennis ball" },
                    chopped: { g: 100, description: "½ cup chopped", visual: "tennis ball" }
                },
                dairy: {
                    cheese: { g: 30, description: "size of 4 stacked dice", visual: "4 dice" },
                    yogurt: { g: 170, description: "¾ cup", visual: "tennis ball" }
                },
                nuts: {
                    raw: { g: 30, description: "small handful", visual: "ping pong ball" },
                    roasted: { g: 30, description: "small handful", visual: "ping pong ball" }
                }
            }
        };

        this.visualReferences = {
            "1 cup": "baseball",
            "¾ cup": "tennis ball",
            "½ cup": "tennis ball",
            "¼ cup": "large egg",
            "2 tablespoons": "ping pong ball",
            "1 tablespoon": "thumb tip",
            "1 teaspoon": "fingertip",
            "3 ounces": "deck of cards",
            "2 ounces": "matchbox",
            "1 ounce": "four dice"
        };

        // Enhanced common foods database with nutrition information
        this.commonFoods = {
            grains: {
                rice: { 
                    nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
                    portion: { cooked: { g: 150, description: "¾ cup cooked", visual: "tennis ball" } }
                },
                pasta: { 
                    nutrition: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, sugar: 0.6 },
                    portion: { cooked: { g: 125, description: "1 cup cooked", visual: "tennis ball" } }
                },
                bread: { 
                    nutrition: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5.1 },
                    portion: { raw: { g: 30, description: "1 slice", visual: "deck of cards" } }
                }
            },
            proteins: {
                chicken_breast: { 
                    nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
                    portion: { cooked: { g: 85, description: "size of a deck of cards", visual: "deck of cards" } }
                },
                salmon: { 
                    nutrition: { calories: 208, protein: 22, carbs: 0, fat: 13, fiber: 0, sugar: 0 },
                    portion: { cooked: { g: 85, description: "size of a deck of cards", visual: "deck of cards" } }
                }
            },
            vegetables: {
                carrot: { 
                    nutrition: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7 },
                    portion: { raw: { g: 85, description: "1 cup raw", visual: "baseball" } }
                },
                broccoli: { 
                    nutrition: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7 },
                    portion: { raw: { g: 85, description: "1 cup raw", visual: "baseball" } }
                }
            }
        };
    }

    /**
     * Placeholder for future DOM-dependent initialization.
     */
    init() {
        // No window/document code needed yet
    }

    /**
     * Find the food type based on ingredient name with enhanced matching
     * @param {string} ingredientName - The name of the ingredient
     * @returns {Object|null} The food type information or null if not found
     */
    findFoodType(ingredientName) {
        if (!ingredientName || typeof ingredientName !== 'string') {
            console.warn('Invalid ingredient name provided to findFoodType');
            return null;
        }

        // Check cache first
        const cached = this.typeCache.get(ingredientName);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.type;
        }

        const normalizedName = ingredientName.toLowerCase().trim();
        
        // Enhanced matching with subcategories
        for (const [mainCategory, subcategories] of Object.entries(this.foodTypes)) {
            for (const [subcategory, items] of Object.entries(subcategories)) {
                if (items.some(item => normalizedName.includes(item))) {
                    const result = {
                        mainCategory,
                        subcategory,
                        confidence: 'high'
                    };
                    this.cacheResult(ingredientName, result);
                    return result;
                }
            }
        }

        // Fallback to partial matching
        for (const [mainCategory, subcategories] of Object.entries(this.foodTypes)) {
            for (const [subcategory, items] of Object.entries(subcategories)) {
                if (items.some(item => item.includes(normalizedName) || normalizedName.includes(item))) {
                    const result = {
                        mainCategory,
                        subcategory,
                        confidence: 'low'
                    };
                    this.cacheResult(ingredientName, result);
                    return result;
                }
            }
        }

        // If no match found, cache null result
        this.cacheResult(ingredientName, null);
        return null;
    }

    /**
     * Cache the result of a food type lookup with size management
     * @param {string} ingredientName - The name of the ingredient
     * @param {Object|null} type - The food type information or null
     */
    cacheResult(ingredientName, type) {
        // Manage cache size
        if (this.typeCache.size >= this.maxCacheSize) {
            const oldestKey = Array.from(this.typeCache.keys())[0];
            this.typeCache.delete(oldestKey);
        }

        this.typeCache.set(ingredientName, {
            type,
            timestamp: Date.now()
        });
    }

    /**
     * Get common portion information for a food type with enhanced details
     * @param {string} foodType - The type of food
     * @param {string} [state='cooked'] - The state of the food (raw/cooked)
     * @returns {Object|null} The portion information or null if not found
     */
    getCommonPortion(foodType, state = 'cooked') {
        const portion = this.commonPortions.serving[foodType];
        if (!portion) return null;
        
        return portion[state] || portion.cooked || null;
    }

    /**
     * Get visual reference for a portion size
     * @param {string} portion - The portion size (e.g., "1 cup", "2 tablespoons")
     * @returns {string|null} The visual reference or null if not found
     */
    getVisualReference(portion) {
        return this.visualReferences[portion] || null;
    }

    /**
     * Calculate nutrition values based on portion size
     * @param {Object} nutrition - Base nutrition values per 100g
     * @param {number} amount - Amount of food
     * @param {string} unit - Unit of measurement
     * @returns {Object} Adjusted nutrition values
     * @throws {Error} If nutrition data is invalid or unit is not supported
     */
    calculateNutritionForPortion(nutrition, amount, unit) {
        // Validate nutrition data
        if (!nutrition || typeof nutrition !== 'object') {
            throw new Error('Invalid nutrition data provided');
        }

        // Validate amount
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            throw new Error('Invalid amount provided');
        }

        const baseAmount = 100; // Base nutrition values are per 100g
        let factor = amount / baseAmount;

        // Convert common units to grams
        if (unit !== 'g') {
            const conversions = {
                oz: 28.35,
                lb: 453.6,
                kg: 1000,
                cup: 240,
                tbsp: 15,
                tsp: 5,
                ml: 1
            };

            if (!conversions[unit]) {
                throw new Error(`Unsupported unit: ${unit}`);
            }

            factor = (amount * conversions[unit]) / baseAmount;
        }

        // Calculate and validate each nutrient
        const result = {};
        for (const [key, value] of Object.entries(nutrition)) {
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`Invalid nutrition value for ${key}`);
            }
            result[key] = key === 'calories' 
                ? Math.round(value * factor)
                : +(value * factor).toFixed(1);
        }

        return result;
    }

    /**
     * Get common foods for a meal type
     * @param {string} mealType - The type of meal (breakfast, lunch, dinner, snacks)
     * @returns {Array} Array of common foods for the meal type
     */
    getCommonFoodsForMealType(mealType) {
        const commonFoods = {
            breakfast: [
                { id: 'sample-oatmeal', name: 'Oatmeal', calories: 150, protein: 6, carbs: 27, fat: 2.5 },
                { id: 'sample-eggs', name: 'Eggs', calories: 140, protein: 12, carbs: 0, fat: 10 },
                { id: 'sample-yogurt', name: 'Greek Yogurt', calories: 120, protein: 15, carbs: 8, fat: 0 }
            ],
            lunch: [
                { id: 'sample-sandwich', name: 'Turkey Sandwich', calories: 350, protein: 20, carbs: 40, fat: 10 },
                { id: 'sample-salad', name: 'Chicken Salad', calories: 300, protein: 25, carbs: 15, fat: 12 }
            ],
            dinner: [
                { id: 'sample-salmon', name: 'Salmon', calories: 280, protein: 30, carbs: 0, fat: 15 },
                { id: 'sample-chicken', name: 'Grilled Chicken', calories: 250, protein: 35, carbs: 0, fat: 10 }
            ],
            snacks: [
                { id: 'sample-apple', name: 'Apple', calories: 80, protein: 0, carbs: 20, fat: 0 },
                { id: 'sample-nuts', name: 'Mixed Nuts', calories: 170, protein: 5, carbs: 6, fat: 14 }
            ]
        };
        
        return commonFoods[mealType] || [];
    }

    /**
     * Generate helper content for portion selection
     * @param {string} ingredientName - The name of the ingredient
     * @returns {string} HTML content for the helper
     */
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

    /**
     * Get nutrition information for a food item
     * @param {string} ingredientName - The name of the ingredient
     * @param {number} amount - The amount of the ingredient
     * @param {string} unit - The unit of measurement
     * @returns {Object|null} Nutrition information or null if not found
     */
    getNutritionInfo(ingredientName, amount = 100, unit = 'g') {
        if (!ingredientName) {
            console.error('Invalid ingredient name provided');
            return null;
        }

        const foodType = this.findFoodType(ingredientName);
        if (!foodType) {
            return null;
        }

        const { mainCategory, subcategory } = foodType;
        if (!this.commonFoods[mainCategory] || !this.commonFoods[mainCategory][subcategory]) {
            return null;
        }

        // Find the best matching food item
        const foodItems = this.commonFoods[mainCategory][subcategory];
        let bestMatch = null;
        let bestMatchScore = 0;

        for (const [food, info] of Object.entries(foodItems)) {
            const foodName = food.replace('_', ' ');
            const score = this.calculateMatchScore(ingredientName, foodName);
            if (score > bestMatchScore) {
                bestMatchScore = score;
                bestMatch = { food, info };
            }
        }

        if (!bestMatch) {
            return null;
        }

        // Calculate nutrition based on amount and unit
        const baseNutrition = bestMatch.info.nutrition;
        const portionInfo = bestMatch.info.portion;
        
        // Convert amount to grams if needed
        let amountInGrams = amount;
        if (unit !== 'g') {
            const multiplier = this.getUnitMultiplier(unit, portionInfo);
            if (multiplier === null) {
                console.error(`Unsupported unit: ${unit}`);
                return null;
            }
            amountInGrams = amount * multiplier;
        }

        // Calculate nutrition values
        const ratio = amountInGrams / 100; // Base nutrition is per 100g
        return {
            calories: Math.round(baseNutrition.calories * ratio),
            protein: Math.round(baseNutrition.protein * ratio * 10) / 10,
            carbs: Math.round(baseNutrition.carbs * ratio * 10) / 10,
            fat: Math.round(baseNutrition.fat * ratio * 10) / 10,
            fiber: Math.round(baseNutrition.fiber * ratio * 10) / 10,
            sugar: Math.round(baseNutrition.sugar * ratio * 10) / 10,
            portion: {
                amount: amount,
                unit: unit,
                description: portionInfo.description,
                visualReference: portionInfo.visualReference
            }
        };
    }

    calculateMatchScore(ingredientName, foodName) {
        const ingredient = ingredientName.toLowerCase();
        const food = foodName.toLowerCase();
        
        // Exact match
        if (ingredient === food) return 1.0;
        
        // Contains match
        if (ingredient.includes(food) || food.includes(ingredient)) return 0.8;
        
        // Word match
        const ingredientWords = ingredient.split(/\s+/);
        const foodWords = food.split(/\s+/);
        const matchingWords = ingredientWords.filter(word => foodWords.includes(word));
        return matchingWords.length / Math.max(ingredientWords.length, foodWords.length);
    }

    getUnitMultiplier(unit, portionInfo) {
        const unitMap = {
            'g': 1,
            'kg': 1000,
            'oz': 28.35,
            'lb': 453.59,
            'ml': 1,
            'l': 1000,
            'cup': 236.59,
            'tbsp': 14.79,
            'tsp': 4.93,
            'piece': portionInfo.pieceWeight || 100,
            'slice': portionInfo.sliceWeight || 30,
            'serving': portionInfo.servingWeight || 100
        };
        
        return unitMap[unit.toLowerCase()] || null;
    }
} 