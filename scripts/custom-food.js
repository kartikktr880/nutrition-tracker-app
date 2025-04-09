// Custom Food Manager Module
import foodDatabase from './food-db.js';

class CustomFoodManager {
    constructor() {
        this.formElement = null;
        this.modalElement = null;
        this.editMode = false;
        this.currentFoodId = null;
        this.servingOptions = [];
        this.categoryOptions = [
            'Fruits', 'Vegetables', 'Grains', 'Protein Foods', 'Dairy',
            'Snacks', 'Beverages', 'Condiments', 'Desserts', 'Mixed Dishes', 'Other'
        ];
        this.measurementUnits = [
            { value: 'g', label: 'grams (g)' },
            { value: 'ml', label: 'milliliters (ml)' },
            { value: 'oz', label: 'ounces (oz)' },
            { value: 'cup', label: 'cup' },
            { value: 'tbsp', label: 'tablespoon' },
            { value: 'tsp', label: 'teaspoon' },
            { value: 'serving', label: 'serving' }
        ];
        
        this.initialize();
    }
    
    initialize() {
        // Create modal if it doesn't exist
        this.createModalIfNeeded();
        
        // Set up event listeners
        document.addEventListener('click', (e) => {
            if (e.target.id === 'add-custom-food-btn' || e.target.closest('#add-custom-food-btn')) {
                this.showCustomFoodModal();
            }
        });
        
        // Add event listeners to the modal itself
        if (this.modalElement) {
            const closeBtn = this.modalElement.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideModal());
            }
            
