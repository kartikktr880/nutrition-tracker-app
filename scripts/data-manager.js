import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Data Manager for Nutrition Tracker
class DataManager {
    constructor() {
        this.dbName = 'nutritionTrackerDB';
        this.dbVersion = 3; // Increased version for activities store
        this.initializeDB();
        
        // Add caching for frequently accessed data
        this.cache = {
            meals: new Map(),
            preferences: null,
            goals: null,
            lastCacheClean: Date.now()
        };
        
        // Cache TTL in milliseconds
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        
        // Setup cache cleanup interval
        setInterval(() => this.cleanCache(), 10 * 60 * 1000); // Every 10 minutes
    }

    async initializeDB() {
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                logError('Database error:', event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Create stores for different data types if they don't exist
                if (oldVersion < 1) {
                    // Original stores from version 1
                    if (!db.objectStoreNames.contains('meals')) {
                        const mealStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
                        mealStore.createIndex('date', 'date');
                        // Add indexes for better performance
                        mealStore.createIndex('timestamp', 'timestamp');
                        mealStore.createIndex('mealType', 'mealType');
                    }

                    if (!db.objectStoreNames.contains('goals')) {
                        db.createObjectStore('goals', { keyPath: 'type' });
                    }

                    if (!db.objectStoreNames.contains('userPreferences')) {
                        db.createObjectStore('userPreferences', { keyPath: 'id' });
                    }
                }
                
                // Add new stores for version 2
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains('customFoods')) {
                        const foodStore = db.createObjectStore('customFoods', { keyPath: 'id' });
                        foodStore.createIndex('name', 'name');
                        foodStore.createIndex('category', 'category');
                        // Add composite index for faster filtering
                        foodStore.createIndex('categoryName', ['category', 'name']);
                    }
                    
                    if (!db.objectStoreNames.contains('favorites')) {
                        db.createObjectStore('favorites', { keyPath: 'id' });
                    }
                }
                
