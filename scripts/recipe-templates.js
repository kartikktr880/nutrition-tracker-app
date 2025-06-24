import { auth } from './auth-core.js';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { app } from './firebase-config.js';

class RecipeTemplates {
    constructor() {
        this.auth = auth;
        this.db = getFirestore(app);
        this.templates = [];
        this.categories = ['breakfast', 'lunch', 'dinner', 'snack'];
    }

    async initialize() {
        await this.loadTemplates();
        this.setupEventListeners();
    }

    async loadTemplates() {
        try {
            const templatesRef = collection(this.db, 'recipeTemplates');
            const q = query(templatesRef, where('userId', '==', this.auth.currentUser.uid));
            const querySnapshot = await getDocs(q);
            
            this.templates = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateTemplatesList();
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    setupEventListeners() {
        const saveTemplateBtn = document.getElementById('saveAsTemplate');
        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => this.saveCurrentMealAsTemplate());
        }

        const templatesList = document.getElementById('templatesList');
        if (templatesList) {
            templatesList.addEventListener('click', (e) => {
                const templateId = e.target.closest('.template-item')?.dataset.templateId;
                if (templateId) {
                    this.loadTemplateToForm(templateId);
                }
            });
        }
    }

    async saveCurrentMealAsTemplate() {
        const mealForm = document.getElementById('mealForm');
        if (!mealForm) return;

        const templateData = {
            name: document.getElementById('mealName').value,
            type: document.getElementById('mealType').value,
            servings: parseInt(document.getElementById('servings').value, 10),
            ingredients: this.getIngredientsFromForm(),
            nutrition: this.getNutritionFromForm(),
            instructions: document.getElementById('instructions').value,
            notes: document.getElementById('mealNotes').value,
            userId: this.auth.currentUser.uid,
            category: document.getElementById('mealType').value,
            createdAt: new Date(),
            timesUsed: 0
        };

        try {
            await addDoc(collection(this.db, 'recipeTemplates'), templateData);
            await this.loadTemplates();
            this.showNotification('Recipe template saved successfully!');
        } catch (error) {
            console.error('Error saving template:', error);
            this.showNotification('Error saving template', 'error');
        }
    }

    getIngredientsFromForm() {
        const ingredientsList = document.getElementById('ingredientsList');
        return Array.from(ingredientsList.children).map(row => ({
            name: row.querySelector('.ingredient-name').value,
            amount: row.querySelector('.ingredient-amount').value,
            unit: row.querySelector('.ingredient-unit').value
        }));
    }

    getNutritionFromForm() {
        return {
            calories: parseFloat(document.getElementById('calories').value) || 0,
            protein: parseFloat(document.getElementById('protein').value) || 0,
            carbs: parseFloat(document.getElementById('carbs').value) || 0,
            fat: parseFloat(document.getElementById('fat').value) || 0,
            fiber: parseFloat(document.getElementById('fiber').value) || 0,
            sugar: parseFloat(document.getElementById('sugar').value) || 0
        };
    }

    async loadTemplateToForm(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        document.getElementById('mealName').value = template.name;
        document.getElementById('mealType').value = template.type;
        document.getElementById('servings').value = template.servings;
        document.getElementById('instructions').value = template.instructions || '';
        document.getElementById('mealNotes').value = template.notes || '';

        // Update nutrition values
        if (template.nutrition) {
            document.getElementById('calories').value = template.nutrition.calories || '';
            document.getElementById('protein').value = template.nutrition.protein || '';
            document.getElementById('carbs').value = template.nutrition.carbs || '';
            document.getElementById('fat').value = template.nutrition.fat || '';
            document.getElementById('fiber').value = template.nutrition.fiber || '';
            document.getElementById('sugar').value = template.nutrition.sugar || '';
        }

        // Update ingredients
        const ingredientsList = document.getElementById('ingredientsList');
        ingredientsList.innerHTML = '';
        template.ingredients.forEach(ingredient => {
            this.addIngredientRow(ingredient);
        });

        // Update template usage count
        await this.updateTemplateUsage(templateId);
    }

    addIngredientRow(ingredient = null) {
        const ingredientsList = document.getElementById('ingredientsList');
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" class="ingredient-name" placeholder="Ingredient name" value="${ingredient?.name || ''}" required>
            <input type="text" class="ingredient-amount" placeholder="Amount" value="${ingredient?.amount || ''}" required>
            <input type="text" class="ingredient-unit" placeholder="Unit" value="${ingredient?.unit || ''}" required>
            <button type="button" class="remove-ingredient" title="Remove ingredient">
                <i class="fas fa-times"></i>
            </button>
        `;
        ingredientsList.appendChild(row);
    }

    async updateTemplateUsage(templateId) {
        try {
            const templateRef = doc(this.db, 'recipeTemplates', templateId);
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                await updateDoc(templateRef, {
                    timesUsed: (template.timesUsed || 0) + 1,
                    lastUsed: new Date()
                });
            }
        } catch (error) {
            console.error('Error updating template usage:', error);
        }
    }

    updateTemplatesList() {
        const templatesList = document.getElementById('templatesList');
        if (!templatesList) return;

        templatesList.innerHTML = '';
        const groupedTemplates = this.groupTemplatesByCategory();

        for (const [category, templates] of Object.entries(groupedTemplates)) {
            const categorySection = document.createElement('div');
            categorySection.className = 'template-category';
            categorySection.innerHTML = `
                <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                <div class="template-items"></div>
            `;

            const itemsContainer = categorySection.querySelector('.template-items');
            templates.forEach(template => {
                const templateItem = this.createTemplateItem(template);
                itemsContainer.appendChild(templateItem);
            });

            templatesList.appendChild(categorySection);
        }
    }

    groupTemplatesByCategory() {
        const grouped = {};
        this.categories.forEach(category => {
            grouped[category] = this.templates.filter(t => t.category === category)
                .sort((a, b) => (b.timesUsed || 0) - (a.timesUsed || 0));
        });
        return grouped;
    }

    createTemplateItem(template) {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.dataset.templateId = template.id;
        
        const nutrition = template.nutrition || {};
        item.innerHTML = `
            <div class="template-header">
                <h5>${template.name}</h5>
                <span class="template-stats">
                    <i class="fas fa-utensils"></i> ${template.servings} servings
                    <i class="fas fa-fire"></i> ${nutrition.calories || 0} kcal
                </span>
            </div>
            <div class="template-details">
                <span class="template-ingredients">${template.ingredients.length} ingredients</span>
                <span class="template-usage">Used ${template.timesUsed || 0} times</span>
            </div>
        `;

        return item;
    }

    showNotification(message, type = 'success') {
        // Implementation depends on your notification system
        console.log(`${type}: ${message}`);
    }
}

export const recipeTemplates = new RecipeTemplates(); 