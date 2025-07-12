import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
import { auth } from './auth-core.js';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from './firebase-config.js';

class MealSuggestions {
    constructor() {
        this.auth = auth;
        this.db = getFirestore(app);
        this.suggestionCache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
        this.cache = new Map();
        this.isInitialized = false;
        this.suggestionLimit = 6; // Limit suggestions to maintain performance
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add suggestions button to meal form
        const mealForm = document.querySelector('.meal-form');
        const firstFormGroup = mealForm.querySelector('.form-group');
        
        const suggestionsButton = document.createElement('button');
        suggestionsButton.type = 'button';
        suggestionsButton.className = 'btn btn-secondary suggestions-btn';
        suggestionsButton.innerHTML = '<i class="fas fa-lightbulb"></i> Get Meal Ideas';
        suggestionsButton.addEventListener('click', () => this.showSuggestions());
        
        firstFormGroup.parentNode.insertBefore(suggestionsButton, firstFormGroup);

        // Add quick suggestion chips
        const quickSuggestions = document.createElement('div');
        quickSuggestions.className = 'quick-suggestions';
        quickSuggestions.innerHTML = `
            <div class="suggestion-chips">
                <button type="button" class="chip" data-type="quick">Quick & Easy</button>
                <button type="button" class="chip" data-type="healthy">Healthy</button>
                <button type="button" class="chip" data-type="protein">High Protein</button>
                <button type="button" class="chip" data-type="vegetarian">Vegetarian</button>
            </div>
        `;
        firstFormGroup.parentNode.insertBefore(quickSuggestions, firstFormGroup);

        // Add event listeners to chips
        quickSuggestions.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => this.showFilteredSuggestions(chip.dataset.type));
        });

        this.isInitialized = true;
    }

    async showSuggestions() {
        const modal = document.createElement('div');
        modal.className = 'meal-modal';
        modal.style.display = 'flex';

        const content = `
            <div class="modal-content suggestions-content">
                <div class="modal-header">
                    <h3 class="modal-title">Meal Suggestions</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="suggestions-body">
                    <div class="suggestions-filters">
                        <input type="text" id="suggestionSearch" placeholder="Search meals..." class="suggestion-search">
                        <div class="filter-tags">
                            <button class="filter-tag active" data-filter="all">All</button>
                            <button class="filter-tag" data-filter="breakfast">Breakfast</button>
                            <button class="filter-tag" data-filter="lunch">Lunch</button>
                            <button class="filter-tag" data-filter="dinner">Dinner</button>
                        </div>
                    </div>
                    <div class="suggestions-grid" id="suggestionsGrid">
                        Loading suggestions...
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        // Close button handler
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Search handler with debounce
        let searchTimeout;
        const searchInput = modal.querySelector('#suggestionSearch');
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterSuggestions(searchInput.value);
            }, 300);
        });

        // Filter tag handlers
        modal.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                modal.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                this.filterSuggestions(searchInput.value, tag.dataset.filter);
            });
        });

        // Load initial suggestions
        await this.loadSuggestions();
    }

    async loadSuggestions() {
        const cacheKey = 'meal-suggestions';
        if (this.cache.has(cacheKey)) {
            this.displaySuggestions(this.cache.get(cacheKey));
            return;
        }

        try {
            const suggestions = await this.getMealSuggestions();
            
            // Cache for 10 minutes
            this.cache.set(cacheKey, suggestions);
            setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);
            
            this.displaySuggestions(suggestions);
        } catch (error) {
            logError('Error loading suggestions:', error);
            document.getElementById('suggestionsGrid').innerHTML = 'Error loading suggestions';
        }
    }

    async getMealSuggestions() {
        // This would be replaced with actual API call or database query
        // For now, returning mock data
        return [
            {
                id: 1,
                name: 'Overnight Oats',
                type: 'breakfast',
                time: '5 min prep',
                calories: 350,
                protein: 15,
                tags: ['quick', 'healthy'],
                image: 'path/to/oats-image.jpg'
            },
            // Add more mock suggestions
        ];
    }

    displaySuggestions(suggestions) {
        const grid = document.getElementById('suggestionsGrid');
        
        if (!suggestions.length) {
            grid.innerHTML = '<p class="no-suggestions">No suggestions found</p>';
            return;
        }

        grid.innerHTML = suggestions.slice(0, this.suggestionLimit).map(suggestion => `
            <div class="suggestion-card" data-id="${suggestion.id}">
                <div class="suggestion-image" style="background-color: #f0f0f0;">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="suggestion-content">
                    <h4>${suggestion.name}</h4>
                    <div class="suggestion-meta">
                        <span><i class="far fa-clock"></i> ${suggestion.time}</span>
                        <span><i class="fas fa-fire"></i> ${suggestion.calories} cal</span>
                    </div>
                    <div class="suggestion-tags">
                        ${suggestion.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-primary use-suggestion">Use Recipe</button>
            </div>
        `).join('');

        // Add click handlers to suggestion cards
        grid.querySelectorAll('.use-suggestion').forEach(button => {
            button.addEventListener('click', () => {
                const suggestionId = button.closest('.suggestion-card').dataset.id;
                this.useSuggestion(suggestionId);
            });
        });
    }

    filterSuggestions(search = '', filter = 'all') {
        const suggestions = this.cache.get('meal-suggestions') || [];
        
        const filtered = suggestions.filter(suggestion => {
            const matchesSearch = suggestion.name.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filter === 'all' || suggestion.type === filter;
            return matchesSearch && matchesFilter;
        });

        this.displaySuggestions(filtered);
    }

    async showFilteredSuggestions(type) {
        const suggestions = this.cache.get('meal-suggestions') || [];
        const filtered = suggestions.filter(s => s.tags.includes(type));
        this.displaySuggestions(filtered);
    }

    async useSuggestion(suggestionId) {
        const suggestions = this.cache.get('meal-suggestions') || [];
        const suggestion = suggestions.find(s => s.id === parseInt(suggestionId));
        
        if (!suggestion) return;

        // Fill the meal form with suggestion data
        document.getElementById('mealName').value = suggestion.name;
        document.getElementById('calories').value = suggestion.calories;
        document.getElementById('protein').value = suggestion.protein;
        
        // Close the suggestions modal
        document.querySelector('.meal-modal').remove();
    }
}

export const mealSuggestions = new MealSuggestions(); 