                // Add new stores for version 3
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains('activities')) {
                        const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
                        activityStore.createIndex('date', 'date');
                        activityStore.createIndex('type', 'type');
                        // Add composite index for faster queries
                        activityStore.createIndex('dateType', ['date', 'type']);
                    }
                    
                    if (!db.objectStoreNames.contains('recipes')) {
                        const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' });
                        recipeStore.createIndex('name', 'name');
                    }
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                logInfo('Database initialized successfully');
            };
        } catch (error) {
            logError('Failed to initialize database:', error);
        }
    }

    // Meal Management
    async addMeal(mealData) {
        try {
            const store = this.getStore('meals', 'readwrite');
            const meal = {
                ...mealData,
                date: new Date(mealData.date || Date.now()).toISOString(),
                timestamp: Date.now()
            };
            const id = await store.add(meal);
            
            // Clear meal cache for this date
            const dateKey = meal.date.split('T')[0];
            this.cache.meals.delete(dateKey);
            
            return { success: true, id };
        } catch (error) {
            logError('Error adding meal:', error);
            return { success: false, error: error.message };
        }
    }

    async getMeals(startDate, endDate, options = {}) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            // Generate cache key based on date range
            const startDateStr = new Date(startDate).toISOString().split('T')[0];
            const endDateStr = new Date(endDate).toISOString().split('T')[0];
            const cacheKey = `${startDateStr}_${endDateStr}`;
            
            // Check if we have cached data
            if (this.cache.meals.has(cacheKey) && !options.bypassCache) {
                const cachedData = this.cache.meals.get(cacheKey);
                const cacheAge = Date.now() - cachedData.timestamp;
                
                // Return from cache if not expired
                if (cacheAge < this.cacheTTL) {
                    logInfo('Getting meals from cache');
                    
                    // Apply pagination if requested
                    if (options.pagination) {
                        const { page = 1, limit = 50 } = options.pagination;
                        const start = (page - 1) * limit;
                        const end = start + limit;
                        const paginatedData = cachedData.data.slice(start, end);
                        
                        return { 
                            success: true, 
                            data: paginatedData,
                            meta: {
                                total: cachedData.data.length,
                                page: page,
                                limit: limit,
                                pages: Math.ceil(cachedData.data.length / limit)
                            }
                        };
                    }
                    
                    return cachedData.data.length > 0 
                        ? { success: true, data: cachedData.data } 
                        : { success: true, data: [] };
                }
            }
            
            const store = this.getStore('meals', 'readonly');
            const index = store.index('date');
            const range = IDBKeyRange.bound(
                new Date(startDate).toISOString(),
                new Date(endDate).toISOString()
            );

            let meals;
            
            // Apply pagination directly at the database level if possible
            if (options.pagination && options.pagination.limit < 1000) {
                meals = await this.getPaginatedFromIndex(index, range, options.pagination);
            } else {
                meals = await this.getAllFromIndex(index, range);
            }
            
            // Filter meals if filters are provided
            if (options.filters) {
                meals = this.filterMeals(meals, options.filters);
            }
            
            // Store in cache for future requests
            this.cache.meals.set(cacheKey, {
                data: meals,
                timestamp: Date.now()
            });
            
            // Apply pagination if it hasn't been applied at the DB level
            if (options.pagination && options.pagination.limit >= 1000) {
                const { page = 1, limit = 50 } = options.pagination;
                const start = (page - 1) * limit;
                const end = start + limit;
                const paginatedData = meals.slice(start, end);
                
                return { 
                    success: true, 
                    data: paginatedData,
                    meta: {
                        total: meals.length,
                        page: page,
                        limit: limit,
                        pages: Math.ceil(meals.length / limit)
                    }
                };
            }
            
            return { success: true, data: meals };
        } catch (error) {
            logError('Error getting meals:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Filter meals based on criteria
    filterMeals(meals, filters) {
        return meals.filter(meal => {
            let matches = true;
            
            if (filters.mealType && meal.mealType !== filters.mealType) {
                matches = false;
            }
            
            if (filters.foodName) {
                const foodNameLower = filters.foodName.toLowerCase();
                const hasFoodWithName = meal.foods && meal.foods.some(
                    food => food.name.toLowerCase().includes(foodNameLower)
                );
                if (!hasFoodWithName) matches = false;
            }
            
            // Add more filter conditions as needed
            
            return matches;
        });
    }

    // Goal Management
    async setGoal(goalData) {
        try {
            const store = this.getStore('goals', 'readwrite');
            await store.put(goalData);
            
            // Clear goals cache
            this.cache.goals = null;
            
            return { success: true };
        } catch (error) {
            logError('Error setting goal:', error);
            return { success: false, error: error.message };
        }
    }

    async getGoals() {
        try {
            // Check cache first
            if (this.cache.goals) {
                const cacheAge = Date.now() - this.cache.goals.timestamp;
                if (cacheAge < this.cacheTTL) {
                    return { success: true, data: this.cache.goals.data };
                }
            }
            
            const store = this.getStore('goals', 'readonly');
            const goals = await this.getAll(store);
            
            // Update cache
            this.cache.goals = {
                data: goals,
                timestamp: Date.now()
            };
            
            return { success: true, data: goals };
        } catch (error) {
            logError('Error getting goals:', error);
            return { success: false, error: error.message };
        }
    }

    // User Preferences
    async savePreferences(preferences) {
        try {
            const store = this.getStore('userPreferences', 'readwrite');
            
            // Get existing preferences first
            let existingPrefs;
            try {
                existingPrefs = await this.get(store, 'user-prefs');
            } catch (err) {
                existingPrefs = {};
            }
            
            // Merge with new preferences
            const mergedPrefs = {
                id: 'user-prefs',
                ...existingPrefs,
                ...preferences,
                updatedAt: new Date().toISOString()
            };
            
            await store.put(mergedPrefs);
            
            // Update cache
            this.cache.preferences = {
                data: mergedPrefs,
                timestamp: Date.now()
            };
            
            return { success: true };
        } catch (error) {
            logError('Error saving preferences:', error);
            return { success: false, error: error.message };
        }
    }

    async getPreferences() {
        try {
            // Check cache first
            if (this.cache.preferences) {
                const cacheAge = Date.now() - this.cache.preferences.timestamp;
                if (cacheAge < this.cacheTTL) {
                    return { success: true, data: this.cache.preferences.data };
                }
            }
            
            const store = this.getStore('userPreferences', 'readonly');
            const prefs = await this.get(store, 'user-prefs');
            
            // Update cache
            this.cache.preferences = {
                data: prefs || {},
                timestamp: Date.now()
            };
            
            return { success: true, data: prefs || {} };
        } catch (error) {
            logError('Error getting preferences:', error);
            return { success: false, error: error.message, data: {} };
        }
    }
    
    // Clean cache periodically to prevent memory leaks
    cleanCache() {
        const now = Date.now();
        
        // Clean meals cache
        for (const [key, value] of this.cache.meals.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.meals.delete(key);
            }
        }
        
        // Reset other caches if they're old
        if (this.cache.preferences && now - this.cache.preferences.timestamp > this.cacheTTL) {
            this.cache.preferences = null;
        }
        
        if (this.cache.goals && now - this.cache.goals.timestamp > this.cacheTTL) {
            this.cache.goals = null;
        }
        
        this.cache.lastCacheClean = now;
    }
    
    // Custom Foods Management
    async addCustomFood(foodData) {
        try {
            const store = this.getStore('customFoods', 'readwrite');
            await store.add(foodData);
            return { success: true };
        } catch (error) {
            logError('Error adding custom food:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Get paginated data from an index (efficient for large datasets)
    async getPaginatedFromIndex(index, range, pagination) {
        const { page = 1, limit = 50 } = pagination;
        
        return new Promise((resolve, reject) => {
            const results = [];
            const skip = (page - 1) * limit;
            let cursorCount = 0;
            
            const request = index.openCursor(range);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (!cursor) {
                    resolve(results);
                    return;
                }
                
                // Skip records before the start of current page
                if (cursorCount < skip) {
                    cursorCount++;
                    cursor.continue();
                    return;
                }
                
                // Collect records for current page
                if (results.length < limit) {
                    results.push(cursor.value);
                    cursorCount++;
                    cursor.continue();
                } else {
                    // We have all the results we need
                    resolve(results);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Helper functions
    getStore(storeName, mode) {
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    getAllFromIndex(index, range) {
        return new Promise((resolve, reject) => {
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAll(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    get(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Data Export/Import
    async exportData() {
        try {
            const meals = await this.getMeals(
                new Date(0).toISOString(),
                new Date().toISOString()
            );
            const goals = await this.getGoals();
            const preferences = await this.getPreferences();
            const customFoods = await this.getCustomFoods();
            const favorites = await this.getFavorites();

            const exportData = {
                meals: meals.data,
                goals: goals.data,
                preferences: preferences.data,
                customFoods: customFoods.data,
                favorites: favorites.data,
                exportDate: new Date().toISOString()
            };

            return {
                success: true,
                data: exportData
            };
        } catch (error) {
            logError('Error exporting data:', error);
            return { success: false, error: error.message };
        }
    }

    async importData(data) {
        try {
            // Validate data structure
            if (!data.meals || !data.goals || !data.preferences) {
                throw new Error('Invalid data format');
            }

            // Clear existing data
            const stores = ['meals', 'goals', 'userPreferences', 'customFoods', 'favorites'];
            for (const storeName of stores) {
                const store = this.getStore(storeName, 'readwrite');
                await store.clear();
            }

            // Import meals
            for (const meal of data.meals) {
                await this.addMeal(meal);
            }

            // Import goals
            for (const goal of data.goals) {
                await this.setGoal(goal);
            }

            // Import preferences
            if (data.preferences) {
                await this.savePreferences(data.preferences);
            }
            
            // Import custom foods
            if (data.customFoods) {
                for (const food of data.customFoods) {
                    await this.addCustomFood(food);
                }
            }
            
            // Import favorites
            if (data.favorites) {
                await this.saveFavorites(data.favorites);
            }

            return { success: true };
        } catch (error) {
            logError('Error importing data:', error);
            return { success: false, error: error.message };
        }
    }

    validateMeal(meal) {
        // Validate meal data
        const requiredFields = ['name', 'foods', 'mealType'];
        const missingFields = requiredFields.filter(field => !meal[field]);
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }
        
        return { valid: true };
    }
    
    validateGoal(goal) {
        // Validate goal data
        const requiredFields = ['type', 'target'];
        const missingFields = requiredFields.filter(field => !goal[field]);
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }
        
        return { valid: true };
    }
    
    validateFood(food) {
        // Validate food data
        const requiredFields = ['name', 'calories', 'serving'];
        const missingFields = requiredFields.filter(field => !food[field]);
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            };
        }
        
        return { valid: true };
    }

    // Activity Tracking Methods
    async saveActivities(activities) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('activities', 'readwrite');
            
            // Save all activities
            for (const activity of activities) {
                await store.put(activity);
            }
            
            return true;
        } catch (error) {
            logError('Error saving activities:', error);
            return false;
        }
    }
    
    async getActivities() {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('activities', 'readonly');
            const activities = await this.getAll(store);
            return activities;
        } catch (error) {
            logError('Error getting activities:', error);
            return [];
        }
    }
    
    async getActivitiesForDateRange(startDate, endDate) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('activities', 'readonly');
            const index = store.index('date');
            const range = IDBKeyRange.bound(
                new Date(startDate).toISOString(),
                new Date(endDate).toISOString()
            );
            
            const activities = await this.getAllFromIndex(index, range);
            return activities;
        } catch (error) {
            logError('Error getting activities for date range:', error);
            return [];
        }
    }
    
    // Recipe Management Methods
    async getRecipes() {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('recipes', 'readonly');
            const recipes = await this.getAll(store);
            return recipes;
        } catch (error) {
            logError('Error getting recipes:', error);
            return [];
        }
    }
    
    async saveRecipes(recipes) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('recipes', 'readwrite');
            
            // Save all recipes
            for (const recipe of recipes) {
                await store.put(recipe);
            }
            
            return true;
        } catch (error) {
            logError('Error saving recipes:', error);
            return false;
        }
    }
    
    async getRecipe(id) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('recipes', 'readonly');
            const recipe = await this.get(store, id);
            return recipe;
        } catch (error) {
            logError('Error getting recipe:', error);
            return null;
        }
    }
    
    async saveRecipe(recipe) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('recipes', 'readwrite');
            
            // Ensure recipe has an ID
            if (!recipe.id) {
                recipe.id = Date.now().toString();
            }
            
            await store.put(recipe);
            return true;
        } catch (error) {
            logError('Error saving recipe:', error);
            return false;
        }
    }
    
    async deleteRecipe(id) {
        if (!this.db) {
            await new Promise(resolve => {
                const checkDB = setInterval(() => {
                    if (this.db) {
                        clearInterval(checkDB);
                        resolve();
                    }
                }, 100);
            });
        }
        
        try {
            const store = this.getStore('recipes', 'readwrite');
            
            // Check if recipe exists
            const recipe = await this.get(store, id);
            if (!recipe) {
                return false;
            }
            
            await store.delete(id);
            return true;
        } catch (error) {
            logError('Error deleting recipe:', error);
            return false;
        }
    }

    // Favorites Management
    async saveFavorites(favoriteIds) {
        try {
            const store = this.getStore('favorites', 'readwrite');
            await store.put({
                id: 'user-favorites',
                foodIds: favoriteIds,
                updatedAt: new Date().toISOString()
            });
            
            return { success: true };
        } catch (error) {
            logError('Error saving favorites:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getFavorites() {
        try {
            const store = this.getStore('favorites', 'readonly');
            const favorites = await this.get(store, 'user-favorites');
            
            return { 
                success: true, 
                data: favorites ? favorites.foodIds : [] 
            };
        } catch (error) {
            logError('Error getting favorites:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Get water intake entries between two dates (inclusive).
     * Returns: [{ date: 'YYYY-MM-DD', amount: Number }]
     */
    getWaterIntake(startDate, endDate) {
        const waterData = JSON.parse(localStorage.getItem('waterData')) || {};
        const results = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const dateStr in waterData) {
            const date = new Date(dateStr);
            if (date >= start && date <= end) {
                results.push({
                    date: dateStr,
                    amount: waterData[dateStr].totalAmount || 0
                });
            }
        }
        return Promise.resolve(results);
    }
}

// Create singleton instance
const dataManager = new DataManager();

// Make it globally available
window.dataManager = dataManager;

// No longer need to export for modules
// export default dataManager;

logInfo('✅ Data Manager initialized successfully. Dashboard data loading can proceed.');
window.addEventListener('DOMContentLoaded', () => {
    logInfo('DOM loaded, checking Data Manager availability:', window.dataManager ? 'Available' : 'Not Available');
}); 