class RecipeCalculator {
  constructor() {
    this.ingredients = [];
    this.steps = [];
    this.nutritionDatabase = this.getMockNutritionDatabase();
    this.initElements();
    this.initEventListeners();
  }

  initElements() {
    // Recipe info elements
    this.recipeName = document.getElementById('recipe-name');
    this.recipeDescription = document.getElementById('recipe-description');
    this.recipeServings = document.getElementById('recipe-servings');
    this.recipePrepTime = document.getElementById('recipe-prep-time');
    this.recipeCookTime = document.getElementById('recipe-cook-time');
    
    // Ingredient elements
    this.ingredientsContainer = document.getElementById('ingredients-container');
    this.addIngredientBtn = document.getElementById('add-ingredient');
    this.searchIngredientsBtn = document.getElementById('search-ingredients');
    
    // Instructions elements
    this.instructionsContainer = document.getElementById('instructions-container');
    this.addStepBtn = document.getElementById('add-step');
    
    // Calculation elements
    this.calculateBtn = document.getElementById('calculate-nutrition');
    this.resetBtn = document.getElementById('reset-recipe');
    this.nutritionResults = document.querySelector('.nutrition-results');
    
    // Nutrition summary elements
    this.caloriesPerServing = document.getElementById('calories-per-serving');
    this.proteinPerServing = document.getElementById('protein-per-serving');
    this.carbsPerServing = document.getElementById('carbs-per-serving');
    this.fatPerServing = document.getElementById('fat-per-serving');
    
    // Detailed nutrition elements
    this.totalFat = document.getElementById('total-fat');
    this.totalFatPercent = document.getElementById('total-fat-percent');
    this.saturatedFat = document.getElementById('saturated-fat');
    this.saturatedFatPercent = document.getElementById('saturated-fat-percent');
    this.transFat = document.getElementById('trans-fat');
    this.cholesterol = document.getElementById('cholesterol');
    this.cholesterolPercent = document.getElementById('cholesterol-percent');
    this.sodium = document.getElementById('sodium');
    this.sodiumPercent = document.getElementById('sodium-percent');
    this.totalCarbs = document.getElementById('total-carbs');
    this.totalCarbsPercent = document.getElementById('total-carbs-percent');
    this.fiber = document.getElementById('fiber');
    this.fiberPercent = document.getElementById('fiber-percent');
    this.totalSugars = document.getElementById('total-sugars');
    this.addedSugars = document.getElementById('added-sugars');
    this.addedSugarsPercent = document.getElementById('added-sugars-percent');
    this.protein = document.getElementById('protein');
    this.vitaminD = document.getElementById('vitamin-d');
    this.vitaminDPercent = document.getElementById('vitamin-d-percent');
    this.calcium = document.getElementById('calcium');
    this.calciumPercent = document.getElementById('calcium-percent');
    this.iron = document.getElementById('iron');
    this.ironPercent = document.getElementById('iron-percent');
    this.potassium = document.getElementById('potassium');
    this.potassiumPercent = document.getElementById('potassium-percent');
    
    // Save buttons
    this.saveRecipeBtn = document.getElementById('save-recipe');
    this.saveToMealPlanBtn = document.getElementById('save-to-meal-plan');
    
    // Modals
    this.searchIngredientsModal = document.getElementById('search-ingredients-modal');
    this.addToMealPlanModal = document.getElementById('add-to-meal-plan-modal');
    this.ingredientSearchInput = document.getElementById('ingredient-search');
    this.ingredientSearchBtn = document.getElementById('search-btn');
    this.ingredientSearchResults = document.getElementById('ingredient-search-results');
    this.mealPlanDate = document.getElementById('meal-plan-date');
    this.mealPlanType = document.getElementById('meal-plan-type');
    this.confirmAddToMealPlanBtn = document.getElementById('confirm-add-to-meal-plan');
  }

