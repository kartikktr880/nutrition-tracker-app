// Initialize Meal Planner functionality
class MealPlanner {
  constructor() {
    this.currentDate = new Date();
    this.meals = JSON.parse(localStorage.getItem('mealPlan')) || {};
    this.mealTemplates = JSON.parse(localStorage.getItem('mealTemplates')) || [];
    this.initElements();
    this.initEventListeners();
    this.renderCalendar();
    this.renderTemplates();
    this.updateWeeklyStats();
  }

  initElements() {
    // Calendar elements
    this.calendarDays = document.getElementById('calendar-days');
    this.calendarMeals = document.getElementById('calendar-meals');
    this.currentWeekDisplay = document.getElementById('current-week-display');
    this.prevWeekBtn = document.getElementById('prev-week');
    this.nextWeekBtn = document.getElementById('next-week');
    this.todayBtn = document.getElementById('today-btn');
    
    // Templates elements
    this.templatesGrid = document.getElementById('templates-grid');
    this.templatesEmpty = document.getElementById('templates-empty');
    this.createTemplateBtn = document.getElementById('create-template-btn');
    this.createFirstTemplateBtn = document.getElementById('create-first-template-btn');
    
    // Modals
    this.addMealModal = document.getElementById('add-meal-modal');
    this.templateModal = document.getElementById('template-modal');
    
    // Weekly stats
    this.weeklyCalories = document.getElementById('weekly-calories');
    this.weeklyProtein = document.getElementById('weekly-protein');
    this.weeklyCarbs = document.getElementById('weekly-carbs');
    this.weeklyFat = document.getElementById('weekly-fat');
    
    // Progress bars
    this.caloriesProgress = document.getElementById('calories-progress');
    this.proteinProgress = document.getElementById('protein-progress');
    this.carbsProgress = document.getElementById('carbs-progress');
    this.fatProgress = document.getElementById('fat-progress');
    
    // Buttons
    this.generateShoppingListBtn = document.getElementById('generate-shopping-list');
  }

  initEventListeners() {
    // Navigation buttons
    this.prevWeekBtn.addEventListener('click', () => this.changeWeek(-1));
    this.nextWeekBtn.addEventListener('click', () => this.changeWeek(1));
    this.todayBtn.addEventListener('click', () => this.goToToday());
    
    // Template buttons
    if (this.createTemplateBtn) {
      this.createTemplateBtn.addEventListener('click', () => this.openTemplateModal());
    }
    
    if (this.createFirstTemplateBtn) {
      this.createFirstTemplateBtn.addEventListener('click', () => this.openTemplateModal());
    }
    
    // Shopping list
    if (this.generateShoppingListBtn) {
      this.generateShoppingListBtn.addEventListener('click', () => this.generateShoppingList());
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });
    
    // Save buttons
    const saveMealBtn = document.getElementById('save-meal-btn');
    if (saveMealBtn) {
      saveMealBtn.addEventListener('click', () => this.saveMeal());
    }
    
