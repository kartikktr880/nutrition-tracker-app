// Recipes.js - JavaScript functionality for the recipes page

document.addEventListener('DOMContentLoaded', function() {
    const recipeManager = new RecipeManager();
    recipeManager.init();
});

class RecipeManager {
    constructor() {
        // DOM elements
        this.recipeGrid = document.getElementById('recipe-grid');
        this.emptyState = document.getElementById('empty-state');
        this.createRecipeBtn = document.getElementById('create-recipe-btn');
        this.createRecipeEmptyBtn = document.getElementById('create-recipe-empty-btn');
        this.categoryButtons = document.querySelectorAll('.category-btn');
        this.recipeSearchInput = document.getElementById('recipe-search-input');
        this.recipeForm = document.getElementById('recipe-form');
        this.cancelRecipeBtn = document.getElementById('cancel-recipe-btn');
        this.saveRecipeBtn = document.getElementById('save-recipe-btn');
        this.formTabs = document.querySelectorAll('.form-tab');
        this.ingredientSearchBtn = document.getElementById('ingredient-search-btn');
        this.addIngredientBtn = document.getElementById('add-ingredient-btn');
        this.addInstructionBtn = document.getElementById('add-instruction-btn');
        this.ingredientList = document.getElementById('ingredient-list');
        this.instructionList = document.getElementById('instruction-list');
        this.recipeEditorModal = document.getElementById('recipe-editor-modal');
        this.recipeViewerModal = document.getElementById('recipe-viewer-modal');
        this.editRecipeBtn = document.getElementById('edit-recipe-btn');
        this.deleteRecipeBtn = document.getElementById('delete-recipe-btn');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        this.confirmModal = document.getElementById('confirm-modal');
        this.addToLogBtn = document.getElementById('add-to-log-btn');
        this.addToLogModal = document.getElementById('add-to-log-modal');
        this.confirmAddToLogBtn = document.getElementById('confirm-add-to-log-btn');
        this.recipeImageInput = document.getElementById('recipe-image');
        this.imagePreview = document.getElementById('image-preview');
        this.shareRecipeBtn = document.getElementById('share-recipe-btn');
        
        // State variables
        this.recipes = [];
        this.currentRecipe = null;
        this.currentRecipeId = null;
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.ingredientCounter = 0;
        this.foodDatabase = this.getMockFoodDatabase();
    }
    
    init() {
        this.setupEventListeners();
        this.loadRecipes();
        this.filterAndRenderRecipes();
    }
    
