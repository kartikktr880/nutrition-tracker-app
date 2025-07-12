import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js';
import { getDatabase, ref, push, set, get, remove } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-database.js';

const firebaseConfig = {
    // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const foodEntriesContainer = document.getElementById('food-entries');
const foodSearch = document.getElementById('food-search');
const searchResults = document.getElementById('search-results');

// Create a food entry row
function createFoodEntry(food, amount = 1) {
    const entry = document.createElement('div');
    entry.className = 'food-entry';
    
    const macros = calculateMacros(food, amount);
    
    entry.innerHTML = `
        <span class="food-name-col">${food.name}</span>
        <span class="food-amount-col">${amount} ${food.unit || 'serving'}</span>
        <span class="food-calories-col">${macros.calories.toFixed(0)} kcal</span>
        <span class="food-protein-col">${macros.protein.toFixed(1)} g</span>
        <span class="food-carbs-col">${macros.carbs.toFixed(1)} g</span>
        <span class="food-fat-col">${macros.fat.toFixed(1)} g</span>
        <span class="food-actions-col">
            <button class="food-entry-action action-edit" title="Edit">
                <i class="fas fa-edit"></i>
                    </button>
            <button class="food-entry-action action-delete" title="Delete">
                <i class="fas fa-trash"></i>
                        </button>
                            </span>
    `;
    
    // Add event listeners for edit and delete buttons
    entry.querySelector('.action-edit').addEventListener('click', () => editFoodEntry(entry, food));
    entry.querySelector('.action-delete').addEventListener('click', () => deleteFoodEntry(entry));
    
    return entry;
}

// Calculate macros based on amount
function calculateMacros(food, amount) {
    const multiplier = amount / (food.servingSize || 1);
    return {
        calories: food.calories * multiplier,
        protein: food.protein * multiplier,
        carbs: food.carbs * multiplier,
        fat: food.fat * multiplier
    };
}

// Update meal totals
function updateMealTotals() {
    const entries = document.querySelectorAll('.food-entry');
    let totals = {
                calories: 0,
                protein: 0,
                carbs: 0,
        fat: 0
    };
    
    entries.forEach(entry => {
        totals.calories += parseFloat(entry.querySelector('.food-calories-col').textContent);
        totals.protein += parseFloat(entry.querySelector('.food-protein-col').textContent);
        totals.carbs += parseFloat(entry.querySelector('.food-carbs-col').textContent);
        totals.fat += parseFloat(entry.querySelector('.food-fat-col').textContent);
    });
    
    document.getElementById('meal-calories').textContent = `${totals.calories.toFixed(0)} kcal`;
    document.getElementById('meal-protein').textContent = `${totals.protein.toFixed(1)} g`;
    document.getElementById('meal-carbs').textContent = `${totals.carbs.toFixed(1)} g`;
    document.getElementById('meal-fat').textContent = `${totals.fat.toFixed(1)} g`;
    
    updateProgressBars(totals);
}

// Update progress bars in the daily summary
function updateProgressBars(totals) {
    const goals = {
        calories: parseFloat(document.getElementById('calories-goal').textContent),
        protein: parseFloat(document.getElementById('protein-goal').textContent),
        carbs: parseFloat(document.getElementById('carbs-goal').textContent),
        fat: parseFloat(document.getElementById('fat-goal').textContent)
    };
    
    // Update progress bars
    Object.keys(totals).forEach(macro => {
        const progress = (totals[macro] / goals[macro]) * 100;
        const progressBar = document.getElementById(`${macro}-progress`);
        const currentValue = document.getElementById(`${macro}-current`);
        
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        currentValue.textContent = totals[macro].toFixed(macro === 'calories' ? 0 : 1);
        
        // Add warning class if over goal
        if (progress > 100) {
            progressBar.classList.add('over-limit');
        } else {
            progressBar.classList.remove('over-limit');
        }
    });
    
    // Update macro distribution chart
    updateMacroDistribution(totals);
}

// Update the macro distribution chart
function updateMacroDistribution(totals) {
    const totalCalories = totals.calories;
    if (totalCalories > 0) {
        const proteinPercent = ((totals.protein * 4) / totalCalories) * 100;
        const carbsPercent = ((totals.carbs * 4) / totalCalories) * 100;
        const fatPercent = ((totals.fat * 9) / totalCalories) * 100;
        
        document.getElementById('protein-percent').textContent = `${proteinPercent.toFixed(0)}%`;
        document.getElementById('carbs-percent').textContent = `${carbsPercent.toFixed(0)}%`;
        document.getElementById('fat-percent').textContent = `${fatPercent.toFixed(0)}%`;
        
        // Update the chart if using Chart.js
        if (window.macroChart) {
            window.macroChart.data.datasets[0].data = [proteinPercent, carbsPercent, fatPercent];
            window.macroChart.update();
        }
    }
}

// Save food entry to Firebase
async function saveFoodEntry(food, amount, meal) {
    const userId = getCurrentUserId();
    const date = getCurrentDate();
    const mealRef = ref(db, `users/${userId}/meals/${date}/${meal}`);
    
    const macros = calculateMacros(food, amount);
    const entry = {
        foodId: food.id,
        name: food.name,
        amount: amount,
        unit: food.unit || 'serving',
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        timestamp: Date.now()
    };
    
    try {
        await push(mealRef, entry);
        updateMealTotals();
        showStatusMessage('Food added successfully', 'success');
    } catch (error) {
        logError('Error saving food entry:', error);
        showStatusMessage('Failed to save food entry', 'error');
    }
}

// Edit food entry
async function editFoodEntry(entryElement, food) {
    const amount = parseFloat(prompt('Enter new amount:', food.amount));
    if (amount && !isNaN(amount)) {
        const userId = getCurrentUserId();
        const date = getCurrentDate();
        const meal = document.querySelector('.meal-tab.active').dataset.meal;
        const entryId = entryElement.dataset.entryId;
        
        try {
            const entryRef = ref(db, `users/${userId}/meals/${date}/${meal}/${entryId}`);
            const macros = calculateMacros(food, amount);
            
            await set(entryRef, {
                ...food,
                amount: amount,
                calories: macros.calories,
                protein: macros.protein,
                carbs: macros.carbs,
                fat: macros.fat
            });
            
            loadMealData(); // Reload the entire meal to ensure consistency
            showStatusMessage('Food entry updated', 'success');
        } catch (error) {
            logError('Error updating food entry:', error);
            showStatusMessage('Failed to update food entry', 'error');
        }
    }
}

// Delete food entry
async function deleteFoodEntry(entryElement) {
    if (confirm('Are you sure you want to delete this food entry?')) {
        const userId = getCurrentUserId();
        const date = getCurrentDate();
        const meal = document.querySelector('.meal-tab.active').dataset.meal;
        const entryId = entryElement.dataset.entryId;
        
        try {
            const entryRef = ref(db, `users/${userId}/meals/${date}/${meal}/${entryId}`);
            await remove(entryRef);
            
            entryElement.remove();
            updateMealTotals();
            showStatusMessage('Food entry deleted', 'success');
        } catch (error) {
            logError('Error deleting food entry:', error);
            showStatusMessage('Failed to delete food entry', 'error');
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Chart.js for macro distribution
    const ctx = document.getElementById('macroChart').getContext('2d');
    window.macroChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                data: [0, 0, 0],
                    backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue('--protein-color'),
                    getComputedStyle(document.documentElement).getPropertyValue('--carbs-color'),
                    getComputedStyle(document.documentElement).getPropertyValue('--fat-color')
                ]
                }]
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    
    // Load initial data
    loadMealData();
    
    // Add event listeners for meal tabs
    document.querySelectorAll('.meal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.meal-tab.active').classList.remove('active');
            tab.classList.add('active');
            document.getElementById('current-meal').textContent = tab.querySelector('span').textContent;
            loadMealData();
        });
    });
});

