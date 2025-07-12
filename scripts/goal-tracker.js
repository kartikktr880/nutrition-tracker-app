import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Enhanced Goal Tracker for Nutrition Tracker App
 * Provides advanced goal tracking and visualization
 */

import { auth, db } from './auth-core.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { calculateTDEE, calculateBMI, calculateMacroTargets } from './nutrition-analytics.js';

class GoalTracker {
  constructor() {
    // Goal types and their icons
    this.goalTypes = {
      weight: { 
        name: 'Weight Management', 
        icon: 'fa-weight-scale',
        metrics: ['weight', 'bmi']
      },
      nutrition: { 
        name: 'Nutrition Balance', 
        icon: 'fa-apple-whole',
        metrics: ['calories', 'protein', 'carbs', 'fat'] 
      },
      activity: { 
        name: 'Physical Activity', 
        icon: 'fa-person-running',
        metrics: ['steps', 'exercise', 'activeMinutes'] 
      },
      hydration: { 
        name: 'Hydration', 
        icon: 'fa-droplet',
        metrics: ['water'] 
      },
      sleep: { 
        name: 'Sleep Quality', 
        icon: 'fa-moon',
        metrics: ['sleepHours', 'sleepQuality'] 
      }
    };
    
    // User data and goals
    this.userData = null;
    this.userGoals = [];
    this.progressData = {};
    
    // DOM elements
    this.goalDashboard = null;
    this.goalEditor = null;
    this.progressCharts = {};
    
    // Chart library (will use Chart.js)
    this.chartLib = null;
  }
  
  /**
   * Initialize the goal tracker functionality
   */
  async initialize() {
    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) return false;
      
      // Get user profile data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) throw new Error('Failed to load user profile');
      
      this.userData = userDoc.data();
      this.userGoals = this.userData.goals || [];
      
      // Initialize goal dashboard
      this.initializeDashboard();
      
      // Initialize goal editor
      this.initializeGoalEditor();
      
      // Load progress data
      await this.loadProgressData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load and initialize charts
      await this.loadChartLibrary();
      this.initializeCharts();
      