    const saveTemplateBtn = document.getElementById('save-template-btn');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => this.saveTemplate());
    }
    
    // Modal tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        this.switchTab(tabId);
        });
    });
  }

  formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
  }

  renderCalendar() {
    // Get the first day of the current week (Sunday)
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    // Format the week display (e.g., "June 5 - June 11, 2023")
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    
    const formatDateForDisplay = (date) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    
    this.currentWeekDisplay.textContent = `${formatDateForDisplay(firstDayOfWeek)} - ${formatDateForDisplay(lastDayOfWeek)}, ${lastDayOfWeek.getFullYear()}`;
    
    // Clear calendar days
    this.calendarDays.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = day;
      this.calendarDays.appendChild(dayHeader);
    });
    
    // Clear calendar meals
    this.calendarMeals.innerHTML = '';
    
    // Add days and meal slots
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateKey = this.formatDate(currentDay);
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      // Add date display
      const dayElement = document.createElement('div');
      dayElement.className = `calendar-day${isToday ? ' today' : ''}`;
      
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-date';
      dayNumber.textContent = currentDay.getDate();
      dayElement.appendChild(dayNumber);
      
      this.calendarDays.appendChild(dayElement);
      
      // Add meal slots
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
      mealTypes.forEach(mealType => {
        const mealSlot = document.createElement('div');
        mealSlot.className = 'meal-slot';
        
        const mealTypeEl = document.createElement('div');
        mealTypeEl.className = 'meal-type';
        mealTypeEl.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        
        mealSlot.appendChild(mealTypeEl);
        
        // Check if there's a meal for this day and type
        if (this.meals[dateKey] && this.meals[dateKey][mealType]) {
          const meal = this.meals[dateKey][mealType];
          
          const mealItem = document.createElement('div');
          mealItem.className = 'meal-item';
          mealItem.innerHTML = `
            <div class="meal-name">${meal.name}</div>
            <div class="meal-calories">${meal.calories || 0} cal</div>
          `;
          
          mealItem.addEventListener('click', () => this.viewMeal(dateKey, mealType));
          
          mealSlot.appendChild(mealItem);
            } else {
          mealSlot.classList.add('empty');
          mealSlot.addEventListener('click', () => this.openAddMealModal(dateKey, mealType));
        }
        
        this.calendarMeals.appendChild(mealSlot);
      });
    }
  }

  renderTemplates() {
    if (this.mealTemplates.length === 0) {
      if (this.templatesEmpty) {
        this.templatesEmpty.style.display = 'flex';
      }
      if (this.templatesGrid) {
        this.templatesGrid.style.display = 'none';
      }
      return;
    }
    
    if (this.templatesEmpty) {
      this.templatesEmpty.style.display = 'none';
    }
    if (this.templatesGrid) {
      this.templatesGrid.style.display = 'grid';
      this.templatesGrid.innerHTML = '';
      
      this.mealTemplates.forEach((template, index) => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        
        templateCard.innerHTML = `
          <div class="template-header">
            <h3 class="template-name">${template.name}</h3>
            <span class="template-type">${template.type || 'Custom'}</span>
          </div>
          <div class="template-nutrition">
            <div class="template-nutrition-item">${template.calories || 0} cal</div>
            <div class="template-nutrition-item">${template.protein || 0}g protein</div>
            <div class="template-nutrition-item">${template.carbs || 0}g carbs</div>
            <div class="template-nutrition-item">${template.fat || 0}g fat</div>
          </div>
          <div class="template-actions">
            <button class="template-action use-template" data-index="${index}">Use</button>
            <button class="template-action delete-template" data-index="${index}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        
        // Add event listeners
        const useBtn = templateCard.querySelector('.use-template');
        const deleteBtn = templateCard.querySelector('.delete-template');
        
        useBtn.addEventListener('click', () => this.useTemplate(index));
        deleteBtn.addEventListener('click', () => this.deleteTemplate(index));
        
        this.templatesGrid.appendChild(templateCard);
      });
    }
  }

  changeWeek(offset) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + (offset * 7));
    this.currentDate = newDate;
    this.renderCalendar();
    this.updateWeeklyStats();
  }

  goToToday() {
    this.currentDate = new Date();
    this.renderCalendar();
    this.updateWeeklyStats();
  }

  openAddMealModal(date, mealType) {
    // Set values in hidden fields
    const mealDateField = document.getElementById('meal-date');
    const mealTypeField = document.getElementById('meal-type');
    
    if (mealDateField) mealDateField.value = date;
    if (mealTypeField) mealTypeField.value = mealType;
    
    // Set modal title
    const modalTitle = document.getElementById('meal-modal-title');
    if (modalTitle) {
      const displayDate = new Date(this.parseDate(date));
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = displayDate.toLocaleDateString('en-US', options);
      
      modalTitle.textContent = `Add ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} for ${formattedDate}`;
    }
    
    // Clear any previously selected items
    const selectedItemsContainer = document.getElementById('selected-items');
    if (selectedItemsContainer) {
      selectedItemsContainer.innerHTML = '';
    }
    
    // Update nutrition summary
    this.updateMealNutrition();
    
    // Reset tab to food search
    this.switchTab('food-search');
    
    // Show modal
    this.addMealModal.classList.add('active');
  }

  openTemplateModal(templateIndex = null) {
    const modalTitle = document.getElementById('template-modal-title');
    const templateNameField = document.getElementById('template-name');
    const templateTypeField = document.getElementById('template-type');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    
    if (modalTitle) {
      modalTitle.textContent = templateIndex !== null ? 'Edit Meal Template' : 'Create Meal Template';
    }
    
    if (templateIndex !== null && this.mealTemplates[templateIndex]) {
      const template = this.mealTemplates[templateIndex];
      
      if (templateNameField) templateNameField.value = template.name;
      if (templateTypeField) templateTypeField.value = template.type || 'Custom';
      
      // Populate template items
      // This part depends on your template structure
      
      if (saveTemplateBtn) {
        saveTemplateBtn.setAttribute('data-index', templateIndex);
                }
            } else {
      if (templateNameField) templateNameField.value = '';
      if (templateTypeField) templateTypeField.value = 'Custom';
      
      // Clear template items
      
      if (saveTemplateBtn) {
        saveTemplateBtn.removeAttribute('data-index');
      }
    }
    
    // Show modal
    this.templateModal.classList.add('active');
  }

  saveMeal() {
    const date = document.getElementById('meal-date').value;
    const mealType = document.getElementById('meal-type').value;
    const mealName = document.getElementById('meal-name').value;
    const mealNotes = document.getElementById('meal-notes').value;
    
    // Get selected items
    const selectedItems = Array.from(document.querySelectorAll('.selected-item'))
      .map(item => {
        const itemId = item.getAttribute('data-id');
        const itemName = item.querySelector('.selected-item-name').textContent;
        const calories = parseInt(item.getAttribute('data-calories') || '0');
        const protein = parseFloat(item.getAttribute('data-protein') || '0');
        const carbs = parseFloat(item.getAttribute('data-carbs') || '0');
        const fat = parseFloat(item.getAttribute('data-fat') || '0');
        
        return { id: itemId, name: itemName, calories, protein, carbs, fat };
      });
    
    // Calculate totals
    const totals = selectedItems.reduce((acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Create meal object
    const meal = {
      name: mealName,
      notes: mealNotes,
      items: selectedItems,
      ...totals
    };
    
    // Save to state
    if (!this.meals[date]) {
      this.meals[date] = {};
    }
    
    this.meals[date][mealType] = meal;
    
    // Save to localStorage
    localStorage.setItem('mealPlan', JSON.stringify(this.meals));
    
    // Close modal and update UI
    this.addMealModal.classList.remove('active');
    this.renderCalendar();
    this.updateWeeklyStats();
    
    // Show success notification
    this.showToast(`${mealName} added to your meal plan!`);
  }

  saveTemplate() {
    const templateNameField = document.getElementById('template-name');
    const templateTypeField = document.getElementById('template-type');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    
    if (!templateNameField || !templateNameField.value.trim()) {
      this.showToast('Please enter a template name', 'error');
            return;
        }
        
    // Get template info
    const templateName = templateNameField.value.trim();
    const templateType = templateTypeField ? templateTypeField.value : 'Custom';
    
    // Get template items - this should be adapted to your UI
    const templateItems = [];
    
    // Calculate totals
    const totals = templateItems.reduce((acc, item) => {
      acc.calories += item.calories || 0;
      acc.protein += item.protein || 0;
      acc.carbs += item.carbs || 0;
      acc.fat += item.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Create template object
    const template = {
      name: templateName,
      type: templateType,
      items: templateItems,
      ...totals
    };
    
    // Check if we're editing or creating
    if (saveTemplateBtn && saveTemplateBtn.hasAttribute('data-index')) {
      const index = parseInt(saveTemplateBtn.getAttribute('data-index'));
      this.mealTemplates[index] = template;
    } else {
      this.mealTemplates.push(template);
    }
    
    // Save to localStorage
    localStorage.setItem('mealTemplates', JSON.stringify(this.mealTemplates));
    
    // Close modal and update UI
    this.templateModal.classList.remove('active');
    this.renderTemplates();
    
    // Show success notification
    this.showToast(`Template "${templateName}" saved successfully!`);
  }

  viewMeal(date, mealType) {
    if (this.meals[date] && this.meals[date][mealType]) {
      const meal = this.meals[date][mealType];
      
      // Populate modal with meal details
      // This implementation depends on your modal structure
      
      // For now, we'll just show a temporary message
      this.showToast(`Viewing ${mealType} for ${date}`);
      
      // In a real implementation, you would populate the modal fields and show it
      // this.mealDetailsModal.classList.add('active');
    }
  }

  deleteMeal(date, mealType) {
    if (this.meals[date] && this.meals[date][mealType]) {
      const mealName = this.meals[date][mealType].name;
      
      // Remove the meal
      delete this.meals[date][mealType];
      
      // If no more meals for this date, clean up
      if (Object.keys(this.meals[date]).length === 0) {
        delete this.meals[date];
      }
      
      // Save to localStorage
      localStorage.setItem('mealPlan', JSON.stringify(this.meals));
      
      // Update UI
      this.renderCalendar();
      this.updateWeeklyStats();
      
      // Show success notification
      this.showToast(`"${mealName}" removed from your meal plan`);
    }
  }

  useTemplate(index) {
    if (this.mealTemplates[index]) {
      // This would typically open the add meal modal and pre-populate it
      // with the template content
      this.showToast(`Using template: ${this.mealTemplates[index].name}`);
      
      // In a real implementation, you would call openAddMealModal
      // and then populate the selected items from the template
    }
  }

  deleteTemplate(index) {
    if (this.mealTemplates[index]) {
      const templateName = this.mealTemplates[index].name;
      
      // Remove template
      this.mealTemplates.splice(index, 1);
      
      // Save to localStorage
      localStorage.setItem('mealTemplates', JSON.stringify(this.mealTemplates));
      
      // Update UI
      this.renderTemplates();
      
      // Show success notification
      this.showToast(`Template "${templateName}" deleted`);
    }
  }

  updateWeeklyStats() {
    // Get first day of current week (Sunday)
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    // Initialize totals
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    // Loop through each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateKey = this.formatDate(currentDay);
      
      // Check if we have meals for this day
      if (this.meals[dateKey]) {
        // Add up all meal totals for this day
        Object.values(this.meals[dateKey]).forEach(meal => {
          totals.calories += meal.calories || 0;
          totals.protein += meal.protein || 0;
          totals.carbs += meal.carbs || 0;
          totals.fat += meal.fat || 0;
        });
      }
    }
    
    // Update the UI
    if (this.weeklyCalories) this.weeklyCalories.textContent = Math.round(totals.calories);
    if (this.weeklyProtein) this.weeklyProtein.textContent = `${Math.round(totals.protein)}g`;
    if (this.weeklyCarbs) this.weeklyCarbs.textContent = `${Math.round(totals.carbs)}g`;
    if (this.weeklyFat) this.weeklyFat.textContent = `${Math.round(totals.fat)}g`;
    
    // Update progress bars based on goals
    // For this example, we'll use default weekly goals
    const goals = {
      calories: 14000, // 2000 per day
      protein: 490,    // 70g per day
      carbs: 1750,     // 250g per day
      fat: 385         // 55g per day
    };
    
    const calculatePercentage = (value, goal) => {
      return Math.min(Math.round((value / goal) * 100), 100);
    };
    
    if (this.caloriesProgress) {
      this.caloriesProgress.style.width = `${calculatePercentage(totals.calories, goals.calories)}%`;
    }
    
    if (this.proteinProgress) {
      this.proteinProgress.style.width = `${calculatePercentage(totals.protein, goals.protein)}%`;
    }
    
    if (this.carbsProgress) {
      this.carbsProgress.style.width = `${calculatePercentage(totals.carbs, goals.carbs)}%`;
    }
    
    if (this.fatProgress) {
      this.fatProgress.style.width = `${calculatePercentage(totals.fat, goals.fat)}%`;
    }
  }

  generateShoppingList() {
    // Get first day of current week (Sunday)
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    // Extract all items from the current week's meals
    const mealPlanItems = [];
    
    // Loop through each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateKey = this.formatDate(currentDay);
      
      // Check if we have meals for this day
      if (this.meals[dateKey]) {
        // Add items from all meals for this day
        Object.values(this.meals[dateKey]).forEach(meal => {
          if (meal.items && meal.items.length > 0) {
            meal.items.forEach(item => {
              // Convert meal item to shopping list item
              mealPlanItems.push({
                name: item.name,
                quantity: '1 serving', // Default quantity
                category: this.determineCategory(item.name)
              });
            });
          }
        });
      }
    }

    // Save weekly meal plan to localStorage for shopping list to use
    const weeklyMealPlan = {
      startDate: this.formatDate(firstDayOfWeek),
      endDate: this.formatDate(new Date(firstDayOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)),
      items: mealPlanItems
    };
    
    localStorage.setItem('currentWeekMealPlan', JSON.stringify(weeklyMealPlan));
    
    // Redirect to shopping list page
    if (mealPlanItems.length > 0) {
      window.location.href = 'shopping-list.html?source=mealplan';
      return;
    }
    
    // Show a message if no items found
    this.showToast('No food items found in the meal plan. Add meals with ingredients first.', 'warning');
  }
  
  determineCategory(itemName) {
    // Simple logic to categorize items based on name
    itemName = itemName.toLowerCase();
    
    // Define category patterns
    const categories = {
      meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'shrimp', 'salmon', 'tuna'],
      dairy: ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'egg'],
      produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'cucumber', 'carrot', 'onion', 'garlic', 'potato', 'broccoli', 'spinach'],
      pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'spice', 'herb', 'sauce', 'soup', 'bread'],
      frozen: ['frozen', 'ice cream'],
    };
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => itemName.includes(keyword))) {
        return category;
      }
    }
    
    // Default category
    return 'other';
  }

  switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `${tabId}-tab`) {
        content.classList.add('active');
        } else {
        content.classList.remove('active');
      }
    });
  }

  updateMealNutrition() {
    // Calculate totals from selected items
    const selectedItems = document.querySelectorAll('.selected-item');
    
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    selectedItems.forEach(item => {
      totals.calories += parseInt(item.getAttribute('data-calories') || '0');
      totals.protein += parseFloat(item.getAttribute('data-protein') || '0');
      totals.carbs += parseFloat(item.getAttribute('data-carbs') || '0');
      totals.fat += parseFloat(item.getAttribute('data-fat') || '0');
    });
    
    // Update UI
    const mealCalories = document.getElementById('meal-calories');
    const mealProtein = document.getElementById('meal-protein');
    const mealCarbs = document.getElementById('meal-carbs');
    const mealFat = document.getElementById('meal-fat');
    
    if (mealCalories) mealCalories.textContent = Math.round(totals.calories);
    if (mealProtein) mealProtein.textContent = `${Math.round(totals.protein)}g`;
    if (mealCarbs) mealCarbs.textContent = `${Math.round(totals.carbs)}g`;
    if (mealFat) mealFat.textContent = `${Math.round(totals.fat)}g`;
  }

  showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to DOM
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

// Initialize the meal planner when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const mealPlanner = new MealPlanner();
});