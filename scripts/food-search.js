// Food Search Class
class FoodSearch {
    constructor() {
        // Initialize state
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalPages = 1;
        this.currentSearch = '';
        this.currentCategory = 'all';
        this.currentSort = 'relevance';
        this.favorites = this.loadFromStorage('favorites') || [];
        this.recentlyUsed = this.loadFromStorage('recentlyUsed') || [];
        this.advancedFiltersVisible = false;
        this.foodDatabase = [];
        
        // Initialize elements
        this.initElements();
        this.initEventListeners();
        
        // Load food database
        this.loadFoodDatabase();
    }
    
    // Initialize DOM elements
    initElements() {
        // Search inputs and buttons
        this.searchInput = document.getElementById('food-search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.categorySelect = document.getElementById('food-category');
        this.sortBySelect = document.getElementById('sort-by');
        this.advancedFilterToggle = document.getElementById('advanced-filter-toggle');
        this.advancedFilters = document.getElementById('advanced-filters');
        this.applyFiltersBtn = document.getElementById('apply-filters');
        this.resetFiltersBtn = document.getElementById('reset-filters');
        
        // Advanced filter inputs
        this.caloriesMin = document.getElementById('calories-min');
        this.caloriesMax = document.getElementById('calories-max');
        this.proteinMin = document.getElementById('protein-min');
        this.proteinMax = document.getElementById('protein-max');
        this.carbsMin = document.getElementById('carbs-min');
        this.carbsMax = document.getElementById('carbs-max');
        this.fatMin = document.getElementById('fat-min');
        this.fatMax = document.getElementById('fat-max');
        this.onlyFavorites = document.getElementById('only-favorites');
        this.recentlyUsed = document.getElementById('recently-used');
        
        // Results elements
        this.resultsGrid = document.getElementById('results-grid');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.emptyResults = document.getElementById('empty-results');
        this.resultsCount = document.querySelector('.results-count');
        
        // Pagination
        this.paginationContainer = document.getElementById('pagination');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.currentPageEl = document.querySelector('.current-page');
        this.totalPagesEl = document.querySelector('.total-pages');
        
        // Common foods links
        this.commonFoodLinks = document.querySelectorAll('.food-list a');
        
        // Modal elements
        this.foodDetailModal = document.getElementById('food-detail-modal');
        this.addToDiaryModal = document.getElementById('add-to-diary-modal');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        this.foodDetailTitle = document.getElementById('food-detail-title');
        this.servingSizeSelect = document.getElementById('serving-size-select');
        this.favoriteBtn = document.getElementById('favorite-btn');
        this.addToDiaryBtn = document.getElementById('add-to-diary-btn');
        
        // Nutrition elements in food detail modal
        this.caloriesValue = document.getElementById('calories-value');
        this.proteinValue = document.getElementById('protein-value');
        this.carbsValue = document.getElementById('carbs-value');
        this.fatValue = document.getElementById('fat-value');
        
        // Tab buttons in food detail modal
        this.tabBtns = document.querySelectorAll('.tab-btn');
        
        // Detail nutrition fields
        this.caloriesDetail = document.getElementById('calories-detail');
        this.totalFat = document.getElementById('total-fat');
        this.saturatedFat = document.getElementById('saturated-fat');
        this.transFat = document.getElementById('trans-fat');
        this.monoFat = document.getElementById('mono-fat');
        this.polyFat = document.getElementById('poly-fat');
        this.cholesterol = document.getElementById('cholesterol');
        this.sodium = document.getElementById('sodium');
        this.totalCarbs = document.getElementById('total-carbs');
        this.fiber = document.getElementById('fiber');
        this.sugars = document.getElementById('sugars');
        this.proteinDetail = document.getElementById('protein-detail');
        
        // Add to diary form
        this.addFoodName = document.getElementById('add-food-name');
        this.addCalories = document.getElementById('add-calories');
        this.addProtein = document.getElementById('add-protein');
        this.addCarbs = document.getElementById('add-carbs');
        this.addFat = document.getElementById('add-fat');
        this.diaryDate = document.getElementById('diary-date');
        this.mealType = document.getElementById('meal-type');
        this.servingAmount = document.getElementById('serving-amount');
        this.servingUnit = document.getElementById('serving-unit');
        this.updatedCalories = document.getElementById('updated-calories');
        this.updatedProtein = document.getElementById('updated-protein');
        this.updatedCarbs = document.getElementById('updated-carbs');
        this.updatedFat = document.getElementById('updated-fat');
        this.addToDiaryConfirm = document.getElementById('add-to-diary-confirm');
        
        // Mobile menu
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.sideNav = document.querySelector('.side-nav');
    }
    
    // Initialize event listeners
    initEventListeners() {
        // Search functionality
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // Filter changes
        this.categorySelect.addEventListener('change', () => this.updateFilters());
        this.sortBySelect.addEventListener('change', () => this.updateFilters());
        
        // Advanced filters
        this.advancedFilterToggle.addEventListener('click', () => this.toggleAdvancedFilters());
        this.applyFiltersBtn.addEventListener('click', () => this.applyAdvancedFilters());
        this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        
        // Pagination
        this.prevBtn.addEventListener('click', () => this.goToPrevPage());
        this.nextBtn.addEventListener('click', () => this.goToNextPage());
        
        // Common food links
        this.commonFoodLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.searchInput.value = link.getAttribute('data-food');
                this.performSearch();
            });
        });
        
        // Modal closing
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.foodDetailModal.classList.remove('active');
                this.addToDiaryModal.classList.remove('active');
            });
        });
        
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => {
                this.sideNav.classList.toggle('active');
            });
        }
        
        // Set current date for diary
        const today = new Date().toISOString().split('T')[0];
        if (this.diaryDate) {
            this.diaryDate.value = today;
        }
    }
    
    // Load from localStorage
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error loading ${key} from storage:`, e);
            return null;
        }
    }
    
    // Save to localStorage
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key} to storage:`, e);
        }
    }
    
    // Load food database
    loadFoodDatabase() {
        // In a real application, this would be an API call
        // For this demo, we'll use sample data
        this.foodDatabase = [
            {
                id: 'apple',
                name: 'Apple',
                category: 'fruits',
                image: 'images/food/apple.jpg',
                calories: 52,
                protein: 0.3,
                carbs: 14,
                fat: 0.2,
                nutrients: {
                    saturatedFat: 0,
                    transFat: 0,
                    monounsaturatedFat: 0.1,
                    polyunsaturatedFat: 0.1,
                    cholesterol: 0,
                    sodium: 1,
                    fiber: 2.4,
                    sugar: 10.3
                },
                vitamins: {
                    vitaminA: 1,
                    vitaminC: 8,
                    vitaminD: 0,
                    vitaminE: 2,
                    vitaminK: 2,
                    thiamin: 1,
                    riboflavin: 2,
                    niacin: 1,
                    vitaminB6: 3,
                    folate: 1,
                    vitaminB12: 0
                },
                minerals: {
                    calcium: 1,
                    iron: 1,
                    magnesium: 2,
                    phosphorus: 1,
                    potassium: 3,
                    zinc: 0,
                    copper: 2,
                    manganese: 1,
                    selenium: 0
                },
                health: {
                    benefits: [
                        'High in fiber and water which may aid weight loss',
                        'Contains antioxidants that may lower risk of chronic diseases',
                        'Supports heart health with soluble fiber that helps lower cholesterol',
                        'May help lower risk of type 2 diabetes'
                    ],
                    dietaryConsiderations: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Low-Sodium'],
                    glycemicIndex: 36
                },
                servings: {
                    '100g': { multiplier: 1 },
                    '1cup': { multiplier: 1.25, equivalent: '125g' },
                    '1oz': { multiplier: 0.28, equivalent: '28g' },
                    '1tbsp': { multiplier: 0.09, equivalent: '9g' },
                    '1tsp': { multiplier: 0.03, equivalent: '3g' }
                }
            },
            {
                id: 'banana',
                name: 'Banana',
                category: 'fruits',
                image: 'images/food/banana.jpg',
                calories: 89,
                protein: 1.1,
                carbs: 22.8,
                fat: 0.3,
                nutrients: {
                    saturatedFat: 0.1,
                    transFat: 0,
                    monounsaturatedFat: 0.1,
                    polyunsaturatedFat: 0.1,
                    cholesterol: 0,
                    sodium: 1,
                    fiber: 2.6,
                    sugar: 12.2
                },
                vitamins: {
                    vitaminA: 1,
                    vitaminC: 10,
                    vitaminD: 0,
                    vitaminE: 1,
                    vitaminK: 0.5,
                    thiamin: 3,
                    riboflavin: 5,
                    niacin: 4,
                    vitaminB6: 20,
                    folate: 5,
                    vitaminB12: 0
                },
                minerals: {
                    calcium: 0.5,
                    iron: 2,
                    magnesium: 8,
                    phosphorus: 2,
                    potassium: 10,
                    zinc: 1,
                    copper: 5,
                    manganese: 15,
                    selenium: 1
                },
                health: {
                    benefits: [
                        'Good source of potassium which supports heart health',
                        'Contains prebiotic fiber that feeds healthy gut bacteria',
                        'Provides vitamin B6 that supports brain development and metabolism',
                        'Natural source of energy for physical activity'
                    ],
                    dietaryConsiderations: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Low-Sodium'],
                    glycemicIndex: 51
                },
                servings: {
                    '100g': { multiplier: 1 },
                    '1cup': { multiplier: 1.18, equivalent: '118g' },
                    '1oz': { multiplier: 0.28, equivalent: '28g' },
                    '1tbsp': { multiplier: 0.15, equivalent: '15g' },
                    '1tsp': { multiplier: 0.05, equivalent: '5g' }
                }
            },
            {
                id: 'chicken-breast',
                name: 'Chicken Breast',
                category: 'proteins',
                image: 'images/food/chicken-breast.jpg',
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
                nutrients: {
                    saturatedFat: 1,
                    transFat: 0,
                    monounsaturatedFat: 1.5,
                    polyunsaturatedFat: 0.8,
                    cholesterol: 85,
                    sodium: 74,
                    fiber: 0,
                    sugar: 0
                },
                vitamins: {
                    vitaminA: 1,
                    vitaminC: 0,
                    vitaminD: 1,
                    vitaminE: 2,
                    vitaminK: 0,
                    thiamin: 5,
                    riboflavin: 8,
                    niacin: 50,
                    vitaminB6: 30,
                    folate: 2,
                    vitaminB12: 10
                },
                minerals: {
                    calcium: 1,
                    iron: 5,
                    magnesium: 7,
                    phosphorus: 20,
                    potassium: 8,
                    zinc: 7,
                    copper: 2,
                    manganese: 1,
                    selenium: 35
                },
                health: {
                    benefits: [
                        'Excellent source of lean protein for muscle maintenance and growth',
                        'Contains essential B vitamins that support energy metabolism',
                        'Rich in selenium which supports immune function',
                        'Low in saturated fat compared to other meat proteins'
                    ],
                    dietaryConsiderations: ['Gluten-Free', 'Low-Carb', 'Keto-Friendly', 'Paleo-Friendly'],
                    glycemicIndex: 0
                },
                servings: {
                    '100g': { multiplier: 1 },
                    '1cup': { multiplier: 1.4, equivalent: '140g' },
                    '1oz': { multiplier: 0.28, equivalent: '28g' },
                    '1tbsp': { multiplier: 0.15, equivalent: '15g' },
                    '1tsp': { multiplier: 0.05, equivalent: '5g' }
                }
            },
            {
                id: 'salmon',
                name: 'Salmon',
                category: 'proteins',
                image: 'images/food/salmon.jpg',
                calories: 208,
                protein: 20,
                carbs: 0,
                fat: 13,
                nutrients: {
                    saturatedFat: 3,
                    transFat: 0,
                    monounsaturatedFat: 4.5,
                    polyunsaturatedFat: 4,
                    cholesterol: 55,
                    sodium: 50,
                    fiber: 0,
                    sugar: 0
                },
                vitamins: {
                    vitaminA: 2,
                    vitaminC: 0,
                    vitaminD: 100,
                    vitaminE: 5,
                    vitaminK: 1,
                    thiamin: 20,
                    riboflavin: 30,
                    niacin: 40,
                    vitaminB6: 35,
                    folate: 4,
                    vitaminB12: 80
                },
                minerals: {
                    calcium: 1,
                    iron: 4,
                    magnesium: 10,
                    phosphorus: 25,
                    potassium: 8,
                    zinc: 5,
                    copper: 10,
                    manganese: 1,
                    selenium: 60
                },
                health: {
                    benefits: [
                        'Rich in omega-3 fatty acids which support heart and brain health',
                        'Excellent source of vitamin D which supports bone health and immunity',
                        'Contains astaxanthin, an antioxidant that may reduce inflammation',
                        'High in B vitamins that support brain function and energy production'
                    ],
                    dietaryConsiderations: ['Gluten-Free', 'Low-Carb', 'Keto-Friendly', 'Paleo-Friendly'],
                    glycemicIndex: 0
                },
                servings: {
                    '100g': { multiplier: 1 },
                    '1cup': { multiplier: 1.32, equivalent: '132g' },
                    '1oz': { multiplier: 0.28, equivalent: '28g' },
                    '1tbsp': { multiplier: 0.15, equivalent: '15g' },
                    '1tsp': { multiplier: 0.05, equivalent: '5g' }
                }
            },
            {
                id: 'broccoli',
                name: 'Broccoli',
                category: 'vegetables',
                image: 'images/food/broccoli.jpg',
                calories: 34,
                protein: 2.8,
                carbs: 6.6,
                fat: 0.4,
                nutrients: {
                    saturatedFat: 0.1,
                    transFat: 0,
                    monounsaturatedFat: 0,
                    polyunsaturatedFat: 0.2,
                    cholesterol: 0,
                    sodium: 33,
                    fiber: 2.6,
                    sugar: 1.7
                },
                vitamins: {
                    vitaminA: 12,
                    vitaminC: 150,
                    vitaminD: 0,
                    vitaminE: 7,
                    vitaminK: 115,
                    thiamin: 5,
                    riboflavin: 10,
                    niacin: 5,
                    vitaminB6: 15,
                    folate: 15,
                    vitaminB12: 0
                },
                minerals: {
                    calcium: 5,
                    iron: 5,
                    magnesium: 6,
                    phosphorus: 8,
                    potassium: 9,
                    zinc: 4,
                    copper: 3,
                    manganese: 10,
                    selenium: 3
                },
                health: {
                    benefits: [
                        'High in vitamin C which supports immune function',
                        'Contains sulforaphane, a compound that may help prevent cancer',
                        'Rich in vitamin K which supports bone health',
                        'Good source of fiber which supports digestive health'
                    ],
                    dietaryConsiderations: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Low-Calorie', 'Low-Fat'],
                    glycemicIndex: 15
                },
                servings: {
                    '100g': { multiplier: 1 },
                    '1cup': { multiplier: 0.91, equivalent: '91g' },
                    '1oz': { multiplier: 0.28, equivalent: '28g' },
                    '1tbsp': { multiplier: 0.1, equivalent: '10g' },
                    '1tsp': { multiplier: 0.03, equivalent: '3g' }
                }
            }
        ];
    }
    
    // Perform search
    performSearch() {
        this.currentSearch = this.searchInput.value.trim();
        this.currentPage = 1;
        this.updateFilters();
    }
    
    // Update filters and refresh results
    updateFilters() {
        this.currentCategory = this.categorySelect.value;
        this.currentSort = this.sortBySelect.value;
        this.displayResults();
    }
    
    // Toggle advanced filters visibility
    toggleAdvancedFilters() {
        this.advancedFiltersVisible = !this.advancedFiltersVisible;
        if (this.advancedFiltersVisible) {
            this.advancedFilters.classList.add('active');
            this.advancedFilterToggle.textContent = 'Hide Advanced Filters';
        } else {
            this.advancedFilters.classList.remove('active');
            this.advancedFilterToggle.textContent = 'Show Advanced Filters';
        }
    }
    
    // Apply advanced filters
    applyAdvancedFilters() {
        this.currentPage = 1;
        this.displayResults();
    }
    
    // Reset all filters
    resetFilters() {
        // Reset basic filters
        this.searchInput.value = '';
        this.currentSearch = '';
        this.categorySelect.value = 'all';
        this.currentCategory = 'all';
        this.sortBySelect.value = 'relevance';
        this.currentSort = 'relevance';
        
        // Reset advanced filters
        this.caloriesMin.value = '';
        this.caloriesMax.value = '';
        this.proteinMin.value = '';
        this.proteinMax.value = '';
        this.carbsMin.value = '';
        this.carbsMax.value = '';
        this.fatMin.value = '';
        this.fatMax.value = '';
        this.onlyFavorites.checked = false;
        this.recentlyUsed.checked = false;
        
        // Reset page and display results
        this.currentPage = 1;
        this.displayResults();
    }
    
    // Display results based on current filters
    displayResults() {
        // Show loading spinner
        this.loadingSpinner.classList.add('active');
        this.resultsGrid.innerHTML = '';
        this.emptyResults.classList.remove('active');
        
        // Filter results
        let results = this.filterResults();
        
        // Sort results
        results = this.sortResults(results);
        
        // Calculate pagination
        this.totalPages = Math.ceil(results.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedResults = results.slice(startIndex, endIndex);
        
        // Update pagination UI
        this.currentPageEl.textContent = this.currentPage;
        this.totalPagesEl.textContent = this.totalPages;
        this.prevBtn.disabled = this.currentPage === 1;
        this.nextBtn.disabled = this.currentPage === this.totalPages || this.totalPages === 0;
        
        // Update results count
        this.resultsCount.textContent = `${results.length} results found`;
        
        // Hide loading spinner
        setTimeout(() => {
            this.loadingSpinner.classList.remove('active');
            
            // Display empty message if no results
            if (paginatedResults.length === 0) {
                this.emptyResults.classList.add('active');
                return;
            }
            
            // Render results
            paginatedResults.forEach(food => {
                this.resultsGrid.appendChild(this.createFoodCard(food));
            });
        }, 500); // Simulate loading for 500ms
    }
    
    // Filter results based on all criteria
    filterResults() {
        return this.foodDatabase.filter(food => {
            // Basic text search
            if (this.currentSearch && !food.name.toLowerCase().includes(this.currentSearch.toLowerCase())) {
                return false;
            }
            
            // Category filter
            if (this.currentCategory !== 'all' && food.category !== this.currentCategory) {
                return false;
            }
            
            // Advanced filters - nutritional ranges
            if (this.caloriesMin.value && food.calories < parseFloat(this.caloriesMin.value)) return false;
            if (this.caloriesMax.value && food.calories > parseFloat(this.caloriesMax.value)) return false;
            if (this.proteinMin.value && food.protein < parseFloat(this.proteinMin.value)) return false;
            if (this.proteinMax.value && food.protein > parseFloat(this.proteinMax.value)) return false;
            if (this.carbsMin.value && food.carbs < parseFloat(this.carbsMin.value)) return false;
            if (this.carbsMax.value && food.carbs > parseFloat(this.carbsMax.value)) return false;
            if (this.fatMin.value && food.fat < parseFloat(this.fatMin.value)) return false;
            if (this.fatMax.value && food.fat > parseFloat(this.fatMax.value)) return false;
            
            // Favorites filter
            if (this.onlyFavorites.checked && !this.favorites.includes(food.id)) return false;
            
            // Recently used filter
            if (this.recentlyUsed.checked && !this.recentlyUsed.includes(food.id)) return false;
            
            return true;
        });
    }
    
    // Sort results based on selected criteria
    sortResults(results) {
        switch (this.currentSort) {
            case 'name-asc':
                return results.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return results.sort((a, b) => b.name.localeCompare(a.name));
            case 'calories-asc':
                return results.sort((a, b) => a.calories - b.calories);
            case 'calories-desc':
                return results.sort((a, b) => b.calories - a.calories);
            case 'protein-desc':
                return results.sort((a, b) => b.protein - a.protein);
            case 'carbs-desc':
                return results.sort((a, b) => b.carbs - a.carbs);
            case 'fat-desc':
                return results.sort((a, b) => b.fat - a.fat);
            default: // relevance or any other case
                // For relevance, prioritize exact matches, then starting with search term
                if (this.currentSearch) {
                    return results.sort((a, b) => {
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        const search = this.currentSearch.toLowerCase();
                        
                        // Exact match gets highest priority
                        if (aName === search && bName !== search) return -1;
                        if (bName === search && aName !== search) return 1;
                        
                        // Starts with gets second priority
                        if (aName.startsWith(search) && !bName.startsWith(search)) return -1;
                        if (bName.startsWith(search) && !aName.startsWith(search)) return 1;
                        
                        // Otherwise sort alphabetically
                        return aName.localeCompare(bName);
                    });
                } else {
                    return results.sort((a, b) => a.name.localeCompare(b.name));
                }
        }
    }
    
    // Create a food card element
    createFoodCard(food) {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.setAttribute('data-food-id', food.id);
        
        // Check if food is favorited
        const isFavorite = this.favorites.includes(food.id);
        const favoriteClass = isFavorite ? 'active' : '';
        
        // Set card HTML
        card.innerHTML = `
            <div class="food-card-img">
                <img src="${food.image}" alt="${food.name}">
                <button class="favorite-btn ${favoriteClass}" aria-label="Add to favorites">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="food-card-content">
                <h3 class="food-name">${food.name}</h3>
                <div class="food-category">${this.getCategoryLabel(food.category)}</div>
                <div class="food-card-nutrition">
                    <div class="nutrition-item">
                        <span class="label">Calories</span>
                        <span class="value">${food.calories}</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Protein</span>
                        <span class="value">${food.protein}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Carbs</span>
                        <span class="value">${food.carbs}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Fat</span>
                        <span class="value">${food.fat}g</span>
                    </div>
                </div>
                <div class="food-card-actions">
                    <button class="btn btn-sm view-details-btn">View Details</button>
                    <button class="btn btn-sm btn-primary add-food-btn">Add to Diary</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(food.id);
            favoriteBtn.classList.toggle('active');
        });
        
        const viewDetailsBtn = card.querySelector('.view-details-btn');
        viewDetailsBtn.addEventListener('click', () => {
            this.showFoodDetails(food);
        });
        
        const addFoodBtn = card.querySelector('.add-food-btn');
        addFoodBtn.addEventListener('click', () => {
            this.openAddToDiary(food);
        });
        
        // Make entire card clickable to show details
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.showFoodDetails(food);
            }
        });
        
        return card;
    }
    
    // Get friendly category label
    getCategoryLabel(category) {
        const categories = {
            'fruits': 'Fruits',
            'vegetables': 'Vegetables',
            'grains': 'Grains',
            'proteins': 'Proteins',
            'dairy': 'Dairy',
            'fats': 'Fats & Oils',
            'beverages': 'Beverages',
            'snacks': 'Snacks',
            'condiments': 'Condiments',
            'prepared': 'Prepared Foods'
        };
        
        return categories[category] || 'Other';
    }
    
    // Pagination - go to previous page
    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayResults();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    // Pagination - go to next page
    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayResults();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    // Toggle favorite status for a food
    toggleFavorite(foodId) {
        const index = this.favorites.indexOf(foodId);
        if (index === -1) {
            this.favorites.push(foodId);
            this.showToast(`Added ${this.getFoodNameById(foodId)} to favorites!`);
        } else {
            this.favorites.splice(index, 1);
            this.showToast(`Removed ${this.getFoodNameById(foodId)} from favorites`);
        }
        this.saveToStorage('favorites', this.favorites);
    }
    
    // Get food name by ID
    getFoodNameById(foodId) {
        const food = this.foodDatabase.find(f => f.id === foodId);
        return food ? food.name : 'Food';
    }
    
    // Show food details in modal
    showFoodDetails(food) {
        // Set food details in modal
        this.foodDetailTitle.textContent = food.name;
        this.caloriesValue.textContent = food.calories;
        this.proteinValue.textContent = `${food.protein}g`;
        this.carbsValue.textContent = `${food.carbs}g`;
        this.fatValue.textContent = `${food.fat}g`;
        
        // Populate detail nutrition fields
        this.caloriesDetail.textContent = food.calories;
        this.totalFat.textContent = `${food.fat}g`;
        this.saturatedFat.textContent = `${food.nutrients.saturatedFat}g`;
        this.transFat.textContent = `${food.nutrients.transFat}g`;
        this.monoFat.textContent = `${food.nutrients.monounsaturatedFat}g`;
        this.polyFat.textContent = `${food.nutrients.polyunsaturatedFat}g`;
        this.cholesterol.textContent = `${food.nutrients.cholesterol}mg`;
        this.sodium.textContent = `${food.nutrients.sodium}mg`;
        this.totalCarbs.textContent = `${food.carbs}g`;
        this.fiber.textContent = `${food.nutrients.fiber}g`;
        this.sugars.textContent = `${food.nutrients.sugar}g`;
        this.proteinDetail.textContent = `${food.protein}g`;
        
        // Update favorite button status
        if (this.favorites.includes(food.id)) {
            this.favoriteBtn.classList.add('active');
        } else {
            this.favoriteBtn.classList.remove('active');
        }
        
        // Add event listener to favorite button (remove previous listeners first)
        this.favoriteBtn.replaceWith(this.favoriteBtn.cloneNode(true));
        this.favoriteBtn = document.getElementById('favorite-btn'); // Re-assign after cloning
        this.favoriteBtn.addEventListener('click', () => {
            this.toggleFavorite(food.id);
            this.favoriteBtn.classList.toggle('active');
        });
        
        // Add event listener to add to diary button
        this.addToDiaryBtn.replaceWith(this.addToDiaryBtn.cloneNode(true));
        this.addToDiaryBtn = document.getElementById('add-to-diary-btn'); // Re-assign after cloning
        this.addToDiaryBtn.addEventListener('click', () => {
            this.foodDetailModal.classList.remove('active');
            this.openAddToDiary(food);
        });
        
        // Populate serving size dropdown
        this.servingSizeSelect.innerHTML = '';
        Object.entries(food.servings).forEach(([size, data]) => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size + (data.equivalent ? ` (${data.equivalent})` : '');
            this.servingSizeSelect.appendChild(option);
        });
        
        // Activate first tab by default
        this.switchTab('nutrition');
        
        // Show modal
        this.foodDetailModal.classList.add('active');
        
        // Add to recently used
        this.addToRecentlyUsed(food.id);
    }
    
    // Switch tabs in food detail modal
    switchTab(tabId) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.getAttribute('id') === `${tabId}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
    
    // Add to recently used list
    addToRecentlyUsed(foodId) {
        // Remove if already in list
        const index = this.recentlyUsed.indexOf(foodId);
        if (index !== -1) {
            this.recentlyUsed.splice(index, 1);
        }
        
        // Add to beginning of list
        this.recentlyUsed.unshift(foodId);
        
        // Limit to 20 items
        if (this.recentlyUsed.length > 20) {
            this.recentlyUsed.pop();
        }
        
        // Save to storage
        this.saveToStorage('recentlyUsed', this.recentlyUsed);
    }
    
    // Open add to diary modal
    openAddToDiary(food) {
        // Set food details
        this.addFoodName.textContent = food.name;
        this.addCalories.textContent = food.calories;
        this.addProtein.textContent = `${food.protein}g`;
        this.addCarbs.textContent = `${food.carbs}g`;
        this.addFat.textContent = `${food.fat}g`;
        
        // Set default values
        this.servingAmount.value = 1;
        
        // Update nutrition based on serving
        this.updateNutritionForServing(food);
        
        // Add event listeners
        this.servingAmount.addEventListener('input', () => {
            this.updateNutritionForServing(food);
        });
        
        this.servingUnit.innerHTML = '';
        Object.entries(food.servings).forEach(([size, data]) => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size + (data.equivalent ? ` (${data.equivalent})` : '');
            this.servingUnit.appendChild(option);
        });
        
        this.servingUnit.addEventListener('change', () => {
            this.updateNutritionForServing(food);
        });
        
        // Add event listener to confirm button
        this.addToDiaryConfirm.replaceWith(this.addToDiaryConfirm.cloneNode(true));
        this.addToDiaryConfirm = document.getElementById('add-to-diary-confirm'); // Re-assign after cloning
        this.addToDiaryConfirm.addEventListener('click', () => {
            this.addFoodToDiary(food);
        });
        
        // Show modal
        this.addToDiaryModal.classList.add('active');
    }
    
    // Update nutrition based on serving size
    updateNutritionForServing(food) {
        const amount = parseFloat(this.servingAmount.value) || 0;
        const unit = this.servingUnit.value;
        const multiplier = food.servings[unit]?.multiplier || 1;
        
        // Calculate nutrition values
        const calories = Math.round(food.calories * multiplier * amount);
        const protein = (food.protein * multiplier * amount).toFixed(1);
        const carbs = (food.carbs * multiplier * amount).toFixed(1);
        const fat = (food.fat * multiplier * amount).toFixed(1);
        
        // Update display
        this.updatedCalories.textContent = calories;
        this.updatedProtein.textContent = `${protein}g`;
        this.updatedCarbs.textContent = `${carbs}g`;
        this.updatedFat.textContent = `${fat}g`;
    }
    
    // Add food to diary
    addFoodToDiary(food) {
        const amount = parseFloat(this.servingAmount.value) || 0;
        const unit = this.servingUnit.value;
        const multiplier = food.servings[unit]?.multiplier || 1;
        const date = this.diaryDate.value;
        const mealType = this.mealType.value;
        
        // Calculate nutrition values
        const calories = Math.round(food.calories * multiplier * amount);
        const protein = parseFloat((food.protein * multiplier * amount).toFixed(1));
        const carbs = parseFloat((food.carbs * multiplier * amount).toFixed(1));
        const fat = parseFloat((food.fat * multiplier * amount).toFixed(1));
        
        // Create diary entry
        const entry = {
            id: Date.now(),
            foodId: food.id,
            name: food.name,
            date: date,
            mealType: mealType,
            servingAmount: amount,
            servingUnit: unit,
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat,
            timestamp: new Date().toISOString()
        };
        
        // Get existing diary entries
        let diaryEntries = this.loadFromStorage('diaryEntries') || [];
        
        // Add new entry
        diaryEntries.push(entry);
        
        // Save to storage
        this.saveToStorage('diaryEntries', diaryEntries);
        
        // Close modal
        this.addToDiaryModal.classList.remove('active');
        
        // Show toast
        this.showToast(`Added ${food.name} to your diary!`);
        
        // Add to recently used
        this.addToRecentlyUsed(food.id);
    }
    
    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize the food search functionality when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const foodSearch = new FoodSearch();
    
    // Display initial results
    foodSearch.displayResults();
});
