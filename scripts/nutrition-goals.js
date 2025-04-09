class NutritionGoals {
  constructor() {
    this.goals = {
      daily: {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
        sugar: 50,
        sodium: 2300,
        water: 2500
      },
      weekly: {
        exerciseDays: 4,
        mealPrepDays: 2,
        cheatMeals: 2
      },
      custom: []
    };
    
    this.history = [];
    this.achievements = [];
    
    this.loadGoals();
    this.initEventListeners();
  }
  
  loadGoals() {
    const savedGoals = localStorage.getItem('nutritionGoals');
    if (savedGoals) {
      this.goals = JSON.parse(savedGoals);
    }
    
    const savedHistory = localStorage.getItem('goalsHistory');
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }
    
    const savedAchievements = localStorage.getItem('goalsAchievements');
    if (savedAchievements) {
      this.achievements = JSON.parse(savedAchievements);
    }
  }
  
  saveGoals() {
    localStorage.setItem('nutritionGoals', JSON.stringify(this.goals));
    localStorage.setItem('goalsHistory', JSON.stringify(this.history));
    localStorage.setItem('goalsAchievements', JSON.stringify(this.achievements));
  }
  
  initEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.renderGoals();
      
      // Handle form submission
      const goalForm = document.getElementById('nutrition-goals-form');
      if (goalForm) {
        goalForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.updateGoalsFromForm();
        });
      }
      
      // Handle tab switching
      const tabButtons = document.querySelectorAll('.goals-tab-button');
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.getAttribute('data-tab');
          this.switchTab(tabId);
        });
      });
      
      // Handle custom goal form
      const customGoalForm = document.getElementById('custom-goal-form');
      if (customGoalForm) {
        customGoalForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.addCustomGoal();
        });
      }
      
      // Handle progress tracking form
      const trackProgressForm = document.getElementById('track-progress-form');
      if (trackProgressForm) {
        trackProgressForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.trackProgress();
        });
      }
    });
  }
  
  renderGoals() {
    this.renderDailyGoals();
    this.renderWeeklyGoals();
    this.renderCustomGoals();
    this.renderAchievements();
  }
  
  renderDailyGoals() {
    // Update form values
    const dailyGoals = this.goals.daily;
    
    for (const nutrient in dailyGoals) {
      const input = document.getElementById(`goal-${nutrient}`);
      if (input) {
        input.value = dailyGoals[nutrient];
      }
    }
    
    // Update progress bars if present
    for (const nutrient in dailyGoals) {
      const progressBar = document.getElementById(`${nutrient}-progress`);
      if (progressBar) {
        const today = new Date().toISOString().split('T')[0];
        const todayProgress = this.getDailyProgress(today);
        
        if (todayProgress && todayProgress[nutrient]) {
          const percentage = Math.min(100, Math.round((todayProgress[nutrient] / dailyGoals[nutrient]) * 100));
          progressBar.style.width = `${percentage}%`;
          
          const value = document.getElementById(`${nutrient}-value`);
          if (value) {
            value.textContent = `${todayProgress[nutrient]} / ${dailyGoals[nutrient]}`;
          }
        }
      }
    }
  }
  
  renderWeeklyGoals() {
    // Update form values
    const weeklyGoals = this.goals.weekly;
    
    for (const goal in weeklyGoals) {
      const input = document.getElementById(`goal-${goal}`);
      if (input) {
        input.value = weeklyGoals[goal];
      }
    }
    
    // Update progress indicators if present
    for (const goal in weeklyGoals) {
      const progressElement = document.getElementById(`${goal}-progress`);
      if (progressElement) {
        const weekProgress = this.getWeeklyProgress();
        
        if (weekProgress && weekProgress[goal] !== undefined) {
          const percentage = Math.min(100, Math.round((weekProgress[goal] / weeklyGoals[goal]) * 100));
          
          if (progressElement.tagName === 'DIV') {
            // If it's a progress bar
            progressElement.style.width = `${percentage}%`;
          }
          
          const value = document.getElementById(`${goal}-value`);
          if (value) {
            value.textContent = `${weekProgress[goal]} / ${weeklyGoals[goal]}`;
          }
        }
      }
    }
  }
  
  renderCustomGoals() {
    const container = document.getElementById('custom-goals-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.goals.custom.length === 0) {
      container.innerHTML = '<div class="empty-state">No custom goals yet. Add your first custom goal!</div>';
      return;
    }
    
    this.goals.custom.forEach((goal, index) => {
      const goalEl = document.createElement('div');
      goalEl.className = 'custom-goal-item';
      
      // Calculate progress
      let progressPercent = 0;
      if (goal.type === 'target') {
        progressPercent = Math.min(100, Math.round((goal.current / goal.target) * 100));
      } else if (goal.type === 'boolean') {
        progressPercent = goal.completed ? 100 : 0;
      }
      
      const daysLeft = this.getDaysUntil(goal.deadline);
      const statusClass = daysLeft < 0 ? 'expired' : 
                          progressPercent >= 100 ? 'completed' : 
                          daysLeft < 7 ? 'urgent' : '';
      
      goalEl.innerHTML = `
        <div class="goal-header">
          <h3>${goal.name}</h3>
          <div class="goal-actions">
            <button type="button" class="update-goal-btn" data-index="${index}">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" class="delete-goal-btn" data-index="${index}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="goal-details ${statusClass}">
          ${goal.type === 'target' ? 
            `<div class="goal-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <div class="progress-text">${goal.current} / ${goal.target} ${goal.unit}</div>
            </div>` : 
            `<div class="goal-checkbox">
              <input type="checkbox" id="goal-check-${index}" ${goal.completed ? 'checked' : ''}>
              <label for="goal-check-${index}">Completed</label>
            </div>`
          }
          <div class="goal-deadline">
            <i class="fas fa-calendar"></i>
            <span>Deadline: ${new Date(goal.deadline).toLocaleDateString()}</span>
            ${daysLeft >= 0 ? `<span class="days-left">(${daysLeft} days left)</span>` : 
              '<span class="days-left expired">Expired</span>'}
          </div>
          <p class="goal-description">${goal.description || ''}</p>
        </div>
      `;
      
      container.appendChild(goalEl);
      
      // Add event listeners for the new goal item
      const updateBtn = goalEl.querySelector('.update-goal-btn');
      const deleteBtn = goalEl.querySelector('.delete-goal-btn');
      const checkbox = goalEl.querySelector(`#goal-check-${index}`);
      
      if (updateBtn) {
        updateBtn.addEventListener('click', () => this.editCustomGoal(index));
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteCustomGoal(index));
      }
      
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.goals.custom[index].completed = checkbox.checked;
          this.saveGoals();
          this.checkAchievements();
          
          if (checkbox.checked) {
            goalEl.querySelector('.goal-details').classList.add('completed');
          } else {
            goalEl.querySelector('.goal-details').classList.remove('completed');
          }
        });
      }
    });
  }
  
  renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.achievements.length === 0) {
      container.innerHTML = '<div class="empty-state">No achievements yet. Complete goals to earn achievements!</div>';
      return;
    }
    
    this.achievements.forEach(achievement => {
      const achievementEl = document.createElement('div');
      achievementEl.className = 'achievement-item';
      
      achievementEl.innerHTML = `
        <div class="achievement-icon">
          <i class="fas fa-${achievement.icon}"></i>
        </div>
        <div class="achievement-content">
          <h3>${achievement.title}</h3>
          <p>${achievement.description}</p>
          <div class="achievement-date">Earned on ${new Date(achievement.date).toLocaleDateString()}</div>
        </div>
        <button class="share-achievement-btn" data-id="${achievement.id}">
          <i class="fas fa-share-alt"></i>
        </button>
      `;
      
      container.appendChild(achievementEl);
      
      // Add event listener for sharing
      const shareBtn = achievementEl.querySelector('.share-achievement-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => this.shareAchievement(achievement));
      }
    });
  }
  
  updateGoalsFromForm() {
    // Get daily goals from form
    for (const nutrient in this.goals.daily) {
      const input = document.getElementById(`goal-${nutrient}`);
      if (input) {
        this.goals.daily[nutrient] = parseFloat(input.value);
      }
    }
    
    // Get weekly goals from form
    for (const goal in this.goals.weekly) {
      const input = document.getElementById(`goal-${goal}`);
      if (input) {
        this.goals.weekly[goal] = parseInt(input.value);
      }
    }
    
    this.saveGoals();
    this.showToast('Nutrition goals updated successfully!');
    
    // Re-render the goals
    this.renderGoals();
  }
  
  addCustomGoal() {
    const nameInput = document.getElementById('custom-goal-name');
    const typeSelect = document.getElementById('custom-goal-type');
    const targetInput = document.getElementById('custom-goal-target');
    const unitInput = document.getElementById('custom-goal-unit');
    const deadlineInput = document.getElementById('custom-goal-deadline');
    const descriptionInput = document.getElementById('custom-goal-description');
    
    if (!nameInput || !typeSelect || !deadlineInput) return;
    
    const type = typeSelect.value;
    const target = type === 'target' ? parseFloat(targetInput.value) : null;
    const unit = type === 'target' ? unitInput.value : null;
    
    const newGoal = {
      id: Date.now().toString(),
      name: nameInput.value,
      type: type,
      target: target,
      current: 0,
      unit: unit,
      deadline: deadlineInput.value,
      description: descriptionInput ? descriptionInput.value : '',
      completed: false,
      dateCreated: new Date().toISOString()
    };
    
    this.goals.custom.push(newGoal);
    this.saveGoals();
    
    this.showToast('Custom goal added successfully!');
    
    // Reset form and re-render
    document.getElementById('custom-goal-form').reset();
    this.renderCustomGoals();
    
    // Show target inputs only for target type
    this.toggleTargetInputs();
  }
  
  editCustomGoal(index) {
    const goal = this.goals.custom[index];
    if (!goal) return;
    
    // Populate form with goal data
    const nameInput = document.getElementById('custom-goal-name');
    const typeSelect = document.getElementById('custom-goal-type');
    const targetInput = document.getElementById('custom-goal-target');
    const unitInput = document.getElementById('custom-goal-unit');
    const deadlineInput = document.getElementById('custom-goal-deadline');
    const descriptionInput = document.getElementById('custom-goal-description');
    const currentInput = document.getElementById('custom-goal-current');
    
    if (nameInput) nameInput.value = goal.name;
    if (typeSelect) typeSelect.value = goal.type;
    if (targetInput && goal.type === 'target') targetInput.value = goal.target;
    if (unitInput && goal.type === 'target') unitInput.value = goal.unit;
    if (deadlineInput) deadlineInput.value = goal.deadline;
    if (descriptionInput) descriptionInput.value = goal.description || '';
    if (currentInput && goal.type === 'target') currentInput.value = goal.current;
    
    // Toggle target inputs based on type
    this.toggleTargetInputs();
    
    // Show current progress if it's a target goal
    if (goal.type === 'target' && currentInput) {
      currentInput.classList.remove('hidden');
      document.getElementById('current-progress-container').classList.remove('hidden');
    }
    
    // Store index for updating
    document.getElementById('custom-goal-form').dataset.editIndex = index;
    
    // Change button text
    const submitBtn = document.getElementById('custom-goal-submit');
    if (submitBtn) submitBtn.textContent = 'Update Goal';
    
    // Switch to custom goals tab
    this.switchTab('custom');
    
    // Scroll to form
    document.getElementById('custom-goal-form').scrollIntoView();
  }
  
  deleteCustomGoal(index) {
    if (confirm('Are you sure you want to delete this goal?')) {
      this.goals.custom.splice(index, 1);
      this.saveGoals();
      this.renderCustomGoals();
      this.showToast('Goal deleted successfully');
    }
  }
  
  trackProgress() {
    const dateInput = document.getElementById('progress-date');
    if (!dateInput) return;
    
    const date = dateInput.value || new Date().toISOString().split('T')[0];
    
    // Track daily nutrients
    for (const nutrient in this.goals.daily) {
      const input = document.getElementById(`track-${nutrient}`);
      if (input && input.value) {
        this.updateDailyProgress(date, nutrient, parseFloat(input.value));
      }
    }
    
    // Track weekly goals
    for (const goal in this.goals.weekly) {
      const input = document.getElementById(`track-${goal}`);
      if (input && input.value) {
        this.updateWeeklyProgress(goal, parseInt(input.value));
      }
    }
    
    // Track custom goals
    const customGoalSelect = document.getElementById('track-custom-goal');
    const customValueInput = document.getElementById('track-custom-value');
    
    if (customGoalSelect && customGoalSelect.value && customValueInput) {
      const goalIndex = parseInt(customGoalSelect.value);
      const goal = this.goals.custom[goalIndex];
      
      if (goal && goal.type === 'target') {
        goal.current = parseFloat(customValueInput.value);
        
        // Check if goal is completed
        if (goal.current >= goal.target) {
          this.addAchievement({
            title: 'Goal Achieved!',
            description: `You achieved your goal: ${goal.name}`,
            icon: 'trophy'
          });
        }
      }
    }
    
    this.saveGoals();
    this.renderGoals();
    this.checkAchievements();
    
    this.showToast('Progress tracked successfully!');
    
    // Reset tracking form
    document.getElementById('track-progress-form').reset();
  }
  
  updateDailyProgress(date, nutrient, value) {
    if (!this.history[date]) {
      this.history[date] = { daily: {}, weekly: {} };
    }
    
    if (!this.history[date].daily) {
      this.history[date].daily = {};
    }
    
    this.history[date].daily[nutrient] = value;
    
    // Check if goal met
    if (value >= this.goals.daily[nutrient]) {
      this.checkNutrientGoalAchievement(nutrient);
    }
  }
  
  updateWeeklyProgress(goalType, value) {
    const currentWeek = this.getCurrentWeekRange();
    let weekKey = `${currentWeek.start}`;
    
    if (!this.history[weekKey]) {
      this.history[weekKey] = { weekly: {} };
    }
    
    if (!this.history[weekKey].weekly) {
      this.history[weekKey].weekly = {};
    }
    
    this.history[weekKey].weekly[goalType] = value;
    
    // Check if goal met
    if (value >= this.goals.weekly[goalType]) {
      this.checkWeeklyGoalAchievement(goalType);
    }
  }
  
  getDailyProgress(date) {
    if (!this.history[date] || !this.history[date].daily) {
      return null;
    }
    
    return this.history[date].daily;
  }
  
  getWeeklyProgress() {
    const currentWeek = this.getCurrentWeekRange();
    let weekKey = `${currentWeek.start}`;
    
    if (!this.history[weekKey] || !this.history[weekKey].weekly) {
      return null;
    }
    
    return this.history[weekKey].weekly;
  }
  
  getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    };
  }
  
  checkAchievements() {
    this.checkDailyGoalsAchievements();
    this.checkWeeklyGoalsAchievements();
    this.checkCustomGoalsAchievements();
    this.checkStreakAchievements();
  }
  
  checkNutrientGoalAchievement(nutrient) {
    const formattedNutrient = nutrient.charAt(0).toUpperCase() + nutrient.slice(1);
    
    this.addAchievement({
      title: `${formattedNutrient} Goal Achieved!`,
      description: `You reached your daily ${nutrient} goal`,
      icon: this.getNutrientIcon(nutrient)
    });
  }
  
  checkWeeklyGoalAchievement(goalType) {
    const goalLabels = {
      exerciseDays: 'Exercise Days',
      mealPrepDays: 'Meal Prep Days',
      cheatMeals: 'Cheat Meals'
    };
    
    const goalIcons = {
      exerciseDays: 'dumbbell',
      mealPrepDays: 'kitchen-set',
      cheatMeals: 'pizza-slice'
    };
    
    this.addAchievement({
      title: `Weekly ${goalLabels[goalType]} Goal Met!`,
      description: `You achieved your weekly goal for ${goalLabels[goalType].toLowerCase()}`,
      icon: goalIcons[goalType] || 'check'
    });
  }
  
  checkDailyGoalsAchievements() {
    // Check if all daily goals were met today
    const today = new Date().toISOString().split('T')[0];
    const todayProgress = this.getDailyProgress(today);
    
    if (!todayProgress) return;
    
    let allMet = true;
    for (const nutrient in this.goals.daily) {
      if (!todayProgress[nutrient] || todayProgress[nutrient] < this.goals.daily[nutrient]) {
        allMet = false;
        break;
      }
    }
    
    if (allMet) {
      this.addAchievement({
        title: 'Perfect Day!',
        description: 'You met all your nutrition goals today',
        icon: 'calendar-check'
      });
    }
  }
  
  checkWeeklyGoalsAchievements() {
    // Check if all weekly goals were met this week
    const weekProgress = this.getWeeklyProgress();
    
    if (!weekProgress) return;
    
    let allMet = true;
    for (const goal in this.goals.weekly) {
      if (!weekProgress[goal] || weekProgress[goal] < this.goals.weekly[goal]) {
        allMet = false;
        break;
      }
    }
    
    if (allMet) {
      this.addAchievement({
        title: 'Perfect Week!',
        description: 'You met all your weekly nutrition goals',
        icon: 'trophy'
      });
    }
  }
  
  checkCustomGoalsAchievements() {
    // Check completed custom goals
    const completedGoals = this.goals.custom.filter(goal => {
      if (goal.type === 'boolean') {
        return goal.completed;
      } else if (goal.type === 'target') {
        return goal.current >= goal.target;
      }
      return false;
    });
    
    if (completedGoals.length >= 5) {
      this.addAchievement({
        title: 'Goal Crusher',
        description: 'You completed 5 or more custom goals',
        icon: 'bullseye'
      });
    }
  }
  
  checkStreakAchievements() {
    // Check streak of meeting daily goals
    const streak = this.calculateStreak();
    
    if (streak >= 7) {
      this.addAchievement({
        title: 'One Week Streak!',
        description: 'You met your nutrition goals for 7 consecutive days',
        icon: 'fire'
      });
    }
    
    if (streak >= 30) {
      this.addAchievement({
        title: 'One Month Streak!',
        description: 'You met your nutrition goals for 30 consecutive days',
        icon: 'fire-flame-curved'
      });
    }
  }
  
  calculateStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 100; i++) {
      // Start from yesterday and go backwards
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayProgress = this.getDailyProgress(dateStr);
      
      if (!dayProgress) break;
      
      let dayComplete = true;
      for (const nutrient in this.goals.daily) {
        if (!dayProgress[nutrient] || dayProgress[nutrient] < this.goals.daily[nutrient]) {
          dayComplete = false;
          break;
        }
      }
      
      if (dayComplete) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  addAchievement(achievement) {
    // Check if a similar achievement already exists recently (within 24 hours)
    const existingIndex = this.achievements.findIndex(a => 
      a.title === achievement.title && 
      new Date(a.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    if (existingIndex !== -1) return;
    
    const newAchievement = {
      id: Date.now().toString(),
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon || 'award',
      date: new Date().toISOString()
    };
    
    this.achievements.unshift(newAchievement);
    this.saveGoals();
    this.renderAchievements();
    
    // Show notification
    this.showAchievementNotification(newAchievement);
  }
  
  showAchievementNotification(achievement) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    
    notification.innerHTML = `
      <div class="achievement-icon">
        <i class="fas fa-${achievement.icon}"></i>
      </div>
      <div class="achievement-content">
        <h3>${achievement.title}</h3>
        <p>${achievement.description}</p>
      </div>
      <button class="close-notification">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Add animation class after a small delay
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
    
    // Add event listener to close button
    notification.querySelector('.close-notification').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  }
  
  shareAchievement(achievement) {
    const shareData = {
      title: achievement.title,
      description: achievement.description,
      stats: {
        streak: this.calculateStreak(),
        calories: this.goals.daily.calories,
        protein: this.goals.daily.protein
      },
      image: 'images/achievement.png'
    };
    
    // Check if we have the achievement component
    if (typeof window.shareAchievement === 'function') {
      window.shareAchievement(shareData);
    } else {
      // Create an iframe to load the achievement share component
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'components/achievement-share.html';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          if (iframeDoc.defaultView.updateAchievement) {
            iframeDoc.defaultView.updateAchievement(shareData);
            
            const content = iframeDoc.querySelector('.achievement-share-container').outerHTML;
            this.showShareModal(content);
          }
        } catch (e) {
          console.error('Error loading achievement share component:', e);
          this.showToast('Could not load sharing component', 'error');
        }
        
        document.body.removeChild(iframe);
      };
    }
  }
  
  showShareModal(content) {
    const modal = document.createElement('div');
    modal.className = 'goals-modal';
    
    modal.innerHTML = `
      <div class="goals-modal-backdrop">
        <div class="goals-modal-content">
          <div class="goals-modal-header">
            <h3>Share Achievement</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="goals-modal-body">
            ${content}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close button
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });
  }
  
  switchTab(tabId) {
    // Update active tab button
    const tabButtons = document.querySelectorAll('.goals-tab-button');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Show active tab content
    const tabs = document.querySelectorAll('.goals-tab');
    tabs.forEach(tab => {
      if (tab.id === `${tabId}-goals-tab`) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }
  
  toggleTargetInputs() {
    const typeSelect = document.getElementById('custom-goal-type');
    const targetContainer = document.getElementById('target-container');
    const currentContainer = document.getElementById('current-progress-container');
    
    if (typeSelect && targetContainer) {
      if (typeSelect.value === 'target') {
        targetContainer.style.display = 'block';
      } else {
        targetContainer.style.display = 'none';
      }
    }
    
    if (currentContainer) {
      currentContainer.style.display = 'none';
    }
  }
  
  getNutrientIcon(nutrient) {
    const icons = {
      calories: 'fire',
      protein: 'drumstick-bite',
      carbs: 'bread-slice',
      fat: 'cheese',
      fiber: 'seedling',
      sugar: 'candy-cane',
      sodium: 'salt',
      water: 'water'
    };
    
    return icons[nutrient] || 'utensils';
  }
  
  getDaysUntil(dateStr) {
    const targetDate = new Date(dateStr);
    targetDate.setHours(23, 59, 59, 999);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  showToast(message, type = 'success') {
    // Check if there's an existing toast container
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove the toast after a delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize nutrition goals tracker
const nutritionGoals = new NutritionGoals();

// Add event listener for type select
document.addEventListener('DOMContentLoaded', function() {
  const typeSelect = document.getElementById('custom-goal-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      nutritionGoals.toggleTargetInputs();
    });
  }
}); 