import { initializeAuth, saveFoodLog, getFoodLog } from './firebase-config.js';

// Sample food database (in a real app, this would come from a server)
const foodDatabase = [
    { id: 1, name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { id: 2, name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { id: 3, name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 4, name: 'Brown Rice (100g, cooked)', calories: 112, protein: 2.6, carbs: 24, fat: 0.8 },
    { id: 5, name: 'Eggs (1 large)', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
    { id: 6, name: 'Broccoli (100g)', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
    { id: 7, name: 'Salmon (100g)', calories: 206, protein: 22, carbs: 0, fat: 13 },
    { id: 8, name: 'Greek Yogurt (100g)', calories: 59, protein: 10, carbs: 3.6, fat: 0.4 }
];

// Initialize the tracker
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Firebase Auth
    const user = await initializeAuth();
    
    // If no user is logged in, redirect is handled by auth.js
    if (!user) return;
    
    // Get DOM elements
    const searchInput = document.getElementById('food-search');
    const searchBtn = document.getElementById('search-btn');
    const foodEntries = document.getElementById('food-entries');
    const totalCalories = document.getElementById('total-calories');
    const totalProtein = document.getElementById('total-protein');
    const totalCarbs = document.getElementById('total-carbs');
    const totalFat = document.getElementById('total-fat');
    const mealButtons = document.querySelectorAll('.meal-btn');
    
    // Current selected meal
    let currentMeal = 'breakfast';
    
    // Today's food log
    let foodLog = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
    };
    
    // Load saved food log for today
    await loadTodaysFoodLog();
    
    // Set up meal button event listeners
    mealButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            mealButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current meal
            currentMeal = this.dataset.meal;
            
            // Update the food entries display
            updateFoodEntries();
        });
    });
    
    // Set first meal button as active
    mealButtons[0].classList.add('active');
    
    // Set up search button event listener
    searchBtn.addEventListener('click', function() {
        searchFood();
    });
    
    // Allow pressing Enter to search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchFood();
        }
    });
    
    // Function to search food
    function searchFood() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query === '') {
            return; // Don't search if input is empty
        }
        
        // In a real app, this would be an API call to your backend
        const results = foodDatabase.filter(food => 
            food.name.toLowerCase().includes(query)
        );
        
        if (results.length > 0) {
            // For simplicity, just add the first result
            addFoodToLog(results[0]);
            searchInput.value = ''; // Clear the search input
        } else {
            alert('Food not found. Try a different search term or use the advanced search.');
        }
    }
    
    // Function to add food to the current meal's log
    function addFoodToLog(food) {
        foodLog[currentMeal].push({ ...food, timestamp: new Date().toISOString() }); // Add timestamp for history tracking
        updateFoodEntries();
        updateNutritionTotals();
        saveFoodLogToFirestore();
    }
    
    // Function to remove food from the log
    function removeFoodFromLog(index) {
        foodLog[currentMeal].splice(index, 1);
        updateFoodEntries();
        updateNutritionTotals();
        saveFoodLogToFirestore();
    }
    
    // Function to update the food entries display
    function updateFoodEntries() {
        const entries = foodLog[currentMeal];
        
        if (entries.length === 0) {
            foodEntries.innerHTML = '<p class="empty-state">No foods logged yet for this meal. Use the search bar above to add foods.</p>';
            return;
        }
        
        foodEntries.innerHTML = '';
        
        entries.forEach((food, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'food-entry';
            
            entryElement.innerHTML = `
                <div>
                    <div class="food-name">${food.name}</div>
                    <div class="food-macros">
                        ${food.calories} cal | P: ${food.protein}g | C: ${food.carbs}g | F: ${food.fat}g
                    </div>
                </div>
                <button class="remove-food" data-index="${index}">Remove</button>
            `;
            
            foodEntries.appendChild(entryElement);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-food').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removeFoodFromLog(index);
            });
        });
    }
    
    // Function to update nutrition totals
    function updateNutritionTotals() {
        // Calculate totals across all meals
        const totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        // Sum up all meals
        for (const meal in foodLog) {
            foodLog[meal].forEach(food => {
                totals.calories += food.calories;
                totals.protein += food.protein;
                totals.carbs += food.carbs;
                totals.fat += food.fat;
            });
        }
        
        // Update the display
        totalCalories.textContent = Math.round(totals.calories);
        totalProtein.textContent = Math.round(totals.protein) + 'g';
        totalCarbs.textContent = Math.round(totals.carbs) + 'g';
        totalFat.textContent = Math.round(totals.fat) + 'g';
        
        // Update the chart (in a real app, this would use a proper chart library)
        updateMacroChart(totals);
    }
    
    // Function to update the macro chart
    function updateMacroChart(totals) {
        const totalMacros = totals.protein + totals.carbs + totals.fat;
        
        if (totalMacros > 0) {
            const proteinPercent = (totals.protein / totalMacros) * 100;
            const carbsPercent = (totals.carbs / totalMacros) * 100;
            const fatPercent = (totals.fat / totalMacros) * 100;
            
            document.querySelector('.protein').style.width = proteinPercent + '%';
            document.querySelector('.carbs').style.width = carbsPercent + '%';
            document.querySelector('.fat').style.width = fatPercent + '%';
        }
    }
    
    // Function to save food log to Firestore
    async function saveFoodLogToFirestore() {
        // Get the date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        // Save to Firestore
        await saveFoodLog(currentUser.uid, today, foodLog);
        
        // For backward compatibility, also save to localStorage
        saveFoodLogToLocalStorage();
    }
    
    // Function to save food log to localStorage (for backward compatibility)
    function saveFoodLogToLocalStorage() {
        // Get the date in YYYY-MM-DD format for the key
        const today = new Date().toISOString().split('T')[0];
        
        // Get existing food logs or initialize empty object
        const allFoodLogs = JSON.parse(localStorage.getItem('foodLog')) || {};
        
        // Update today's entry
        allFoodLogs[today] = foodLog;
        
        // Save back to localStorage
        localStorage.setItem('foodLog', JSON.stringify(allFoodLogs));
    }
    
    // Function to load today's food log from Firestore
    async function loadTodaysFoodLog() {
        // Get the date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return;
        
        // Load from Firestore
        const result = await getFoodLog(currentUser.uid, today);
        
        if (result.success) {
            foodLog = result.data;
            updateFoodEntries();
            updateNutritionTotals();
        }
    }
    
    // Initialize the UI
    updateFoodEntries();
});