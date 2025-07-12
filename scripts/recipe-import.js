import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { auth } from './auth-core.js';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from './firebase-config.js';
import { recipeTemplates } from './recipe-templates.js';

class RecipeImport {
    constructor() {
        this.db = getFirestore(app);
        this.supportedSources = ['url', 'text', 'file'];
    }

    async initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const importBtn = document.getElementById('importRecipe');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.showImportModal());
        }
    }

    showImportModal() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.id = 'importModal';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Import Recipe</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="import-content">
                    <div class="import-tabs">
                        <button class="tab-btn active" data-tab="url">
                            <i class="fas fa-link"></i> From URL
                        </button>
                        <button class="tab-btn" data-tab="text">
                            <i class="fas fa-keyboard"></i> Paste Text
                        </button>
                        <button class="tab-btn" data-tab="file">
                            <i class="fas fa-file-alt"></i> Upload File
                        </button>
                    </div>

                    <div class="tab-content active" id="urlTab">
                        <div class="form-group">
                            <label for="recipeUrl">Recipe URL</label>
                            <input type="url" id="recipeUrl" placeholder="Paste recipe URL here">
                            <p class="help-text">Supports popular recipe websites</p>
                        </div>
                    </div>

                    <div class="tab-content" id="textTab">
                        <div class="form-group">
                            <label for="recipeText">Recipe Text</label>
                            <textarea id="recipeText" rows="10" placeholder="Paste recipe text here"></textarea>
                            <p class="help-text">Paste the recipe including ingredients and instructions</p>
                        </div>
                    </div>

                    <div class="tab-content" id="fileTab">
                        <div class="form-group">
                            <label for="recipeFile">Recipe File</label>
                            <input type="file" id="recipeFile" accept=".txt,.doc,.docx,.pdf">
                            <p class="help-text">Supported formats: TXT, DOC, DOCX, PDF</p>
                        </div>
                    </div>

                    <div class="import-preview" id="importPreview"></div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelImport">Cancel</button>
                        <button type="button" class="btn btn-primary" id="processImport">
                            <i class="fas fa-file-import"></i> Import Recipe
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupModalEventListeners(modal);
    }

    setupModalEventListeners(modal) {
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('#cancelImport');
        const processBtn = modal.querySelector('#processImport');
        const tabs = modal.querySelectorAll('.tab-btn');
        const urlInput = modal.querySelector('#recipeUrl');
        const textInput = modal.querySelector('#recipeText');
        const fileInput = modal.querySelector('#recipeFile');

        closeBtn.addEventListener('click', () => this.closeImportModal(modal));
        cancelBtn.addEventListener('click', () => this.closeImportModal(modal));
        processBtn.addEventListener('click', () => this.processImport(modal));

        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(modal, tab.dataset.tab));
        });

        // Live preview as user inputs
        urlInput.addEventListener('input', debounce(() => this.previewRecipe(modal, 'url'), 1000));
        textInput.addEventListener('input', debounce(() => this.previewRecipe(modal, 'text'), 1000));
        fileInput.addEventListener('change', () => this.previewRecipe(modal, 'file'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeImportModal(modal);
        });
    }

    switchTab(modal, tabId) {
        const tabs = modal.querySelectorAll('.tab-btn');
        const contents = modal.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        contents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });

        // Clear preview when switching tabs
        modal.querySelector('#importPreview').innerHTML = '';
    }

    async previewRecipe(modal, source) {
        const preview = modal.querySelector('#importPreview');
        preview.innerHTML = '<div class="loading">Analyzing recipe...</div>';

        try {
            const recipeData = await this.extractRecipeData(modal, source);
            if (recipeData) {
                preview.innerHTML = this.generatePreviewHTML(recipeData);
            } else {
                preview.innerHTML = '<div class="error">Could not detect recipe format. Please check your input.</div>';
            }
        } catch (error) {
            logError('Error previewing recipe:', error);
            preview.innerHTML = '<div class="error">Error analyzing recipe. Please try again.</div>';
        }
    }

    async extractRecipeData(modal, source) {
        let content = '';
        switch (source) {
            case 'url':
                const url = modal.querySelector('#recipeUrl').value.trim();
                if (!url) return null;
                // In a real implementation, this would make an API call to a recipe scraper service
                // For now, we'll simulate parsing with a basic structure
                return this.simulateUrlParsing(url);

            case 'text':
                content = modal.querySelector('#recipeText').value.trim();
                if (!content) return null;
                return this.parseRecipeText(content);

            case 'file':
                const file = modal.querySelector('#recipeFile').files[0];
                if (!file) return null;
                content = await this.readFile(file);
                return this.parseRecipeText(content);
        }
    }

    generatePreviewHTML(recipe) {
        return `
            <div class="preview-content">
                <h4>${recipe.name}</h4>
                ${recipe.servings ? `<p class="servings"><i class="fas fa-users"></i> ${recipe.servings} servings</p>` : ''}
                
                <div class="preview-section">
                    <h5><i class="fas fa-list"></i> Ingredients</h5>
                    <ul class="ingredients-list">
                        ${recipe.ingredients.map(ing => `
                            <li>
                                <span class="amount">${ing.amount}</span>
                                <span class="unit">${ing.unit}</span>
                                <span class="name">${ing.name}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                ${recipe.instructions ? `
                    <div class="preview-section">
                        <h5><i class="fas fa-tasks"></i> Instructions</h5>
                        <ol class="instructions-list">
                            ${recipe.instructions.split('\n').filter(Boolean).map(step => `
                                <li>${step.trim()}</li>
                            `).join('')}
                        </ol>
                    </div>
                ` : ''}

                ${recipe.notes ? `
                    <div class="preview-section">
                        <h5><i class="fas fa-sticky-note"></i> Notes</h5>
                        <p>${recipe.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async processImport(modal) {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        
        try {
            const recipeData = await this.extractRecipeData(modal, activeTab);
            if (!recipeData) {
                throw new Error('No recipe data found');
            }

            // Save as template
            const templateData = {
                ...recipeData,
                userId: auth.currentUser.uid,
                category: 'imported',
                createdAt: new Date(),
                timesUsed: 0
            };

            await addDoc(collection(this.db, 'recipeTemplates'), templateData);
            
            // Refresh templates list
            await recipeTemplates.loadTemplates();
            
            this.closeImportModal(modal);
            this.showSuccessMessage('Recipe imported successfully!');
        } catch (error) {
            logError('Error importing recipe:', error);
            this.showErrorMessage('Failed to import recipe. Please try again.');
        }
    }

    closeImportModal(modal) {
        document.body.removeChild(modal);
    }

    showSuccessMessage(message) {
        // Implementation depends on your notification system
        logInfo('Success:', message);
    }

    showErrorMessage(message) {
        // Implementation depends on your notification system
        logError('Error:', message);
    }

    // Helper methods
    simulateUrlParsing(url) {
        // This is a mock implementation
        // In production, this would call an API to scrape the recipe
        return {
            name: 'Sample Recipe',
            servings: 4,
            ingredients: [
                { amount: '2', unit: 'cups', name: 'flour' },
                { amount: '1', unit: 'tsp', name: 'salt' }
            ],
            instructions: 'Step 1: Mix ingredients\nStep 2: Cook',
            notes: 'Sample recipe parsed from URL'
        };
    }

    parseRecipeText(text) {
        // Basic recipe text parsing
        // This could be enhanced with AI/ML for better extraction
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        
        const recipe = {
            name: lines[0],
            ingredients: [],
            instructions: '',
            notes: ''
        };

        let section = 'name';
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            
            if (line.includes('ingredients:')) {
                section = 'ingredients';
                continue;
            } else if (line.includes('instructions:') || line.includes('directions:')) {
                section = 'instructions';
                continue;
            } else if (line.includes('notes:')) {
                section = 'notes';
                continue;
            }

            switch (section) {
                case 'ingredients':
                    const ingredient = this.parseIngredientLine(lines[i]);
                    if (ingredient) recipe.ingredients.push(ingredient);
                    break;
                case 'instructions':
                    recipe.instructions += lines[i] + '\n';
                    break;
                case 'notes':
                    recipe.notes += lines[i] + '\n';
                    break;
            }
        }

        return recipe;
    }

    parseIngredientLine(line) {
        // Basic ingredient line parsing
        // This could be enhanced with AI/ML for better extraction
        const match = line.match(/^([\d./]+)?\s*([\w]+)?\s*(.+)$/);
        if (match) {
            return {
                amount: match[1] || '1',
                unit: match[2] || 'item',
                name: match[3].trim()
            };
        }
        return null;
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export const recipeImport = new RecipeImport(); 