// Helper functions
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    return user ? user.uid : null;
}

function getCurrentDate() {
    return document.getElementById('selectedDate').getAttribute('data-date') || 
           new Date().toISOString().split('T')[0];
}

function showStatusMessage(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
    statusElement.className = `status-message show ${type}`;
    setTimeout(() => {
        statusElement.classList.remove('show');
        }, 3000);
    }

// Load meal data from Firebase
async function loadMealData() {
    const userId = getCurrentUserId();
    const date = getCurrentDate();
    const meal = document.querySelector('.meal-tab.active').dataset.meal;
    
    try {
        const mealRef = ref(db, `users/${userId}/meals/${date}/${meal}`);
        const snapshot = await get(mealRef);
        
        foodEntriesContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const entries = snapshot.val();
            Object.entries(entries).forEach(([id, entry]) => {
                const foodEntry = createFoodEntry(entry, entry.amount);
                foodEntry.dataset.entryId = id;
                foodEntriesContainer.appendChild(foodEntry);
            });
                                    } else {
            foodEntriesContainer.innerHTML = `
                <div class="empty-meal-message">
                    <p>No foods logged for this meal yet.</p>
                    <p>Use the search box above to add foods.</p>
                        </div>
                    `;
        }
        
        updateMealTotals();
        } catch (error) {
        logError('Error loading meal data:', error);
        showStatusMessage('Failed to load meal data', 'error');
    }
}
