import foodDatabase from './food-db.js';
import dataManager from './data-manager.js';
import performanceOptimizer from './performance-optimizer.js';

class FoodLogger {
    constructor() {
        this.searchTimeout = null;
        this.recentFoods = new Set();
        this.searchCache = new Map();
        this.searchHistory = [];
        this.maxSearchHistory = 5;
        this.offlineMode = !navigator.onLine;
        this.userPreferences = this.loadUserPreferences();
        this.mealTimings = {
            breakfast: { start: 5, end: 11 },
            lunch: { start: 11, end: 15 },
            dinner: { start: 15, end: 22 },
            snacks: { start: 0, end: 24 }
        };
        this.dailyGoals = {
            calories: 2000,
            protein: 60,
            carbs: 250,
            fat: 65
        };
        this.dailySummary = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            mealCounts: {
                breakfast: 0,
                lunch: 0,
                dinner: 0,
                snacks: 0
            }
        };
        this.weeklyStats = {
            bestDay: null,
            totalCalories: 0,
            avgProtein: 0,
            mostCommonFoods: [],
            streaks: {
                current: 0,
                best: 0
            }
        };
        this.goalRecommendations = {
            lastUpdate: null,
            suggestions: [],
            trends: {
                calories: [],
                protein: []
            }
        };
        this.mealSuggestions = {
            breakfast: [
                { name: 'Oatmeal (1 cup cooked)', calories: 158, protein: 6, category: 'grains' },
                { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 12, category: 'dairy' },
                { name: 'Egg', calories: 70, protein: 6, category: 'proteins' }
            ],
            lunch: [
                { name: 'Chicken Breast', calories: 165, protein: 31, category: 'proteins' },
                { name: 'Rice (1 cup cooked)', calories: 205, protein: 4.3, category: 'grains' },
                { name: 'Salmon (3 oz)', calories: 177, protein: 22, category: 'proteins' }
            ],
            dinner: [
                { name: 'Salmon (3 oz)', calories: 177, protein: 22, category: 'proteins' },
                { name: 'Chicken Breast', calories: 165, protein: 31, category: 'proteins' },
                { name: 'Rice (1 cup cooked)', calories: 205, protein: 4.3, category: 'grains' }
            ],
            snacks: [
                { name: 'Apple', calories: 95, protein: 0.5, category: 'fruits' },
                { name: 'Banana', calories: 105, protein: 1.3, category: 'fruits' },
                { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 12, category: 'dairy' }
            ]
        };
        
        // Initialize virtualized lists container for optimized rendering
        this.virtualLists = {};
        
