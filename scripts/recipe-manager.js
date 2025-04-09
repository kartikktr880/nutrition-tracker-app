import dataManager from './data-manager.js';
import foodDatabase from './food-db.js';

class RecipeManager {
    constructor() {
        this.recipes = [];
        this.currentRecipe = null;
        this.editMode = false;
    }
    
    /**
     * Initialize the recipe manager
     */
    async init() {
        try {
            // Load saved recipes
            await this.loadRecipes();
            return true;
        } catch (error) {
            console.error('Error initializing recipe manager:', error);
            return false;
        }
    }
    
    /**
     * Load saved recipes from storage
     */
    async loadRecipes() {
        try {
            const recipes = await dataManager.getRecipes();
            this.recipes = recipes || [];
            return this.recipes;
        } catch (error) {
            console.error('Error loading recipes:', error);
            return [];
        }
    }
    
    /**
     * Get all recipes
     * @returns {Array} The list of recipes
     */
    getRecipes() {
        return this.recipes;
    }
    
    /**
     * Get a recipe by ID
     * @param {string} id The recipe ID
     * @returns {Object} The recipe
     */
    getRecipe(id) {
        return this.recipes.find(recipe => recipe.id === id);
    }
    
    /**
     * Create a new recipe
     */
    createRecipe() {
        this.currentRecipe = {
            id: this.generateId(),
            name: '',
            description: '',
            servings: 1,
            prepTime: 15,
            cookTime: 30,
            ingredients: [],
            instructions: [],
            tags: [],
            image: null,
            nutrition: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.editMode = false;
        
        this.openRecipeEditor();
    }
    
    /**
     * Edit an existing recipe
     * @param {string} id The recipe ID
     */
    editRecipe(id) {
        const recipe = this.getRecipe(id);
        
        if (!recipe) {
            console.error('Recipe not found:', id);
            return;
        }
        
        // Clone the recipe to avoid modifying the original
        this.currentRecipe = JSON.parse(JSON.stringify(recipe));
        this.editMode = true;
        
        this.openRecipeEditor();
    }
    
    /**
     * View a recipe
     * @param {string} id The recipe ID
     */
    viewRecipe(id) {
        const recipe = this.getRecipe(id);
        
        if (!recipe) {
            console.error('Recipe not found:', id);
            return;
        }
        
        this.openRecipeViewer(recipe);
    }
    
    /**
     * Delete a recipe
     * @param {string} id The recipe ID
     * @returns {Promise<boolean>} Whether the deletion was successful
     */
    async deleteRecipe(id) {
        try {
            // Find the recipe index
            const index = this.recipes.findIndex(recipe => recipe.id === id);
            
            if (index === -1) {
                console.error('Recipe not found:', id);
                return false;
            }
            
            // Remove from array
            this.recipes.splice(index, 1);
            
            // Save updated recipes
            await dataManager.saveRecipes(this.recipes);
            
            return true;
        } catch (error) {
            console.error('Error deleting recipe:', error);
            return false;
        }
    }
    
    /**
     * Save the current recipe
     * @param {Object} recipeData Recipe data from the form
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async saveRecipe(recipeData) {
        try {
            if (!this.currentRecipe) {
                console.error('No current recipe to save');
                return false;
            }
            
            // Update recipe with form data
            const updatedRecipe = {
                ...this.currentRecipe,
                ...recipeData,
                updatedAt: new Date().toISOString()
            };
            
            // Calculate nutrition
            updatedRecipe.nutrition = await this.calculateRecipeNutrition(updatedRecipe);
            
            // Update recipes array
            if (this.editMode) {
                // Find and update existing recipe
                const index = this.recipes.findIndex(recipe => recipe.id === updatedRecipe.id);
                if (index !== -1) {
                    this.recipes[index] = updatedRecipe;
                } else {
                    // Add as new if not found
                    this.recipes.push(updatedRecipe);
                }
            } else {
                // Add new recipe
                this.recipes.push(updatedRecipe);
            }
            
            // Save to storage
            await dataManager.saveRecipes(this.recipes);
            
            // Clear current recipe
            this.currentRecipe = null;
            
            return true;
        } catch (error) {
            console.error('Error saving recipe:', error);
            return false;
        }
    }
    
    /**
     * Add an ingredient to the current recipe
     * @param {Object} ingredient The ingredient to add
     */
    addIngredient(ingredient) {
        if (!this.currentRecipe) {
            console.error('No current recipe');
            return;
        }
        
        // Add ID if not provided
        if (!ingredient.id) {
            ingredient.id = this.generateId();
        }
        
        this.currentRecipe.ingredients.push(ingredient);
    }
    
    /**
     * Remove an ingredient from the current recipe
     * @param {string} ingredientId The ingredient ID
     */
    removeIngredient(ingredientId) {
        if (!this.currentRecipe) {
            console.error('No current recipe');
            return;
        }
        
        const index = this.currentRecipe.ingredients.findIndex(ingredient => ingredient.id === ingredientId);
        
        if (index !== -1) {
            this.currentRecipe.ingredients.splice(index, 1);
        }
    }
    
    /**
     * Add an instruction to the current recipe
     * @param {string} instruction The instruction text
     */
    addInstruction(instruction) {
        if (!this.currentRecipe) {
            console.error('No current recipe');
            return;
        }
        
        this.currentRecipe.instructions.push(instruction);
    }
    
    /**
     * Remove an instruction from the current recipe
     * @param {number} index The instruction index
     */
    removeInstruction(index) {
        if (!this.currentRecipe || !this.currentRecipe.instructions[index]) {
            console.error('Invalid instruction index');
            return;
        }
        
        this.currentRecipe.instructions.splice(index, 1);
    }
    
    /**
     * Open the recipe editor
     */
    openRecipeEditor() {
        // Dispatch custom event to open the recipe editor modal
        const event = new CustomEvent('open-recipe-editor', {
            detail: {
                recipe: this.currentRecipe,
                editMode: this.editMode
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * Open the recipe viewer
     * @param {Object} recipe The recipe to view
     */
    openRecipeViewer(recipe) {
        // Dispatch custom event to open the recipe viewer modal
        const event = new CustomEvent('open-recipe-viewer', {
            detail: {
                recipe: recipe
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * Calculate nutrition information for a recipe
     * @param {Object} recipe The recipe
     * @returns {Promise<Object>} The nutrition information
     */
    async calculateRecipeNutrition(recipe) {
        const nutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0
        };
        
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return nutrition;
        }
        
        // Calculate nutrition based on ingredients
        for (const ingredient of recipe.ingredients) {
            // If ingredient has a foodId, fetch nutrition from database
            if (ingredient.foodId) {
                try {
                    const food = await foodDatabase.getFoodDetails(ingredient.foodId);
                    
                    if (food) {
                        const quantity = ingredient.quantity || 1;
                        nutrition.calories += (food.calories || 0) * quantity;
                        nutrition.protein += (food.protein || 0) * quantity;
                        nutrition.carbs += (food.carbs || 0) * quantity;
                        nutrition.fat += (food.fat || 0) * quantity;
                        nutrition.fiber += (food.fiber || 0) * quantity;
                    }
                } catch (error) {
                    console.error('Error fetching food details:', error);
                }
            } else if (ingredient.nutrition) {
                // Use provided nutrition information
                const quantity = ingredient.quantity || 1;
                nutrition.calories += (ingredient.nutrition.calories || 0) * quantity;
                nutrition.protein += (ingredient.nutrition.protein || 0) * quantity;
                nutrition.carbs += (ingredient.nutrition.carbs || 0) * quantity;
                nutrition.fat += (ingredient.nutrition.fat || 0) * quantity;
                nutrition.fiber += (ingredient.nutrition.fiber || 0) * quantity;
            }
        }
        
        // Calculate per serving
        if (recipe.servings && recipe.servings > 0) {
            nutrition.calories = Math.round(nutrition.calories / recipe.servings);
            nutrition.protein = Math.round(nutrition.protein / recipe.servings);
            nutrition.carbs = Math.round(nutrition.carbs / recipe.servings);
            nutrition.fat = Math.round(nutrition.fat / recipe.servings);
            nutrition.fiber = Math.round(nutrition.fiber / recipe.servings);
        }
        
        return nutrition;
    }
    
    /**
     * Add a recipe to the food log
     * @param {string} recipeId The recipe ID
     * @param {number} servings The number of servings
     * @param {string} mealType The meal type
     * @returns {Promise<boolean>} Whether the addition was successful
     */
    async addRecipeToLog(recipeId, servings, mealType) {
        try {
            const recipe = this.getRecipe(recipeId);
            
            if (!recipe) {
                console.error('Recipe not found:', recipeId);
                return false;
            }
            
            // Create a food log entry from the recipe
            const logEntry = {
                foodId: `recipe_${recipe.id}`,
                name: recipe.name,
                quantity: servings || 1,
                mealType: mealType,
                date: new Date().toISOString(),
                calories: (recipe.nutrition.calories || 0) * (servings || 1),
                protein: (recipe.nutrition.protein || 0) * (servings || 1),
                carbs: (recipe.nutrition.carbs || 0) * (servings || 1),
                fat: (recipe.nutrition.fat || 0) * (servings || 1),
                fiber: (recipe.nutrition.fiber || 0) * (servings || 1),
                isRecipe: true,
                recipeId: recipe.id
            };
            
            // Add to meal log
            await dataManager.addMeal(logEntry);
            
            return true;
        } catch (error) {
            console.error('Error adding recipe to log:', error);
            return false;
        }
    }
    
    /**
     * Generate a unique ID
     * @returns {string} A unique ID
     */
    generateId() {
        return 'r_' + Math.random().toString(36).substr(2, 9);
    }
}

// Create and export a singleton instance
const recipeManager = new RecipeManager();
export default recipeManager; 