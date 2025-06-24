/**
 * Comprehensive Food Database
 * 
 * Contains detailed nutritional information for common foods organized by categories.
 * Each food item includes calories, macronutrients (protein, carbs, fat), and additional
 * nutritional details like fiber, sugar, sodium, etc.
 */

// Food Database Service
import { UsdaAPI } from './usda-api.js';
import dataManager from './data-manager.js';
import { FoodTypeUtils } from './food-type-utils.js';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

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
        
        this.foodTypeUtils = new FoodTypeUtils();
        
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
            console.log('Food database service initialized');
        } catch (error) {
            console.error('Failed to initialize food database service:', error);
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
            console.error('Error searching foods:', error);
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
            console.error(`Error getting food details for ${foodId}:`, error);
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
            console.error('Error adding custom food:', error);
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
            console.error(`Error updating custom food ${foodId}:`, error);
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
            console.error(`Error deleting custom food ${foodId}:`, error);
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
            console.error(`Error adding food ${foodId} to favorites:`, error);
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
            console.error(`Error removing food ${foodId} from favorites:`, error);
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
            console.error(`Error tracking food usage for ${foodId}:`, error);
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
                    console.warn(`Could not retrieve recently used food ${foodId}:`, err);
                }
            }
            
            return foodDetails;
        } catch (error) {
            console.error('Error getting recently used foods:', error);
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
                    console.warn(`Could not retrieve favorite food ${foodId}:`, err);
                }
            }
            
            return foodDetails;
        } catch (error) {
            console.error('Error getting favorite foods:', error);
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
            console.error('Error getting suggested foods:', error);
            return [];
        }
    }
    
    // Get common foods for meal type (sample implementation)
    getCommonFoodsForMealType(mealType) {
        return this.foodTypeUtils.getCommonFoodsForMealType(mealType);
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

    async addFood(foodData) {
        try {
            // Use FoodTypeUtils to determine food type
            const foodType = this.foodTypeUtils.findFoodType(foodData.name);
            const foodWithType = {
                ...foodData,
                type: foodType || 'other'
            };

            const docRef = await addDoc(collection(this.db, 'foods'), foodWithType);
            return docRef.id;
        } catch (error) {
            console.error('Error adding food:', error);
            throw error;
        }
    }

    async getFoodsByType(type) {
        try {
            const q = query(
                collection(this.db, 'foods'),
                where('type', '==', type)
            );
            
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting foods by type:', error);
            return [];
        }
    }

    async getCommonFoodsForMealType(mealType) {
        return this.foodTypeUtils.getCommonFoodsForMealType(mealType);
    }
}

// Create and export singleton instance
const foodDatabase = new FoodDatabaseService();
export default foodDatabase; 