    setupEventListeners() {
        // Create recipe buttons
        this.createRecipeBtn.addEventListener('click', () => this.createRecipe());
        this.createRecipeEmptyBtn.addEventListener('click', () => this.createRecipe());
        
        // Category filters
        this.categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentCategory = button.dataset.category;
                this.filterAndRenderRecipes();
            });
        });
        
        // Search
        this.recipeSearchInput.addEventListener('input', this.debounce(() => {
            this.searchQuery = this.recipeSearchInput.value.trim().toLowerCase();
            this.filterAndRenderRecipes();
        }, 300));
        
        // Form tabs
        this.formTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.formTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabId = tab.dataset.tab;
                document.querySelectorAll('.form-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelector(`.form-tab-content[data-tab-content="${tabId}"]`).classList.add('active');
            });
        });
        
        // Ingredient and instruction buttons
        this.ingredientSearchBtn.addEventListener('click', () => this.searchIngredient());
        this.addIngredientBtn.addEventListener('click', () => this.addIngredient());
        this.addInstructionBtn.addEventListener('click', () => this.addInstruction());
        
        // Form buttons
        this.cancelRecipeBtn.addEventListener('click', () => {
            this.closeModal(this.recipeEditorModal);
            this.resetRecipeForm();
        });
        
        this.saveRecipeBtn.addEventListener('click', () => this.saveRecipe());
        
        // Recipe actions
        this.editRecipeBtn.addEventListener('click', () => {
            if (this.currentRecipeId) {
                this.closeModal(this.recipeViewerModal);
                this.editRecipe(this.currentRecipeId);
            }
        });
        
        this.deleteRecipeBtn.addEventListener('click', () => {
            if (this.currentRecipeId) {
                this.closeModal(this.recipeViewerModal);
                this.openModal(this.confirmModal);
            }
        });
        
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteRecipe());
        
        this.cancelDeleteBtn.addEventListener('click', () => {
            this.closeModal(this.confirmModal);
        });
        
        // Add to food log
        this.addToLogBtn.addEventListener('click', () => {
            this.closeModal(this.recipeViewerModal);
            this.openModal(this.addToLogModal);
            
            // Set current meal type based on time of day
            const mealTypeSelect = document.getElementById('log-meal-type');
            if (mealTypeSelect) {
                const hour = new Date().getHours();
                let defaultMealType = 'snacks';
                
                if (hour >= 5 && hour < 11) {
                    defaultMealType = 'breakfast';
                } else if (hour >= 11 && hour < 15) {
                    defaultMealType = 'lunch';
                } else if (hour >= 15 && hour < 22) {
                    defaultMealType = 'dinner';
                }
                
                mealTypeSelect.value = defaultMealType;
            }
            
            // Set today's date
            const dateInput = document.getElementById('log-date');
            if (dateInput) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                dateInput.value = `${year}-${month}-${day}`;
            }
        });
        
        this.confirmAddToLogBtn.addEventListener('click', () => this.addRecipeToLog());
        
        // Close modals
        document.querySelectorAll('.cancel-log-btn, .close-modal').forEach(element => {
            element.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Image upload
        this.recipeImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Share recipe
        if (this.shareRecipeBtn) {
            this.shareRecipeBtn.addEventListener('click', () => {
                this.shareRecipe();
            });
        }
        
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }
    
    loadRecipes() {
        // Load recipes from local storage
        const savedRecipes = localStorage.getItem('recipes');
        if (savedRecipes) {
            this.recipes = JSON.parse(savedRecipes);
        } else {
            // Sample recipes for demonstration
            this.recipes = [
                {
                    id: '1',
                    name: 'Avocado Toast',
                    description: 'A simple and nutritious breakfast option',
                    category: 'breakfast',
                    servings: 1,
                    prepTime: 5,
                    cookTime: 5,
                    ingredients: [
                        { id: 'bread', name: 'Whole Grain Bread', amount: 2, unit: 'slice' },
                        { id: 'avocado', name: 'Avocado', amount: 1, unit: 'piece' },
                        { id: 'lemon', name: 'Lemon Juice', amount: 1, unit: 'tsp' },
                        { id: 'salt', name: 'Salt', amount: 1, unit: 'pinch' }
                    ],
                    instructions: [
                        'Toast the bread until golden and crispy',
                        'Mash the avocado in a bowl with lemon juice and salt',
                        'Spread the avocado mixture on the toast',
                        'Optionally, top with red pepper flakes or sesame seeds'
                    ],
                    nutrition: {
                        calories: 320,
                        protein: 7,
                        carbs: 35,
                        fat: 18
                    },
                    image: 'images/default-recipe.jpg'
                },
                {
                    id: '2',
                    name: 'Greek Salad',
                    description: 'Fresh and healthy Mediterranean salad',
                    category: 'lunch',
                    servings: 2,
                    prepTime: 15,
                    cookTime: 0,
                    ingredients: [
                        { id: 'cucumber', name: 'Cucumber', amount: 1, unit: 'piece' },
                        { id: 'tomato', name: 'Tomatoes', amount: 2, unit: 'piece' },
                        { id: 'onion', name: 'Red Onion', amount: 0.5, unit: 'piece' },
                        { id: 'feta', name: 'Feta Cheese', amount: 100, unit: 'g' },
                        { id: 'olives', name: 'Kalamata Olives', amount: 10, unit: 'piece' },
                        { id: 'oil', name: 'Olive Oil', amount: 2, unit: 'tbsp' }
                    ],
                    instructions: [
                        'Dice the cucumber and tomatoes',
                        'Thinly slice the red onion',
                        'Combine all vegetables in a bowl',
                        'Crumble feta cheese over the top',
                        'Add olives and drizzle with olive oil',
                        'Season with salt and oregano to taste'
                    ],
                    nutrition: {
                        calories: 280,
                        protein: 8,
                        carbs: 12,
                        fat: 22
                    },
                    image: 'images/default-recipe.jpg'
                }
            ];
            
            // Save sample recipes
            localStorage.setItem('recipes', JSON.stringify(this.recipes));
        }
        
        this.toggleEmptyState();
    }
    
    filterAndRenderRecipes() {
        let filteredRecipes = [...this.recipes];
        
        // Apply category filter
        if (this.currentCategory !== 'all') {
            filteredRecipes = filteredRecipes.filter(recipe => recipe.category === this.currentCategory);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filteredRecipes = filteredRecipes.filter(recipe => {
                return (
                    recipe.name.toLowerCase().includes(this.searchQuery) ||
                    recipe.description.toLowerCase().includes(this.searchQuery) ||
                    recipe.ingredients.some(ing => ing.name.toLowerCase().includes(this.searchQuery))
                );
            });
        }
        
        this.renderRecipes(filteredRecipes);
    }
    
    renderRecipes(recipesToRender) {
        if (!this.recipeGrid) return;
        
        this.recipeGrid.innerHTML = '';
        
        if (recipesToRender.length === 0) {
            this.emptyState.style.display = 'flex';
            this.recipeGrid.style.display = 'none';
            return;
        }
        
        this.emptyState.style.display = 'none';
        this.recipeGrid.style.display = 'grid';
        
        recipesToRender.forEach(recipe => {
            const recipeCard = document.createElement('div');
            recipeCard.className = 'recipe-card';
            recipeCard.dataset.id = recipe.id;
            
            const categoryName = this.getCategoryName(recipe.category);
            
            recipeCard.innerHTML = `
                <div class="recipe-image">
                    <img src="${recipe.image || 'images/default-recipe.jpg'}" alt="${recipe.name}">
                    <div class="recipe-category">${categoryName}</div>
                </div>
                <div class="recipe-info">
                    <h3 class="recipe-name">${recipe.name}</h3>
                    <div class="recipe-meta">
                        <span>
                            <i class="far fa-clock"></i> ${recipe.prepTime + recipe.cookTime} min
                        </span>
                        <span>
                            <i class="fas fa-fire"></i> ${recipe.nutrition.calories} cal
                        </span>
                    </div>
                    <p class="recipe-description">${recipe.description}</p>
                </div>
                <div class="recipe-actions">
                    <button class="view-recipe" title="View Recipe">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="edit-recipe" title="Edit Recipe">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="add-to-log" title="Add to Food Log">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            
            // Add event listeners to buttons
            recipeCard.querySelector('.view-recipe').addEventListener('click', () => {
                this.viewRecipe(recipe.id);
            });
            
            recipeCard.querySelector('.edit-recipe').addEventListener('click', () => {
                this.editRecipe(recipe.id);
            });
            
            recipeCard.querySelector('.add-to-log').addEventListener('click', () => {
                this.currentRecipe = recipe;
                this.currentRecipeId = recipe.id;
                this.openModal(this.addToLogModal);
                
                // Set current meal type based on time of day
                const mealTypeSelect = document.getElementById('log-meal-type');
                if (mealTypeSelect) {
                    const hour = new Date().getHours();
                    let defaultMealType = 'snacks';
                    
                    if (hour >= 5 && hour < 11) {
                        defaultMealType = 'breakfast';
                    } else if (hour >= 11 && hour < 15) {
                        defaultMealType = 'lunch';
                    } else if (hour >= 15 && hour < 22) {
                        defaultMealType = 'dinner';
                    }
                    
                    mealTypeSelect.value = defaultMealType;
                }
                
                // Set today's date
                const dateInput = document.getElementById('log-date');
                if (dateInput) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    dateInput.value = `${year}-${month}-${day}`;
                }
            });
            
            this.recipeGrid.appendChild(recipeCard);
        });
    }
    
    toggleEmptyState() {
        if (this.recipes.length === 0) {
            this.emptyState.style.display = 'flex';
            this.recipeGrid.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.recipeGrid.style.display = 'grid';
        }
    }
    
    getCategoryName(category) {
        const categories = {
            'breakfast': 'Breakfast',
            'lunch': 'Lunch',
            'dinner': 'Dinner',
            'snacks': 'Snacks',
            'dessert': 'Dessert',
            'other': 'Other'
        };
        
        return categories[category] || 'Other';
    }
    
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    shareRecipe() {
        if (!this.currentRecipe) return;
        
        // Generate share content
        const shareContent = {
            title: `${this.currentRecipe.name} Recipe - Nutrition Tracker`,
            description: `Check out this delicious ${this.currentRecipe.name} recipe with ${this.currentRecipe.nutrition?.calories || 0} calories per serving!`,
            url: `${window.location.origin}/recipes.html?id=${this.currentRecipe.id}`,
            image: this.currentRecipe.image || 'images/placeholder-recipe.jpg',
            type: 'recipe'
        };
        
        // Store the share content for use by the share buttons
        window.currentShareableContent = shareContent;
        
        // Check if SocialSharing is available
        if (typeof SocialSharing !== 'undefined') {
            // Show share modal
            this.openModal(document.getElementById('share-modal'));
            
            // Set up social sharing buttons
            document.querySelectorAll('.share-platform-btn').forEach(button => {
                const platform = button.getAttribute('data-platform');
                button.onclick = () => {
                    const socialSharing = new SocialSharing();
                    socialSharing.share(shareContent, platform)
                        .then(success => {
                            if (success) {
                                this.closeModal(document.getElementById('share-modal'));
                                if (platform === 'copy_link') {
                                    this.showSuccessMessage('Link copied to clipboard!');
                                } else {
                                    this.showSuccessMessage(`Shared to ${platform}!`);
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error sharing recipe:', error);
                            this.showErrorMessage('Failed to share recipe');
                        });
                };
            });
        } else {
            // Fallback to the original share modal
            this.showShareModal(this.generateRecipeShareContent(this.currentRecipe));
        }
    }
    
    createRecipe() {
        this.currentRecipe = null;
        this.currentRecipeId = null;
        
        // Set modal title
        const modalTitle = this.recipeEditorModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Create Recipe';
        }
        
        // Reset form
        this.resetRecipeForm();
        
        // Open modal
        this.openModal(this.recipeEditorModal);
    }
    
    editRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        this.currentRecipe = recipe;
        this.currentRecipeId = recipeId;
        
        // Set modal title
        const modalTitle = this.recipeEditorModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Recipe';
        }
        
        // Populate form
        this.populateRecipeForm(recipe, true);
        
        // Open modal
        this.openModal(this.recipeEditorModal);
    }
    
    viewRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        this.currentRecipe = recipe;
        this.currentRecipeId = recipeId;
        
        // Populate viewer
        this.populateRecipeViewer(recipe);
        
        // Open modal
        this.openModal(this.recipeViewerModal);
    }
    
    async searchIngredient() {
        const searchInput = document.getElementById('ingredient-search-input');
        const searchResults = document.getElementById('ingredient-search-results');
        
        if (!searchInput || !searchResults) return;
        
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        // Search in food database
        const results = this.foodDatabase.filter(food => 
            food.name.toLowerCase().includes(query)
        ).slice(0, 5);
        
        // Display results
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No ingredients found</div>';
            return;
        }
        
        results.forEach(ingredient => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="ingredient-info">
                    <h4>${ingredient.name}</h4>
                    <p>${ingredient.calories} cal, ${ingredient.protein}g protein, ${ingredient.carbs}g carbs, ${ingredient.fat}g fat</p>
                </div>
                <button class="add-search-result">Add</button>
            `;
            
            resultItem.querySelector('.add-search-result').addEventListener('click', () => {
                this.addSearchResultToIngredients(ingredient);
                searchInput.value = '';
                searchResults.innerHTML = '';
            });
            
            searchResults.appendChild(resultItem);
        });
    }
    
    addIngredient() {
        const ingredient = {
            id: `custom-${++this.ingredientCounter}`,
            name: '',
            amount: 0,
            unit: 'g',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        // Add to ingredient list
        this.addSearchResultToIngredients(ingredient, true);
    }
    
    addSearchResultToIngredients(ingredient, isCustom = false) {
        if (!this.ingredientList) return;
        
        // Remove empty message if it exists
        const emptyMessage = this.ingredientList.querySelector('.empty-list-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const ingredientItem = document.createElement('div');
        ingredientItem.className = 'ingredient-item';
        ingredientItem.dataset.id = ingredient.id;
        
        // Create ingredient HTML
        if (isCustom) {
            ingredientItem.innerHTML = `
                <div class="ingredient-details">
                    <input type="text" class="ingredient-name-input" placeholder="Ingredient name" value="${ingredient.name}">
                    <div class="ingredient-amount">
                        <input type="number" class="amount-input" min="0" step="0.01" value="${ingredient.amount}">
                        <select class="unit-select">
                            <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>grams (g)</option>
                            <option value="oz" ${ingredient.unit === 'oz' ? 'selected' : ''}>ounces (oz)</option>
                            <option value="cups" ${ingredient.unit === 'cups' ? 'selected' : ''}>cups</option>
                            <option value="tbsp" ${ingredient.unit === 'tbsp' ? 'selected' : ''}>tablespoons</option>
                            <option value="tsp" ${ingredient.unit === 'tsp' ? 'selected' : ''}>teaspoons</option>
                            <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>milliliters (ml)</option>
                            <option value="piece" ${ingredient.unit === 'piece' ? 'selected' : ''}>piece</option>
                            <option value="slice" ${ingredient.unit === 'slice' ? 'selected' : ''}>slice</option>
                        </select>
                    </div>
                </div>
                <div class="nutrition-info">
                    <div class="nutrition-input">
                        <label>Cal</label>
                        <input type="number" class="calories-input" min="0" value="${ingredient.calories}">
                    </div>
                    <div class="nutrition-input">
                        <label>P</label>
                        <input type="number" class="protein-input" min="0" step="0.1" value="${ingredient.protein}">
                    </div>
                    <div class="nutrition-input">
                        <label>C</label>
                        <input type="number" class="carbs-input" min="0" step="0.1" value="${ingredient.carbs}">
                    </div>
                    <div class="nutrition-input">
                        <label>F</label>
                        <input type="number" class="fat-input" min="0" step="0.1" value="${ingredient.fat}">
                    </div>
                </div>
                <button class="remove-ingredient" title="Remove ingredient">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        } else {
            ingredientItem.innerHTML = `
                <div class="ingredient-details">
                    <span class="ingredient-name">${ingredient.name}</span>
                    <div class="ingredient-amount">
                        <input type="number" class="amount-input" min="0" step="0.01" value="1">
                        <select class="unit-select">
                            <option value="g" selected>grams (g)</option>
                            <option value="oz">ounces (oz)</option>
                            <option value="cups">cups</option>
                            <option value="tbsp">tablespoons</option>
                            <option value="tsp">teaspoons</option>
                            <option value="ml">milliliters (ml)</option>
                            <option value="piece">piece</option>
                            <option value="slice">slice</option>
                        </select>
                    </div>
                </div>
                <div class="nutrition-info">
                    <div class="nutrition-detail">
                        <span>${ingredient.calories}</span>
                        <label>cal</label>
                    </div>
                    <div class="nutrition-detail">
                        <span>${ingredient.protein}g</span>
                        <label>protein</label>
                    </div>
                    <div class="nutrition-detail">
                        <span>${ingredient.carbs}g</span>
                        <label>carbs</label>
                    </div>
                    <div class="nutrition-detail">
                        <span>${ingredient.fat}g</span>
                        <label>fat</label>
                    </div>
                </div>
                <button class="remove-ingredient" title="Remove ingredient">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        // Add event listener to remove button
        ingredientItem.querySelector('.remove-ingredient').addEventListener('click', () => {
            ingredientItem.remove();
            
            // If no ingredients left, show empty message
            if (this.ingredientList.children.length === 0) {
                this.ingredientList.innerHTML = '<div class="empty-list-message">No ingredients added yet. Search or add ingredients above.</div>';
            }
            
            // Update nutrition
            this.updateNutritionDisplay();
        });
        
        // Add to list
        this.ingredientList.appendChild(ingredientItem);
        
        // Update nutrition
        this.updateNutritionDisplay();
    }
    
    addInstruction() {
        if (!this.instructionList) return;
        
        // Remove empty message if it exists
        const emptyMessage = this.instructionList.querySelector('.empty-list-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Create step number
        const stepNumber = this.instructionList.children.length + 1;
        
        // Create instruction step
        const instructionStep = document.createElement('div');
        instructionStep.className = 'instruction-step';
        instructionStep.innerHTML = `
            <div class="step-number">${stepNumber}</div>
            <textarea class="step-text" placeholder="Enter instruction step"></textarea>
            <button class="remove-step" title="Remove step">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add event listener to remove button
        instructionStep.querySelector('.remove-step').addEventListener('click', () => {
            instructionStep.remove();
            
            // Renumber steps
            const steps = this.instructionList.querySelectorAll('.instruction-step');
            steps.forEach((step, index) => {
                step.querySelector('.step-number').textContent = index + 1;
            });
            
            // If no instructions left, show empty message
            if (this.instructionList.children.length === 0) {
                this.instructionList.innerHTML = '<div class="empty-list-message">No instructions added yet. Add steps to your recipe.</div>';
            }
        });
        
        // Add to list
        this.instructionList.appendChild(instructionStep);
    }
    
    saveRecipe() {
        // Get form values
        const name = document.getElementById('recipe-name').value.trim();
        const description = document.getElementById('recipe-description').value.trim();
        const category = document.getElementById('recipe-category').value;
        const servings = parseInt(document.getElementById('recipe-servings').value);
        const prepTime = parseInt(document.getElementById('recipe-prep-time').value) || 0;
        const cookTime = parseInt(document.getElementById('recipe-cook-time').value) || 0;
        
        // Validate required fields
        if (!name) {
            this.showErrorMessage('Please enter a recipe name');
            return;
        }
        
        // Get ingredients
        const ingredients = [];
        const ingredientItems = this.ingredientList.querySelectorAll('.ingredient-item');
        
        ingredientItems.forEach(item => {
            const id = item.dataset.id;
            let name, calories, protein, carbs, fat;
            
            // Check if it's a custom ingredient
            const nameInput = item.querySelector('.ingredient-name-input');
            if (nameInput) {
                name = nameInput.value.trim();
                calories = parseInt(item.querySelector('.calories-input').value) || 0;
                protein = parseFloat(item.querySelector('.protein-input').value) || 0;
                carbs = parseFloat(item.querySelector('.carbs-input').value) || 0;
                fat = parseFloat(item.querySelector('.fat-input').value) || 0;
            } else {
                name = item.querySelector('.ingredient-name').textContent.trim();
                const nutrientSpans = item.querySelectorAll('.nutrition-detail span');
                calories = parseInt(nutrientSpans[0].textContent) || 0;
                protein = parseFloat(nutrientSpans[1].textContent) || 0;
                carbs = parseFloat(nutrientSpans[2].textContent) || 0;
                fat = parseFloat(nutrientSpans[3].textContent) || 0;
            }
            
            const amount = parseFloat(item.querySelector('.amount-input').value) || 0;
            const unit = item.querySelector('.unit-select').value;
            
            if (name && amount > 0) {
                ingredients.push({
                    id,
                    name,
                    amount,
                    unit,
                    calories,
                    protein,
                    carbs,
                    fat
                });
            }
        });
        
        // Validate ingredients
        if (ingredients.length === 0) {
            this.showErrorMessage('Please add at least one ingredient');
            return;
        }
        
        // Get instructions
        const instructions = [];
        const instructionSteps = this.instructionList.querySelectorAll('.instruction-step');
        
        instructionSteps.forEach(step => {
            const text = step.querySelector('.step-text').value.trim();
            if (text) {
                instructions.push(text);
            }
        });
        
        // Validate instructions
        if (instructions.length === 0) {
            this.showErrorMessage('Please add at least one instruction step');
            return;
        }
        
        // Calculate nutrition
        const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
        const totalProtein = ingredients.reduce((sum, ing) => sum + ing.protein, 0);
        const totalCarbs = ingredients.reduce((sum, ing) => sum + ing.carbs, 0);
        const totalFat = ingredients.reduce((sum, ing) => sum + ing.fat, 0);
        
        const nutrition = {
            calories: Math.round(totalCalories / servings),
            protein: Math.round(totalProtein / servings * 10) / 10,
            carbs: Math.round(totalCarbs / servings * 10) / 10,
            fat: Math.round(totalFat / servings * 10) / 10
        };
        
        // Get image
        let image = this.currentRecipe?.image || 'images/default-recipe.jpg';
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview && imagePreview.style.backgroundImage) {
            const bgImage = imagePreview.style.backgroundImage;
            if (bgImage.startsWith('url("data:image/')) {
                image = bgImage.substring(5, bgImage.length - 2);
            }
        }
        
        // Create or update recipe
        const recipe = {
            id: this.currentRecipeId || 'recipe_' + Date.now(),
            name,
            description,
            category,
            servings,
            prepTime,
            cookTime,
            ingredients,
            instructions,
            nutrition,
            image
        };
        
        // Update or add recipe
        if (this.currentRecipeId) {
            const index = this.recipes.findIndex(r => r.id === this.currentRecipeId);
            if (index !== -1) {
                this.recipes[index] = recipe;
            }
        } else {
            this.recipes.push(recipe);
        }
        
        // Save to local storage
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
        
        // Close modal and refresh
        this.closeModal(this.recipeEditorModal);
        this.filterAndRenderRecipes();
        
        // Show success message
        this.showSuccessMessage(this.currentRecipeId ? 'Recipe updated successfully' : 'Recipe created successfully');
        
        // Reset form
        this.resetRecipeForm();
    }
    
    deleteRecipe() {
        if (!this.currentRecipeId) return;
        
        // Find recipe index
        const index = this.recipes.findIndex(r => r.id === this.currentRecipeId);
        if (index === -1) return;
        
        // Remove recipe
        this.recipes.splice(index, 1);
        
        // Save to local storage
        localStorage.setItem('recipes', JSON.stringify(this.recipes));
        
        // Close modal and refresh
        this.closeModal(this.confirmModal);
        this.filterAndRenderRecipes();
        
        // Show success message
        this.showSuccessMessage('Recipe deleted successfully');
    }
    
    addRecipeToLog() {
        if (!this.currentRecipe) return;
        
        const servings = parseFloat(document.getElementById('log-servings').value) || 1;
        const mealType = document.getElementById('log-meal-type').value;
        const dateInput = document.getElementById('log-date');
        const logDate = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);
        
        // Create food log entry
        const entry = {
            id: 'meal_' + Date.now(),
            type: 'recipe',
            name: this.currentRecipe.name,
            recipeId: this.currentRecipe.id,
            date: logDate,
            mealType: mealType,
            servings: servings,
            calories: Math.round(this.currentRecipe.nutrition.calories * servings),
            protein: Math.round(this.currentRecipe.nutrition.protein * servings * 10) / 10,
            carbs: Math.round(this.currentRecipe.nutrition.carbs * servings * 10) / 10,
            fat: Math.round(this.currentRecipe.nutrition.fat * servings * 10) / 10
        };
        
        // Get existing food log
        let foodLog = JSON.parse(localStorage.getItem('foodLog') || '[]');
        
        // Add entry
        foodLog.push(entry);
        
        // Save to local storage
        localStorage.setItem('foodLog', JSON.stringify(foodLog));
        
        // Close modal
        this.closeModal(this.addToLogModal);
        
        // Show success message
        this.showSuccessMessage('Recipe added to food log');
    }
    
    populateRecipeViewer(recipe) {
        if (!recipe) return;
        
        // Set recipe name
        const recipeName = this.recipeViewerModal.querySelector('.recipe-view-name');
        if (recipeName) {
            recipeName.textContent = recipe.name;
        }
        
        // Set recipe image
        const recipeImage = this.recipeViewerModal.querySelector('.recipe-view-image');
        if (recipeImage) {
            recipeImage.style.backgroundImage = `url('${recipe.image || 'images/default-recipe.jpg'}')`;
        }
        
        // Set recipe details
        const servings = this.recipeViewerModal.querySelector('.detail-servings');
        if (servings) servings.textContent = recipe.servings;
        
        const prepTime = this.recipeViewerModal.querySelector('.detail-prep-time');
        if (prepTime) prepTime.textContent = recipe.prepTime;
        
        const cookTime = this.recipeViewerModal.querySelector('.detail-cook-time');
        if (cookTime) cookTime.textContent = recipe.cookTime;
        
        const totalTime = this.recipeViewerModal.querySelector('.detail-total-time');
        if (totalTime) totalTime.textContent = recipe.prepTime + recipe.cookTime;
        
        // Set recipe description
        const description = this.recipeViewerModal.querySelector('.recipe-view-description');
        if (description) {
            description.textContent = recipe.description || 'No description provided.';
        }
        
        // Set ingredients
        const ingredientsList = this.recipeViewerModal.querySelector('.ingredients-list');
        if (ingredientsList) {
            ingredientsList.innerHTML = '';
            
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                recipe.ingredients.forEach(ingredient => {
                    const li = document.createElement('li');
                    li.textContent = `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`;
                    ingredientsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No ingredients added.';
                ingredientsList.appendChild(li);
            }
        }
        
        // Set instructions
        const instructionsList = this.recipeViewerModal.querySelector('.instructions-list');
        if (instructionsList) {
            instructionsList.innerHTML = '';
            
            if (recipe.instructions && recipe.instructions.length > 0) {
                recipe.instructions.forEach((instruction, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="step-number">${index + 1}</span> ${instruction}`;
                    instructionsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No instructions added.';
                instructionsList.appendChild(li);
            }
        }
        
        // Set nutrition info
        const calories = this.recipeViewerModal.querySelector('.nutrition-calories .nutrition-value');
        if (calories) calories.textContent = recipe.nutrition.calories;
        
        const protein = this.recipeViewerModal.querySelector('.nutrition-protein .nutrition-value');
        if (protein) protein.textContent = recipe.nutrition.protein + 'g';
        
        const carbs = this.recipeViewerModal.querySelector('.nutrition-carbs .nutrition-value');
        if (carbs) carbs.textContent = recipe.nutrition.carbs + 'g';
        
        const fat = this.recipeViewerModal.querySelector('.nutrition-fat .nutrition-value');
        if (fat) fat.textContent = recipe.nutrition.fat + 'g';
    }
    
    populateRecipeForm(recipe, isEditing) {
        // Set form header
        const formHeader = this.recipeEditorModal.querySelector('.modal-header h2');
        if (formHeader) {
            formHeader.textContent = isEditing ? 'Edit Recipe' : 'Create Recipe';
        }
        
        // Set form fields
        const nameInput = document.getElementById('recipe-name');
        if (nameInput) nameInput.value = recipe?.name || '';
        
        const descriptionInput = document.getElementById('recipe-description');
        if (descriptionInput) descriptionInput.value = recipe?.description || '';
        
        const servingsInput = document.getElementById('recipe-servings');
        if (servingsInput) servingsInput.value = recipe?.servings || 1;
        
        const prepTimeInput = document.getElementById('recipe-prep-time');
        if (prepTimeInput) prepTimeInput.value = recipe?.prepTime || 0;
        
        const cookTimeInput = document.getElementById('recipe-cook-time');
        if (cookTimeInput) cookTimeInput.value = recipe?.cookTime || 0;
        
        const categorySelect = document.getElementById('recipe-category');
        if (categorySelect) categorySelect.value = recipe?.category || 'dinner';
        
        // Set ingredients
        if (this.ingredientList) {
            this.ingredientList.innerHTML = '';
            
            if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
                recipe.ingredients.forEach(ingredient => {
                    const ingredientItem = document.createElement('div');
                    ingredientItem.className = 'ingredient-item';
                    ingredientItem.dataset.id = ingredient.id;
                    
                    ingredientItem.innerHTML = `
                        <div class="ingredient-details">
                            <span class="ingredient-name">${ingredient.name}</span>
                            <div class="ingredient-amount">
                                <input type="number" class="amount-input" min="0" step="0.01" value="${ingredient.amount}">
                                <select class="unit-select">
                                    <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>grams (g)</option>
                                    <option value="oz" ${ingredient.unit === 'oz' ? 'selected' : ''}>ounces (oz)</option>
                                    <option value="cups" ${ingredient.unit === 'cups' ? 'selected' : ''}>cups</option>
                                    <option value="tbsp" ${ingredient.unit === 'tbsp' ? 'selected' : ''}>tablespoons</option>
                                    <option value="tsp" ${ingredient.unit === 'tsp' ? 'selected' : ''}>teaspoons</option>
                                    <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>milliliters (ml)</option>
                                    <option value="piece" ${ingredient.unit === 'piece' ? 'selected' : ''}>piece</option>
                                    <option value="slice" ${ingredient.unit === 'slice' ? 'selected' : ''}>slice</option>
                                </select>
                            </div>
                        </div>
                        <div class="nutrition-info">
                            <div class="nutrition-detail">
                                <span>${ingredient.calories}</span>
                                <label>cal</label>
                            </div>
                            <div class="nutrition-detail">
                                <span>${ingredient.protein}g</span>
                                <label>protein</label>
                            </div>
                            <div class="nutrition-detail">
                                <span>${ingredient.carbs}g</span>
                                <label>carbs</label>
                            </div>
                            <div class="nutrition-detail">
                                <span>${ingredient.fat}g</span>
                                <label>fat</label>
                            </div>
                        </div>
                        <button class="remove-ingredient" title="Remove ingredient">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    // Add event listener to remove button
                    ingredientItem.querySelector('.remove-ingredient').addEventListener('click', () => {
                        ingredientItem.remove();
                        
                        // If no ingredients left, show empty message
                        if (this.ingredientList.children.length === 0) {
                            this.ingredientList.innerHTML = '<div class="empty-list-message">No ingredients added yet. Search or add ingredients above.</div>';
                        }
                        
                        // Update nutrition
                        this.updateNutritionDisplay();
                    });
                    
                    this.ingredientList.appendChild(ingredientItem);
                });
                
                // Update nutrition
                this.updateNutritionDisplay();
            } else {
                this.ingredientList.innerHTML = '<div class="empty-list-message">No ingredients added yet. Search or add ingredients above.</div>';
            }
        }
        
        // Set instructions
        if (this.instructionList) {
            this.instructionList.innerHTML = '';
            
            if (recipe && recipe.instructions && recipe.instructions.length > 0) {
                recipe.instructions.forEach((instruction, index) => {
                    const instructionStep = document.createElement('div');
                    instructionStep.className = 'instruction-step';
                    instructionStep.innerHTML = `
                        <div class="step-number">${index + 1}</div>
                        <textarea class="step-text" placeholder="Enter instruction step">${instruction}</textarea>
                        <button class="remove-step" title="Remove step">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    // Add event listener to remove button
                    instructionStep.querySelector('.remove-step').addEventListener('click', () => {
                        instructionStep.remove();
                        
                        // Renumber steps
                        const steps = this.instructionList.querySelectorAll('.instruction-step');
                        steps.forEach((step, index) => {
                            step.querySelector('.step-number').textContent = index + 1;
                        });
                        
                        // If no instructions left, show empty message
                        if (this.instructionList.children.length === 0) {
                            this.instructionList.innerHTML = '<div class="empty-list-message">No instructions added yet. Add steps to your recipe.</div>';
                        }
                    });
                    
                    this.instructionList.appendChild(instructionStep);
                });
            } else {
                this.instructionList.innerHTML = '<div class="empty-list-message">No instructions added yet. Add steps to your recipe.</div>';
            }
        }
        
        // Set image preview if exists
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            if (recipe && recipe.image && recipe.image !== 'images/default-recipe.jpg') {
                imagePreview.style.backgroundImage = `url('${recipe.image}')`;
            } else {
                imagePreview.style.backgroundImage = '';
            }
        }
        
        // Activate first tab by default
        this.formTabs[0].click();
    }
    
    resetRecipeForm() {
        // Reset current recipe
        this.currentRecipe = null;
        this.currentRecipeId = null;
        
        // Reset form fields
        const nameInput = document.getElementById('recipe-name');
        if (nameInput) nameInput.value = '';
        
        const descriptionInput = document.getElementById('recipe-description');
        if (descriptionInput) descriptionInput.value = '';
        
        const servingsInput = document.getElementById('recipe-servings');
        if (servingsInput) servingsInput.value = '1';
        
        const prepTimeInput = document.getElementById('recipe-prep-time');
        if (prepTimeInput) prepTimeInput.value = '0';
        
        const cookTimeInput = document.getElementById('recipe-cook-time');
        if (cookTimeInput) cookTimeInput.value = '0';
        
        const categorySelect = document.getElementById('recipe-category');
        if (categorySelect) categorySelect.value = 'dinner';
        
        // Reset lists
        if (this.ingredientList) {
            this.ingredientList.innerHTML = '<div class="empty-list-message">No ingredients added yet. Search or add ingredients above.</div>';
        }
        
        if (this.instructionList) {
            this.instructionList.innerHTML = '<div class="empty-list-message">No instructions added yet. Add steps to your recipe.</div>';
        }
        
        // Reset image preview
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.style.backgroundImage = '';
        }
    }
    
    updateNutritionDisplay() {
        const ingredients = [];
        const ingredientItems = this.ingredientList.querySelectorAll('.ingredient-item');
        
        ingredientItems.forEach(item => {
            let calories, protein, carbs, fat;
            
            // Check if it's a custom ingredient
            const nameInput = item.querySelector('.ingredient-name-input');
            if (nameInput) {
                calories = parseInt(item.querySelector('.calories-input').value) || 0;
                protein = parseFloat(item.querySelector('.protein-input').value) || 0;
                carbs = parseFloat(item.querySelector('.carbs-input').value) || 0;
                fat = parseFloat(item.querySelector('.fat-input').value) || 0;
            } else {
                const nutrientSpans = item.querySelectorAll('.nutrition-detail span');
                calories = parseInt(nutrientSpans[0].textContent) || 0;
                protein = parseFloat(nutrientSpans[1].textContent) || 0;
                carbs = parseFloat(nutrientSpans[2].textContent) || 0;
                fat = parseFloat(nutrientSpans[3].textContent) || 0;
            }
            
            const amount = parseFloat(item.querySelector('.amount-input').value) || 0;
            
            ingredients.push({
                calories: calories * amount,
                protein: protein * amount,
                carbs: carbs * amount,
                fat: fat * amount
            });
        });
        
        // Calculate totals
        const servings = parseInt(document.getElementById('recipe-servings').value) || 1;
        const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
        const totalProtein = ingredients.reduce((sum, ing) => sum + ing.protein, 0);
        const totalCarbs = ingredients.reduce((sum, ing) => sum + ing.carbs, 0);
        const totalFat = ingredients.reduce((sum, ing) => sum + ing.fat, 0);
        
        // Update display
        const caloriesPerServing = Math.round(totalCalories / servings);
        const proteinPerServing = Math.round(totalProtein / servings * 10) / 10;
        const carbsPerServing = Math.round(totalCarbs / servings * 10) / 10;
        const fatPerServing = Math.round(totalFat / servings * 10) / 10;
        
        const caloriesDisplay = document.getElementById('recipe-calories');
        if (caloriesDisplay) caloriesDisplay.textContent = caloriesPerServing;
        
        const proteinDisplay = document.getElementById('recipe-protein');
        if (proteinDisplay) proteinDisplay.textContent = proteinPerServing + 'g';
        
        const carbsDisplay = document.getElementById('recipe-carbs');
        if (carbsDisplay) carbsDisplay.textContent = carbsPerServing + 'g';
        
        const fatDisplay = document.getElementById('recipe-fat');
        if (fatDisplay) fatDisplay.textContent = fatPerServing + 'g';
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file || !file.type.match('image.*')) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                imagePreview.style.backgroundImage = `url('${e.target.result}')`;
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    openModal(modal) {
        if (modal) {
            document.body.classList.add('modal-open');
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        }
    }
    
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }, 300);
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.closeModal(modal);
        });
    }
    
    showSuccessMessage(message) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message success';
            statusMessage.style.display = 'block';
            
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
    }
    
    showErrorMessage(message) {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
            
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
    }
    
    generateRecipeShareContent(recipe) {
        return {
            title: recipe.name,
            description: recipe.description,
            image: recipe.image,
            content: `
                <div class="share-recipe">
                    <h3>${recipe.name}</h3>
                    <p>${recipe.description}</p>
                    <div class="recipe-details">
                        <span><i class="far fa-clock"></i> ${recipe.prepTime + recipe.cookTime} min</span>
                        <span><i class="fas fa-utensils"></i> ${recipe.servings} servings</span>
                    </div>
                    <div class="recipe-nutrition">
                        <div>${recipe.nutrition.calories} calories</div>
                        <div>${recipe.nutrition.protein}g protein</div>
                        <div>${recipe.nutrition.carbs}g carbs</div>
                        <div>${recipe.nutrition.fat}g fat</div>
                    </div>
                </div>
            `
        };
    }
    
    showShareModal(content) {
        const shareModal = document.getElementById('share-modal');
        if (!shareModal) return;
        
        // Set preview content
        const previewTitle = shareModal.querySelector('.share-preview-title');
        if (previewTitle) previewTitle.textContent = content.title;
        
        const previewImage = shareModal.querySelector('.share-preview-image');
        if (previewImage) {
            previewImage.style.backgroundImage = `url('${content.image || 'images/default-recipe.jpg'}')`;
        }
        
        const previewDescription = shareModal.querySelector('.share-preview-description');
        if (previewDescription) previewDescription.textContent = content.description;
        
        // Set up share buttons
        const shareButtons = shareModal.querySelectorAll('.share-btn');
        shareButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                this.shareToPlataform(platform, content);
                this.closeModal(shareModal);
                this.showSuccessMessage(`Shared to ${platform}`);
            });
        });
        
        // Show modal
        this.openModal(shareModal);
    }
    
    shareToPlataform(platform, content) {
        const url = window.location.href;
        const title = encodeURIComponent(content.title);
        const description = encodeURIComponent(content.description);
        
        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
                break;
            case 'pinterest':
                shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${description}`;
                break;
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${title} ${url}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${title}&body=${description}%0A%0A${url}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank');
        }
    }
    
    getMockFoodDatabase() {
        return [
            { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { id: '2', name: 'Brown Rice', calories: 112, protein: 2.6, carbs: 23, fat: 0.9 },
            { id: '3', name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11.2, fat: 0.6 },
            { id: '4', name: 'Salmon', calories: 206, protein: 22.1, carbs: 0, fat: 13 },
            { id: '5', name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
            { id: '6', name: 'Quinoa', calories: 120, protein: 4.1, carbs: 21.3, fat: 1.9 },
            { id: '7', name: 'Eggs', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
            { id: '8', name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
            { id: '9', name: 'Avocado', calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
            { id: '10', name: 'Greek Yogurt', calories: 59, protein: 10.2, carbs: 3.6, fat: 0.4 }
        ];
    }
} 