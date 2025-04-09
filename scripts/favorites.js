document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // DOM Elements
    const favoritesGrid = document.getElementById('favorites-grid');
    const emptyFavorites = document.getElementById('empty-favorites');
    const mealTypeFilter = document.getElementById('meal-type-filter');
    const sortOrder = document.getElementById('sort-order');
    const addToPlanModal = document.getElementById('add-to-plan-modal');
    const mealIdInput = document.getElementById('meal-id-input');
    const addToPlanForm = document.getElementById('add-to-plan-form');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const shareModal = document.getElementById('share-modal');
    const shareCloseBtn = document.querySelector('#share-modal .close-modal');
    const shareCancelBtn = document.querySelector('#share-modal .cancel-btn');
    
    // Load and display favorite meals
    loadFavorites();
    
    // Add event listeners
    mealTypeFilter.addEventListener('change', filterFavorites);
    sortOrder.addEventListener('change', sortFavorites);
    closeModal.addEventListener('click', closeAddToPlanModal);
    cancelBtn.addEventListener('click', closeAddToPlanModal);
    addToPlanForm.addEventListener('submit', handleAddToPlan);
    
    if (shareCloseBtn) {
        shareCloseBtn.addEventListener('click', closeShareModal);
    }
    
    if (shareCancelBtn) {
        shareCancelBtn.addEventListener('click', closeShareModal);
    }
    
    // Functions
    function loadFavorites() {
        // Get user data from localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        
        if (!user || !user.favorites || user.favorites.length === 0) {
            // Show empty state if no favorites
            favoritesGrid.style.display = 'none';
            emptyFavorites.style.display = 'block';
            return;
        }
        
        // Sort favorites by date added (newest first)
        const favorites = [...user.favorites].sort((a, b) => {
            return new Date(b.dateAdded) - new Date(a.dateAdded);
        });
        
        // Display favorites
        displayFavorites(favorites);
    }
    
    function displayFavorites(favorites) {
        // Clear the grid
        favoritesGrid.innerHTML = '';
        
        if (favorites.length === 0) {
            // Show empty state if filtered favorites is empty
            favoritesGrid.style.display = 'none';
            emptyFavorites.style.display = 'block';
            return;
        }
        
        // Show favorites grid and hide empty state
        favoritesGrid.style.display = 'grid';
        emptyFavorites.style.display = 'none';
        
        // Add each favorite to the grid
        favorites.forEach(favorite => {
            // Create favorite card
            const favoriteCard = document.createElement('div');
            favoriteCard.className = 'favorite-card';
            favoriteCard.dataset.mealId = favorite.id;
            favoriteCard.dataset.mealType = favorite.mealType;
            
            // Create favorite image
            const favoriteImage = document.createElement('div');
            favoriteImage.className = 'favorite-image';
            favoriteImage.style.backgroundImage = `url(${favorite.image})`;
            
            // Create favorite badge (meal type)
            const favoriteBadge = document.createElement('div');
            favoriteBadge.className = 'favorite-badge';
            favoriteBadge.textContent = capitalizeFirstLetter(favorite.mealType);
            favoriteImage.appendChild(favoriteBadge);
            
            // Create favorite content
            const favoriteContent = document.createElement('div');
            favoriteContent.className = 'favorite-content';
            
            // Create favorite header (title and date)
            const favoriteHeader = document.createElement('div');
            favoriteHeader.className = 'favorite-header';
            
            const favoriteTitle = document.createElement('h3');
            favoriteTitle.className = 'favorite-title';
            favoriteTitle.textContent = favorite.name;
            
            const favoriteDate = document.createElement('div');
            favoriteDate.className = 'favorite-date';
            favoriteDate.textContent = formatDate(favorite.dateAdded);
            
            favoriteHeader.appendChild(favoriteTitle);
            favoriteHeader.appendChild(favoriteDate);
            favoriteContent.appendChild(favoriteHeader);
            
            // Add macros
            const macros = document.createElement('div');
            macros.className = 'favorite-macros';
            
            // Calories
            const calories = document.createElement('div');
            calories.className = 'macro-item';
            const caloriesValue = document.createElement('span');
            caloriesValue.className = 'macro-value';
            caloriesValue.textContent = favorite.calories;
            const caloriesLabel = document.createElement('span');
            caloriesLabel.className = 'macro-label';
            caloriesLabel.textContent = 'Calories';
            calories.appendChild(caloriesValue);
            calories.appendChild(caloriesLabel);
            macros.appendChild(calories);
            
            // Protein
            const protein = document.createElement('div');
            protein.className = 'macro-item';
            const proteinValue = document.createElement('span');
            proteinValue.className = 'macro-value';
            proteinValue.textContent = `${favorite.protein}g`;
            const proteinLabel = document.createElement('span');
            proteinLabel.className = 'macro-label';
            proteinLabel.textContent = 'Protein';
            protein.appendChild(proteinValue);
            protein.appendChild(proteinLabel);
            macros.appendChild(protein);
            
            // Carbs
            const carbs = document.createElement('div');
            carbs.className = 'macro-item';
            const carbsValue = document.createElement('span');
            carbsValue.className = 'macro-value';
            carbsValue.textContent = `${favorite.carbs}g`;
            const carbsLabel = document.createElement('span');
            carbsLabel.className = 'macro-label';
            carbsLabel.textContent = 'Carbs';
            carbs.appendChild(carbsValue);
            carbs.appendChild(carbsLabel);
            macros.appendChild(carbs);
            
            // Fat
            const fat = document.createElement('div');
            fat.className = 'macro-item';
            const fatValue = document.createElement('span');
            fatValue.className = 'macro-value';
            fatValue.textContent = `${favorite.fat}g`;
            const fatLabel = document.createElement('span');
            fatLabel.className = 'macro-label';
            fatLabel.textContent = 'Fat';
            fat.appendChild(fatValue);
            fat.appendChild(fatLabel);
            macros.appendChild(fat);
            
            favoriteContent.appendChild(macros);
            
            // Add nutrition goal alignment indicators if user has goals set
            const goalAlignment = calculateNutritionGoalAlignment(favorite);
            if (goalAlignment) {
                const alignmentSection = createNutritionGoalAlignmentSection(goalAlignment);
                favoriteContent.appendChild(alignmentSection);
            }
            
            // Add action buttons
            const actions = document.createElement('div');
            actions.className = 'favorite-actions';
            
            // Add to plan button
            const addToPlanBtn = document.createElement('button');
            addToPlanBtn.className = 'action-btn add-plan-btn';
            addToPlanBtn.textContent = 'Add to Meal Plan';
            addToPlanBtn.dataset.mealId = favorite.id;
            addToPlanBtn.addEventListener('click', function() {
                openAddToPlanModal(favorite.id);
            });
            
            // Share button
            const shareBtn = document.createElement('button');
            shareBtn.className = 'action-btn share-btn';
            shareBtn.innerHTML = '<span class="share-icon">🔗</span> Share';
            shareBtn.dataset.mealId = favorite.id;
            shareBtn.addEventListener('click', function() {
                openShareModal(favorite);
            });
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.dataset.mealId = favorite.id;
            removeBtn.addEventListener('click', function() {
                removeFavorite(favorite.id);
            });
            
            actions.appendChild(addToPlanBtn);
            actions.appendChild(shareBtn);
            actions.appendChild(removeBtn);
            favoriteContent.appendChild(actions);
            
            // Append all elements to the card
            favoriteCard.appendChild(favoriteImage);
            favoriteCard.appendChild(favoriteContent);
            
            // Add card to container
            favoritesGrid.appendChild(favoriteCard);
        });
    }
    
    function filterFavorites() {
        const filterValue = mealTypeFilter.value;
        const currentSort = sortOrder.value;
        
        // Get user's favorites
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        
        if (!user || !user.favorites || user.favorites.length === 0) {
            return;
        }
        
        // Filter favorites based on meal type
        let filteredFavorites = [...user.favorites];
        
        if (filterValue !== 'all') {
            filteredFavorites = filteredFavorites.filter(fav => fav.mealType === filterValue);
        }
        
        // Apply current sort
        applySorting(filteredFavorites, currentSort);
        
        // Display filtered favorites
        displayFavorites(filteredFavorites);
    }
    
    function sortFavorites() {
        const filterValue = mealTypeFilter.value;
        const sortValue = sortOrder.value;
        
        // Get user's favorites
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        
        if (!user || !user.favorites || user.favorites.length === 0) {
            return;
        }
        
        // Filter favorites based on current filter
        let filteredFavorites = [...user.favorites];
        
        if (filterValue !== 'all') {
            filteredFavorites = filteredFavorites.filter(fav => fav.mealType === filterValue);
        }
        
        // Apply sorting
        applySorting(filteredFavorites, sortValue);
        
        // Display sorted favorites
        displayFavorites(filteredFavorites);
    }
    
    function applySorting(favorites, sortValue) {
        switch (sortValue) {
            case 'newest':
                favorites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
                break;
            case 'oldest':
                favorites.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
                break;
            case 'name':
                favorites.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'calories':
                favorites.sort((a, b) => a.calories - b.calories);
                break;
            default:
                // Default to newest first
                favorites.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        }
    }
    
    function removeFavorite(mealId) {
        if (confirm('Are you sure you want to remove this meal from your favorites?')) {
            // Get user data
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            
            if (userIndex === -1 || !users[userIndex].favorites) {
                return;
            }
            
            // Find the favorite to remove
            const favoriteIndex = users[userIndex].favorites.findIndex(fav => fav.id === mealId);
            
            if (favoriteIndex === -1) {
                return;
            }
            
            // Remove the favorite
            users[userIndex].favorites.splice(favoriteIndex, 1);
            
            // Save to localStorage
            localStorage.setItem('users', JSON.stringify(users));
            
            // Show toast message
            showToast('Meal removed from favorites');
            
            // Reload favorites with current filter and sort
            filterFavorites();
        }
    }
    
    function openAddToPlanModal(mealId) {
        // Set the meal ID in the form
        mealIdInput.value = mealId;
        
        // Set default values in the form
        const today = new Date();
        const dayOfWeek = today.getDay();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const planDay = document.getElementById('plan-day');
        
        // Set today as default
        if (planDay) {
            planDay.value = days[dayOfWeek];
        }
        
        // Set meal type based on favorite's meal type
        const mealTypeSelect = document.getElementById('plan-meal-type');
        const favoriteCard = document.querySelector(`.favorite-card[data-meal-id="${mealId}"]`);
        
        if (favoriteCard && mealTypeSelect) {
            const mealType = favoriteCard.dataset.mealType;
            if (mealTypeSelect.querySelector(`option[value="${mealType}"]`)) {
                mealTypeSelect.value = mealType;
            }
        }
        
        // Show the modal
        addToPlanModal.style.display = 'flex';
    }
    
    function closeAddToPlanModal() {
        addToPlanModal.style.display = 'none';
    }
    
    function handleAddToPlan(e) {
        e.preventDefault();
        
        // Get form values
        const mealId = mealIdInput.value;
        const planDay = document.getElementById('plan-day').value;
        const planMealType = document.getElementById('plan-meal-type').value;
        
        // Get the favorite meal data
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        
        if (!user || !user.favorites) {
            showToast('Error: Could not find meal data', true);
            return;
        }
        
        const favorite = user.favorites.find(fav => fav.id === mealId);
        
        if (!favorite) {
            showToast('Error: Could not find meal data', true);
            return;
        }
        
        // Add to meal plan (in real app, this would save to database)
        // For now, we'll just mimic adding it to localStorage
        
        // Initialize meal plan if it doesn't exist
        if (!user.mealPlan) {
            user.mealPlan = {};
        }
        
        if (!user.mealPlan[planDay]) {
            user.mealPlan[planDay] = {};
        }
        
        // Add meal to plan
        user.mealPlan[planDay][planMealType] = {
            id: favorite.id,
            name: favorite.name,
            calories: favorite.calories,
            protein: favorite.protein,
            carbs: favorite.carbs,
            fat: favorite.fat
        };
        
        // Save to localStorage
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        users[userIndex] = user;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Close modal
        closeAddToPlanModal();
        
        // Show success message
        showToast(`Added ${favorite.name} to ${capitalizeFirstLetter(planDay)} ${capitalizeFirstLetter(planMealType)}`);
    }
    
    // New function: Open share modal
    function openShareModal(favorite) {
        const shareModalContent = document.querySelector('#share-modal .modal-content');
        
        if (!shareModalContent) {
            // Create modal if it doesn't exist
            createShareModal(favorite);
        } else {
            // Update existing modal
            updateShareModal(favorite);
        }
        
        // Show the modal
        shareModal.style.display = 'flex';
    }
    
    // New function: Create share modal
    function createShareModal(favorite) {
        // Create the modal container if it doesn't exist
        if (!shareModal) {
            const modalDiv = document.createElement('div');
            modalDiv.id = 'share-modal';
            modalDiv.className = 'modal';
            modalDiv.style.display = 'none';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const closeSpan = document.createElement('span');
            closeSpan.className = 'close-modal';
            closeSpan.innerHTML = '&times;';
            closeSpan.addEventListener('click', closeShareModal);
            
            const modalTitle = document.createElement('h2');
            modalTitle.textContent = 'Share This Meal';
            
            const mealDetailsDiv = document.createElement('div');
            mealDetailsDiv.className = 'share-meal-details';
            
            // Add meal title, image, and macros
            const mealTitleEl = document.createElement('h3');
            mealTitleEl.className = 'share-meal-title';
            mealTitleEl.textContent = favorite.name;
            
            const mealImageDiv = document.createElement('div');
            mealImageDiv.className = 'share-meal-image';
            mealImageDiv.style.backgroundImage = `url(${favorite.image})`;
            
            const mealMacrosDiv = document.createElement('div');
            mealMacrosDiv.className = 'share-meal-macros';
            mealMacrosDiv.innerHTML = `
                <div class="macro-item"><span class="macro-value">${favorite.calories}</span><span class="macro-label">Calories</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.protein}g</span><span class="macro-label">Protein</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.carbs}g</span><span class="macro-label">Carbs</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.fat}g</span><span class="macro-label">Fat</span></div>
            `;
            
            mealDetailsDiv.appendChild(mealTitleEl);
            mealDetailsDiv.appendChild(mealImageDiv);
            mealDetailsDiv.appendChild(mealMacrosDiv);
            
            const shareOptionsDiv = document.createElement('div');
            shareOptionsDiv.className = 'share-options';
            
            // Create share option buttons
            const shareOptions = [
                { name: 'Email', icon: '✉️', action: () => shareByEmail(favorite) },
                { name: 'WhatsApp', icon: '📱', action: () => shareByWhatsApp(favorite) },
                { name: 'Facebook', icon: 'fb', action: () => shareByFacebook(favorite) },
                { name: 'Twitter', icon: '🐦', action: () => shareByTwitter(favorite) },
                { name: 'Copy Link', icon: '🔗', action: () => copyShareLink(favorite) }
            ];
            
            shareOptions.forEach(option => {
                const button = document.createElement('button');
                button.className = 'share-option-btn';
                button.dataset.option = option.name.toLowerCase();
                button.innerHTML = `<span class="share-icon">${option.icon}</span>${option.name}`;
                button.addEventListener('click', option.action);
                shareOptionsDiv.appendChild(button);
            });
            
            // Add clipboard textarea (hidden)
            const clipboardInput = document.createElement('textarea');
            clipboardInput.id = 'clipboard-input';
            clipboardInput.style.position = 'absolute';
            clipboardInput.style.left = '-9999px';
            
            // Add all elements to modal
            modalContent.appendChild(closeSpan);
            modalContent.appendChild(modalTitle);
            modalContent.appendChild(mealDetailsDiv);
            modalContent.appendChild(shareOptionsDiv);
            modalContent.appendChild(clipboardInput);
            
            // Add cancel button
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'form-buttons';
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn btn-secondary cancel-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', closeShareModal);
            
            buttonDiv.appendChild(cancelButton);
            modalContent.appendChild(buttonDiv);
            
            modalDiv.appendChild(modalContent);
            document.body.appendChild(modalDiv);
            
            // Update shareModal reference
            shareModal = modalDiv;
        } else {
            updateShareModal(favorite);
        }
    }
    
    // New function: Update share modal content
    function updateShareModal(favorite) {
        const mealTitle = document.querySelector('#share-modal .share-meal-title');
        const mealImage = document.querySelector('#share-modal .share-meal-image');
        const mealMacros = document.querySelector('#share-modal .share-meal-macros');
        
        if (mealTitle) mealTitle.textContent = favorite.name;
        if (mealImage) mealImage.style.backgroundImage = `url(${favorite.image})`;
        if (mealMacros) {
            mealMacros.innerHTML = `
                <div class="macro-item"><span class="macro-value">${favorite.calories}</span><span class="macro-label">Calories</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.protein}g</span><span class="macro-label">Protein</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.carbs}g</span><span class="macro-label">Carbs</span></div>
                <div class="macro-item"><span class="macro-value">${favorite.fat}g</span><span class="macro-label">Fat</span></div>
            `;
        }
    }
    
    // New function: Close share modal
    function closeShareModal() {
        shareModal.style.display = 'none';
    }
    
    // New functions: Share by different methods
    function shareByEmail(favorite) {
        const subject = encodeURIComponent(`Check out this meal: ${favorite.name}`);
        const body = encodeURIComponent(
            `Hey,\n\nI wanted to share this delicious meal with you from my Nutrition Tracker app:\n\n` +
            `${favorite.name}\n\n` +
            `Calories: ${favorite.calories}\n` +
            `Protein: ${favorite.protein}g\n` +
            `Carbs: ${favorite.carbs}g\n` +
            `Fat: ${favorite.fat}g\n\n` +
            `Ingredients: ${favorite.ingredients.join(', ')}\n\n` +
            `Instructions: ${favorite.instructions}\n\n` +
            `Hope you enjoy it!\n`
        );
        
        window.open(`mailto:?subject=${subject}&body=${body}`);
        closeShareModal();
        showToast('Email client opened');
    }
    
    function shareByWhatsApp(favorite) {
        const text = encodeURIComponent(
            `Check out this delicious meal from my Nutrition Tracker app:\n\n` +
            `*${favorite.name}*\n\n` +
            `Calories: ${favorite.calories}\n` +
            `Protein: ${favorite.protein}g\n` +
            `Carbs: ${favorite.carbs}g\n` +
            `Fat: ${favorite.fat}g\n\n` +
            `Ingredients: ${favorite.ingredients.join(', ')}\n\n` +
            `Instructions: ${favorite.instructions}`
        );
        
        window.open(`https://wa.me/?text=${text}`);
        closeShareModal();
        showToast('WhatsApp opened');
    }
    
    function shareByFacebook(favorite) {
        // In a real app, this would use Facebook's sharing API
        // For demonstration, we'll just show a toast message
        showToast('Sharing via Facebook would open Facebook sharing dialog');
        closeShareModal();
    }
    
    function shareByTwitter(favorite) {
        const text = encodeURIComponent(
            `Check out this delicious meal: ${favorite.name} - ${favorite.calories} calories, ${favorite.protein}g protein, ${favorite.carbs}g carbs, ${favorite.fat}g fat. #nutrition #healthyeating`
        );
        
        window.open(`https://twitter.com/intent/tweet?text=${text}`);
        closeShareModal();
        showToast('Twitter opened');
    }
    
    function copyShareLink(favorite) {
        // In a real app, this would generate a unique, shareable link
        // For demonstration, we'll just copy a description to clipboard
        const mealInfo = 
            `${favorite.name}\n\n` +
            `Calories: ${favorite.calories}\n` +
            `Protein: ${favorite.protein}g\n` +
            `Carbs: ${favorite.carbs}g\n` +
            `Fat: ${favorite.fat}g\n\n` +
            `Ingredients: ${favorite.ingredients.join(', ')}\n\n` +
            `Instructions: ${favorite.instructions}`;
        
        const clipboardInput = document.getElementById('clipboard-input');
        clipboardInput.value = mealInfo;
        clipboardInput.select();
        document.execCommand('copy');
        
        showToast('Meal information copied to clipboard');
        closeShareModal();
    }
    
    // New functions for nutrition goal alignment
    function calculateNutritionGoalAlignment(meal) {
        // Get user profile data to check goals
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        
        if (!user || !user.profileData) {
            return null; // No goals set
        }
        
        const profileData = user.profileData;
        
        // Only proceed if user has calories set
        if (!profileData.calories) {
            return null;
        }
        
        const result = {
            calorieGoal: parseInt(profileData.calories),
            caloriePercentage: 0,
            macroBalance: {
                protein: 0,
                carbs: 0,
                fat: 0
            },
            goalAlignment: ''
        };
        
        // Calculate percentages
        // Assuming meal is one of multiple meals per day (typically 3-4)
        // So a meal should be roughly 25-33% of daily calories
        const idealMealCalories = profileData.calories / 3; // Assuming 3 meals per day
        result.caloriePercentage = Math.round((meal.calories / idealMealCalories) * 100);
        
        // Calculate macro balance - this is simplified
        // Typically protein should be ~30%, carbs ~40-45%, fat ~25-30%
        const totalMacroGrams = meal.protein + meal.carbs + meal.fat;
        result.macroBalance.protein = Math.round((meal.protein / totalMacroGrams) * 100);
        result.macroBalance.carbs = Math.round((meal.carbs / totalMacroGrams) * 100);
        result.macroBalance.fat = Math.round((meal.fat / totalMacroGrams) * 100);
        
        // Determine alignment
        if (result.caloriePercentage < 80) {
            result.goalAlignment = 'low';
        } else if (result.caloriePercentage > 120) {
            result.goalAlignment = 'high';
        } else {
            result.goalAlignment = 'good';
        }
        
        return result;
    }
    
    function createNutritionGoalAlignmentSection(goalData) {
        const alignmentSection = document.createElement('div');
        alignmentSection.className = 'goal-alignment-section';
        
        // Create section title
        const sectionTitle = document.createElement('h4');
        sectionTitle.className = 'alignment-title';
        sectionTitle.textContent = 'Goal Alignment';
        alignmentSection.appendChild(sectionTitle);
        
        // Create calorie alignment indicator
        const calorieAlignment = document.createElement('div');
        calorieAlignment.className = 'alignment-item';
        
        // Create alignment label with icon based on alignment
        let alignmentIcon = '✓';
        let alignmentClass = 'good-alignment';
        let alignmentText = 'Good calorie match';
        
        if (goalData.goalAlignment === 'low') {
            alignmentIcon = '↓';
            alignmentClass = 'low-alignment';
            alignmentText = 'Below calorie target';
        } else if (goalData.goalAlignment === 'high') {
            alignmentIcon = '↑';
            alignmentClass = 'high-alignment';
            alignmentText = 'Above calorie target';
        }
        
        calorieAlignment.innerHTML = `
            <div class="alignment-icon ${alignmentClass}">${alignmentIcon}</div>
            <div class="alignment-text">
                <div class="alignment-label">${alignmentText}</div>
                <div class="alignment-detail">${goalData.caloriePercentage}% of target meal calories</div>
            </div>
        `;
        
        alignmentSection.appendChild(calorieAlignment);
        
        // Create macro balance indicator
        const macroAlignment = document.createElement('div');
        macroAlignment.className = 'alignment-item';
        
        // Show macro balance as a progress bar
        macroAlignment.innerHTML = `
            <div class="macro-balance-label">Macro Balance:</div>
            <div class="macro-balance-bar">
                <div class="macro-segment protein-segment" style="width: ${goalData.macroBalance.protein}%;">P</div>
                <div class="macro-segment carbs-segment" style="width: ${goalData.macroBalance.carbs}%;">C</div>
                <div class="macro-segment fat-segment" style="width: ${goalData.macroBalance.fat}%;">F</div>
            </div>
            <div class="macro-balance-values">
                <span>P: ${goalData.macroBalance.protein}%</span>
                <span>C: ${goalData.macroBalance.carbs}%</span>
                <span>F: ${goalData.macroBalance.fat}%</span>
            </div>
        `;
        
        alignmentSection.appendChild(macroAlignment);
        
        return alignmentSection;
    }
    
    // Function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        
        // Check if it's today
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        }
        
        // Check if it's yesterday
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        
        // Otherwise, return the date
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }
    
    // Function to show a toast message
    function showToast(message, isError = false) {
        // Check if a toast container already exists
        let toastContainer = document.querySelector('.toast-container');
        
        // If not, create one
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create the toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        if (isError) {
            toast.classList.add('error');
        }
        toast.textContent = message;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Remove after animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }
    
    // Helper function
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}); 