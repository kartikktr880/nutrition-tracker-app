// Goals management class
class Goals {
  constructor() {
    // Initialize data
    this.goals = this.loadFromStorage('goals') || this.createSampleGoals();
    this.achievements = this.loadFromStorage('achievements') || this.createSampleAchievements();
    this.currentFilter = 'active';
    this.currentTypeFilter = 'all';
    
    // Initialize page elements
    this.initElements();
    this.initEventListeners();
    
    // Render content
    this.renderDashboard();
    this.initCharts();
  }
  
  // Load data from localStorage
  loadFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error loading ${key} from storage:`, e);
      return null;
    }
  }
  
  // Save data to localStorage
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }
  
  // Create sample goals for demo purposes
  createSampleGoals() {
    const goals = [
      {
        id: 'goal-1',
        name: 'Lose Weight',
        type: 'weight',
        dateCreated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
        progress: 35,
        status: 'active',
        startingWeight: 85,
        targetWeight: 75,
        targetWeightUnit: 'kg',
        progressUpdates: [
          {
            date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            value: 85
          },
          {
            date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            value: 83.5
          },
          {
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            value: 81.8
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            value: 80.2
          }
        ]
      },
      {
        id: 'goal-2',
        name: 'Increase Protein Intake',
        type: 'nutrition',
        dateCreated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
        progress: 75,
        status: 'active',
        nutritionTargetType: 'protein',
        nutritionTargetValue: 120,
        nutritionUnit: 'g',
        nutritionDirection: 'more than',
        nutritionTargetPeriod: 'daily',
        progressUpdates: [
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            value: 80
          },
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            value: 95
          },
          {
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            value: 110
          }
        ]
      },
      {
        id: 'goal-3',
        name: 'Drink More Water',
        type: 'water',
        dateCreated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: null,
        completed: true,
        progress: 100,
        status: 'completed',
        waterTarget: 2500,
        waterFrequency: 'daily',
        progressUpdates: [
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            value: 1800
          },
          {
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            value: 2200
          },
          {
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            value: 2500
          }
        ]
      }
    ];
    
    this.saveToStorage('goals', goals);
    return goals;
  }
  
  // Create sample achievements for demo purposes
  createSampleAchievements() {
    const achievements = [
      {
        id: 'achievement-1',
        title: 'First Goal Created',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        icon: 'fas fa-trophy'
      },
      {
        id: 'achievement-2',
        title: 'Consistent Water Intake',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        icon: 'fas fa-medal'
      }
    ];
    
    this.saveToStorage('achievements', achievements);
    return achievements;
  }
  
  // Initialize page elements
  initElements() {
    // Summary dashboard
    this.activeGoalsCount = document.getElementById('active-goals-count');
    this.completedGoalsCount = document.getElementById('completed-goals-count');
    this.avgCompletion = document.getElementById('avg-completion');
    
    // Goals list and filters
    this.goalsList = document.getElementById('goals-list');
    this.emptyGoalsMessage = document.getElementById('empty-goals-message');
    this.filterTabs = document.querySelectorAll('.filter-tab');
    this.goalTypeFilter = document.getElementById('goal-type-filter');
    
    // Create goal buttons
    this.createGoalBtn = document.getElementById('create-goal-btn');
    this.createFirstGoalBtn = document.getElementById('create-first-goal-btn');
    
    // Achievements
    this.achievementsList = document.getElementById('achievements-list');
    this.emptyAchievementsMessage = document.getElementById('empty-achievements-message');
    
    // Modals
    this.goalModal = document.getElementById('goal-modal');
    this.goalDetailsModal = document.getElementById('goal-details-modal');
    this.updateProgressModal = document.getElementById('update-progress-modal');
    this.closeModalBtns = document.querySelectorAll('.close-modal');
  }
  
  // Set up event listeners
  initEventListeners() {
    // Create goal buttons
    this.createGoalBtn.addEventListener('click', () => this.showToast('Goal creation coming soon!'));
    this.createFirstGoalBtn.addEventListener('click', () => this.showToast('Goal creation coming soon!'));
    
    // Filter tabs
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.getAttribute('data-filter');
        this.renderGoalsList();
      });
    });
    
    // Goal type filter
    this.goalTypeFilter.addEventListener('change', () => {
      this.currentTypeFilter = this.goalTypeFilter.value;
      this.renderGoalsList();
    });
    
    // Close modals
    this.closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });
  }
  
  // Render the dashboard summary
  renderDashboard() {
    this.renderGoalsList();
    this.renderSummary();
    this.renderAchievements();
  }
  
  // Render the goals list
  renderGoalsList() {
    // Clear existing goals
    const goalElements = this.goalsList.querySelectorAll('.goal-card');
    goalElements.forEach(el => el.remove());
    
    // Filter goals based on current filters
    let filteredGoals = [...this.goals];
    
    if (this.currentFilter === 'active') {
      filteredGoals = filteredGoals.filter(goal => !goal.completed);
    } else if (this.currentFilter === 'completed') {
      filteredGoals = filteredGoals.filter(goal => goal.completed);
    }
    
    if (this.currentTypeFilter !== 'all') {
      filteredGoals = filteredGoals.filter(goal => goal.type === this.currentTypeFilter);
    }
    
    // Show empty state if no goals
    if (filteredGoals.length === 0) {
      this.emptyGoalsMessage.style.display = 'block';
      return;
    }
    
    // Hide empty state
    this.emptyGoalsMessage.style.display = 'none';
    
    // Create goal cards
    filteredGoals.forEach(goal => {
      const goalCard = this.createGoalCard(goal);
      this.goalsList.appendChild(goalCard);
    });
  }
  
  // Create a goal card element
  createGoalCard(goal) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.setAttribute('data-id', goal.id);
    
    const typeColor = this.getGoalTypeColor(goal.type);
    const typeIcon = this.getGoalTypeIcon(goal.type);
    
    card.innerHTML = `
      <div class="goal-header">
        <div class="goal-title">
          <div class="goal-type-icon" style="background-color: ${typeColor}">
            <i class="fas ${typeIcon}"></i>
          </div>
          <h3>${goal.name}</h3>
        </div>
        <div class="goal-status ${goal.status}">${goal.completed ? 'Completed' : 'Active'}</div>
      </div>
      <div class="goal-body">
        <div class="goal-progress">
          <div class="progress-header">
            <div class="progress-label">Progress</div>
            <div class="progress-value">${goal.progress || 0}%</div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${goal.progress || 0}%"></div>
          </div>
        </div>
        <div class="goal-details">
          <div class="details-row">
            <div class="detail-item">
              <span class="detail-label">Target</span>
              <span class="detail-value">${this.formatGoalTarget(goal)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Deadline</span>
              <span class="detail-value">${goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}</span>
            </div>
          </div>
          <div class="details-row">
            <div class="detail-item">
              <span class="detail-label">Current</span>
              <span class="detail-value">${this.getCurrentValue(goal)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Started</span>
              <span class="detail-value">${new Date(goal.dateCreated).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="goal-actions">
        ${!goal.completed ? '<button class="goal-action-btn update-progress-btn"><i class="fas fa-plus"></i> Update Progress</button>' : ''}
        <button class="goal-action-btn view-details-btn"><i class="fas fa-eye"></i> View Details</button>
      </div>
    `;
    
    // Add event listeners
    card.querySelector('.view-details-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showToast('Goal details feature coming soon');
    });
    
    const updateBtn = card.querySelector('.update-progress-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showToast('Update progress feature coming soon');
      });
    }
    
    return card;
  }
  
  // Get color for goal type icon
  getGoalTypeColor(type) {
    switch (type) {
      case 'weight': return '#4a6fa5';
      case 'nutrition': return '#28a745';
      case 'water': return '#17a2b8';
      case 'activity': return '#fd7e14';
      default: return '#6c757d';
    }
  }
  
  // Get icon class for goal type
  getGoalTypeIcon(type) {
    switch (type) {
      case 'weight': return 'fa-weight-scale';
      case 'nutrition': return 'fa-apple-whole';
      case 'water': return 'fa-droplet';
      case 'activity': return 'fa-person-running';
      default: return 'fa-star';
    }
  }
  
  // Format goal target based on type
  formatGoalTarget(goal) {
    switch (goal.type) {
      case 'weight':
        return `${goal.targetWeight} ${goal.targetWeightUnit}`;
      case 'nutrition':
        return `${goal.nutritionDirection} ${goal.nutritionTargetValue} ${goal.nutritionUnit}`;
      case 'water':
        return `${goal.waterTarget} ml`;
      case 'activity':
        return `${goal.activityTarget} ${goal.activityUnit || ''}`;
      default:
        return goal.customTarget ? `${goal.customTarget} ${goal.customMeasurement || ''}` : '--';
    }
  }
  
  // Get current value from progress updates
  getCurrentValue(goal) {
    if (!goal.progressUpdates || goal.progressUpdates.length === 0) {
      return '--';
    }
    
    const lastUpdate = goal.progressUpdates[goal.progressUpdates.length - 1];
    
    switch (goal.type) {
      case 'weight':
        return `${lastUpdate.value} ${goal.targetWeightUnit}`;
      case 'nutrition':
        return `${lastUpdate.value} ${goal.nutritionUnit}`;
      case 'water':
        return `${lastUpdate.value} ml`;
      case 'activity':
        return `${lastUpdate.value} ${goal.activityUnit || ''}`;
      default:
        return `${lastUpdate.value} ${goal.customMeasurement || ''}`;
    }
  }
  
  // Render summary statistics
  renderSummary() {
    const activeGoals = this.goals.filter(goal => !goal.completed);
    const completedGoals = this.goals.filter(goal => goal.completed);
    
    this.activeGoalsCount.textContent = activeGoals.length;
    this.completedGoalsCount.textContent = completedGoals.length;
    
    // Calculate average completion
    if (this.goals.length > 0) {
      const totalProgress = this.goals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
      const avgProgress = Math.round(totalProgress / this.goals.length);
      this.avgCompletion.textContent = `${avgProgress}%`;
    } else {
      this.avgCompletion.textContent = '0%';
    }
  }
  
  // Render achievements
  renderAchievements() {
    // Clear existing achievements
    const achievementElements = this.achievementsList.querySelectorAll('.achievement-card');
    achievementElements.forEach(el => el.remove());
    
    // Show empty state if no achievements
    if (this.achievements.length === 0) {
      this.emptyAchievementsMessage.style.display = 'block';
      return;
    }
    
    // Hide empty state
    this.emptyAchievementsMessage.style.display = 'none';
    
    // Sort achievements by date (newest first)
    const sortedAchievements = [...this.achievements].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Create achievement cards (show up to 5)
    sortedAchievements.slice(0, 5).forEach(achievement => {
      const card = document.createElement('div');
      card.className = 'achievement-card';
      
      card.innerHTML = `
        <div class="achievement-icon">
          <i class="${achievement.icon}"></i>
        </div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-date">${new Date(achievement.date).toLocaleDateString()}</div>
      `;
      
      this.achievementsList.appendChild(card);
    });
  }
  
  // Initialize charts
  initCharts() {
    // Sample data for charts
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-US', {weekday: 'short'});
    }).reverse();
    
    // Common chart options
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
    
    // Calories chart
    new Chart(document.getElementById('calories-chart'), {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Daily Calories',
          data: [1850, 2100, 1950, 2200, 1800, 2050, 2150],
          borderColor: '#4a6fa5',
          backgroundColor: 'rgba(74, 111, 165, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: chartOptions
    });
    
    // Activities chart
    new Chart(document.getElementById('activities-chart'), {
      type: 'bar',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Workouts',
          data: [1, 0, 1, 1, 0, 2, 0],
          backgroundColor: '#fd7e14'
        }]
      },
      options: chartOptions
    });
    
    // Water chart
    new Chart(document.getElementById('water-chart'), {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Water Intake (ml)',
          data: [2200, 1800, 2500, 2300, 2100, 2600, 2400],
          borderColor: '#17a2b8',
          backgroundColor: 'rgba(23, 162, 184, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: chartOptions
    });
    
    // Weight chart
    new Chart(document.getElementById('weight-chart'), {
      type: 'line',
      data: {
        labels: ['Jan 1', 'Jan 15', 'Feb 1', 'Feb 15', 'Mar 1', 'Mar 15', 'Apr 1'],
        datasets: [{
          label: 'Weight (kg)',
          data: [85, 84.2, 83.5, 82.1, 81.8, 80.5, 80.2],
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        ...chartOptions,
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
    
    // Update summary metrics
    document.getElementById('calories-goal').textContent = '2000 kcal';
    document.getElementById('calories-avg').textContent = '2014 kcal';
    
    document.getElementById('activities-goal').textContent = '5 workouts';
    document.getElementById('activities-current').textContent = '5 workouts';
    
    document.getElementById('water-goal').textContent = '2500 ml';
    document.getElementById('water-avg').textContent = '2271 ml';
    
    document.getElementById('weight-start').textContent = '85 kg';
    document.getElementById('weight-current').textContent = '80.2 kg';
    document.getElementById('weight-goal').textContent = '75 kg';
  }
  
  // Show toast notification
  showToast(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
      
      // Add toast container styles
      const style = document.createElement('style');
      style.textContent = `
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
        }
        .toast {
          padding: 12px 20px;
          margin-bottom: 10px;
          background-color: #333;
          color: white;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }
        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Append to container
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Goals();
}); 