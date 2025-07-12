import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Food Database Service
import { UsdaAPI } from './usda-api.js';
import dataManager from './data-manager.js';

class FoodDatabaseService {
    constructor() {
        this.cache = {
            searches: new Map(), // Caches search results
            foods: new Map(),    // Caches individual food items
            customFoods: []      // Local custom foods
        };
        this.expireDuration = 24 * 60 * 60 * 1000; // 24 hours
        this.lastSyncTimestamp = 0;
        this.syncInterval = 30 * 60 * 1000; // 30 minutes
        this.initialized = false;
        this.recentlyUsed = [];  // Track recently used foods for suggestions
        this.maxRecentlyUsed = 10;
        this.favoritesList = []; // User's favorite foods
        this.apiEndpoint = 'https://api.nutrition-tracker.com/foods';
        this.barcodeCache = new Map();
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Load custom foods from IndexedDB
            const result = await dataManager.getCustomFoods();
            if (result.success) {
                this.cache.customFoods = result.data;
            }
            
            // Load favorites
            const favoritesResult = await dataManager.getFavorites();
            if (favoritesResult.success) {
                this.favoritesList = favoritesResult.data;
            }
            
            // Load recently used foods
            const recentResult = await dataManager.getPreferences();
            if (recentResult.success && recentResult.data.recentlyUsedFoods) {
                this.recentlyUsed = recentResult.data.recentlyUsedFoods;
            }
            
            this.initialized = true;
            logInfo('Food database service initialized');
        } catch (error) {
            logError('Failed to initialize food database service:', error);
        }
    }
    
    // Search for foods combining USDA API and custom foods
    async searchFoods(query, options = {}) {
        if (!query) return { foods: [], totalHits: 0 };
        
        // Default options
        const defaultOptions = {
            includeCustom: true,
            includeUsda: true,
            pageSize: 50,
            sortBy: 'relevance',
            filters: {}
        };
        
        const searchOptions = { ...defaultOptions, ...options };
        
        // Check cache first
        const cacheKey = `${query}-${JSON.stringify(searchOptions)}`;
        const cachedResult = this.getCachedSearch(cacheKey);
        if (cachedResult) return cachedResult;
        
        try {
            let foods = [];
            let totalHits = 0;
            
            // Get custom foods
            if (searchOptions.includeCustom) {
                const customFoods = this.filterCustomFoods(query, searchOptions.filters);
                foods = [...customFoods];
            }
            
            // Get USDA foods
            if (searchOptions.includeUsda) {
                const usdaResult = await UsdaAPI.searchFoods(query, searchOptions.pageSize);
                foods = [...foods, ...usdaResult.foods];
                totalHits = usdaResult.totalHits;
            }
            
            // Apply sorting
            foods = this.sortFoods(foods, searchOptions.sortBy);
            
            // Cache the results
            const result = { foods, totalHits: totalHits + (searchOptions.includeCustom ? this.cache.customFoods.length : 0) };
            this.cacheSearchResult(cacheKey, result);
            
            return result;
        } catch (error) {
            logError('Error searching foods:', error);
            // On error, return custom foods only to ensure some results
            if (searchOptions.includeCustom) {
                return { 
                    foods: this.filterCustomFoods(query, searchOptions.filters),
                    totalHits: this.cache.customFoods.length,
                    error: error.message
                };
            }
            return { foods: [], totalHits: 0, error: error.message };
        }
    }
    
    // Get food details by ID (custom or USDA)
    async getFoodDetails(foodId) {
        // Check cache first
        const cachedFood = this.cache.foods.get(foodId);
        if (cachedFood) return cachedFood;
        
        try {
            // Check if it's a custom food
            if (foodId.startsWith('custom-')) {
                const customFood = this.cache.customFoods.find(f => f.id === foodId);
                if (customFood) {
                    this.cache.foods.set(foodId, customFood);
                    return customFood;
                }
                throw new Error('Custom food not found');
            }
            
            // Get from USDA API
            if (foodId.startsWith('usda-')) {
                const fdcId = foodId.replace('usda-', '');
                const food = await UsdaAPI.getFoodDetails(fdcId);
                this.cache.foods.set(foodId, food);
                return food;
            }
            
            throw new Error('Invalid food ID format');
        } catch (error) {
            logError(`Error getting food details for ${foodId}:`, error);
            throw error;
        }
    }
    
    // Add custom food to the database
    async addCustomFood(foodData) {
        try {
            const newFood = {
                id: `custom-${Date.now()}`,
                source: 'custom',
                ...foodData,
                createdAt: new Date().toISOString()
            };
            
            // Add to local cache
            this.cache.customFoods.push(newFood);
            
            // Save to database
            await dataManager.addCustomFood(newFood);
            
            // Clear search cache since we've added a new food
            this.clearSearchCache();
            
            return newFood;
        } catch (error) {
            logError('Error adding custom food:', error);
            throw error;
        }
    }
    
    // Update existing custom food
    async updateCustomFood(foodId, updatedData) {
        try {
            if (!foodId.startsWith('custom-')) {
                throw new Error('Can only update custom foods');
            }
            
            // Update in cache
            const index = this.cache.customFoods.findIndex(f => f.id === foodId);
            if (index === -1) {
                throw new Error('Custom food not found');
            }
            
            const updatedFood = {
                ...this.cache.customFoods[index],
                ...updatedData,
                updatedAt: new Date().toISOString()
            };
            
            this.cache.customFoods[index] = updatedFood;
            this.cache.foods.set(foodId, updatedFood);
            
            // Update in database
            await dataManager.updateCustomFood(updatedFood);
            
            // Clear search cache
            this.clearSearchCache();
            
            return updatedFood;
        } catch (error) {
            logError(`Error updating custom food ${foodId}:`, error);
            throw error;
        }
    }
    
    // Delete custom food
    async deleteCustomFood(foodId) {
        try {
            if (!foodId.startsWith('custom-')) {
                throw new Error('Can only delete custom foods');
            }
            
            // Remove from cache
            this.cache.customFoods = this.cache.customFoods.filter(f => f.id !== foodId);
            this.cache.foods.delete(foodId);
            
            // Remove from database
            await dataManager.deleteCustomFood(foodId);
            
            // Clear search cache
            this.clearSearchCache();
            
            return true;
        } catch (error) {
            logError(`Error deleting custom food ${foodId}:`, error);
            throw error;
        }
    }
    
    // Add food to favorites
    async addToFavorites(foodId) {
        try {
            if (this.favoritesList.includes(foodId)) {
                return true; // Already in favorites
            }
            
            this.favoritesList.push(foodId);
            await dataManager.saveFavorites(this.favoritesList);
            return true;
        } catch (error) {
            logError(`Error adding food ${foodId} to favorites:`, error);
            throw error;
        }
    }
    
    // Remove food from favorites
    async removeFromFavorites(foodId) {
        try {
            this.favoritesList = this.favoritesList.filter(id => id !== foodId);
            await dataManager.saveFavorites(this.favoritesList);
            return true;
        } catch (error) {
            logError(`Error removing food ${foodId} from favorites:`, error);
            throw error;
        }
    }
    
    // Track food as recently used
    async trackFoodUsage(foodId) {
        try {
            // Remove if already in list
            this.recentlyUsed = this.recentlyUsed.filter(id => id !== foodId);
            
            // Add to front of list
            this.recentlyUsed.unshift(foodId);
            
            // Keep list at max size
            if (this.recentlyUsed.length > this.maxRecentlyUsed) {
                this.recentlyUsed = this.recentlyUsed.slice(0, this.maxRecentlyUsed);
            }
            
            // Save to preferences
            const preferences = {
                recentlyUsedFoods: this.recentlyUsed
            };
            await dataManager.savePreferences(preferences);
            
            return true;
        } catch (error) {
            logError(`Error tracking food usage for ${foodId}:`, error);
            return false;
        }
    }
    
    // Get recently used foods with details
    async getRecentlyUsedFoods() {
        try {
            const foodDetails = [];
            
            for (const foodId of this.recentlyUsed) {
                try {
                    const food = await this.getFoodDetails(foodId);
                    foodDetails.push(food);
                } catch (err) {
                    logWarn(`Could not retrieve recently used food ${foodId}:`, err);
                }
            }
            
            return foodDetails;
        } catch (error) {
            logError('Error getting recently used foods:', error);
            return [];
        }
    }
    
    // Get favorite foods with details
    async getFavoriteFoods() {
        try {
            const foodDetails = [];
            
            for (const foodId of this.favoritesList) {
                try {
                    const food = await this.getFoodDetails(foodId);
                    foodDetails.push(food);
                } catch (err) {
                    logWarn(`Could not retrieve favorite food ${foodId}:`, err);
                }
            }
            
            return foodDetails;
        } catch (error) {
            logError('Error getting favorite foods:', error);
            return [];
        }
    }
    
    // Get suggested foods based on current time, preferences, and goals
    async getSuggestedFoods(mealType = null) {
        try {
            const currentHour = new Date().getHours();
            
            // Determine meal type if not provided
            if (!mealType) {
                if (currentHour >= 5 && currentHour < 11) {
                    mealType = 'breakfast';
                } else if (currentHour >= 11 && currentHour < 15) {
                    mealType = 'lunch';
                } else if (currentHour >= 15 && currentHour < 22) {
                    mealType = 'dinner';
                } else {
                    mealType = 'snacks';
                }
            }
            
            // Get user preferences and goals from data manager
            const prefsResult = await dataManager.getPreferences();
            const goalsResult = await dataManager.getGoals();
            
            const preferences = prefsResult.success ? prefsResult.data : {};
            const goals = goalsResult.success ? goalsResult.data : [];
            
            // Get recently used and favorites
            const recentFoods = await this.getRecentlyUsedFoods();
            const favorites = await this.getFavoriteFoods();
            
            // Choose 8-10 suggestions based on:
            // 1. Recently used for this meal type
            // 2. Favorites
            // 3. Foods that match user's protein/carb goals
            // 4. Common foods for this meal type
            const suggestions = [];
            
            // Add 2-3 recent foods for this meal type
            const recentForMealType = recentFoods.filter(food => 
                preferences.mealPatterns && 
                preferences.mealPatterns[food.id] === mealType
            ).slice(0, 3);
            
            suggestions.push(...recentForMealType);
            
            // Add 2-3 favorites not already included
            const favoritesNotIncluded = favorites.filter(
                food => !suggestions.some(s => s.id === food.id)
            ).slice(0, 3);
            
            suggestions.push(...favoritesNotIncluded);
            
            // If we need more, add common foods for this meal type
            if (suggestions.length < 8) {
                // This would be populated with common foods for each meal type
                // For now using sample foods
                const commonFoods = this.getCommonFoodsForMealType(mealType);
                const remainingCount = 8 - suggestions.length;
                
                // Filter out any already included
                const commonNotIncluded = commonFoods.filter(
                    food => !suggestions.some(s => s.id === food.id)
                ).slice(0, remainingCount);
                
                suggestions.push(...commonNotIncluded);
            }
            
            return suggestions;
        } catch (error) {
            logError('Error getting suggested foods:', error);
            return [];
        }
    }
    
    // Get common foods for meal type (sample implementation)
    getCommonFoodsForMealType(mealType) {
        // This would ideally be populated from a database of common foods
        // or from aggregated user data. For now, using sample data.
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
    
    // Helper methods for caching
    getCachedSearch(key) {
        const cacheItem = this.cache.searches.get(key);
        if (!cacheItem) return null;
        
        // Check if expired
        if (Date.now() - cacheItem.timestamp > this.expireDuration) {
            this.cache.searches.delete(key);
            return null;
        }
        
        return cacheItem.data;
    }
    
    cacheSearchResult(key, data) {
        this.cache.searches.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearSearchCache() {
        this.cache.searches.clear();
    }
    
    // Helper method to filter custom foods
    filterCustomFoods(query, filters) {
        query = query.toLowerCase();
        
        return this.cache.customFoods.filter(food => {
            // Name match
            const nameMatch = food.name.toLowerCase().includes(query);
            if (!nameMatch) return false;
            
            // Apply filters
            for (const [key, value] of Object.entries(filters)) {
                if (key === 'category' && value && food.category !== value) {
                    return false;
                }
                
                if (key === 'maxCalories' && value && food.calories > value) {
                    return false;
                }
                
                if (key === 'minProtein' && value && food.protein < value) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    // Helper method to sort foods
    sortFoods(foods, sortBy) {
        if (sortBy === 'calorie') {
            return [...foods].sort((a, b) => a.calories - b.calories);
        } else if (sortBy === 'protein') {
            return [...foods].sort((a, b) => b.protein - a.protein);
        } else if (sortBy === 'mostUsed') {
            return [...foods].sort((a, b) => {
                const aIndex = this.recentlyUsed.indexOf(a.id);
                const bIndex = this.recentlyUsed.indexOf(b.id);
                
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                
                return aIndex - bIndex;
            });
        }
        
        // Default: sort by relevance (no sorting, keep API order)
        return foods;
    }
    
    /**
     * Look up a food item by barcode
     * @param {string} barcode - The barcode to look up
     * @returns {Promise<Object|null>} - The found food or null
     */
    async lookupBarcode(barcode) {
        try {
            logInfo(`Looking up barcode: ${barcode}`);
            
            // First check if the barcode is in our local cache
            const cachedItem = await this.getBarcodeFromCache(barcode);
            if (cachedItem) {
                logInfo('Found barcode in cache:', cachedItem);
                return cachedItem;
            }
            
            // Simulate loading delay for demo purposes
            await this.simulateNetworkDelay();
            
            // For demo purposes, we'll create some sample barcode data
            // In a real app, this would be an API call to a food database
            const sampleBarcodes = {
                // Common food item barcodes
                '737628064502': { // Nature Valley Granola Bars
                    id: 'bc_737628064502',
                    name: 'Nature Valley Crunchy Granola Bars',
                    brand: 'Nature Valley',
                    serving_size: '42g (2 bars)',
                    calories: 190,
                    protein: 4,
                    carbs: 29,
                    fat: 6,
                    fiber: 2,
                    sugar: 11,
                    category: 'Snacks',
                    barcode: '737628064502',
                    image: 'https://m.media-amazon.com/images/I/81TdJl1E3lL.jpg'
                },
                '021130126026': { // Cheerios
                    id: 'bc_021130126026',
                    name: 'Cheerios Original Cereal',
                    brand: 'General Mills',
                    serving_size: '28g (1 cup)',
                    calories: 100,
                    protein: 3,
                    carbs: 20,
                    fat: 2,
                    fiber: 3,
                    sugar: 1,
                    category: 'Breakfast',
                    barcode: '021130126026',
                    image: 'https://m.media-amazon.com/images/I/91pxgB-6lSL.jpg'
                },
                '021000026487': { // Coca-Cola
                    id: 'bc_021000026487',
                    name: 'Coca-Cola Classic',
                    brand: 'Coca-Cola',
                    serving_size: '355ml (12 fl oz)',
                    calories: 140,
                    protein: 0,
                    carbs: 39,
                    fat: 0,
                    fiber: 0,
                    sugar: 39,
                    category: 'Beverages',
                    barcode: '021000026487',
                    image: 'https://m.media-amazon.com/images/I/71h3XBwsQlL.jpg'
                },
                '011110038364': { // Peanut Butter
                    id: 'bc_011110038364',
                    name: 'Jif Creamy Peanut Butter',
                    brand: 'Jif',
                    serving_size: '32g (2 tbsp)',
                    calories: 190,
                    protein: 7,
                    carbs: 8,
                    fat: 16,
                    fiber: 2,
                    sugar: 3,
                    category: 'Spreads',
                    barcode: '011110038364',
                    image: 'https://m.media-amazon.com/images/I/81vMcxYQSNL.jpg'
                },
                '052000324631': { // Doritos
                    id: 'bc_052000324631',
                    name: 'Doritos Nacho Cheese Flavored Tortilla Chips',
                    brand: 'Doritos',
                    serving_size: '28g (about 12 chips)',
                    calories: 150,
                    protein: 2,
                    carbs: 18,
                    fat: 8,
                    fiber: 1,
                    sugar: 1,
                    category: 'Snacks',
                    barcode: '052000324631',
                    image: 'https://m.media-amazon.com/images/I/71MJXCjvCaL.jpg'
                },
                '028400090834': { // Lay's Potato Chips
                    id: 'bc_028400090834',
                    name: 'Lay\'s Classic Potato Chips',
                    brand: 'Lay\'s',
                    serving_size: '28g (about 15 chips)',
                    calories: 160,
                    protein: 2,
                    carbs: 15,
                    fat: 10,
                    fiber: 1,
                    sugar: 1,
                    category: 'Snacks',
                    barcode: '028400090834',
                    image: 'https://m.media-amazon.com/images/I/81hHh0UFyoL.jpg'
                },
                '038000138416': { // Rice Krispies
                    id: 'bc_038000138416',
                    name: 'Kellogg\'s Rice Krispies Cereal',
                    brand: 'Kellogg\'s',
                    serving_size: '33g (1.25 cups)',
                    calories: 130,
                    protein: 2,
                    carbs: 29,
                    fat: 0,
                    fiber: 0,
                    sugar: 4,
                    category: 'Breakfast',
                    barcode: '038000138416',
                    image: 'https://m.media-amazon.com/images/I/91OKUP-yK-L.jpg'
                },
                '051500241288': { // Dasani Water
                    id: 'bc_051500241288',
                    name: 'Dasani Purified Water',
                    brand: 'Dasani',
                    serving_size: '500ml (16.9 fl oz)',
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    sugar: 0,
                    category: 'Beverages',
                    barcode: '051500241288',
                    image: 'https://m.media-amazon.com/images/I/61ewl-9aCFL.jpg'
                },
                '070847811169': { // Kind Bar
                    id: 'bc_070847811169',
                    name: 'KIND Bars, Dark Chocolate Nuts & Sea Salt',
                    brand: 'KIND',
                    serving_size: '40g (1 bar)',
                    calories: 180,
                    protein: 6,
                    carbs: 16,
                    fat: 15,
                    fiber: 7,
                    sugar: 5,
                    category: 'Snacks',
                    barcode: '070847811169',
                    image: 'https://m.media-amazon.com/images/I/71A+teI0wnL.jpg'
                },
                '013000006127': { // Tropicana Orange Juice
                    id: 'bc_013000006127',
                    name: 'Tropicana Pure Premium Original Orange Juice',
                    brand: 'Tropicana',
                    serving_size: '240ml (8 fl oz)',
                    calories: 110,
                    protein: 2,
                    carbs: 26,
                    fat: 0,
                    fiber: 0,
                    sugar: 22,
                    category: 'Beverages',
                    barcode: '013000006127',
                    image: 'https://m.media-amazon.com/images/I/71kFcbfmKVL.jpg'
                }
            };
            
            // Check if barcode is in our sample data
            if (barcode in sampleBarcodes) {
                const foodItem = sampleBarcodes[barcode];
                
                // Cache the result
                await this.cacheBarcodeResult(barcode, foodItem);
                
                return foodItem;
            }
            
            // If barcode wasn't found in sample data, attempt to fetch from Open Food Facts API
            // Note: This is a real food database API, but results may vary
            try {
                const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                const data = await response.json();
                
                // Check if product was found
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    
                    // Extract nutrition data
                    const nutriments = product.nutriments || {};
                    
                    // Create food item object
                    const foodItem = {
                        id: `bc_${barcode}`,
                        name: product.product_name || 'Unknown Product',
                        brand: product.brands || 'Unknown Brand',
                        serving_size: product.serving_size || '100g',
                        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal_serving'] || 0,
                        protein: nutriments.proteins_100g || nutriments.proteins_serving || 0,
                        carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates_serving || 0,
                        fat: nutriments.fat_100g || nutriments.fat_serving || 0,
                        fiber: nutriments.fiber_100g || nutriments.fiber_serving || 0,
                        sugar: nutriments.sugars_100g || nutriments.sugars_serving || 0,
                        category: product.categories_tags ? product.categories_tags[0].replace('en:', '') : 'Food',
                        barcode: barcode,
                        image: product.image_url || null
                    };
                    
                    // Cache the result
                    await this.cacheBarcodeResult(barcode, foodItem);
                    
                    return foodItem;
                }
            } catch (err) {
                logError('Error fetching from Open Food Facts API:', err);
            }
            
            // If we get here, the barcode wasn't found
            return null;
        } catch (error) {
            logError('Error looking up barcode:', error);
            return null;
        }
    }
    
    /**
     * Get a barcode from cache
     * @param {string} barcode - The barcode to retrieve
     * @returns {Promise<Object|null>} - The cached food or null
     */
    async getBarcodeFromCache(barcode) {
        try {
            // Try to get from local storage
            const cacheKey = `barcode_cache_${barcode}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            logError('Error getting barcode from cache:', error);
            return null;
        }
    }
    
    /**
     * Cache a barcode lookup result
     * @param {string} barcode - The barcode
     * @param {Object} food - The food data
     */
    async cacheBarcodeResult(barcode, food) {
        try {
            const cacheKey = `barcode_cache_${barcode}`;
            localStorage.setItem(cacheKey, JSON.stringify(food));
        } catch (error) {
            logError('Error caching barcode result:', error);
        }
    }
    
    // Simulate network delay for barcode lookup
    async simulateNetworkDelay() {
        // This is a placeholder implementation. In a real application,
        // you would use a more reliable method to simulate network delay.
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Create and export singleton instance
const foodDatabase = new FoodDatabaseService();
export default foodDatabase; 