      return true;
    } catch (error) {
      logError('Error initializing goal tracker:', error);
      return false;
    }
  }
  
  /**
   * Initialize the goal dashboard display
   */
  initializeDashboard() {
    // Find or create goal dashboard container
    let dashboard = document.getElementById('goalDashboard');
    if (!dashboard) {
      const profileGrid = document.querySelector('.profile-grid');
      if (!profileGrid) return;
      
      // Create a new section for the goal dashboard
      const section = document.createElement('section');
      section.className = 'profile-section';
      section.innerHTML = `
        <h2>
          Goal Tracking
          <button type="button" id="addGoalBtn" class="btn-sm">
            <i class="fas fa-plus"></i> Add Goal
          </button>
        </h2>
        <div id="goalDashboard" class="goal-dashboard"></div>
        <div class="goal-chart-container">
          <div class="goal-chart-header">
            <h3 class="goal-chart-title">Progress Visualization</h3>
            <div class="goal-chart-controls">
              <button type="button" data-period="week" class="chart-period-btn active">Week</button>
              <button type="button" data-period="month" class="chart-period-btn">Month</button>
              <button type="button" data-period="year" class="chart-period-btn">Year</button>
            </div>
          </div>
          <div class="goal-chart" id="progressChart"></div>
        </div>
      `;
      
      profileGrid.appendChild(section);
      dashboard = document.getElementById('goalDashboard');
    }
    
    this.goalDashboard = dashboard;
    this.renderGoalDashboard();
  }
  
  /**
   * Render the goal dashboard with all user goals
   */
  renderGoalDashboard() {
    if (!this.goalDashboard) return;
    
    // Clear existing content
    this.goalDashboard.innerHTML = '';
    
    if (this.userGoals.length === 0) {
      this.goalDashboard.innerHTML = `
        <div class="empty-state">
          <p>You haven't set any goals yet. Click the "Add Goal" button to get started.</p>
        </div>
      `;
      return;
    }
    
    // Render each goal card
    this.userGoals.forEach(goal => {
      const goalCard = this.createGoalCard(goal);
      this.goalDashboard.appendChild(goalCard);
    });
  }
  
  /**
   * Create a goal card element
   * @param {Object} goal - The goal object
   * @return {HTMLElement} - The goal card element
   */
  createGoalCard(goal) {
    const goalType = this.goalTypes[goal.type] || { name: 'Custom Goal', icon: 'fa-bullseye' };
    const progress = this.calculateGoalProgress(goal);
    const statusClass = progress.statusClass;
    const statusText = progress.statusText;
    
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.dataset.goalId = goal.id;
    
    // Add new badge if goal was created within the last 7 days
    const isNewGoal = new Date(goal.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newBadge = isNewGoal ? '<div class="goal-badge">New</div>' : '';
    
    card.innerHTML = `
      ${newBadge}
      <div class="goal-card-header">
        <div>
          <h3 class="goal-card-title">${goal.title || goalType.name}</h3>
          <span class="goal-card-status ${statusClass}">${statusText}</span>
        </div>
        <div class="goal-card-icon">
          <i class="fas ${goalType.icon}"></i>
        </div>
      </div>
      <div class="goal-card-content">
        ${this.renderGoalMetrics(goal, progress)}
        <div class="goal-progress-container">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.percentage}%; background-color: var(--${progress.color})"></div>
          </div>
          <div class="progress-labels">
            <span>Start: ${goal.startValue || 0} ${goal.unit || ''}</span>
            <span>Target: ${goal.targetValue || 0} ${goal.unit || ''}</span>
          </div>
        </div>
      </div>
      <div class="goal-card-actions">
        <button type="button" class="goal-action-btn edit-goal" data-goal-id="${goal.id}">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button type="button" class="goal-action-btn log-progress" data-goal-id="${goal.id}">
          <i class="fas fa-plus-circle"></i> Log Progress
        </button>
        <button type="button" class="goal-action-btn delete-goal" data-goal-id="${goal.id}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    
    return card;
  }
  
  /**
   * Render metrics for a specific goal
   * @param {Object} goal - The goal object
   * @param {Object} progress - The progress data
   * @return {string} - HTML for goal metrics
   */
  renderGoalMetrics(goal, progress) {
    let metricsHTML = '';
    
    // Current value
    metricsHTML += `
      <div class="goal-metric">
        <span>Current</span>
        <span class="goal-metric-value">${progress.currentValue} ${goal.unit || ''}</span>
      </div>
    `;
    
    // Change since start
    const change = progress.currentValue - goal.startValue;
    const changePrefix = change >= 0 ? '+' : '';
    metricsHTML += `
      <div class="goal-metric">
        <span>Change</span>
        <span class="goal-metric-value">${changePrefix}${change.toFixed(1)} ${goal.unit || ''}</span>
      </div>
    `;
    
    // Remaining to target
    const remaining = Math.abs(goal.targetValue - progress.currentValue);
    metricsHTML += `
      <div class="goal-metric">
        <span>Remaining</span>
        <span class="goal-metric-value">${remaining.toFixed(1)} ${goal.unit || ''}</span>
      </div>
    `;
    
    return metricsHTML;
  }
  
  /**
   * Calculate progress for a specific goal
   * @param {Object} goal - The goal object
   * @return {Object} - Progress data
   */
  calculateGoalProgress(goal) {
    // Get the latest progress entry for this goal
    const progressEntries = this.progressData[goal.id] || [];
    const latestEntry = progressEntries.length > 0 
      ? progressEntries[progressEntries.length - 1] 
      : { value: goal.startValue };
      
    const currentValue = latestEntry.value;
    
    // Calculate percentage progress
    const totalChange = goal.targetValue - goal.startValue;
    const currentChange = currentValue - goal.startValue;
    let percentage = (currentChange / totalChange) * 100;
    
    // Handle edge cases
    if (isNaN(percentage)) percentage = 0;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    
    // Determine status
    let statusClass, statusText, color;
    
    // Check if we need to increase or decrease value to reach goal
    const isIncreaseGoal = goal.targetValue > goal.startValue;
    
    // Calculate expected progress based on start date and end date
    const startDate = new Date(goal.startDate || goal.createdAt);
    const endDate = new Date(goal.endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000));
    const totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
    const elapsedDays = (new Date() - startDate) / (24 * 60 * 60 * 1000);
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
    
    // Compare actual progress to expected progress
    const progressDiff = percentage - expectedProgress;
    
    if (Math.abs(progressDiff) <= 10) {
      // On track (within 10% of expected progress)
      statusClass = 'goal-status-on-track';
      statusText = 'On Track';
      color = 'goal-achieved';
    } else if (progressDiff > 10) {
      // Ahead of schedule
      statusClass = 'goal-status-ahead';
      statusText = 'Ahead of Schedule';
      color = 'goal-progress';
    } else {
      // Behind schedule
      statusClass = 'goal-status-behind';
      statusText = 'Needs Attention';
      color = 'goal-behind';
    }
    
    return {
      currentValue,
      percentage,
      statusClass,
      statusText,
      color
    };
  }
  
  /**
   * Initialize the goal editor modal
   */
  initializeGoalEditor() {
    // Create goal editor modal if it doesn't exist
    if (!document.getElementById('goalEditorModal')) {
      const modal = document.createElement('div');
      modal.id = 'goalEditorModal';
      modal.className = 'goal-editor-modal';
      modal.innerHTML = `
        <div class="goal-editor-content">
          <div class="goal-editor-header">
            <h3 class="goal-editor-title">Create New Goal</h3>
            <button type="button" class="goal-editor-close" aria-label="Close">&times;</button>
          </div>
          <form id="goalEditorForm" class="goal-editor-form">
            <input type="hidden" id="goalId">
            
            <div class="form-group">
              <label for="goalTitle">Goal Title</label>
              <input type="text" id="goalTitle" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label for="goalType">Goal Type</label>
              <select id="goalType" class="form-control" required>
                <option value="weight">Weight Management</option>
                <option value="nutrition">Nutrition Balance</option>
                <option value="activity">Physical Activity</option>
                <option value="hydration">Hydration</option>
                <option value="sleep">Sleep Quality</option>
                <option value="custom">Custom Goal</option>
              </select>
            </div>
            
            <div class="goal-editor-section">
              <h3>Target Values</h3>
              
              <div class="goal-metric-row">
                <div>
                  <label for="startValue">Starting Value</label>
                  <input type="number" id="startValue" step="0.01" required>
                </div>
                <div>
                  <label for="targetValue">Target Value</label>
                  <input type="number" id="targetValue" step="0.01" required>
                </div>
                <div>
                  <label for="goalUnit">Unit</label>
                  <input type="text" id="goalUnit" placeholder="kg, kcal, etc.">
                </div>
              </div>
            </div>
            
            <div class="goal-editor-section">
              <h3>Time Frame</h3>
              
              <div class="goal-metric-row">
                <div>
                  <label for="startDate">Start Date</label>
                  <input type="date" id="startDate" required>
                </div>
                <div>
                  <label for="endDate">Target Date</label>
                  <input type="date" id="endDate" required>
                </div>
              </div>
            </div>
            
            <div class="goal-editor-section">
              <h3>Weekly Targets</h3>
              <div class="goal-metric-row">
                <div>
                  <label for="weeklyTarget">Weekly Target</label>
                  <input type="number" id="weeklyTarget" step="0.01">
                </div>
                <div>
                  <label for="dailyTarget">Daily Target</label>
                  <input type="number" id="dailyTarget" step="0.01">
                </div>
              </div>
            </div>
            
            <div class="goal-editor-actions">
              <button type="button" class="goal-editor-btn btn-cancel">Cancel</button>
              <button type="submit" class="goal-editor-btn btn-save">Save Goal</button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(modal);
      this.goalEditor = modal;
      
      // Set up editor event listeners
      this.setupEditorEventListeners();
    }
  }
  
  /**
   * Set up event listeners for the goal editor
   */
  setupEditorEventListeners() {
    if (!this.goalEditor) return;
    
    const closeBtn = this.goalEditor.querySelector('.goal-editor-close');
    const cancelBtn = this.goalEditor.querySelector('.btn-cancel');
    const form = this.goalEditor.querySelector('#goalEditorForm');
    
    // Close modal when clicking close or cancel buttons
    closeBtn.addEventListener('click', () => this.closeGoalEditor());
    cancelBtn.addEventListener('click', () => this.closeGoalEditor());
    
    // Close modal when clicking outside content
    this.goalEditor.addEventListener('click', (e) => {
      if (e.target === this.goalEditor) {
        this.closeGoalEditor();
      }
    });
    
    // Handle form submission
    form.addEventListener('submit', (e) => this.handleGoalFormSubmit(e));
    
    // Handle goal type change
    const goalTypeSelect = form.querySelector('#goalType');
    goalTypeSelect.addEventListener('change', () => this.updateGoalTypeFields());
    
    // Handle start/target value changes to calculate weekly/daily targets
    const startValue = form.querySelector('#startValue');
    const targetValue = form.querySelector('#targetValue');
    const startDate = form.querySelector('#startDate');
    const endDate = form.querySelector('#endDate');
    
    [startValue, targetValue, startDate, endDate].forEach(input => {
      input.addEventListener('change', () => this.calculateTargetRates());
    });
  }
  
  /**
   * Open the goal editor modal with an optional goal to edit
   * @param {Object} goalToEdit - Optional goal to edit
   */
  openGoalEditor(goalToEdit = null) {
    if (!this.goalEditor) return;
    
    const form = this.goalEditor.querySelector('#goalEditorForm');
    const title = this.goalEditor.querySelector('.goal-editor-title');
    
    // Reset form
    form.reset();
    
    // Set today as default start date
    const today = new Date().toISOString().split('T')[0];
    form.querySelector('#startDate').value = today;
    
    // Set default end date to 30 days from now
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 30);
    form.querySelector('#endDate').value = defaultEndDate.toISOString().split('T')[0];
    
    if (goalToEdit) {
      // Edit existing goal
      title.textContent = 'Edit Goal';
      form.querySelector('#goalId').value = goalToEdit.id;
      form.querySelector('#goalTitle').value = goalToEdit.title || '';
      form.querySelector('#goalType').value = goalToEdit.type || 'weight';
      form.querySelector('#startValue').value = goalToEdit.startValue || '';
      form.querySelector('#targetValue').value = goalToEdit.targetValue || '';
      form.querySelector('#goalUnit').value = goalToEdit.unit || '';
      form.querySelector('#startDate').value = goalToEdit.startDate || today;
      form.querySelector('#endDate').value = goalToEdit.endDate || '';
      form.querySelector('#weeklyTarget').value = goalToEdit.weeklyTarget || '';
      form.querySelector('#dailyTarget').value = goalToEdit.dailyTarget || '';
    } else {
      // Create new goal
      title.textContent = 'Create New Goal';
      form.querySelector('#goalId').value = '';
      
      // Set default values based on user data
      if (this.userData) {
        if (form.querySelector('#goalType').value === 'weight') {
          form.querySelector('#startValue').value = this.userData.weight || '';
          form.querySelector('#goalUnit').value = this.userData.weightUnit || 'kg';
        }
      }
    }
    
    // Update UI based on goal type
    this.updateGoalTypeFields();
    
    // Calculate target rates
    this.calculateTargetRates();
    
    // Show modal
    this.goalEditor.classList.add('active');
  }
  
  /**
   * Close the goal editor modal
   */
  closeGoalEditor() {
    if (!this.goalEditor) return;
    this.goalEditor.classList.remove('active');
  }
  
  /**
   * Update form fields based on selected goal type
   */
  updateGoalTypeFields() {
    const form = this.goalEditor.querySelector('#goalEditorForm');
    const goalType = form.querySelector('#goalType').value;
    const unitInput = form.querySelector('#goalUnit');
    
    // Update unit field based on goal type
    switch (goalType) {
      case 'weight':
        unitInput.value = this.userData?.weightUnit || 'kg';
        break;
      case 'nutrition':
        unitInput.value = 'kcal';
        break;
      case 'activity':
        unitInput.value = 'steps';
        break;
      case 'hydration':
        unitInput.value = 'ml';
        break;
      case 'sleep':
        unitInput.value = 'hours';
        break;
      default:
        unitInput.value = '';
    }
  }
  
  /**
   * Calculate weekly and daily target rates based on start/end values and dates
   */
  calculateTargetRates() {
    const form = this.goalEditor.querySelector('#goalEditorForm');
    const startValue = parseFloat(form.querySelector('#startValue').value);
    const targetValue = parseFloat(form.querySelector('#targetValue').value);
    const startDate = new Date(form.querySelector('#startDate').value);
    const endDate = new Date(form.querySelector('#endDate').value);
    
    if (isNaN(startValue) || isNaN(targetValue) || !startDate || !endDate) {
      return;
    }
    
    // Calculate total days
    const totalDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    if (totalDays <= 0) return;
    
    // Calculate total change
    const totalChange = targetValue - startValue;
    
    // Calculate daily target
    const dailyTarget = totalChange / totalDays;
    form.querySelector('#dailyTarget').value = dailyTarget.toFixed(2);
    
    // Calculate weekly target
    const weeklyTarget = dailyTarget * 7;
    form.querySelector('#weeklyTarget').value = weeklyTarget.toFixed(2);
  }
  
  /**
   * Handle goal form submission
   * @param {Event} e - Form submit event
   */
  async handleGoalFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const user = auth.currentUser;
    if (!user) return;
    
    const goalId = form.querySelector('#goalId').value || `goal_${Date.now()}`;
    const goalData = {
      id: goalId,
      title: form.querySelector('#goalTitle').value,
      type: form.querySelector('#goalType').value,
      startValue: parseFloat(form.querySelector('#startValue').value),
      targetValue: parseFloat(form.querySelector('#targetValue').value),
      unit: form.querySelector('#goalUnit').value,
      startDate: form.querySelector('#startDate').value,
      endDate: form.querySelector('#endDate').value,
      weeklyTarget: parseFloat(form.querySelector('#weeklyTarget').value),
      dailyTarget: parseFloat(form.querySelector('#dailyTarget').value),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Check if editing or creating
      const existingGoalIndex = this.userGoals.findIndex(goal => goal.id === goalId);
      
      if (existingGoalIndex >= 0) {
        // Update existing goal
        this.userGoals[existingGoalIndex] = {
          ...this.userGoals[existingGoalIndex],
          ...goalData,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new goal
        this.userGoals.push(goalData);
      }
      
      // Save to user profile
      await updateDoc(doc(db, "users", user.uid, "goals", goalId));
      
      // Add initial progress entry if it's a new goal
      if (existingGoalIndex < 0) {
        await this.logGoalProgress(goalId, goalData.startValue);
      }
      
      // Close modal and refresh dashboard
      this.closeGoalEditor();
      this.renderGoalDashboard();
      
      // Show success message
      this.showToast('Goal saved successfully!', 'success');
    } catch (error) {
      logError('Error saving goal:', error);
      this.showToast('Error saving goal. Please try again.', 'error');
    }
  }
  
  /**
   * Set up event listeners for goal interactions
   */
  setupEventListeners() {
    // Listen for add goal button click
    document.addEventListener('click', (e) => {
      // Add new goal
      if (e.target.id === 'addGoalBtn' || e.target.closest('#addGoalBtn')) {
        this.openGoalEditor();
      }
      
      // Edit goal
      if (e.target.classList.contains('edit-goal') || e.target.closest('.edit-goal')) {
        const goalId = e.target.dataset.goalId || e.target.closest('.edit-goal').dataset.goalId;
        const goalToEdit = this.userGoals.find(goal => goal.id === goalId);
        if (goalToEdit) {
          this.openGoalEditor(goalToEdit);
        }
      }
      
      // Log progress
      if (e.target.classList.contains('log-progress') || e.target.closest('.log-progress')) {
        const goalId = e.target.dataset.goalId || e.target.closest('.log-progress').dataset.goalId;
        const goal = this.userGoals.find(g => g.id === goalId);
        if (goal) {
          this.promptForProgressUpdate(goal);
        }
      }
      
      // Delete goal
      if (e.target.classList.contains('delete-goal') || e.target.closest('.delete-goal')) {
        const goalId = e.target.dataset.goalId || e.target.closest('.delete-goal').dataset.goalId;
        if (confirm('Are you sure you want to delete this goal?')) {
          this.deleteGoal(goalId);
        }
      }
      
      // Chart period buttons
      if (e.target.classList.contains('chart-period-btn')) {
        const period = e.target.dataset.period;
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        e.target.classList.add('active');
        this.updateProgressChart(period);
      }
    });
  }
  
  /**
   * Delete a goal
   * @param {string} goalId - ID of the goal to delete
   */
  async deleteGoal(goalId) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      // Remove goal from array
      const goalIndex = this.userGoals.findIndex(goal => goal.id === goalId);
      if (goalIndex >= 0) {
        this.userGoals.splice(goalIndex, 1);
        
        // Update user profile
        await updateDoc(doc(db, "users", user.uid, "goals", goalId));
        
        // Refresh dashboard
        this.renderGoalDashboard();
        
        // Show success message
        this.showToast('Goal deleted successfully!', 'success');
      }
    } catch (error) {
      logError('Error deleting goal:', error);
      this.showToast('Error deleting goal. Please try again.', 'error');
    }
  }
  
  /**
   * Prompt user to update progress for a goal
   * @param {Object} goal - The goal to update progress for
   */
  promptForProgressUpdate(goal) {
    const currentValue = prompt(`Enter current ${goal.title || 'goal'} value (${goal.unit || ''}):`, goal.startValue);
    if (currentValue !== null) {
      this.logGoalProgress(goal.id, parseFloat(currentValue));
    }
  }
  
  /**
   * Log progress update for a goal
   * @param {string} goalId - ID of the goal
   * @param {number} value - Current value
   */
  async logGoalProgress(goalId, value) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      // Add progress entry
      if (!this.progressData[goalId]) {
        this.progressData[goalId] = [];
      }
      
      const entry = {
        value,
        date: new Date().toISOString()
      };
      
      this.progressData[goalId].push(entry);
      
      // Save progress data
      await updateDoc(doc(db, "users", user.uid, "progressData", goalId, "entries", entry.date));
      
      // Refresh dashboard
      this.renderGoalDashboard();
      
      // Update chart
      const activePeriodBtn = document.querySelector('.chart-period-btn.active');
      const period = activePeriodBtn ? activePeriodBtn.dataset.period : 'week';
      this.updateProgressChart(period);
      
      // Show success message
      this.showToast('Progress updated successfully!', 'success');
    } catch (error) {
      logError('Error logging progress:', error);
      this.showToast('Error updating progress. Please try again.', 'error');
    }
  }
  
  /**
   * Load progress data from user profile
   */
  async loadProgressData() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().progressData) {
        this.progressData = userDoc.data().progressData;
      }
    } catch (error) {
      logError('Error loading progress data:', error);
    }
  }
  
  /**
   * Load Chart.js library
   */
  async loadChartLibrary() {
    try {
      // Check if Chart.js is already loaded
      if (window.Chart) {
        this.chartLib = window.Chart;
        return;
      }
      
      // Create script element to load Chart.js
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
          this.chartLib = window.Chart;
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
      });
    } catch (error) {
      logError('Error loading Chart.js:', error);
    }
  }
  
  /**
   * Initialize progress charts
   */
  initializeCharts() {
    if (!this.chartLib) return;
    
    // Initialize progress chart
    const chartCanvas = document.getElementById('progressChart');
    if (!chartCanvas) return;
    
    // Create chart
    this.progressCharts.main = new this.chartLib(chartCanvas, {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day'
            }
          }
        }
      }
    });
    
    // Update chart with data
    this.updateProgressChart('week');
  }
  
  /**
   * Update progress chart with data
   * @param {string} period - Time period to display (week, month, year)
   */
  updateProgressChart(period = 'week') {
    if (!this.progressCharts.main) return;
    
    // Determine date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    // Prepare datasets
    const datasets = [];
    const colors = [
      'rgba(26, 60, 52, 0.7)',
      'rgba(61, 90, 128, 0.7)',
      'rgba(255, 140, 66, 0.7)',
      'rgba(76, 175, 80, 0.7)',
      'rgba(255, 107, 107, 0.7)'
    ];
    
    // Add datasets for each goal
    let colorIndex = 0;
    this.userGoals.forEach(goal => {
      const progressEntries = this.progressData[goal.id] || [];
      
      // Filter entries within the date range
      const filteredEntries = progressEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      // Sort entries by date
      filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Create dataset
      datasets.push({
        label: goal.title || `${this.goalTypes[goal.type]?.name || 'Goal'}`,
        data: filteredEntries.map(entry => ({
          x: new Date(entry.date),
          y: entry.value
        })),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length].replace('0.7', '0.1'),
        tension: 0.4,
        fill: false
      });
      
      colorIndex++;
    });
    
    // Update chart data
    this.progressCharts.main.data.datasets = datasets;
    
    // Update time unit based on period
    let timeUnit = 'day';
    if (period === 'month') timeUnit = 'week';
    if (period === 'year') timeUnit = 'month';
    
    this.progressCharts.main.options.scales.x.time.unit = timeUnit;
    
    // Update chart
    this.progressCharts.main.update();
  }
  
  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of toast (success, error, info)
   */
  showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    
    // Set toast content and type
    toast.textContent = message;
    toast.className = `toast-notification toast-${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Create and initialize goal tracker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const goalTracker = new GoalTracker();
  goalTracker.initialize();
});

export default GoalTracker;