  initEventListeners() {
    // Add ingredient button
    this.addIngredientBtn.addEventListener('click', () => this.addIngredientRow());
    
    // Search ingredients button
    this.searchIngredientsBtn.addEventListener('click', () => this.openSearchIngredientsModal());
    
    // Add step button
    this.addStepBtn.addEventListener('click', () => this.addInstructionStep());
    
    // Calculate nutrition button
    this.calculateBtn.addEventListener('click', () => this.calculateNutrition());
    
    // Reset button
    this.resetBtn.addEventListener('click', () => this.resetRecipe());
    
    // Save recipe button
    this.saveRecipeBtn.addEventListener('click', () => this.saveRecipe());
    
    // Add to meal plan button
    this.saveToMealPlanBtn.addEventListener('click', () => this.openAddToMealPlanModal());
    
    // Search ingredients in modal
    this.ingredientSearchBtn.addEventListener('click', () => this.searchIngredients());
    this.ingredientSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchIngredients();
      }
    });
    
    // Confirm add to meal plan button
    this.confirmAddToMealPlanBtn.addEventListener('click', () => this.addToMealPlan());
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
      });
    });
    
    // Modal backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.parentElement.classList.remove('active');
        }
      });
    });
    
    // Initial ingredient row
    const initialIngredientRow = this.ingredientsContainer.querySelector('.ingredient-row');
    if (initialIngredientRow) {
      const removeBtn = initialIngredientRow.querySelector('.remove-ingredient');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeIngredient(removeBtn));
      }
    }
    
    // Initial instruction step
    const initialStep = this.instructionsContainer.querySelector('.instruction-step');
    if (initialStep) {
      const removeBtn = initialStep.querySelector('.remove-step');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeStep(removeBtn));
      }
    }
  }

  addIngredientRow() {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ingredient-name';
    nameInput.placeholder = 'Ingredient name';
    nameGroup.appendChild(nameInput);
    
    const amountGroup = document.createElement('div');
    amountGroup.className = 'form-group';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'ingredient-amount';
    amountInput.placeholder = 'Amount';
    amountInput.min = '0';
    amountInput.step = '0.01';
    amountGroup.appendChild(amountInput);
    
    const unitGroup = document.createElement('div');
    unitGroup.className = 'form-group';
    const unitSelect = document.createElement('select');
    unitSelect.className = 'ingredient-unit';
    
    const units = [
      { value: 'g', label: 'grams (g)' },
      { value: 'oz', label: 'ounces (oz)' },
      { value: 'cups', label: 'cups' },
      { value: 'tbsp', label: 'tablespoons' },
      { value: 'tsp', label: 'teaspoons' },
      { value: 'ml', label: 'milliliters (ml)' },
      { value: 'piece', label: 'piece' },
      { value: 'slice', label: 'slice' }
    ];
    
    units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.value;
      option.textContent = unit.label;
      unitSelect.appendChild(option);
    });
    
    unitGroup.appendChild(unitSelect);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-ingredient';
    removeBtn.title = 'Remove ingredient';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.addEventListener('click', () => this.removeIngredient(removeBtn));
    
    row.appendChild(nameGroup);
    row.appendChild(amountGroup);
    row.appendChild(unitGroup);
    row.appendChild(removeBtn);
    
    this.ingredientsContainer.appendChild(row);
  }

  removeIngredient(button) {
    const row = button.closest('.ingredient-row');
    row.remove();
  }

  addInstructionStep() {
    const stepCount = this.instructionsContainer.querySelectorAll('.instruction-step').length + 1;
    
    const step = document.createElement('div');
    step.className = 'instruction-step';
    
    const stepNumber = document.createElement('div');
    stepNumber.className = 'step-number';
    stepNumber.textContent = stepCount;
    
    const stepText = document.createElement('textarea');
    stepText.className = 'step-text';
    stepText.placeholder = 'Enter instruction step';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-step';
    removeBtn.title = 'Remove step';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.addEventListener('click', () => this.removeStep(removeBtn));
    
    step.appendChild(stepNumber);
    step.appendChild(stepText);
    step.appendChild(removeBtn);
    
    this.instructionsContainer.appendChild(step);
  }

  removeStep(button) {
    const step = button.closest('.instruction-step');
    step.remove();
    
    // Renumber steps
    const steps = this.instructionsContainer.querySelectorAll('.instruction-step');
    steps.forEach((step, index) => {
      step.querySelector('.step-number').textContent = index + 1;
    });
  }

  openSearchIngredientsModal() {
    this.searchIngredientsModal.classList.add('active');
  }

  openAddToMealPlanModal() {
    // Set default date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    this.mealPlanDate.value = formattedDate;
    
    this.addToMealPlanModal.classList.add('active');
  }

  searchIngredients() {
    const query = this.ingredientSearchInput.value.trim().toLowerCase();
    if (!query) return;
    
    // Filter ingredients from the mock database
    const results = this.nutritionDatabase.filter(item => 
      item.name.toLowerCase().includes(query)
    );
    
    // Clear previous results
    this.ingredientSearchResults.innerHTML = '';
    
    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No ingredients found. Try another search term.';
      this.ingredientSearchResults.appendChild(noResults);
      return;
    }
    
    // Display results
    results.forEach(ingredient => {
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'ingredient-info';
      
      const name = document.createElement('h4');
      name.textContent = ingredient.name;
      
      const details = document.createElement('p');
      details.textContent = `100g: ${ingredient.calories} calories, ${ingredient.protein}g protein, ${ingredient.carbs}g carbs, ${ingredient.fat}g fat`;
      
      infoDiv.appendChild(name);
      infoDiv.appendChild(details);
      
      const addBtn = document.createElement('button');
      addBtn.className = 'add-search-result';
      addBtn.textContent = 'Add';
      addBtn.addEventListener('click', () => this.addSearchResultToIngredients(ingredient));
      
      resultItem.appendChild(infoDiv);
      resultItem.appendChild(addBtn);
      
      this.ingredientSearchResults.appendChild(resultItem);
    });
  }

  addSearchResultToIngredients(ingredient) {
    // Add a new ingredient row
    this.addIngredientRow();
    
    // Get the last row (the one we just added)
    const rows = this.ingredientsContainer.querySelectorAll('.ingredient-row');
    const lastRow = rows[rows.length - 1];
    
    // Fill in the fields
    lastRow.querySelector('.ingredient-name').value = ingredient.name;
    lastRow.querySelector('.ingredient-amount').value = '100';
    lastRow.querySelector('.ingredient-unit').value = 'g';
    
    // Close the modal
    this.searchIngredientsModal.classList.remove('active');
    
    // Show toast
    this.showToast(`Added ${ingredient.name} to ingredients`, 'success');
  }

  calculateNutrition() {
    // Gather ingredient data
    const ingredients = [];
    const rows = this.ingredientsContainer.querySelectorAll('.ingredient-row');
    
    rows.forEach(row => {
      const name = row.querySelector('.ingredient-name').value.trim();
      const amountStr = row.querySelector('.ingredient-amount').value.trim();
      const unit = row.querySelector('.ingredient-unit').value;
      
      if (name && amountStr) {
        const amount = parseFloat(amountStr);
        ingredients.push({ name, amount, unit });
      }
    });
    
    if (ingredients.length === 0) {
      this.showToast('Please add at least one ingredient', 'error');
      return;
    }
    
    // Get servings
    const servings = parseInt(this.recipeServings.value) || 1;
    
    // Calculate nutrition
    const nutrition = this.calculateRecipeNutrition(ingredients, servings);
    
    // Update nutrition summary
    this.caloriesPerServing.textContent = Math.round(nutrition.calories);
    this.proteinPerServing.textContent = Math.round(nutrition.protein);
    this.carbsPerServing.textContent = Math.round(nutrition.carbs);
    this.fatPerServing.textContent = Math.round(nutrition.fat);
    
    // Update detailed nutrition
    this.totalFat.textContent = `${Math.round(nutrition.fat)}g`;
    this.totalFatPercent.textContent = `${Math.round((nutrition.fat * 9) / 2000 * 100)}%`;
    
    this.saturatedFat.textContent = `${Math.round(nutrition.saturatedFat)}g`;
    this.saturatedFatPercent.textContent = `${Math.round((nutrition.saturatedFat * 9) / 2000 * 100)}%`;
    
    this.transFat.textContent = `${Math.round(nutrition.transFat)}g`;
    
    this.cholesterol.textContent = `${Math.round(nutrition.cholesterol)}mg`;
    this.cholesterolPercent.textContent = `${Math.round(nutrition.cholesterol / 300 * 100)}%`;
    
    this.sodium.textContent = `${Math.round(nutrition.sodium)}mg`;
    this.sodiumPercent.textContent = `${Math.round(nutrition.sodium / 2300 * 100)}%`;
    
    this.totalCarbs.textContent = `${Math.round(nutrition.carbs)}g`;
    this.totalCarbsPercent.textContent = `${Math.round(nutrition.carbs / 275 * 100)}%`;
    
    this.fiber.textContent = `${Math.round(nutrition.fiber)}g`;
    this.fiberPercent.textContent = `${Math.round(nutrition.fiber / 28 * 100)}%`;
    
    this.totalSugars.textContent = `${Math.round(nutrition.sugar)}g`;
    
    this.addedSugars.textContent = `${Math.round(nutrition.addedSugar)}g`;
    this.addedSugarsPercent.textContent = `${Math.round(nutrition.addedSugar / 50 * 100)}%`;
    
    this.protein.textContent = `${Math.round(nutrition.protein)}g`;
    
    this.vitaminD.textContent = `${Math.round(nutrition.vitaminD)}mcg`;
    this.vitaminDPercent.textContent = `${Math.round(nutrition.vitaminD / 20 * 100)}%`;
    
    this.calcium.textContent = `${Math.round(nutrition.calcium)}mg`;
    this.calciumPercent.textContent = `${Math.round(nutrition.calcium / 1300 * 100)}%`;
    
    this.iron.textContent = `${Math.round(nutrition.iron)}mg`;
    this.ironPercent.textContent = `${Math.round(nutrition.iron / 18 * 100)}%`;
    
    this.potassium.textContent = `${Math.round(nutrition.potassium)}mg`;
    this.potassiumPercent.textContent = `${Math.round(nutrition.potassium / 4700 * 100)}%`;
    
    // Show nutrition results
    this.nutritionResults.classList.add('active');
    
    // Show toast
    this.showToast('Nutrition calculated successfully', 'success');
  }

  calculateRecipeNutrition(ingredients, servings) {
    // Initialize nutrition totals
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      saturatedFat: 0,
      transFat: 0,
      cholesterol: 0,
      sodium: 0,
      fiber: 0,
      sugar: 0,
      addedSugar: 0,
      vitaminD: 0,
      calcium: 0,
      iron: 0,
      potassium: 0
    };
    
    // Calculate totals based on ingredients
    ingredients.forEach(ingredient => {
      // Look up ingredient in database
      const dbIngredient = this.nutritionDatabase.find(
        item => item.name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (dbIngredient) {
        // Convert units if necessary (simplified for demo)
        let multiplier = ingredient.amount / 100; // Database values are per 100g
        
        if (ingredient.unit === 'oz') {
          multiplier = (ingredient.amount * 28.35) / 100; // 1 oz = 28.35g
        } else if (ingredient.unit === 'cups') {
          multiplier = (ingredient.amount * 240) / 100; // Approximation: 1 cup = 240g
        } else if (ingredient.unit === 'tbsp') {
          multiplier = (ingredient.amount * 15) / 100; // Approximation: 1 tbsp = 15g
        } else if (ingredient.unit === 'tsp') {
          multiplier = (ingredient.amount * 5) / 100; // Approximation: 1 tsp = 5g
        } else if (ingredient.unit === 'ml') {
          multiplier = (ingredient.amount * 1) / 100; // Approximation: 1 ml = 1g for water-based
        } else if (ingredient.unit === 'piece' || ingredient.unit === 'slice') {
          // Rough approximation for demonstration purposes
          multiplier = (ingredient.amount * 30) / 100; // Assume 1 piece/slice = 30g
        }
        
        // Add to totals
        totals.calories += dbIngredient.calories * multiplier;
        totals.protein += dbIngredient.protein * multiplier;
        totals.carbs += dbIngredient.carbs * multiplier;
        totals.fat += dbIngredient.fat * multiplier;
        totals.saturatedFat += (dbIngredient.saturatedFat || dbIngredient.fat * 0.3) * multiplier;
        totals.transFat += (dbIngredient.transFat || 0) * multiplier;
        totals.cholesterol += (dbIngredient.cholesterol || 0) * multiplier;
        totals.sodium += (dbIngredient.sodium || 0) * multiplier;
        totals.fiber += (dbIngredient.fiber || dbIngredient.carbs * 0.1) * multiplier;
        totals.sugar += (dbIngredient.sugar || dbIngredient.carbs * 0.2) * multiplier;
        totals.addedSugar += (dbIngredient.addedSugar || 0) * multiplier;
        totals.vitaminD += (dbIngredient.vitaminD || 0) * multiplier;
        totals.calcium += (dbIngredient.calcium || 0) * multiplier;
        totals.iron += (dbIngredient.iron || 0) * multiplier;
        totals.potassium += (dbIngredient.potassium || 0) * multiplier;
      } else {
        console.log(`Ingredient not found in database: ${ingredient.name}`);
      }
    });
    
    // Divide by servings to get per-serving values
    for (const key in totals) {
      totals[key] = totals[key] / servings;
    }
    
    return totals;
  }

  resetRecipe() {
    if (confirm('Are you sure you want to reset the recipe? All entered data will be lost.')) {
      // Clear recipe info
      this.recipeName.value = '';
      this.recipeDescription.value = '';
      this.recipeServings.value = '1';
      this.recipePrepTime.value = '';
      this.recipeCookTime.value = '';
      
      // Clear ingredients
      this.ingredientsContainer.innerHTML = '';
      this.addIngredientRow();
      
      // Clear instructions
      this.instructionsContainer.innerHTML = '';
      this.addInstructionStep();
      
      // Hide nutrition results
      this.nutritionResults.classList.remove('active');
      
      // Show toast
      this.showToast('Recipe reset successfully', 'info');
    }
  }

  saveRecipe() {
    const name = this.recipeName.value.trim();
    
    if (!name) {
      this.showToast('Please enter a recipe name', 'error');
      return;
    }
    
    // Get recipe data
    const recipe = this.getRecipeData();
    
    // Validate recipe data
    if (recipe.ingredients.length === 0) {
      this.showToast('Please add at least one ingredient', 'error');
      return;
    }
    
    if (recipe.steps.length === 0) {
      this.showToast('Please add at least one instruction step', 'error');
      return;
    }
    
    // Get existing recipes from localStorage
    let recipes = JSON.parse(localStorage.getItem('recipes')) || [];
    
    // Check if recipe with same name exists
    const existingIndex = recipes.findIndex(r => r.name === recipe.name);
    if (existingIndex >= 0) {
      if (confirm(`A recipe named "${recipe.name}" already exists. Do you want to replace it?`)) {
        recipes[existingIndex] = recipe;
      } else {
        return;
      }
    } else {
      recipes.push(recipe);
    }
    
    // Save to localStorage
    localStorage.setItem('recipes', JSON.stringify(recipes));
    
    // Show toast
    this.showToast('Recipe saved successfully', 'success');
  }

  addToMealPlan() {
    const date = this.mealPlanDate.value;
    const mealType = this.mealPlanType.value;
    
    if (!date) {
      this.showToast('Please select a date', 'error');
      return;
    }
    
    // Get recipe data
    const recipe = this.getRecipeData();
    
    // Validate recipe
    if (!recipe.name) {
      this.showToast('Please enter a recipe name', 'error');
      return;
    }
    
    // Get meal plan from localStorage
    let mealPlan = JSON.parse(localStorage.getItem('mealPlan')) || {};
    
    // Initialize date if it doesn't exist
    if (!mealPlan[date]) {
      mealPlan[date] = {};
    }
    
    // Add recipe to meal plan
    mealPlan[date][mealType] = {
      name: recipe.name,
      calories: recipe.nutrition.calories,
      protein: recipe.nutrition.protein,
      carbs: recipe.nutrition.carbs,
      fat: recipe.nutrition.fat,
      notes: `Recipe: ${recipe.name}`
    };
    
    // Save to localStorage
    localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
    
    // Close modal
    this.addToMealPlanModal.classList.remove('active');
    
    // Show toast
    this.showToast(`Added "${recipe.name}" to meal plan for ${new Date(date).toLocaleDateString()}`, 'success');
  }

  getRecipeData() {
    // Get basic recipe info
    const name = this.recipeName.value.trim();
    const description = this.recipeDescription.value.trim();
    const servings = parseInt(this.recipeServings.value) || 1;
    const prepTime = parseInt(this.recipePrepTime.value) || 0;
    const cookTime = parseInt(this.recipeCookTime.value) || 0;
    
    // Get ingredients
    const ingredients = [];
    const ingredientRows = this.ingredientsContainer.querySelectorAll('.ingredient-row');
    
    ingredientRows.forEach(row => {
      const name = row.querySelector('.ingredient-name').value.trim();
      const amountStr = row.querySelector('.ingredient-amount').value.trim();
      const unit = row.querySelector('.ingredient-unit').value;
      
      if (name && amountStr) {
        const amount = parseFloat(amountStr);
        ingredients.push({ name, amount, unit });
      }
    });
    
    // Get steps
    const steps = [];
    const stepElements = this.instructionsContainer.querySelectorAll('.instruction-step');
    
    stepElements.forEach(stepElement => {
      const text = stepElement.querySelector('.step-text').value.trim();
      if (text) {
        steps.push(text);
      }
    });
    
    // Calculate nutrition if not already calculated
    let nutrition;
    if (this.nutritionResults.classList.contains('active')) {
      nutrition = {
        calories: parseInt(this.caloriesPerServing.textContent) || 0,
        protein: parseInt(this.proteinPerServing.textContent) || 0,
        carbs: parseInt(this.carbsPerServing.textContent) || 0,
        fat: parseInt(this.fatPerServing.textContent) || 0
      };
    } else {
      nutrition = this.calculateRecipeNutrition(ingredients, servings);
    }
    
    // Create recipe object
    const recipe = {
      name,
      description,
      servings,
      prepTime,
      cookTime,
      ingredients,
      steps,
      nutrition,
      dateCreated: new Date().toISOString()
    };
    
    return recipe;
  }

  showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  getMockNutritionDatabase() {
    return [
      {
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        saturatedFat: 1,
        cholesterol: 85,
        sodium: 74,
        fiber: 0,
        sugar: 0,
        calcium: 15,
        iron: 1,
        potassium: 256
      },
      {
        name: 'Brown Rice',
        calories: 112,
        protein: 2.6,
        carbs: 23.5,
        fat: 0.9,
        saturatedFat: 0.2,
        cholesterol: 0,
        sodium: 10,
        fiber: 1.8,
        sugar: 0.7,
        calcium: 10,
        iron: 0.5,
        potassium: 84
      },
      {
        name: 'Spinach',
        calories: 23,
        protein: 2.9,
        carbs: 3.6,
        fat: 0.4,
        saturatedFat: 0.1,
        cholesterol: 0,
        sodium: 79,
        fiber: 2.2,
        sugar: 0.4,
        calcium: 99,
        iron: 2.7,
        potassium: 558
      },
      {
        name: 'Salmon',
        calories: 208,
        protein: 20,
        carbs: 0,
        fat: 13,
        saturatedFat: 3.1,
        cholesterol: 60,
        sodium: 59,
        fiber: 0,
        sugar: 0,
        calcium: 12,
        iron: 0.8,
        potassium: 384
      },
      {
        name: 'Sweet Potato',
        calories: 86,
        protein: 1.6,
        carbs: 20.1,
        fat: 0.1,
        saturatedFat: 0,
        cholesterol: 0,
        sodium: 55,
        fiber: 3,
        sugar: 4.2,
        calcium: 30,
        iron: 0.6,
        potassium: 337
      },
      {
        name: 'Olive Oil',
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100,
        saturatedFat: 14,
        cholesterol: 0,
        sodium: 2,
        fiber: 0,
        sugar: 0,
        calcium: 1,
        iron: 0.6,
        potassium: 1
      },
      {
        name: 'Avocado',
        calories: 160,
        protein: 2,
        carbs: 8.5,
        fat: 14.7,
        saturatedFat: 2.1,
        cholesterol: 0,
        sodium: 7,
        fiber: 6.7,
        sugar: 0.7,
        calcium: 12,
        iron: 0.6,
        potassium: 485
      },
      {
        name: 'Greek Yogurt',
        calories: 59,
        protein: 10,
        carbs: 3.6,
        fat: 0.4,
        saturatedFat: 0.3,
        cholesterol: 5,
        sodium: 36,
        fiber: 0,
        sugar: 3.6,
        calcium: 111,
        iron: 0.1,
        potassium: 141
      },
      {
        name: 'Egg',
        calories: 155,
        protein: 12.6,
        carbs: 0.6,
        fat: 10.6,
        saturatedFat: 3.3,
        cholesterol: 373,
        sodium: 124,
        fiber: 0,
        sugar: 0.6,
        calcium: 50,
        iron: 1.8,
        potassium: 126
      },
      {
        name: 'Almonds',
        calories: 576,
        protein: 21.2,
        carbs: 21.7,
        fat: 49.4,
        saturatedFat: 3.7,
        cholesterol: 0,
        sodium: 1,
        fiber: 12.2,
        sugar: 4.2,
        calcium: 269,
        iron: 3.7,
        potassium: 733
      },
      {
        name: 'Broccoli',
        calories: 34,
        protein: 2.8,
        carbs: 6.6,
        fat: 0.4,
        saturatedFat: 0.1,
        cholesterol: 0,
        sodium: 33,
        fiber: 2.6,
        sugar: 1.7,
        calcium: 47,
        iron: 0.7,
        potassium: 316
      },
      {
        name: 'Quinoa',
        calories: 120,
        protein: 4.4,
        carbs: 21.3,
        fat: 1.9,
        saturatedFat: 0.2,
        cholesterol: 0,
        sodium: 13,
        fiber: 2.8,
        sugar: 0.9,
        calcium: 17,
        iron: 1.5,
        potassium: 172
      },
      {
        name: 'Banana',
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3,
        saturatedFat: 0.1,
        cholesterol: 0,
        sodium: 1,
        fiber: 2.6,
        sugar: 12.2,
        calcium: 5,
        iron: 0.3,
        potassium: 358
      },
      {
        name: 'Lentils',
        calories: 116,
        protein: 9,
        carbs: 20,
        fat: 0.4,
        saturatedFat: 0.1,
        cholesterol: 0,
        sodium: 2,
        fiber: 7.9,
        sugar: 1.8,
        calcium: 19,
        iron: 3.3,
        potassium: 369
      },
      {
        name: 'Whole Wheat Bread',
        calories: 247,
        protein: 13,
        carbs: 41,
        fat: 3.4,
        saturatedFat: 0.7,
        cholesterol: 0,
        sodium: 481,
        fiber: 6.8,
        sugar: 6,
        calcium: 107,
        iron: 2.4,
        potassium: 212
      }
    ];
  }
}

// Initialize recipe calculator when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const recipeCalculator = new RecipeCalculator();
}); 