            const cancelBtn = this.modalElement.querySelector('#cancel-custom-food');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.hideModal());
            }
            
            const saveBtn = this.modalElement.querySelector('#save-custom-food');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveCustomFood());
            }
            
            // Add serving row button
            const addServingBtn = this.modalElement.querySelector('#add-serving-option');
            if (addServingBtn) {
                addServingBtn.addEventListener('click', () => this.addServingOption());
            }
        }
    }
    
    createModalIfNeeded() {
        if (!document.getElementById('custom-food-modal')) {
            const modalHtml = `
                <div id="custom-food-modal" class="modal">
                    <div class="modal-content custom-food-modal">
                        <div class="modal-header">
                            <h2 id="custom-food-title">Add Custom Food</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="custom-food-form">
                                <div class="form-group">
                                    <label for="food-name">Food Name*</label>
                                    <input type="text" id="food-name" required placeholder="e.g. Homemade Granola">
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="food-category">Category</label>
                                        <select id="food-category">
                                            ${this.categoryOptions.map(cat => 
                                                `<option value="${cat.toLowerCase()}">${cat}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="food-brand">Brand (optional)</label>
                                        <input type="text" id="food-brand" placeholder="e.g. Homemade">
                                    </div>
                                </div>
                                
                                <div class="section-header">
                                    <h3>Standard Serving</h3>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="serving-size">Serving Size*</label>
                                        <input type="number" id="serving-size" min="0" step="0.1" required placeholder="e.g. 100">
                                    </div>
                                    <div class="form-group">
                                        <label for="serving-unit">Unit*</label>
                                        <select id="serving-unit" required>
                                            ${this.measurementUnits.map(unit => 
                                                `<option value="${unit.value}">${unit.label}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="section-header">
                                    <h3>Nutrition Facts (per serving)</h3>
                                </div>
                                
                                <div class="nutrition-grid">
                                    <div class="form-group">
                                        <label for="food-calories">Calories*</label>
                                        <input type="number" id="food-calories" min="0" required placeholder="e.g. 240">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-protein">Protein (g)</label>
                                        <input type="number" id="food-protein" min="0" step="0.1" placeholder="e.g. 10">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-carbs">Carbs (g)</label>
                                        <input type="number" id="food-carbs" min="0" step="0.1" placeholder="e.g. 30">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-fat">Fat (g)</label>
                                        <input type="number" id="food-fat" min="0" step="0.1" placeholder="e.g. 8">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-fiber">Fiber (g)</label>
                                        <input type="number" id="food-fiber" min="0" step="0.1" placeholder="e.g. 5">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-sugar">Sugar (g)</label>
                                        <input type="number" id="food-sugar" min="0" step="0.1" placeholder="e.g. 12">
                                    </div>
                                    <div class="form-group">
                                        <label for="food-sodium">Sodium (mg)</label>
                                        <input type="number" id="food-sodium" min="0" placeholder="e.g. 120">
                                    </div>
                                </div>
                                
                                <div class="form-section servings-section">
                                    <div class="section-header">
                                        <h3>Additional Serving Options (optional)</h3>
                                        <button type="button" id="add-serving-option" class="btn secondary small">
                                            <i class="fas fa-plus"></i> Add Option
                                        </button>
                                    </div>
                                    <div id="serving-options-container">
                                        <!-- Additional serving options will be added here -->
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" id="cancel-custom-food" class="btn secondary">Cancel</button>
                            <button type="button" id="save-custom-food" class="btn primary">Save Food</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal to body
            const modalWrapper = document.createElement('div');
            modalWrapper.innerHTML = modalHtml.trim();
            document.body.appendChild(modalWrapper.firstChild);
            
            this.modalElement = document.getElementById('custom-food-modal');
            this.formElement = document.getElementById('custom-food-form');
        } else {
            this.modalElement = document.getElementById('custom-food-modal');
            this.formElement = document.getElementById('custom-food-form');
        }
    }
    
    showCustomFoodModal(foodId = null) {
        // Reset form
        this.reset();
        
        if (foodId) {
            // Edit mode - load existing food data
            this.editMode = true;
            this.currentFoodId = foodId;
            this.loadFoodData(foodId);
            document.getElementById('custom-food-title').textContent = 'Edit Custom Food';
        } else {
            // Add mode
            this.editMode = false;
            this.currentFoodId = null;
            document.getElementById('custom-food-title').textContent = 'Add Custom Food';
        }
        
        // Show modal
        this.modalElement.style.display = 'flex';
    }
    
    async loadFoodData(foodId) {
        try {
            const food = await foodDatabase.getFoodDetails(foodId);
            if (!food) throw new Error('Food not found');
            
            // Set form values
            document.getElementById('food-name').value = food.name || '';
            document.getElementById('food-category').value = food.category || 'other';
            document.getElementById('food-brand').value = food.brandOwner || '';
            
            // Standard serving
            const servingMatch = (food.serving || '').match(/^([\d.]+)(.+)$/);
            if (servingMatch) {
                document.getElementById('serving-size').value = servingMatch[1] || '';
                document.getElementById('serving-unit').value = servingMatch[2] || 'g';
            } else {
                document.getElementById('serving-size').value = '100';
                document.getElementById('serving-unit').value = 'g';
            }
            
            // Nutrition facts
            document.getElementById('food-calories').value = food.calories || '';
            document.getElementById('food-protein').value = food.protein || '';
            document.getElementById('food-carbs').value = food.carbs || '';
            document.getElementById('food-fat').value = food.fat || '';
            document.getElementById('food-fiber').value = food.fiber || '';
            document.getElementById('food-sugar').value = food.sugar || '';
            document.getElementById('food-sodium').value = food.sodium || '';
            
            // Additional serving options
            if (food.servingOptions) {
                this.servingOptions = Object.entries(food.servingOptions).map(([key, option]) => ({
                    name: option.name,
                    ratio: option.ratio
                }));
                
                this.renderServingOptions();
            }
        } catch (error) {
            console.error('Error loading food data:', error);
            this.showNotification('Error loading food data', 'error');
        }
    }
    
    async saveCustomFood() {
        try {
            if (!this.formElement.checkValidity()) {
                this.formElement.reportValidity();
                return;
            }
            
            // Get form values
            const name = document.getElementById('food-name').value;
            const category = document.getElementById('food-category').value;
            const brand = document.getElementById('food-brand').value;
            const servingSize = parseFloat(document.getElementById('serving-size').value);
            const servingUnit = document.getElementById('serving-unit').value;
            const calories = parseInt(document.getElementById('food-calories').value);
            const protein = parseFloat(document.getElementById('food-protein').value || 0);
            const carbs = parseFloat(document.getElementById('food-carbs').value || 0);
            const fat = parseFloat(document.getElementById('food-fat').value || 0);
            const fiber = parseFloat(document.getElementById('food-fiber').value || 0);
            const sugar = parseFloat(document.getElementById('food-sugar').value || 0);
            const sodium = parseInt(document.getElementById('food-sodium').value || 0);
            
            // Prepare food data
            const foodData = {
                name,
                category,
                brandOwner: brand,
                serving: `${servingSize}${servingUnit}`,
                calories,
                protein,
                carbs,
                fat,
                fiber,
                sugar,
                sodium
            };
            
            // Add serving options if any
            if (this.servingOptions.length > 0) {
                foodData.servingOptions = {};
                this.servingOptions.forEach((option, index) => {
                    const key = `option${index + 1}`;
                    foodData.servingOptions[key] = {
                        name: option.name,
                        ratio: option.ratio
                    };
                });
            }
            
            if (this.editMode && this.currentFoodId) {
                // Update existing food
                await foodDatabase.updateCustomFood(this.currentFoodId, foodData);
                this.showNotification('Food updated successfully', 'success');
            } else {
                // Add new food
                await foodDatabase.addCustomFood(foodData);
                this.showNotification('Food added successfully', 'success');
            }
            
            // Close modal and refresh food list
            this.hideModal();
            
            // Trigger refresh by dispatching a custom event
            document.dispatchEvent(new CustomEvent('customFoodUpdated'));
        } catch (error) {
            console.error('Error saving custom food:', error);
            this.showNotification('Error saving food', 'error');
        }
    }
    
    reset() {
        // Reset form fields
        if (this.formElement) {
            this.formElement.reset();
        }
        
        // Reset serving options
        this.servingOptions = [];
        const container = document.getElementById('serving-options-container');
        if (container) {
            container.innerHTML = '';
        }
    }
    
    hideModal() {
        this.modalElement.style.display = 'none';
    }
    
    addServingOption() {
        this.servingOptions.push({
            name: '',
            ratio: 1
        });
        
        this.renderServingOptions();
    }
    
    removeServingOption(index) {
        this.servingOptions.splice(index, 1);
        this.renderServingOptions();
    }
    
    renderServingOptions() {
        const container = document.getElementById('serving-options-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.servingOptions.forEach((option, index) => {
            const row = document.createElement('div');
            row.className = 'serving-option-row';
            row.innerHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="serving-name-${index}">Name</label>
                        <input type="text" id="serving-name-${index}" placeholder="e.g. 1 cup" value="${option.name}">
                    </div>
                    <div class="form-group">
                        <label for="serving-ratio-${index}">Ratio</label>
                        <input type="number" id="serving-ratio-${index}" min="0.1" step="0.1" placeholder="e.g. 2.5" value="${option.ratio}">
                    </div>
                    <div class="form-group form-action">
                        <button type="button" class="btn icon-btn remove-serving" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(row);
            
            // Add event listener to name and ratio inputs
            row.querySelector(`#serving-name-${index}`).addEventListener('input', (e) => {
                this.servingOptions[index].name = e.target.value;
            });
            
            row.querySelector(`#serving-ratio-${index}`).addEventListener('input', (e) => {
                this.servingOptions[index].ratio = parseFloat(e.target.value);
            });
            
            // Add event listener to remove button
            row.querySelector(`.remove-serving[data-index="${index}"]`).addEventListener('click', () => {
                this.removeServingOption(index);
            });
        });
    }
    
    showNotification(message, type = 'info') {
        // Dispatch a custom event to show notification
        const event = new CustomEvent('showNotification', {
            detail: {
                message,
                type
            }
        });
        document.dispatchEvent(event);
    }
}

// Create and export the singleton instance
const customFoodManager = new CustomFoodManager();
export default customFoodManager; 