        this.initializeLogger();
    }

    loadUserPreferences() {
        try {
            return JSON.parse(localStorage.getItem('userPreferences')) || {
                frequentFoods: {},
                mealPatterns: {},
                lastMealType: null
            };
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {
                frequentFoods: {},
                mealPatterns: {},
                lastMealType: null
            };
        }
    }

    saveUserPreferences() {
        try {
            localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    initializeLogger() {
        // Add selectedDate property
        this.selectedDate = new Date();
        
        this.setupEventListeners();
        this.loadRecentFoods();
        this.setupOfflineSupport();
        this.setupPerformanceMonitoring();
        this.setupSmartSuggestions();
        this.setupQuickActions();
        this.setupDailySummary();
        this.updateDailySummary();
        this.setupWeeklyInsights();
        this.updateWeeklyStats();
        this.setupGoalRecommendations();
        this.setupDateNavigation();
        this.setupWeeklyProgressChart();
        this.setupGoalSetting();
        this.setupWaterTracking();
        this.setupDataExport();
        
        // Set initial meal type
        this.currentMealType = this.getCurrentMealType();
        this.selectMealTab(this.currentMealType);
        this.updateMealEntries(this.currentMealType);
    }

    setupEventListeners() {
        // Search input - use debounced search from performance optimizer
        const searchInput = document.getElementById('food-search');
        if (searchInput) {
            searchInput.addEventListener('input', performanceOptimizer.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.clearSearchResults();
            });
        }

        // Meal type buttons
        document.querySelectorAll('.meal-tab').forEach(btn => {
            btn.addEventListener('click', performanceOptimizer.throttle(() => {
                this.selectMealTab(btn.dataset.meal);
            }, 300));
        });

        // Add food button
        const addFoodBtn = document.querySelector('.add-food-btn');
        if (addFoodBtn) {
            addFoodBtn.addEventListener('click', () => {
                searchInput.focus();
            });
        }

        // Network status
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
    }

    setupOfflineSupport() {
        if (this.offlineMode) {
            document.body.classList.add('offline');
            this.showOfflineIndicator();
        }

        // Add offline indicator to DOM
        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.textContent = 'You are offline. Some features may be limited.';
        document.body.appendChild(indicator);
    }

    setupPerformanceMonitoring() {
        // Use the performance optimizer's monitoring capabilities
        console.log('Performance monitoring enabled via performance-optimizer.js');
    }

    handleNetworkChange(isOnline) {
        this.offlineMode = !isOnline;
        document.body.classList.toggle('offline', !isOnline);
        
        if (isOnline) {
            this.syncOfflineData();
        }
    }

    async syncOfflineData() {
        try {
            const offlineData = localStorage.getItem('offlineMeals');
            if (offlineData) {
                const meals = JSON.parse(offlineData);
                for (const meal of meals) {
                    await dataManager.addMeal(meal);
                }
                localStorage.removeItem('offlineMeals');
                this.updateFoodEntries();
            }
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    async loadRecentFoods() {
        try {
            const today = new Date();
            const lastWeek = new Date(today.setDate(today.getDate() - 7));
            
            const result = await dataManager.getMeals(lastWeek.toISOString(), new Date().toISOString());
            if (result.success) {
                this.recentFoods = new Set(
                    result.data
                        .map(meal => meal.name)
                        .filter((name, index, self) => self.indexOf(name) === index)
                        .slice(0, 5)
                );
                this.updateRecentFoodsList();
            }
        } catch (error) {
            console.error('Error loading recent foods:', error);
        }
    }

    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }

        // Show loading state
        this.showLoading(true);

        // Use cache if available
        if (this.searchCache.has(query)) {
            this.displaySearchResults(this.searchCache.get(query));
            this.showLoading(false);
            return;
        }

        try {
            // Use web worker for intensive search operations
            if (window.Worker && performanceOptimizer.enabledOptimizations.webWorkers) {
                const searchWorker = performanceOptimizer.createWorker(function() {
                    self.onmessage = function(e) {
                        const { query, allFoods } = e.data;
                        
                        // Search algorithm
                        const results = allFoods
                            .map(food => {
                                const score = calculateSearchScore(food.name, query);
                                return { ...food, score };
                            })
                            .filter(food => food.score > 0.3)
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 50);
                            
                        self.postMessage(results);
                        
                        // Helper function for search scoring
                        function calculateSearchScore(foodName, query) {
                            const foodNameLower = foodName.toLowerCase();
                            const queryLower = query.toLowerCase();
                            
                            // Exact match
                            if (foodNameLower === queryLower) return 1;
                            
                            // Starts with query
                            if (foodNameLower.startsWith(queryLower)) return 0.9;
                            
                            // Contains query as a whole word
                            if (foodNameLower.includes(` ${queryLower} `)) return 0.8;
                            
                            // Contains query
                            if (foodNameLower.includes(queryLower)) return 0.7;
                            
                            // Check for partial word matches
                            const foodWords = foodNameLower.split(/\s+/);
                            const queryWords = queryLower.split(/\s+/);
                            
                            let matchCount = 0;
                            for (const queryWord of queryWords) {
                                for (const foodWord of foodWords) {
                                    if (foodWord.includes(queryWord) || queryWord.includes(foodWord)) {
                                        matchCount++;
                                        break;
                                    }
                                }
                            }
                            
                            if (matchCount > 0) {
                                return 0.5 * (matchCount / queryWords.length);
                            }
                            
                            return 0;
                        }
                    };
                });
                
                // Get all foods - this should be optimized to only get necessary fields for search
                const foods = await foodDatabase.getAllFoods();
                
                // Send data to worker
                searchWorker.postMessage({
                    query,
                    allFoods: foods
                });
                
                // Handle worker response
                searchWorker.onmessage = (e) => {
                    const results = e.data;
                    this.searchCache.set(query, results);
                    this.displaySearchResults(results);
                    this.showLoading(false);
                    performanceOptimizer.terminateWorker(searchWorker.id);
                };
            } else {
                // Fallback to regular search if workers aren't available
                const foods = await foodDatabase.searchFoods(query);
                this.searchCache.set(query, foods);
                this.displaySearchResults(foods);
            }
        } catch (error) {
            console.error('Error searching foods:', error);
            this.showError('Failed to search foods. Please try again.');
        } finally {
            this.showLoading(false);
            this.addToSearchHistory(query);
        }
    }

    calculateSearchScore(foodName, query) {
        if (foodName.includes(query)) {
            // Exact match gets highest score
            return 1;
        }

        const words = foodName.split(' ');
        const queryWords = query.split(' ');
        let score = 0;

        // Check each word in the food name against each word in the query
        for (const word of words) {
            for (const queryWord of queryWords) {
                if (word.startsWith(queryWord)) {
                    score += 0.8; // High score for prefix match
                } else if (this.levenshteinDistance(word, queryWord) <= 2) {
                    score += 0.6; // Medium score for close match
                }
            }
        }

        return score / words.length; // Normalize score
    }

    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    addToSearchHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > this.maxSearchHistory) {
                this.searchHistory.pop();
            }
            this.updateSearchHistoryUI();
        }
    }

    updateSearchHistoryUI() {
        const searchSection = document.querySelector('.search-section');
        if (!searchSection) return;

        let historyContainer = document.querySelector('.search-history');
        if (!historyContainer) {
            historyContainer = document.createElement('div');
            historyContainer.className = 'search-history';
            searchSection.appendChild(historyContainer);
        }

        historyContainer.innerHTML = `
            <div class="search-history-title">Recent Searches</div>
            <div class="search-history-items">
                ${this.searchHistory.map(term => `
                    <button class="search-history-item" onclick="foodLogger.handleSearch('${term}')">
                        <span class="history-icon">🔍</span>
                        ${term}
                    </button>
                `).join('')}
            </div>
        `;
    }

    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="far fa-sad-tear"></i>
                    <p>No foods found. Try a different search term.</p>
                </div>
            `;
            return;
        }

        // Use virtualized list for displaying large result sets
        if (results.length > 20) {
            // Destroy previous virtualized list if it exists
            if (this.virtualLists.searchResults) {
                performanceOptimizer.removeVirtualizedList(this.virtualLists.searchResults.id);
            }
            
            // Create container for virtualized list
            resultsContainer.innerHTML = '<div id="virtual-search-results" style="height: 500px; overflow-y: auto;"></div>';
            const virtualContainer = document.getElementById('virtual-search-results');
            
            // Create virtualized list
            this.virtualLists.searchResults = performanceOptimizer.createVirtualizedList({
                container: virtualContainer,
                itemHeight: 70, // Approximate height of each food item
                renderItem: (element, food, index) => {
                    element.className = 'food-item';
                    element.innerHTML = `
                        <div class="food-item-info">
                            <div class="food-name">${food.name}</div>
                            <div class="food-details">
                                <span class="food-calories">${food.calories} cal</span>
                                <span class="food-nutrients">
                                    <span class="nutrient">P: ${food.protein}g</span>
                                    <span class="nutrient">C: ${food.carbs}g</span>
                                    <span class="nutrient">F: ${food.fat}g</span>
                                </span>
                            </div>
                        </div>
                        <button class="add-food-btn" data-food-id="${food.id}">
                            <i class="fas fa-plus"></i>
                        </button>
                    `;
                    
                    // Add click handler
                    element.querySelector('.add-food-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.addFoodToLog(food.id);
                    });
                    
                    element.addEventListener('click', () => {
                        this.showFoodDetail(food.id);
                    });
                },
                getItemKey: (food) => food.id
            });
            
            // Set items to the virtualized list
            this.virtualLists.searchResults.setItems(results);
        } else {
            // Use regular rendering for smaller result sets
            results.forEach(food => {
                const foodItem = document.createElement('div');
                foodItem.className = 'food-item';
                foodItem.innerHTML = `
                    <div class="food-item-info">
                        <div class="food-name">${food.name}</div>
                        <div class="food-details">
                            <span class="food-calories">${food.calories} cal</span>
                            <span class="food-nutrients">
                                <span class="nutrient">P: ${food.protein}g</span>
                                <span class="nutrient">C: ${food.carbs}g</span>
                                <span class="nutrient">F: ${food.fat}g</span>
                            </span>
                        </div>
                    </div>
                    <button class="add-food-btn" data-food-id="${food.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                
                // Add event listeners
                foodItem.addEventListener('click', () => {
                    this.showFoodDetail(food.id);
                });
                
                foodItem.querySelector('.add-food-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.addFoodToLog(food.id);
                });
                
                resultsContainer.appendChild(foodItem);
            });
        }
    }

    updateRecentFoodsList() {
        const recentFoodsList = document.getElementById('recent-foods');
        if (!recentFoodsList) return;

        // Clear the list
        recentFoodsList.innerHTML = '';

        if (this.recentFoods.size === 0) {
            recentFoodsList.innerHTML = '<div class="no-recent-foods">No recent foods</div>';
            return;
        }

        // Convert Set to Array and slice to get most recent ones
        const recentFoodsArray = Array.from(this.recentFoods).slice(0, 10);

        // Use processArrayInChunks to handle potentially large list without blocking UI
        performanceOptimizer.processArrayInChunks(recentFoodsArray, async (foodId) => {
            try {
                const food = await foodDatabase.getFoodById(foodId);
                if (!food) return null;
                
                const foodItem = document.createElement('div');
                foodItem.className = 'recent-food-item';
                foodItem.innerHTML = `
                    <div class="food-name">${food.name}</div>
                    <div class="food-calories">${food.calories} cal</div>
                    <button class="add-recent-food" data-food-id="${food.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                
                foodItem.querySelector('.add-recent-food').addEventListener('click', () => {
                    this.addFoodToLog(food.id);
                });
                
                return foodItem;
            } catch (error) {
                console.error('Error loading recent food:', error);
                return null;
            }
        }, { chunkSize: 5, chunkDelay: 0 }).then(foodElements => {
            // Filter out null elements
            const validElements = foodElements.filter(el => el !== null);
            
            if (validElements.length === 0) {
                recentFoodsList.innerHTML = '<div class="no-recent-foods">No recent foods</div>';
                return;
            }
            
            // Add all elements to the DOM
            validElements.forEach(element => {
                recentFoodsList.appendChild(element);
            });
        });
    }

    clearSearchResults() {
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    handleMealTypeSelection(button) {
        document.querySelector('.meal-btn.active')?.classList.remove('active');
        button.classList.add('active');
        this.updateFoodEntries();
    }

    async handleFoodEntryClick(event) {
        const target = event.target;
        
        if (target.classList.contains('add-food-btn')) {
            const foodData = JSON.parse(target.dataset.food);
            await this.addFoodEntry(foodData);
        } else if (target.classList.contains('remove-food')) {
            const entryId = target.closest('.food-entry').dataset.id;
            await this.removeFoodEntry(entryId);
        }
    }

    async addFoodEntry(foodData) {
        try {
            const mealType = document.querySelector('.meal-btn.active')?.dataset.mealType || 'snacks';
            const addBtn = document.querySelector(`[data-food='${JSON.stringify(foodData)}']`);
            const portion = parseFloat(addBtn?.dataset.portion || 1);
            
            const meal = {
                ...foodData,
                calories: Math.round(foodData.calories * portion),
                protein: +(foodData.protein * portion).toFixed(1),
                carbs: +(foodData.carbs * portion).toFixed(1),
                fat: +(foodData.fat * portion).toFixed(1),
                mealType,
                portion,
                date: new Date().toISOString()
            };

            if (this.offlineMode) {
                // Store in localStorage when offline
                const offlineMeals = JSON.parse(localStorage.getItem('offlineMeals') || '[]');
                offlineMeals.push(meal);
                localStorage.setItem('offlineMeals', JSON.stringify(offlineMeals));
                this.showMessage('Food saved offline. Will sync when connection is restored.', 'info');
            } else {
                const result = await dataManager.addMeal(meal);
                if (!result.success) {
                    throw new Error(result.error);
                }
            }

            this.recentFoods.add(foodData.name);
            this.updateFoodEntries();
            this.updateRecentFoodsList();

            // Update frequency count for the food
            this.userPreferences.frequentFoods[foodData.name] = 
                (this.userPreferences.frequentFoods[foodData.name] || 0) + 1;
            
            // Update meal patterns
            const hour = new Date().getHours();
            if (!this.userPreferences.mealPatterns[hour]) {
                this.userPreferences.mealPatterns[hour] = {};
            }
            this.userPreferences.mealPatterns[hour][foodData.name] = 
                (this.userPreferences.mealPatterns[hour][foodData.name] || 0) + 1;

            this.saveUserPreferences();
            this.updateQuickActions();
            await this.updateDailySummary();
            await this.updateWeeklyStats();
        } catch (error) {
            console.error('Error adding food entry:', error);
            this.showError('Failed to add food entry. Please try again.');
        }
    }

    async removeFoodEntry(entryId) {
        try {
            // Implement remove functionality when dataManager supports it
            this.updateFoodEntries();
            await this.updateDailySummary();
        } catch (error) {
            console.error('Error removing food entry:', error);
            this.showError('Failed to remove food entry. Please try again.');
        }
    }

    async updateFoodEntries() {
        try {
            const mealType = document.querySelector('.meal-btn.active')?.dataset.meal;
            const today = new Date();
            const result = await dataManager.getMeals(today.toISOString(), today.toISOString());

            if (result.success) {
                const entries = result.data.filter(meal => 
                    !mealType || meal.mealType === mealType
                );
                this.displayFoodEntries(entries);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error updating food entries:', error);
            this.showError('Failed to update food entries. Please try again.');
        }
    }

    displayFoodEntries(entries) {
        const container = document.getElementById('food-entries');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = `
                <p class="empty-state">No foods logged yet today. Use the search bar above to add foods.</p>
            `;
            return;
        }

        const list = document.createElement('div');
        list.className = 'food-entries-list';

        entries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'food-entry';
            entryElement.dataset.id = entry.id;
            entryElement.innerHTML = `
                <div class="entry-info">
                    <span class="entry-name">
                        ${entry.name}
                        ${entry.portion !== 1 ? `<span class="portion-indicator">(${entry.portion}×)</span>` : ''}
                    </span>
                    <span class="entry-details">
                        ${entry.calories} kcal | ${entry.protein}g protein
                    </span>
                </div>
                <button class="remove-food" aria-label="Remove food">×</button>
            `;
            list.appendChild(entryElement);
        });

        container.innerHTML = '';
        container.appendChild(list);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 3000);
    }

    showMessage(message, type = 'error') {
        const messageElement = document.createElement('div');
        messageElement.className = `message-toast ${type}`;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        // Trigger reflow to ensure animation plays
        messageElement.offsetHeight;
        
        messageElement.classList.add('show');
        setTimeout(() => {
            messageElement.classList.remove('show');
            setTimeout(() => messageElement.remove(), 300);
        }, 3000);
    }

    showOfflineIndicator() {
        // Implement the logic to show an offline indicator to the user
        console.warn('Offline mode is active');
    }

    setupSmartSuggestions() {
        // Auto-select meal type based on time
        this.updateMealTypeBasedOnTime();
        
        // Update meal type every 30 minutes
        setInterval(() => this.updateMealTypeBasedOnTime(), 30 * 60 * 1000);

        // Setup meal suggestions
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'meal-suggestions';
        suggestionsContainer.innerHTML = `
            <div class="suggestions-header">
                <h3>Suggested for You</h3>
                <div class="suggestions-subtext">Based on your goals and time of day</div>
            </div>
            <div class="suggestions-content"></div>
        `;
        
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            searchSection.parentNode.insertBefore(suggestionsContainer, searchSection.nextSibling);
            this.updateMealSuggestions();
        }

        // Update suggestions every hour
        setInterval(() => this.updateMealSuggestions(), 60 * 60 * 1000);
    }

    updateMealTypeBasedOnTime() {
        const hour = new Date().getHours();
        let suggestedMealType = 'snacks';

        for (const [mealType, timing] of Object.entries(this.mealTimings)) {
            if (hour >= timing.start && hour < timing.end) {
                suggestedMealType = mealType;
                break;
            }
        }

        const mealButton = document.querySelector(`[data-meal-type="${suggestedMealType}"]`);
        if (mealButton && !document.querySelector('.meal-btn.active')) {
            this.handleMealTypeSelection(mealButton);
        }
    }

    async updateMealSuggestions() {
        try {
            const mealType = this.currentMealType;
            const currentDate = this.selectedDate;
            
            // Show loading state
            const suggestionsContainer = document.getElementById('meal-suggestions');
            suggestionsContainer.innerHTML = '<div class="suggestions-loading"><p>Generating personalized suggestions...</p></div>';
            
            // Get current nutritional intake for the day
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const result = await dataManager.getMeals(dayStart.toISOString(), dayEnd.toISOString());
            if (!result.success) throw new Error('Failed to load meals');
            
            // Calculate daily totals
            const meals = result.data || [];
            const dailyTotals = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0
            };
            
            meals.forEach(meal => {
                dailyTotals.calories += meal.calories || 0;
                dailyTotals.protein += meal.protein || 0;
                dailyTotals.carbs += meal.carbs || 0;
                dailyTotals.fat += meal.fat || 0;
                dailyTotals.fiber += meal.fiber || 0;
            });
            
            // Get suggested foods from food database
            const suggestions = await foodDatabase.getSuggestedFoods(mealType);
            
            // Generate smart suggestions based on nutritional gaps
            const smartSuggestions = this.generateSmartSuggestions(mealType, dailyTotals);
            
            // Display suggestions
            this.displayMealSuggestions([...smartSuggestions, ...suggestions].slice(0, 8));
        } catch (error) {
            console.error('Error updating meal suggestions:', error);
            const suggestionsContainer = document.getElementById('meal-suggestions');
            suggestionsContainer.innerHTML = '<p>Could not load suggestions. Please try again later.</p>';
        }
    }

    generateSmartSuggestions(mealType, dailyTotals) {
        // Get nutritional goals from class properties
        const calorieGoal = this.dailyGoals.calories || 2000;
        const proteinGoal = this.dailyGoals.protein || 60;
        const carbsGoal = this.dailyGoals.carbs || 250;
        const fatGoal = this.dailyGoals.fat || 65;
        const fiberGoal = this.dailyGoals.fiber || 25;
        
        // Calculate remaining macros for the day
        const remaining = {
            calories: Math.max(0, calorieGoal - dailyTotals.calories),
            protein: Math.max(0, proteinGoal - dailyTotals.protein),
            carbs: Math.max(0, carbsGoal - dailyTotals.carbs),
            fat: Math.max(0, fatGoal - dailyTotals.fat),
            fiber: Math.max(0, fiberGoal - dailyTotals.fiber)
        };
        
        // Determine what nutrients are most needed
        const priorities = [];
        
        const caloriePercent = dailyTotals.calories / calorieGoal;
        const proteinPercent = dailyTotals.protein / proteinGoal;
        const carbsPercent = dailyTotals.carbs / carbsGoal;
        const fatPercent = dailyTotals.fat / fatGoal;
        
        // Check if protein is particularly low
        if (proteinPercent < 0.5 && caloriePercent < 0.75) {
            priorities.push('protein');
        }
        
        // Check if user needs more carbs
        if (carbsPercent < 0.5 && caloriePercent < 0.75) {
            priorities.push('carbs');
        }
        
        // Check if user needs more healthy fats
        if (fatPercent < 0.5 && caloriePercent < 0.75) {
            priorities.push('fat');
        }
        
        // Add fiber if it's low
        if (dailyTotals.fiber < fiberGoal * 0.5) {
            priorities.push('fiber');
        }
        
        // Return appropriate suggestions
        return this.getSuggestionsForPriorities(priorities, mealType);
    }

    getSuggestionsForPriorities(priorities, mealType) {
        const suggestions = [];
        
        // Sample food suggestions based on nutritional priorities
        const foodsByPriority = {
            protein: [
                { id: 'smart-chicken', name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, image: 'images/foods/chicken-breast.jpg' },
                { id: 'smart-greek-yogurt', name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0, fiber: 0, image: 'images/foods/greek-yogurt.jpg' },
                { id: 'smart-tofu', name: 'Tofu', calories: 144, protein: 16, carbs: 2.3, fat: 8.7, fiber: 2.3, image: 'images/foods/tofu.jpg' }
            ],
            carbs: [
                { id: 'smart-oatmeal', name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fat: 2.5, fiber: 4, image: 'images/foods/oatmeal.jpg' },
                { id: 'smart-brown-rice', name: 'Brown Rice', calories: 215, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, image: 'images/foods/brown-rice.jpg' },
                { id: 'smart-sweet-potato', name: 'Sweet Potato', calories: 115, protein: 2, carbs: 26, fat: 0.1, fiber: 3.8, image: 'images/foods/sweet-potato.jpg' }
            ],
            fat: [
                { id: 'smart-avocado', name: 'Avocado', calories: 234, protein: 2.9, carbs: 12.5, fat: 21, fiber: 9.8, image: 'images/foods/avocado.jpg' },
                { id: 'smart-almonds', name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, image: 'images/foods/almonds.jpg' },
                { id: 'smart-salmon', name: 'Salmon', calories: 208, protein: 22, carbs: 0, fat: 13, fiber: 0, image: 'images/foods/salmon.jpg' }
            ],
            fiber: [
                { id: 'smart-broccoli', name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.2, image: 'images/foods/broccoli.jpg' },
                { id: 'smart-lentils', name: 'Lentils', calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 15.6, image: 'images/foods/lentils.jpg' },
                { id: 'smart-chia-seeds', name: 'Chia Seeds', calories: 138, protein: 4.7, carbs: 12, fat: 8.7, fiber: 9.8, image: 'images/foods/chia-seeds.jpg' }
            ]
        };
        
        // Set meal-specific suggestions
        const mealSpecific = {
            breakfast: [
                { id: 'smart-breakfast-bowl', name: 'Protein Breakfast Bowl', calories: 350, protein: 25, carbs: 30, fat: 12, fiber: 5, image: 'images/foods/breakfast-bowl.jpg' }
            ],
            lunch: [
                { id: 'smart-salad', name: 'Grilled Chicken Salad', calories: 320, protein: 28, carbs: 12, fat: 16, fiber: 6, image: 'images/foods/chicken-salad.jpg' }
            ],
            dinner: [
                { id: 'smart-salmon-veg', name: 'Salmon with Vegetables', calories: 390, protein: 30, carbs: 15, fat: 22, fiber: 7, image: 'images/foods/salmon-veg.jpg' }
            ],
            snacks: [
                { id: 'smart-protein-bar', name: 'Protein Bar', calories: 180, protein: 15, carbs: 20, fat: 5, fiber: 8, image: 'images/foods/protein-bar.jpg' }
            ]
        };
        
        // Add meal-specific suggestion first
        if (mealSpecific[mealType]) {
            suggestions.push(...mealSpecific[mealType]);
        }
        
        // Add suggestions based on priorities
        for (const priority of priorities) {
            if (foodsByPriority[priority]) {
                suggestions.push(...foodsByPriority[priority]);
            }
        }
        
        // Ensure we don't have duplicates
        const unique = [];
        const ids = new Set();
        
        for (const item of suggestions) {
            if (!ids.has(item.id)) {
                ids.add(item.id);
                unique.push(item);
            }
        }
        
        return unique.slice(0, 4); // Return up to 4 smart suggestions
    }

    displayMealSuggestions(suggestions) {
        const container = document.getElementById('meal-suggestions');
        if (!container) return;
        
        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = '<p>No suggestions available for this meal.</p>';
            return;
        }
        
        let html = '';
        
        suggestions.forEach(food => {
            const imageSrc = food.image || 'images/placeholder-food.jpg';
            
            html += `
                <div class="suggestion-card" data-food-id="${food.id}">
                    <div class="suggestion-image">
                        <img src="${imageSrc}" alt="${food.name}" onerror="this.src='images/placeholder-food.jpg'">
                    </div>
                    <div class="suggestion-info">
                        <h4 class="suggestion-name">${food.name}</h4>
                        <div class="suggestion-details">
                            <span>${food.calories} kcal</span>
                            <span>P: ${food.protein}g</span>
                            <span>C: ${food.carbs}g</span>
                        </div>
                        <button class="add-suggestion-btn" data-food-id="${food.id}">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners to suggestion cards
        container.querySelectorAll('.add-suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const foodId = e.currentTarget.dataset.foodId;
                this.addFoodToLog(foodId);
                e.stopPropagation();
            });
        });
        
        container.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.add-suggestion-btn')) {
                    const foodId = card.dataset.foodId;
                    this.showFoodDetail(foodId);
                }
            });
        });
    }

    setupQuickActions() {
        // Setup quick action buttons
        const quickActionsContainer = document.createElement('div');
        quickActionsContainer.className = 'quick-actions';
        quickActionsContainer.innerHTML = `
            <div class="quick-actions-title">Quick Add Frequent Foods</div>
            <div class="quick-actions-buttons"></div>
        `;
        
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            searchSection.parentNode.insertBefore(quickActionsContainer, searchSection.nextSibling);
            this.updateQuickActions();
        }
    }

    updateQuickActions() {
        const frequentFoods = Object.entries(this.userPreferences.frequentFoods)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([name]) => name);

        const container = document.querySelector('.quick-actions-buttons');
        if (!container) return;

        container.innerHTML = '';
        frequentFoods.forEach(foodName => {
            const button = document.createElement('button');
            button.className = 'quick-action-btn';
            button.textContent = foodName;
            button.addEventListener('click', () => this.quickAddFood(foodName));
            container.appendChild(button);
        });
    }

    async quickAddFood(foodName) {
        const food = await this.searchFoods(foodName);
        if (food && food.length > 0) {
            await this.addFoodEntry(food[0]);
        }
    }

    setupDailySummary() {
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'daily-summary';
        summaryContainer.innerHTML = `
            <div class="summary-header">
                <h2>Today's Progress</h2>
                <div class="summary-stats">
                    <div class="stat-item calories">
                        <div class="stat-label">Calories</div>
                        <div class="stat-progress">
                            <div class="progress-bar" id="calories-progress"></div>
                            <span class="stat-value" id="calories-value">0 / ${this.dailyGoals.calories}</span>
                        </div>
                    </div>
                    <div class="macro-distribution">
                        <div class="macro-header">
                            <h3>Macro Distribution</h3>
                            <div class="macro-legend">
                                <span class="legend-item protein">Protein</span>
                                <span class="legend-item carbs">Carbs</span>
                                <span class="legend-item fat">Fat</span>
                            </div>
                        </div>
                        <div class="macro-chart">
                            <div class="macro-bar">
                                <div class="macro-segment protein" id="protein-segment"></div>
                                <div class="macro-segment carbs" id="carbs-segment"></div>
                                <div class="macro-segment fat" id="fat-segment"></div>
                            </div>
                            <div class="macro-values">
                                <span id="protein-value">0g</span>
                                <span id="carbs-value">0g</span>
                                <span id="fat-value">0g</span>
                            </div>
                        </div>
                        <div class="macro-targets">
                            <div class="target-item">
                                <span class="target-label">Target Ratio:</span>
                                <span class="target-value">25% / 55% / 20%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="meal-distribution" id="meal-distribution"></div>
        `;

        const foodEntries = document.querySelector('.food-entries');
        if (foodEntries) {
            foodEntries.parentNode.insertBefore(summaryContainer, foodEntries);
        }
    }

    async updateDailySummary() {
        try {
            const currentDate = this.selectedDate;
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Fetch goals from data manager
            const goalsResult = await dataManager.getGoals();
            if (goalsResult.success) {
                const goals = goalsResult.data;
                goals.forEach(goal => {
                    if (goal.type === 'calories') this.dailyGoals.calories = goal.target;
                    if (goal.type === 'protein') this.dailyGoals.protein = goal.target;
                    if (goal.type === 'carbs') this.dailyGoals.carbs = goal.target;
                    if (goal.type === 'fat') this.dailyGoals.fat = goal.target;
                    if (goal.type === 'fiber') this.dailyGoals.fiber = goal.target;
                });
            }
            
            // Get today's meals
            const result = await dataManager.getMeals(dayStart.toISOString(), dayEnd.toISOString());
            if (!result.success) {
                throw new Error('Failed to load meals');
            }
            
            const meals = result.data || [];
            
            // Calculate totals by meal type
            const mealTotals = {
                breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
                lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
                dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
                snacks: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
            };
            
            // Calculate daily totals
            this.dailyTotals = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0
            };
            
            meals.forEach(meal => {
                const mealType = meal.mealType || 'snacks';
                
                // Ensure values are numbers
                const calories = Number(meal.calories) || 0;
                const protein = Number(meal.protein) || 0;
                const carbs = Number(meal.carbs) || 0;
                const fat = Number(meal.fat) || 0;
                const fiber = Number(meal.fiber) || 0;
                
                // Add to meal type totals
                mealTotals[mealType].calories += calories;
                mealTotals[mealType].protein += protein;
                mealTotals[mealType].carbs += carbs;
                mealTotals[mealType].fat += fat;
                mealTotals[mealType].fiber += fiber;
                
                // Add to daily totals
                this.dailyTotals.calories += calories;
                this.dailyTotals.protein += protein;
                this.dailyTotals.carbs += carbs;
                this.dailyTotals.fat += fat;
                this.dailyTotals.fiber += fiber;
            });
            
            // Store meal totals for use in other methods
            this.mealTotals = mealTotals;
            
            // Update UI
            this.updateSummaryUI();
            this.updateMacroDistribution();
            this.updateInsights();
        } catch (error) {
            console.error('Error updating daily summary:', error);
        }
    }

    updateSummaryUI() {
        // Update macro cards
        this.updateMacroCard('calories', this.dailyTotals.calories, this.dailyGoals.calories);
        this.updateMacroCard('protein', this.dailyTotals.protein, this.dailyGoals.protein);
        this.updateMacroCard('carbs', this.dailyTotals.carbs, this.dailyGoals.carbs);
        this.updateMacroCard('fat', this.dailyTotals.fat, this.dailyGoals.fat);
        this.updateMacroCard('fiber', this.dailyTotals.fiber, this.dailyGoals.fiber);
    }

    updateMacroCard(macroType, current, goal) {
        const currentElement = document.getElementById(`${macroType}-current`);
        const goalElement = document.getElementById(`${macroType}-goal`);
        const progressElement = document.getElementById(`${macroType}-progress`);
        const cardElement = document.getElementById(`${macroType}-card`);
        
        if (!currentElement || !goalElement || !progressElement || !cardElement) return;
        
        // Update values
        currentElement.textContent = Math.round(current);
        goalElement.textContent = goal;
        
        // Calculate percentage
        const percentage = goal > 0 ? (current / goal) * 100 : 0;
        
        // Update progress bar
        progressElement.style.width = `${Math.min(percentage, 100)}%`;
        
        // Update color based on percentage
        cardElement.classList.remove('under-goal', 'near-goal', 'at-goal', 'over-goal');
        
        if (percentage < 70) {
            cardElement.classList.add('under-goal');
            progressElement.style.backgroundColor = 'var(--under-goal)';
        } else if (percentage < 90) {
            cardElement.classList.add('near-goal');
            progressElement.style.backgroundColor = 'var(--near-goal)';
        } else if (percentage <= 100) {
            cardElement.classList.add('at-goal');
            progressElement.style.backgroundColor = 'var(--at-goal)';
        } else {
            cardElement.classList.add('over-goal');
            progressElement.style.backgroundColor = 'var(--over-limit)';
        }
    }

    updateMacroDistribution() {
        // Get elements
        const proteinPercentElement = document.getElementById('protein-percent');
        const carbsPercentElement = document.getElementById('carbs-percent');
        const fatPercentElement = document.getElementById('fat-percent');
        
        if (!proteinPercentElement || !carbsPercentElement || !fatPercentElement) return;
        
        // Calculate total calories from macros
        const proteinCalories = this.dailyTotals.protein * 4; // 4 calories per gram of protein
        const carbsCalories = this.dailyTotals.carbs * 4;     // 4 calories per gram of carbs
        const fatCalories = this.dailyTotals.fat * 9;         // 9 calories per gram of fat
        
        const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
        
        // Calculate percentages
        const proteinPercent = totalMacroCalories > 0 ? Math.round((proteinCalories / totalMacroCalories) * 100) : 0;
        const carbsPercent = totalMacroCalories > 0 ? Math.round((carbsCalories / totalMacroCalories) * 100) : 0;
        const fatPercent = totalMacroCalories > 0 ? Math.round((fatCalories / totalMacroCalories) * 100) : 0;
        
        // Update UI
        proteinPercentElement.textContent = `${proteinPercent}%`;
        carbsPercentElement.textContent = `${carbsPercent}%`;
        fatPercentElement.textContent = `${fatPercent}%`;
        
        // Update chart if exists
        this.updateMacroChart(proteinPercent, carbsPercent, fatPercent);
    }

    updateMacroChart(proteinPercent, carbsPercent, fatPercent) {
        const chartCanvas = document.getElementById('macroChart');
        if (!chartCanvas) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not available');
            return;
        }
        
        // Destroy existing chart if any
        if (this.macroChart) {
            this.macroChart.destroy();
        }
        
        // Create new chart
        this.macroChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: [proteinPercent, carbsPercent, fatPercent],
                    backgroundColor: [
                        'var(--protein-color)',
                        'var(--carbs-color)',
                        'var(--fat-color)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateInsights() {
        const insightsContainer = document.getElementById('daily-insights');
        if (!insightsContainer) return;
        
        // If no food logged yet, show default message
        if (this.dailyTotals.calories === 0) {
            insightsContainer.innerHTML = `
                <div class="insight-placeholder">
                    <p>Log your meals to see personalized insights</p>
                </div>
            `;
            return;
        }
        
        const insights = [];
        
        // Calorie insight
        const caloriePercent = (this.dailyTotals.calories / this.dailyGoals.calories) * 100;
        if (caloriePercent > 110) {
            insights.push({
                type: 'negative',
                icon: 'fa-fire',
                title: 'Calorie Surplus',
                message: `You're ${Math.round(caloriePercent - 100)}% over your daily calorie goal.`
            });
        } else if (caloriePercent < 50 && new Date().getHours() >= 16) {
            insights.push({
                type: 'warning',
                icon: 'fa-fire',
                title: 'Low Calorie Intake',
                message: `You've only reached ${Math.round(caloriePercent)}% of your calorie goal today.`
            });
        } else if (caloriePercent >= 90 && caloriePercent <= 105) {
            insights.push({
                type: 'positive',
                icon: 'fa-check-circle',
                title: 'On Target',
                message: `You're right on track with your calorie goal!`
            });
        }
        
        // Protein insight
        const proteinPercent = (this.dailyTotals.protein / this.dailyGoals.protein) * 100;
        if (proteinPercent < 50 && caloriePercent > 60) {
            insights.push({
                type: 'warning',
                icon: 'fa-dumbbell',
                title: 'Low Protein',
                message: `Consider adding more protein-rich foods to your meals.`
            });
        } else if (proteinPercent >= 100) {
            insights.push({
                type: 'positive',
                icon: 'fa-dumbbell',
                title: 'Protein Goal Met',
                message: `Great job meeting your protein target for the day!`
            });
        }
        
        // Water insight (if we had water tracking)
        
        // Balance insight
        const macroBalance = this.checkMacroBalance();
        if (macroBalance.balanced) {
            insights.push({
                type: 'positive',
                icon: 'fa-balance-scale',
                title: 'Balanced Macros',
                message: `Your macro ratio is well-balanced for your goals.`
            });
        } else if (macroBalance.dominant) {
            insights.push({
                type: 'warning',
                icon: 'fa-balance-scale',
                title: 'Unbalanced Macros',
                message: `Your diet is relatively high in ${macroBalance.dominant}. Consider adding more ${macroBalance.deficient}.`
            });
        }
        
        // Fiber insight
        if (this.dailyTotals.fiber < this.dailyGoals.fiber * 0.5) {
            insights.push({
                type: 'warning',
                icon: 'fa-seedling',
                title: 'Low Fiber',
                message: `Try adding more fruits, vegetables, and whole grains for fiber.`
            });
        }
        
        // Render insights
        if (insights.length === 0) {
            insightsContainer.innerHTML = `
                <div class="insight-card insight-positive">
                    <div class="insight-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="insight-content">
                        <h4>Looking Good!</h4>
                        <p>Continue your healthy eating habits.</p>
                    </div>
                </div>
            `;
        } else {
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-card insight-${insight.type}">
                    <div class="insight-icon">
                        <i class="fas ${insight.icon}"></i>
                    </div>
                    <div class="insight-content">
                        <h4>${insight.title}</h4>
                        <p>${insight.message}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    checkMacroBalance() {
        // Calculate macro percentages
        const proteinCalories = this.dailyTotals.protein * 4;
        const carbsCalories = this.dailyTotals.carbs * 4;
        const fatCalories = this.dailyTotals.fat * 9;
        
        const totalCalories = proteinCalories + carbsCalories + fatCalories;
        
        if (totalCalories === 0) return { balanced: true };
        
        const proteinPercent = proteinCalories / totalCalories;
        const carbsPercent = carbsCalories / totalCalories;
        const fatPercent = fatCalories / totalCalories;
        
        // Check for extreme imbalances
        const isBalanced = 
            proteinPercent >= 0.15 && proteinPercent <= 0.35 &&
            carbsPercent >= 0.40 && carbsPercent <= 0.65 &&
            fatPercent >= 0.20 && fatPercent <= 0.35;
        
        if (isBalanced) return { balanced: true };
        
        // Find dominant and deficient macros
        let dominant = 'carbs';
        let deficient = 'protein';
        
        if (proteinPercent > carbsPercent && proteinPercent > fatPercent) {
            dominant = 'protein';
            deficient = carbsPercent < fatPercent ? 'carbs' : 'fat';
        } else if (fatPercent > carbsPercent && fatPercent > proteinPercent) {
            dominant = 'fat';
            deficient = proteinPercent < carbsPercent ? 'protein' : 'carbs';
        } else {
            deficient = proteinPercent < fatPercent ? 'protein' : 'fat';
        }
        
        return {
            balanced: false,
            dominant,
            deficient
        };
    }

    setupWeeklyInsights() {
        const insightsContainer = document.createElement('div');
        insightsContainer.className = 'weekly-insights';
        insightsContainer.innerHTML = `
            <div class="insights-header">
                <h2>Weekly Insights</h2>
                <div class="insights-grid">
                    <div class="insight-card streak">
                        <div class="insight-icon">🔥</div>
                        <div class="insight-content">
                            <div class="insight-title">Logging Streak</div>
                            <div class="insight-value" id="streak-value">0 days</div>
                        </div>
                    </div>
                    <div class="insight-card avg-protein">
                        <div class="insight-icon">💪</div>
                        <div class="insight-content">
                            <div class="insight-title">Avg. Daily Protein</div>
                            <div class="insight-value" id="avg-protein-value">0g</div>
                        </div>
                    </div>
                    <div class="insight-card best-day">
                        <div class="insight-icon">⭐</div>
                        <div class="insight-content">
                            <div class="insight-title">Best Day</div>
                            <div class="insight-value" id="best-day-value">-</div>
                        </div>
                    </div>
                    <div class="insight-card common-foods">
                        <div class="insight-icon">🥗</div>
                        <div class="insight-content">
                            <div class="insight-title">Most Common Foods</div>
                            <div class="insight-value" id="common-foods-value">-</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const dailySummary = document.querySelector('.daily-summary');
        if (dailySummary) {
            dailySummary.parentNode.insertBefore(insightsContainer, dailySummary.nextSibling);
        }
    }

    setupGoalRecommendations() {
        const recommendationsContainer = document.createElement('div');
        recommendationsContainer.className = 'goal-recommendations';
        recommendationsContainer.innerHTML = `
            <div class="recommendations-header">
                <h2>Smart Recommendations</h2>
                <div class="recommendations-content" id="recommendations-content">
                    <div class="recommendation-placeholder">Analyzing your patterns...</div>
                </div>
            </div>
        `;

        const weeklyInsights = document.querySelector('.weekly-insights');
        if (weeklyInsights) {
            weeklyInsights.parentNode.insertBefore(recommendationsContainer, weeklyInsights.nextSibling);
        }
    }

    async updateWeeklyStats() {
        try {
            const today = new Date();
            const lastWeek = new Date(today.setDate(today.getDate() - 7));
            const result = await dataManager.getMeals(lastWeek.toISOString(), new Date().toISOString());

            if (result.success) {
                // Group meals by day
                const mealsByDay = this.groupMealsByDay(result.data);
                
                // Calculate streaks
                this.calculateStreaks(mealsByDay);
                
                // Calculate averages and find best day
                this.calculateWeeklyAverages(mealsByDay);
                
                // Find most common foods
                this.findMostCommonFoods(result.data);
                
                // Update UI
                this.updateInsightsUI();

                // Update goal recommendations
                this.updateGoalRecommendations(result.data);
            }
        } catch (error) {
            console.error('Error updating weekly stats:', error);
        }
    }

    groupMealsByDay(meals) {
        const mealsByDay = {};
        meals.forEach(meal => {
            const date = new Date(meal.date).toLocaleDateString();
            if (!mealsByDay[date]) {
                mealsByDay[date] = {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    meals: []
                };
            }
            mealsByDay[date].calories += meal.calories;
            mealsByDay[date].protein += meal.protein;
            mealsByDay[date].carbs += meal.carbs;
            mealsByDay[date].fat += meal.fat;
            mealsByDay[date].meals.push(meal);
        });
        return mealsByDay;
    }

    calculateStreaks(mealsByDay) {
        const dates = Object.keys(mealsByDay).sort();
        let currentStreak = 0;
        let bestStreak = 0;
        
        for (let i = dates.length - 1; i >= 0; i--) {
            const currentDate = new Date(dates[i]);
            const previousDate = i > 0 ? new Date(dates[i - 1]) : null;
            
            if (!previousDate || this.isConsecutiveDay(currentDate, previousDate)) {
                currentStreak++;
                bestStreak = Math.max(bestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        this.weeklyStats.streaks = {
            current: currentStreak,
            best: bestStreak
        };
    }

    isConsecutiveDay(date1, date2) {
        const diffTime = Math.abs(date1 - date2);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    calculateWeeklyAverages(mealsByDay) {
        const days = Object.values(mealsByDay);
        if (days.length === 0) return;

        // Calculate averages
        this.weeklyStats.avgProtein = Math.round(
            days.reduce((sum, day) => sum + day.protein, 0) / days.length
        );

        // Find best day (closest to goals)
        this.weeklyStats.bestDay = Object.entries(mealsByDay)
            .reduce((best, [date, day]) => {
                const calorieScore = Math.abs(day.calories - this.dailyGoals.calories);
                const proteinScore = Math.abs(day.protein - this.dailyGoals.protein);
                const totalScore = calorieScore + proteinScore;

                if (!best || totalScore < best.score) {
                    return { date, score: totalScore };
                }
                return best;
            }, null);
    }

    findMostCommonFoods(meals) {
        const foodCounts = {};
        meals.forEach(meal => {
            foodCounts[meal.name] = (foodCounts[meal.name] || 0) + 1;
        });

        this.weeklyStats.mostCommonFoods = Object.entries(foodCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([name]) => name);
    }

    updateInsightsUI() {
        // Update streak
        const streakValue = document.getElementById('streak-value');
        if (streakValue) {
            streakValue.textContent = `${this.weeklyStats.streaks.current} day${
                this.weeklyStats.streaks.current !== 1 ? 's' : ''
            }`;
        }

        // Update average protein
        const avgProteinValue = document.getElementById('avg-protein-value');
        if (avgProteinValue) {
            avgProteinValue.textContent = `${this.weeklyStats.avgProtein}g`;
        }

        // Update best day
        const bestDayValue = document.getElementById('best-day-value');
        if (bestDayValue && this.weeklyStats.bestDay) {
            const date = new Date(this.weeklyStats.bestDay.date);
            bestDayValue.textContent = date.toLocaleDateString('en-US', { weekday: 'long' });
        }

        // Update common foods
        const commonFoodsValue = document.getElementById('common-foods-value');
        if (commonFoodsValue) {
            commonFoodsValue.textContent = this.weeklyStats.mostCommonFoods.length > 0
                ? this.weeklyStats.mostCommonFoods.join(', ')
                : 'No meals logged';
        }
    }

    updateGoalRecommendations(meals) {
        // Only update recommendations once per day to avoid unnecessary calculations
        const today = new Date().toLocaleDateString();
        if (this.goalRecommendations.lastUpdate === today) return;

        // Group meals by day for trend analysis
        const mealsByDay = this.groupMealsByDay(meals);
        const days = Object.values(mealsByDay);

        if (days.length < 3) return; // Need at least 3 days of data for recommendations

        // Analyze trends
        const trends = this.analyzeTrends(days);
        
        // Generate recommendations based on trends
        const recommendations = this.generateRecommendations(trends);

        // Update UI
        this.updateRecommendationsUI(recommendations);

        // Save last update time
        this.goalRecommendations.lastUpdate = today;
    }

    analyzeTrends(days) {
        const trends = {
            calories: {
                average: 0,
                trend: 'stable',
                consistency: 0
            },
            protein: {
                average: 0,
                trend: 'stable',
                consistency: 0
            },
            carbs: {
                average: 0,
                trend: 'stable',
                consistency: 0
            },
            fat: {
                average: 0,
                trend: 'stable',
                consistency: 0
            }
        };

        // Calculate averages and trends
        const caloriesValues = days.map(day => day.calories);
        const proteinValues = days.map(day => day.protein);
        const carbsValues = days.map(day => day.carbs);
        const fatValues = days.map(day => day.fat);

        trends.calories.average = Math.round(
            caloriesValues.reduce((a, b) => a + b, 0) / days.length
        );
        trends.protein.average = Math.round(
            proteinValues.reduce((a, b) => a + b, 0) / days.length
        );
        trends.carbs.average = Math.round(
            carbsValues.reduce((a, b) => a + b, 0) / days.length
        );
        trends.fat.average = Math.round(
            fatValues.reduce((a, b) => a + b, 0) / days.length
        );

        // Calculate consistency (% of days within 20% of goal)
        trends.calories.consistency = Math.round(
            (days.filter(day => 
                Math.abs(day.calories - this.dailyGoals.calories) <= this.dailyGoals.calories * 0.2
            ).length / days.length) * 100
        );

        trends.protein.consistency = Math.round(
            (days.filter(day => 
                Math.abs(day.protein - this.dailyGoals.protein) <= this.dailyGoals.protein * 0.2
            ).length / days.length) * 100
        );

        trends.carbs.consistency = Math.round(
            (days.filter(day => 
                Math.abs(day.carbs - this.dailyGoals.carbs) <= this.dailyGoals.carbs * 0.2
            ).length / days.length) * 100
        );

        trends.fat.consistency = Math.round(
            (days.filter(day => 
                Math.abs(day.fat - this.dailyGoals.fat) <= this.dailyGoals.fat * 0.2
            ).length / days.length) * 100
        );

        // Determine trends
        const recentCalories = caloriesValues.slice(-3);
        const recentProtein = proteinValues.slice(-3);
        const recentCarbs = carbsValues.slice(-3);
        const recentFat = fatValues.slice(-3);

        trends.calories.trend = this.getTrend(recentCalories, this.dailyGoals.calories);
        trends.protein.trend = this.getTrend(recentProtein, this.dailyGoals.protein);
        trends.carbs.trend = this.getTrend(recentCarbs, this.dailyGoals.carbs);
        trends.fat.trend = this.getTrend(recentFat, this.dailyGoals.fat);

        return trends;
    }

    getTrend(values, goal) {
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const deviation = Math.abs(average - goal);
        const percentDeviation = (deviation / goal) * 100;

        if (percentDeviation <= 10) return 'on-track';
        return average > goal ? 'high' : 'low';
    }

    generateRecommendations(trends) {
        const recommendations = [];

        // Calorie-based recommendations
        if (trends.calories.trend === 'high' && trends.calories.consistency < 70) {
            recommendations.push({
                type: 'suggestion',
                icon: '📊',
                message: 'Consider slightly reducing portion sizes to meet your calorie goal more consistently.'
            });
        } else if (trends.calories.trend === 'low' && trends.calories.consistency < 70) {
            recommendations.push({
                type: 'suggestion',
                icon: '🍽️',
                message: 'Try adding healthy snacks to reach your daily calorie target.'
            });
        }

        // Protein-based recommendations
        if (trends.protein.trend === 'low' && trends.protein.consistency < 70) {
            recommendations.push({
                type: 'suggestion',
                icon: '💪',
                message: 'Include more protein-rich foods in your meals to meet your protein goal.'
            });
        }

        // Consistency achievements
        if (trends.calories.consistency >= 80) {
            recommendations.push({
                type: 'achievement',
                icon: '🎯',
                message: 'Great job maintaining consistent calorie intake!'
            });
        }

        if (trends.protein.consistency >= 80) {
            recommendations.push({
                type: 'achievement',
                icon: '⭐',
                message: 'Excellent protein goal consistency!'
            });
        }

        return recommendations;
    }

    updateRecommendationsUI(recommendations) {
        const container = document.getElementById('recommendations-content');
        if (!container) return;

        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="recommendation-placeholder">
                    Keep logging meals to receive personalized recommendations
                </div>
            `;
            return;
        }

        const recommendationsHTML = recommendations
            .map(rec => `
                <div class="recommendation-card ${rec.type}">
                    <div class="recommendation-icon">${rec.icon}</div>
                    <div class="recommendation-message">${rec.message}</div>
                </div>
            `)
            .join('');

        container.innerHTML = recommendationsHTML;
    }

    async addFoodToLog(foodId, quantity = 1, mealType = null) {
        try {
            // If meal type is not provided, determine based on time
            if (!mealType) {
                mealType = this.getCurrentMealType();
            }
            
            // Get food details
            const food = await foodDatabase.getFoodDetails(foodId);
            if (!food) {
                throw new Error('Food not found');
            }
            
            // Create log entry
            const logEntry = {
                foodId: food.id,
                name: food.name,
                quantity: quantity,
                mealType: mealType,
                date: new Date().toISOString(),
                calories: Math.round(food.calories * quantity),
                protein: Math.round(food.protein * quantity * 10) / 10,
                carbs: Math.round(food.carbs * quantity * 10) / 10,
                fat: Math.round(food.fat * quantity * 10) / 10,
                fiber: Math.round(food.fiber * quantity * 10) / 10
            };
            
            // Save to database
            const result = await dataManager.addMeal(logEntry);
            
            if (result.success) {
                // Track food usage for recommendations
                await foodDatabase.trackFoodUsage(foodId);
                
                // Update meal patterns in user preferences
                this.updateMealPattern(food.name, mealType);
                
                // Update UI
                this.updateDailySummary();
                this.updateMealEntries(mealType);
                
                // Show success message
                this.showStatusMessage(`Added ${food.name} to your ${mealType} log!`, 'success');
                
                return true;
            } else {
                throw new Error('Failed to add food to log');
            }
        } catch (error) {
            console.error('Error adding food to log:', error);
            this.showStatusMessage('Failed to add food to log. Please try again.', 'error');
            return false;
        }
    }

    getCurrentMealType() {
        const hour = new Date().getHours();
        
        if (hour >= this.mealTimings.breakfast.start && hour < this.mealTimings.breakfast.end) {
            return 'breakfast';
        } else if (hour >= this.mealTimings.lunch.start && hour < this.mealTimings.lunch.end) {
            return 'lunch';
        } else if (hour >= this.mealTimings.dinner.start && hour < this.mealTimings.dinner.end) {
            return 'dinner';
        } else {
            return 'snacks';
        }
    }

    async showFoodDetail(foodId) {
        try {
            // Show loading spinner
            this.showLoading(true);
            
            // Get food details from database
            const food = await foodDatabase.getFoodDetails(foodId);
            if (!food) {
                throw new Error('Food not found');
            }
            
            // Get the modal elements
            const modal = document.getElementById('food-detail-modal');
            const nameElement = document.getElementById('food-detail-name');
            const nutritionFacts = document.getElementById('nutrition-facts');
            const quantityInput = document.getElementById('food-quantity');
            const servingSelect = document.getElementById('serving-select');
            const mealTypeSelect = document.getElementById('meal-type');
            const addToLogBtn = document.getElementById('add-to-log');
            const addToFavoritesBtn = document.getElementById('add-to-favorites');
            
            // Populate modal with food data
            nameElement.textContent = food.name;
            
            // Reset quantity and update current meal type
            quantityInput.value = 1;
            mealTypeSelect.value = this.getCurrentMealType();
            
            // Populate nutrition facts table
            nutritionFacts.innerHTML = this.generateNutritionFactsHTML(food);
            
            // Update serving options if available
            if (food.servings && food.servings.length > 0) {
                servingSelect.innerHTML = '';
                food.servings.forEach(serving => {
                    const option = document.createElement('option');
                    option.value = serving.id;
                    option.textContent = serving.name;
                    servingSelect.appendChild(option);
                });
            } else {
                // Default serving options
                servingSelect.innerHTML = `
                    <option value="serving">1 serving</option>
                    <option value="100g">100g</option>
                    <option value="cup">1 cup</option>
                    <option value="ounce">1 ounce</option>
                `;
            }
            
            // Setup quantity input event listeners
            const decreaseBtn = modal.querySelector('.quantity-btn.decrease');
            const increaseBtn = modal.querySelector('.quantity-btn.increase');
            
            decreaseBtn.onclick = () => {
                const currentValue = parseFloat(quantityInput.value);
                if (currentValue > 0.1) {
                    quantityInput.value = (currentValue - 0.1).toFixed(1);
                    this.updateNutritionFactsForQuantity(food);
                }
            };
            
            increaseBtn.onclick = () => {
                const currentValue = parseFloat(quantityInput.value);
                quantityInput.value = (currentValue + 0.1).toFixed(1);
                this.updateNutritionFactsForQuantity(food);
            };
            
            quantityInput.oninput = () => this.updateNutritionFactsForQuantity(food);
            servingSelect.onchange = () => this.updateNutritionFactsForServing(food);
            
            // Check if food is in favorites and update button
            const isFavorite = await foodDatabase.isFavorite(foodId);
            addToFavoritesBtn.innerHTML = isFavorite 
                ? '<i class="fas fa-heart"></i> Remove from Favorites'
                : '<i class="far fa-heart"></i> Add to Favorites';
            
            // Setup button event listeners
            addToLogBtn.onclick = () => {
                const quantity = parseFloat(quantityInput.value);
                const mealType = mealTypeSelect.value;
                this.addFoodToLog(foodId, quantity, mealType);
                modal.classList.remove('active');
            };
            
            addToFavoritesBtn.onclick = async () => {
                if (isFavorite) {
                    await foodDatabase.removeFromFavorites(foodId);
                    addToFavoritesBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
                } else {
                    await foodDatabase.addToFavorites(foodId);
                    addToFavoritesBtn.innerHTML = '<i class="fas fa-heart"></i> Remove from Favorites';
                }
            };
            
            // Close button functionality
            const closeButton = modal.querySelector('.close-modal');
            closeButton.onclick = () => modal.classList.remove('active');
            
            // Show the modal
            modal.classList.add('active');
        } catch (error) {
            console.error('Error showing food detail:', error);
            this.showStatusMessage('Failed to load food details. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    generateNutritionFactsHTML(food) {
        return `
            <div class="nutrition-item calories">
                <span class="nutrient-name">Calories</span>
                <span class="nutrient-value">${food.calories}</span>
                <span class="nutrient-unit">kcal</span>
            </div>
            <div class="nutrition-item protein">
                <span class="nutrient-name">Protein</span>
                <span class="nutrient-value">${food.protein}</span>
                <span class="nutrient-unit">g</span>
            </div>
            <div class="nutrition-item carbs">
                <span class="nutrient-name">Carbs</span>
                <span class="nutrient-value">${food.carbs}</span>
                <span class="nutrient-unit">g</span>
            </div>
            <div class="nutrition-item fat">
                <span class="nutrient-name">Fat</span>
                <span class="nutrient-value">${food.fat}</span>
                <span class="nutrient-unit">g</span>
            </div>
            <div class="nutrition-item fiber">
                <span class="nutrient-name">Fiber</span>
                <span class="nutrient-value">${food.fiber || 0}</span>
                <span class="nutrient-unit">g</span>
            </div>
            ${food.sugar ? `
                <div class="nutrition-item sugar">
                    <span class="nutrient-name">Sugar</span>
                    <span class="nutrient-value">${food.sugar}</span>
                    <span class="nutrient-unit">g</span>
                </div>
            ` : ''}
            ${food.sodium ? `
                <div class="nutrition-item sodium">
                    <span class="nutrient-name">Sodium</span>
                    <span class="nutrient-value">${food.sodium}</span>
                    <span class="nutrient-unit">mg</span>
                </div>
            ` : ''}
        `;
    }

    updateNutritionFactsForQuantity(food) {
        const quantity = parseFloat(document.getElementById('food-quantity').value) || 1;
        const nutritionFacts = document.getElementById('nutrition-facts');
        
        if (nutritionFacts && !isNaN(quantity)) {
            const caloriesElement = nutritionFacts.querySelector('.calories .nutrient-value');
            const proteinElement = nutritionFacts.querySelector('.protein .nutrient-value');
            const carbsElement = nutritionFacts.querySelector('.carbs .nutrient-value');
            const fatElement = nutritionFacts.querySelector('.fat .nutrient-value');
            const fiberElement = nutritionFacts.querySelector('.fiber .nutrient-value');
            
            if (caloriesElement) caloriesElement.textContent = Math.round(food.calories * quantity);
            if (proteinElement) proteinElement.textContent = (food.protein * quantity).toFixed(1);
            if (carbsElement) carbsElement.textContent = (food.carbs * quantity).toFixed(1);
            if (fatElement) fatElement.textContent = (food.fat * quantity).toFixed(1);
            if (fiberElement) fiberElement.textContent = ((food.fiber || 0) * quantity).toFixed(1);
            
            const sugarElement = nutritionFacts.querySelector('.sugar .nutrient-value');
            const sodiumElement = nutritionFacts.querySelector('.sodium .nutrient-value');
            
            if (sugarElement && food.sugar) sugarElement.textContent = (food.sugar * quantity).toFixed(1);
            if (sodiumElement && food.sodium) sodiumElement.textContent = Math.round(food.sodium * quantity);
        }
    }

    updateNutritionFactsForServing(food) {
        // In a real implementation, this would convert between serving sizes
        // For now, we'll just call the quantity update
        this.updateNutritionFactsForQuantity(food);
    }

    async updateMealEntries(mealType) {
        try {
            // Show loading indicator
            this.showLoading(true);
            
            // Get the current date's meals
            const dayStart = new Date(this.selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(this.selectedDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const result = await dataManager.getMeals(dayStart.toISOString(), dayEnd.toISOString());
            if (!result.success) {
                throw new Error('Failed to load meals');
            }
            
            // Filter meals for the selected meal type
            const mealEntries = mealType ? 
                result.data.filter(meal => meal.mealType === mealType) : 
                result.data;
            
            // Display the filtered meals
            this.displayMealEntries(mealEntries, mealType);
            
            // Update meal totals
            this.updateMealTotals(mealEntries, mealType);
        } catch (error) {
            console.error('Error updating meal entries:', error);
            this.showStatusMessage('Failed to load meal entries. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayMealEntries(entries, mealType) {
        const entriesContainer = document.getElementById(`${mealType}-entries`);
        if (!entriesContainer) return;

        // Clear existing entries
        entriesContainer.innerHTML = '';

        if (!entries || entries.length === 0) {
            entriesContainer.innerHTML = `<div class="no-entries">No ${mealType} entries</div>`;
            return;
        }

        // Use virtualized list for large entry sets
        if (entries.length > 15) {
            // Destroy previous virtualized list if it exists
            if (this.virtualLists[mealType]) {
                performanceOptimizer.removeVirtualizedList(this.virtualLists[mealType].id);
            }
            
            // Create container for virtualized list
            entriesContainer.innerHTML = `<div id="virtual-${mealType}-entries" style="max-height: 500px; overflow-y: auto;"></div>`;
            const virtualContainer = document.getElementById(`virtual-${mealType}-entries`);
            
            // Create virtualized list
            this.virtualLists[mealType] = performanceOptimizer.createVirtualizedList({
                container: virtualContainer,
                itemHeight: 80, // Approximate height of each entry
                renderItem: (element, entry, index) => {
                    element.className = 'food-entry';
                    element.innerHTML = `
                        <div class="entry-info">
                            <div class="entry-name">${entry.name}</div>
                            <div class="entry-details">
                                <span class="entry-quantity">${entry.quantity} ${entry.unit || 'serving'}</span>
                                <span class="entry-calories">${Math.round(entry.calories)} cal</span>
                            </div>
                        </div>
                        <div class="entry-actions">
                            <button class="edit-entry" data-entry-id="${entry.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-entry" data-entry-id="${entry.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    // Add event listeners
                    element.querySelector('.edit-entry').addEventListener('click', () => {
                        this.editMealEntry(entry);
                    });
                    
                    element.querySelector('.delete-entry').addEventListener('click', () => {
                        this.removeMealEntry(entry.id);
                    });
                },
                getItemKey: (entry) => entry.id
            });
            
            // Set items to the virtualized list
            this.virtualLists[mealType].setItems(entries);
        } else {
            // Use regular rendering for smaller entry sets
            entries.forEach(entry => {
                const entryElement = document.createElement('div');
                entryElement.className = 'food-entry';
                entryElement.innerHTML = `
                    <div class="entry-info">
                        <div class="entry-name">${entry.name}</div>
                        <div class="entry-details">
                            <span class="entry-quantity">${entry.quantity} ${entry.unit || 'serving'}</span>
                            <span class="entry-calories">${Math.round(entry.calories)} cal</span>
                        </div>
                    </div>
                    <div class="entry-actions">
                        <button class="edit-entry" data-entry-id="${entry.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-entry" data-entry-id="${entry.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // Add event listeners
                entryElement.querySelector('.edit-entry').addEventListener('click', () => {
                    this.editMealEntry(entry);
                });
                
                entryElement.querySelector('.delete-entry').addEventListener('click', () => {
                    this.removeMealEntry(entry.id);
                });
                
                entriesContainer.appendChild(entryElement);
            });
        }

        // Update meal totals
        this.updateMealTotals(entries, mealType);
    }

    updateMealTotals(entries, mealType) {
        const caloriesElement = document.getElementById(`${mealType}-calories`);
        const proteinElement = document.getElementById(`${mealType}-protein`);
        
        if (!caloriesElement || !proteinElement) return;
        
        // Calculate totals
        const totals = entries.reduce((acc, entry) => {
            acc.calories += entry.calories || 0;
            acc.protein += entry.protein || 0;
            return acc;
        }, { calories: 0, protein: 0 });
        
        // Update UI
        caloriesElement.textContent = `${Math.round(totals.calories)} kcal`;
        proteinElement.textContent = `${totals.protein.toFixed(1)} g`;
    }

    async editMealEntry(entry) {
        try {
            // Similar to showFoodDetail but pre-filled with entry data
            await this.showFoodDetail(entry.foodId);
            
            // Update the quantity and meal type
            const quantityInput = document.getElementById('food-quantity');
            const mealTypeSelect = document.getElementById('meal-type');
            
            if (quantityInput) quantityInput.value = entry.quantity;
            if (mealTypeSelect) mealTypeSelect.value = entry.mealType;
            
            // Update the displayed nutrition facts
            const food = await foodDatabase.getFoodDetails(entry.foodId);
            if (food) {
                this.updateNutritionFactsForQuantity(food);
            }
            
            // Change the add button to update
            const addToLogBtn = document.getElementById('add-to-log');
            if (addToLogBtn) {
                addToLogBtn.innerHTML = '<i class="fas fa-check"></i> Update Entry';
                addToLogBtn.onclick = async () => {
                    // Remove the old entry
                    await this.removeMealEntry(entry.id, true);
                    
                    // Add the updated entry
                    const quantity = parseFloat(quantityInput.value) || 1;
                    const mealType = mealTypeSelect.value;
                    await this.addFoodToLog(entry.foodId, quantity, mealType);
                    
                    // Close the modal
                    const modal = document.getElementById('food-detail-modal');
                    if (modal) modal.classList.remove('active');
                };
            }
        } catch (error) {
            console.error('Error editing meal entry:', error);
            this.showStatusMessage('Failed to edit meal entry. Please try again.', 'error');
        }
    }

    async removeMealEntry(entryId, silent = false) {
        try {
            const result = await dataManager.deleteMeal(entryId);
            if (!result.success) {
                throw new Error('Failed to delete meal entry');
            }
            
            // Update UI
            const entryElement = document.querySelector(`.food-entry-row[data-id="${entryId}"]`);
            if (entryElement) {
                entryElement.classList.add('removing');
                setTimeout(() => {
                    entryElement.remove();
                    
                    // Check if there are no more entries
                    const entriesContainer = document.getElementById('food-entries');
                    if (entriesContainer && entriesContainer.children.length === 0) {
                        const mealType = document.querySelector('.meal-tab.active')?.dataset.meal || '';
                        entriesContainer.innerHTML = `
                            <div class="empty-meal-message">
                                <p>No foods logged for ${mealType || 'this meal'} yet.</p>
                                <p>Use the search box above to add foods.</p>
                            </div>
                        `;
                    }
                    
                    // Update meal totals
                    this.updateMealTotals([], '');
                }, 300);
            }
            
            // Update daily summary and insights
            await this.updateDailySummary();
            
            // Show success message
            if (!silent) {
                this.showStatusMessage('Food entry removed successfully', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Error removing meal entry:', error);
            if (!silent) {
                this.showStatusMessage('Failed to remove food entry. Please try again.', 'error');
            }
            return false;
        }
    }

    showStatusMessage(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        if (!statusElement) return;
        
        // Clear existing timeout if any
        if (this.statusMessageTimeout) {
            clearTimeout(this.statusMessageTimeout);
        }
        
        // Set message content and type
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Show the message
        statusElement.classList.add('active');
        
        // Hide after 3 seconds
        this.statusMessageTimeout = setTimeout(() => {
            statusElement.classList.remove('active');
        }, 3000);
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('active');
            } else {
                spinner.classList.remove('active');
            }
        }
    }

    setupDateNavigation() {
        const prevDayBtn = document.querySelector('.prev-day');
        const nextDayBtn = document.querySelector('.next-day');
        const datePickerBtn = document.querySelector('.date-picker-btn');
        const datePicker = document.getElementById('datePicker');
        const currentDateEl = document.getElementById('selectedDate');
        
        if (!prevDayBtn || !nextDayBtn || !datePickerBtn || !datePicker || !currentDateEl) return;
        
        // Format the initial date
        this.updateDateDisplay(currentDateEl);
        
        // Set the date picker's value
        datePicker.valueAsDate = this.selectedDate;
        
        // Previous day button
        prevDayBtn.addEventListener('click', () => {
            this.selectedDate = new Date(this.selectedDate);
            this.selectedDate.setDate(this.selectedDate.getDate() - 1);
            this.updateDateDisplay(currentDateEl);
            datePicker.valueAsDate = this.selectedDate;
            this.refreshData();
        });
        
        // Next day button
        nextDayBtn.addEventListener('click', () => {
            this.selectedDate = new Date(this.selectedDate);
            this.selectedDate.setDate(this.selectedDate.getDate() + 1);
            this.updateDateDisplay(currentDateEl);
            datePicker.valueAsDate = this.selectedDate;
            this.refreshData();
        });
        
        // Date picker button
        datePickerBtn.addEventListener('click', () => {
            datePicker.showPicker();
        });
        
        // Date picker change
        datePicker.addEventListener('change', () => {
            this.selectedDate = new Date(datePicker.value);
            this.updateDateDisplay(currentDateEl);
            this.refreshData();
        });
    }

    updateDateDisplay(element) {
        if (!element) return;
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
        
        // Check if the selected date is today, tomorrow, or yesterday
        if (this.isSameDay(this.selectedDate, today)) {
            element.textContent = 'Today';
        } else if (this.isSameDay(this.selectedDate, tomorrow)) {
            element.textContent = 'Tomorrow';
        } else if (this.isSameDay(this.selectedDate, yesterday)) {
            element.textContent = 'Yesterday';
        } else {
            element.textContent = this.selectedDate.toLocaleDateString('en-US', dateOptions);
        }
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    refreshData() {
        this.updateDailySummary();
        this.updateMealEntries(this.currentMealType);
        this.updateMealSuggestions();
    }

    selectMealTab(mealType) {
        const tabs = document.querySelectorAll('.meal-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.meal === mealType);
        });
        
        this.currentMealType = mealType;
        
        // Update the meal header
        const mealHeader = document.getElementById('current-meal');
        if (mealHeader) {
            mealHeader.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        }
        
        // Update the visible meal entries
        this.updateMealEntries(mealType);
    }

    updateMealPattern(foodName, mealType) {
        // Track which foods are commonly eaten at which meal times
        if (!this.userPreferences.mealPatterns) {
            this.userPreferences.mealPatterns = {};
        }
        
        if (!this.userPreferences.mealPatterns[mealType]) {
            this.userPreferences.mealPatterns[mealType] = {};
        }
        
        // Increment count for this food at this meal type
        this.userPreferences.mealPatterns[mealType][foodName] = 
            (this.userPreferences.mealPatterns[mealType][foodName] || 0) + 1;
        
        // Save preferences
        this.saveUserPreferences();
        
        // Update last meal type
        this.userPreferences.lastMealType = mealType;
    }

    setupWeeklyProgressChart() {
        // Add event listeners to metric buttons
        document.querySelectorAll('.metric-btn').forEach(button => {
            button.addEventListener('click', () => {
                // Update active button
                document.querySelectorAll('.metric-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // Update chart with selected metric
                this.updateWeeklyProgressChart(button.dataset.metric);
            });
        });
        
        // Initialize chart with calories
        this.updateWeeklyProgressChart('calories');
    }

    async updateWeeklyProgressChart(metric = 'calories') {
        try {
            // Show loading indicator
            this.showLoading(true);
            
            // Get data for past 7 days including today
            const endDate = new Date(this.selectedDate);
            endDate.setHours(23, 59, 59, 999);
            
            const startDate = new Date(this.selectedDate);
            startDate.setDate(startDate.getDate() - 6); // 7 days including today
            startDate.setHours(0, 0, 0, 0);
            
            const result = await dataManager.getMeals(startDate.toISOString(), endDate.toISOString());
            if (!result.success) {
                throw new Error('Failed to load meal data');
            }
            
            // Process data by grouping meals by day
            const dayData = this.processWeeklyData(result.data, metric);
            
            // Render the chart
            this.renderWeeklyChart(dayData, metric);
        } catch (error) {
            console.error('Error updating weekly progress chart:', error);
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="chart-error">
                        <p>Could not load chart data. Please try again later.</p>
                    </div>
                `;
            }
        } finally {
            this.showLoading(false);
        }
    }

    processWeeklyData(meals, metric) {
        // Generate dates for the past 7 days
        const dates = [];
        const labels = [];
        const today = new Date(this.selectedDate);
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toDateString());
            
            // Format date as short day name
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        
        // Initialize data structure
        const dayData = {
            labels: labels,
            datasets: [
                {
                    label: 'Actual',
                    data: Array(7).fill(0),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Target',
                    data: Array(7).fill(this.getTargetForMetric(metric)),
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    tension: 0,
                    fill: false
                }
            ]
        };
        
        // Group meals by day and calculate totals
        meals.forEach(meal => {
            const mealDate = new Date(meal.date).toDateString();
            const dateIndex = dates.indexOf(mealDate);
            
            if (dateIndex !== -1) {
                dayData.datasets[0].data[dateIndex] += meal[metric] || 0;
            }
        });
        
        return dayData;
    }

    getTargetForMetric(metric) {
        switch (metric) {
            case 'calories':
                return this.dailyGoals.calories;
            case 'protein':
                return this.dailyGoals.protein;
            case 'carbs':
                return this.dailyGoals.carbs;
            case 'fat':
                return this.dailyGoals.fat;
            default:
                return 0;
        }
    }

    renderWeeklyChart(data, metric) {
        const chartCanvas = document.getElementById('weeklyProgressChart');
        if (!chartCanvas) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not available');
            return;
        }
        
        // Destroy existing chart if any
        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }
        
        // Update y-axis label based on metric
        const metricUnit = metric === 'calories' ? 'kcal' : 'g';
        const metricLabel = `${metric.charAt(0).toUpperCase() + metric.slice(1)} (${metricUnit})`;
        
        // Create new chart
        this.weeklyChart = new Chart(chartCanvas, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(0);
                                    if (metric === 'calories') {
                                        label += ' kcal';
                                    } else {
                                        label += 'g';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: metricLabel
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                return value + (metric === 'calories' ? ' kcal' : 'g');
                            }
                        }
                    }
                }
            }
        });
    }

    setupGoalSetting() {
        // Add ability to edit goals by clicking on macro cards
        document.querySelectorAll('.macro-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showGoalSettingModal();
            });
        });
        
        // Add edit goals button to the daily summary section
        const dailySummary = document.querySelector('.daily-summary h2');
        if (dailySummary) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-goals-btn';
            editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Goals';
            editButton.addEventListener('click', () => {
                this.showGoalSettingModal();
            });
            dailySummary.appendChild(editButton);
        }
        
        // Set up event listeners for the goal setting modal
        const modal = document.getElementById('goal-setting-modal');
        if (!modal) return;
        
        // Close button
        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        // Preset buttons
        const presetButtons = modal.querySelectorAll('.preset-btn');
        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preset = button.dataset.preset;
                this.applyGoalPreset(preset);
            });
        });
        
        // Save button
        const saveButton = document.getElementById('save-goals');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveGoals();
                modal.classList.remove('active');
            });
        }
        
        // Reset button
        const resetButton = document.getElementById('reset-goals');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetGoals();
            });
        }
    }

    showGoalSettingModal() {
        const modal = document.getElementById('goal-setting-modal');
        if (!modal) return;
        
        // Populate inputs with current goals
        document.getElementById('calories-goal').value = this.dailyGoals.calories;
        document.getElementById('protein-goal').value = this.dailyGoals.protein;
        document.getElementById('carbs-goal').value = this.dailyGoals.carbs;
        document.getElementById('fat-goal').value = this.dailyGoals.fat;
        document.getElementById('fiber-goal').value = this.dailyGoals.fiber || 25;
        
        // Show the modal
        modal.classList.add('active');
    }

    applyGoalPreset(preset) {
        const presets = {
            maintenance: {
                calories: 2000,
                protein: 60,
                carbs: 250,
                fat: 65,
                fiber: 25
            },
            'weight-loss': {
                calories: 1500,
                protein: 75,
                carbs: 150,
                fat: 50,
                fiber: 30
            },
            'muscle-gain': {
                calories: 2500,
                protein: 120,
                carbs: 300,
                fat: 70,
                fiber: 30
            },
            keto: {
                calories: 1800,
                protein: 90,
                carbs: 50,
                fat: 120,
                fiber: 15
            }
        };
        
        if (presets[preset]) {
            const goals = presets[preset];
            
            // Update input values
            document.getElementById('calories-goal').value = goals.calories;
            document.getElementById('protein-goal').value = goals.protein;
            document.getElementById('carbs-goal').value = goals.carbs;
            document.getElementById('fat-goal').value = goals.fat;
            document.getElementById('fiber-goal').value = goals.fiber;
        }
    }

    async saveGoals() {
        try {
            // Get values from inputs
            const calories = parseInt(document.getElementById('calories-goal').value);
            const protein = parseInt(document.getElementById('protein-goal').value);
            const carbs = parseInt(document.getElementById('carbs-goal').value);
            const fat = parseInt(document.getElementById('fat-goal').value);
            const fiber = parseInt(document.getElementById('fiber-goal').value);
            
            // Validate values
            if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat) || isNaN(fiber)) {
                throw new Error('Invalid goal values. Please enter numbers only.');
            }
            
            // Update local goals
            this.dailyGoals = {
                calories,
                protein,
                carbs,
                fat,
                fiber
            };
            
            // Save goals to database
            const goals = [
                { type: 'calories', target: calories },
                { type: 'protein', target: protein },
                { type: 'carbs', target: carbs },
                { type: 'fat', target: fat },
                { type: 'fiber', target: fiber }
            ];
            
            // Save each goal
            for (const goal of goals) {
                await dataManager.saveGoal(goal);
            }
            
            // Update UI
            this.updateDailySummary();
            this.updateWeeklyProgressChart();
            
            this.showStatusMessage('Nutrition goals updated successfully', 'success');
        } catch (error) {
            console.error('Error saving goals:', error);
            this.showStatusMessage('Failed to save goals. Please try again.', 'error');
        }
    }

    resetGoals() {
        // Reset to default values
        document.getElementById('calories-goal').value = 2000;
        document.getElementById('protein-goal').value = 60;
        document.getElementById('carbs-goal').value = 250;
        document.getElementById('fat-goal').value = 65;
        document.getElementById('fiber-goal').value = 25;
    }

    setupWaterTracking() {
        // Initialize water tracking data
        this.waterIntake = {
            current: 0,
            goal: 2.5,
            history: {}
        };
        
        // Load saved water intake data
        this.loadWaterIntake();
        
        // Set up event listeners for water buttons
        const waterButtons = document.querySelectorAll('.water-btn');
        waterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const amount = parseFloat(button.dataset.amount);
                this.addWaterIntake(amount);
            });
        });
        
        // Update the UI
        this.updateWaterUI();
    }

    loadWaterIntake() {
        try {
            // Get today's date
            const date = this.selectedDate.toISOString().split('T')[0];
            
            // Load water tracking data from localStorage
            const waterData = localStorage.getItem('waterTracking');
            if (waterData) {
                const parsedData = JSON.parse(waterData);
                this.waterIntake = {
                    ...this.waterIntake,
                    ...parsedData
                };
                
                // Set current water intake to today's value if it exists
                if (this.waterIntake.history && this.waterIntake.history[date]) {
                    this.waterIntake.current = this.waterIntake.history[date];
                } else {
                    this.waterIntake.current = 0;
                }
            }
        } catch (error) {
            console.error('Error loading water intake data:', error);
            this.waterIntake.current = 0;
        }
    }

    saveWaterIntake() {
        try {
            // Get today's date
            const date = this.selectedDate.toISOString().split('T')[0];
            
            // Update history for today
            if (!this.waterIntake.history) {
                this.waterIntake.history = {};
            }
            
            this.waterIntake.history[date] = this.waterIntake.current;
            
            // Save to localStorage
            localStorage.setItem('waterTracking', JSON.stringify(this.waterIntake));
        } catch (error) {
            console.error('Error saving water intake data:', error);
        }
    }

    addWaterIntake(amount) {
        // Add amount to current intake
        this.waterIntake.current += amount;
        
        // Save updated data
        this.saveWaterIntake();
        
        // Update UI
        this.updateWaterUI();
        
        // Show message
        const message = `Added ${amount * 1000}ml of water. Total: ${this.waterIntake.current.toFixed(2)}L`;
        this.showStatusMessage(message, 'success');
        
        // Analyze and provide insights
        this.provideWaterInsights();
    }

    updateWaterUI() {
        // Update water amount display
        const waterCurrent = document.getElementById('water-current');
        const waterGoal = document.getElementById('water-goal');
        const waterLevel = document.getElementById('water-level');
        
        if (waterCurrent && waterGoal && waterLevel) {
            waterCurrent.textContent = this.waterIntake.current.toFixed(2);
            waterGoal.textContent = this.waterIntake.goal.toFixed(1);
            
            // Calculate percentage
            const percentage = (this.waterIntake.current / this.waterIntake.goal) * 100;
            
            // Update water level display
            waterLevel.style.height = `${Math.min(percentage, 100)}%`;
            
            // Change color based on percentage
            if (percentage < 50) {
                waterLevel.style.background = 'linear-gradient(to top, #4193ef, #68b5f6)';
            } else if (percentage >= 100) {
                waterLevel.style.background = 'linear-gradient(to top, #4CAF50, #8BC34A)';
            } else {
                waterLevel.style.background = 'linear-gradient(to top, #4193ef, #68b5f6)';
            }
        }
    }

    provideWaterInsights() {
        // Check if we need to provide insights based on water intake
        const percentage = (this.waterIntake.current / this.waterIntake.goal) * 100;
        let insight = '';
        
        if (percentage < 25) {
            insight = "Don't forget to stay hydrated! Drinking enough water can help with appetite control.";
        } else if (percentage >= 100) {
            insight = "Great job staying hydrated today! Proper hydration is essential for overall health.";
        }
        
        if (insight) {
            // Add water insight to insights section
            const insightsContainer = document.getElementById('daily-insights');
            if (insightsContainer) {
                // Check if there's already a water insight
                const existingInsight = insightsContainer.querySelector('.insight-water');
                
                if (existingInsight) {
                    // Update existing insight
                    const content = existingInsight.querySelector('.insight-content p');
                    if (content) {
                        content.textContent = insight;
                    }
                } else {
                    // Create new insight
                    const insightElement = document.createElement('div');
                    insightElement.className = 'insight-card insight-positive insight-water';
                    insightElement.innerHTML = `
                        <div class="insight-icon">
                            <i class="fas fa-tint"></i>
                        </div>
                        <div class="insight-content">
                            <h4>Hydration</h4>
                            <p>${insight}</p>
                        </div>
                    `;
                    
                    if (insightsContainer.children.length > 0 && insightsContainer.children[0].classList.contains('insight-placeholder')) {
                        insightsContainer.innerHTML = '';
                    }
                    
                    insightsContainer.appendChild(insightElement);
                }
            }
        }
    }

    setupDataExport() {
        const exportBtn = document.getElementById('export-data-btn');
        const exportModal = document.getElementById('export-data-modal');
        const cancelBtn = document.getElementById('cancel-export');
        const confirmBtn = document.getElementById('confirm-export');
        const closeBtn = exportModal.querySelector('.close-modal');
        const customRangeRadio = document.getElementById('export-range-custom');
        const customRangeContainer = document.getElementById('custom-range-container');
        
        // Set up date pickers with default values
        const startDatePicker = document.getElementById('start-date');
        const endDatePicker = document.getElementById('end-date');
        
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        
        startDatePicker.valueAsDate = oneWeekAgo;
        endDatePicker.valueAsDate = today;
        
        // Show export modal
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportModal.classList.add('active');
            });
        }
        
        // Close modal buttons
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                exportModal.classList.remove('active');
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                exportModal.classList.remove('active');
            });
        }
        
        // Toggle custom date range
        if (customRangeRadio) {
            customRangeRadio.addEventListener('change', () => {
                if (customRangeRadio.checked) {
                    customRangeContainer.style.display = 'flex';
                } else {
                    customRangeContainer.style.display = 'none';
                }
            });
            
            document.querySelectorAll('input[name="export-range"]').forEach(radio => {
                if (radio.id !== 'export-range-custom') {
                    radio.addEventListener('change', () => {
                        if (radio.checked) {
                            customRangeContainer.style.display = 'none';
                        }
                    });
                }
            });
        }
        
        // Export data
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.exportData();
                exportModal.classList.remove('active');
            });
        }
    }

    async exportData() {
        try {
            this.showLoading(true);
            
            // Get export options
            const exportRange = document.querySelector('input[name="export-range"]:checked').value;
            const exportFormat = document.querySelector('input[name="export-format"]:checked').value;
            const includeFoodEntries = document.getElementById('include-food-entries').checked;
            const includeWater = document.getElementById('include-water').checked;
            const includeGoals = document.getElementById('include-goals').checked;
            
            // Calculate start and end dates based on range
            let startDate, endDate;
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            switch (exportRange) {
                case 'week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = today;
                    break;
                case 'month':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 30);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = today;
                    break;
                case 'all':
                    // Go back 1 year as a reasonable "all" data range
                    startDate = new Date(today);
                    startDate.setFullYear(today.getFullYear() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = today;
                    break;
                case 'custom':
                    startDate = new Date(document.getElementById('start-date').value);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(document.getElementById('end-date').value);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                default:
                    throw new Error('Invalid export range');
            }
            
            // Collect data
            const data = {
                exportDate: new Date().toISOString(),
                dateRange: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
            };
            
            // Include food entries if selected
            if (includeFoodEntries) {
                const foodEntries = await this.getFoodEntries(startDate, endDate);
                data.foodEntries = foodEntries;
            }
            
            // Include water tracking if selected
            if (includeWater) {
                data.waterIntake = this.getWaterIntake(startDate, endDate);
            }
            
            // Include nutrition goals if selected
            if (includeGoals) {
                data.nutritionGoals = this.dailyGoals;
            }
            
            // Generate filename
            const dateStr = this.formatDateForFilename(new Date());
            const filename = `nutrition_data_${dateStr}.${exportFormat}`;
            
            // Export data in the selected format
            if (exportFormat === 'csv') {
                this.exportAsCSV(data, filename);
            } else {
                this.exportAsJSON(data, filename);
            }
            
            this.showLoading(false);
            this.showStatusMessage('Data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showLoading(false);
            this.showStatusMessage('Failed to export data. Please try again.', 'error');
        }
    }

    async getFoodEntries(startDate, endDate) {
        try {
            const result = await dataManager.getMeals(startDate.toISOString(), endDate.toISOString());
            if (!result.success) {
                throw new Error('Failed to load meals');
            }
            return result.data || [];
        } catch (error) {
            console.error('Error fetching food entries:', error);
            return [];
        }
    }

    getWaterIntake(startDate, endDate) {
        const waterData = [];
        
        if (!this.waterIntake.history) {
            return waterData;
        }
        
        // Convert dates to format used in history
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Loop through each date in range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const amount = this.waterIntake.history[dateStr] || 0;
            
            waterData.push({
                date: dateStr,
                amount: amount
            });
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return waterData;
    }

    exportAsJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        this.downloadFile(jsonStr, filename, 'application/json');
    }

    exportAsCSV(data, filename) {
        let csvContent = '';
        
        // Food entries
        if (data.foodEntries && data.foodEntries.length > 0) {
            csvContent += 'FOOD ENTRIES\n';
            csvContent += 'Date,Meal Type,Food Name,Quantity,Calories,Protein,Carbs,Fat,Fiber\n';
            
            data.foodEntries.forEach(entry => {
                const date = new Date(entry.date).toLocaleDateString();
                const row = [
                    date,
                    entry.mealType || '',
                    entry.name || '',
                    entry.quantity || '',
                    entry.calories || '',
                    entry.protein || '',
                    entry.carbs || '',
                    entry.fat || '',
                    entry.fiber || ''
                ];
                csvContent += row.join(',') + '\n';
            });
            
            csvContent += '\n';
        }
        
        // Water intake
        if (data.waterIntake && data.waterIntake.length > 0) {
            csvContent += 'WATER INTAKE\n';
            csvContent += 'Date,Amount (L)\n';
            
            data.waterIntake.forEach(entry => {
                const row = [entry.date, entry.amount];
                csvContent += row.join(',') + '\n';
            });
            
            csvContent += '\n';
        }
        
        // Nutrition goals
        if (data.nutritionGoals) {
            csvContent += 'NUTRITION GOALS\n';
            csvContent += 'Type,Value\n';
            
            Object.entries(data.nutritionGoals).forEach(([key, value]) => {
                const row = [key, value];
                csvContent += row.join(',') + '\n';
            });
        }
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        
        // Append to the document, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Release the URL after a delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    formatDateForFilename(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    // Add cleanup method to properly dispose of virtualized lists and other resources
    cleanup() {
        // Clean up virtualized lists
        for (const key in this.virtualLists) {
            if (this.virtualLists[key]) {
                performanceOptimizer.removeVirtualizedList(this.virtualLists[key].id);
            }
        }
        
        // Clear caches and other resources
        this.virtualLists = {};
        this.searchCache.clear();
    }
}

// Initialize food logger
const foodLogger = new FoodLogger();

export default foodLogger; 