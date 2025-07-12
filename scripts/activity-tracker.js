import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Activity Tracker JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const activityTracker = new ActivityTracker();
});

class ActivityTracker {
    constructor() {
        // Initialize state
        this.activities = this.loadFromStorage('activityData') || [];
        this.currentActivityId = null;
        this.activityTypes = [
            { id: 'running', name: 'Running', icon: 'fa-running', mets: 9.8 },
            { id: 'walking', name: 'Walking', icon: 'fa-walking', mets: 3.5 },
            { id: 'cycling', name: 'Cycling', icon: 'fa-bicycle', mets: 8.0 },
            { id: 'swimming', name: 'Swimming', icon: 'fa-swimmer', mets: 6.0 },
            { id: 'yoga', name: 'Yoga', icon: 'fa-om', mets: 3.0 },
            { id: 'weightlifting', name: 'Weight Training', icon: 'fa-dumbbell', mets: 5.0 },
            { id: 'hiking', name: 'Hiking', icon: 'fa-hiking', mets: 5.3 },
            { id: 'basketball', name: 'Basketball', icon: 'fa-basketball-ball', mets: 8.0 },
            { id: 'dancing', name: 'Dancing', icon: 'fa-music', mets: 4.8 },
            { id: 'other', name: 'Other', icon: 'fa-plus', mets: 4.0 }
        ];
        
        // User info (for calorie calculations)
        this.userInfo = {
            weight: this.loadFromStorage('userWeight') || 70, // kg
            height: this.loadFromStorage('userHeight') || 170, // cm
            age: this.loadFromStorage('userAge') || 30,
            gender: this.loadFromStorage('userGender') || 'male'
        };
        
        // Initialize UI elements and event listeners
        this.initElements();
        this.initEventListeners();
        
        // Populate activity type grid
        this.populateActivityTypeGrid();
        
        // Set today's date as default in the form
        this.setTodayAsDefault();
        
        // Render activities
        this.renderActivities();
        
        // Initialize charts
        this.initCharts();
    }
    
    initElements() {
        // Stats elements
        this.caloriesBurnedEl = document.getElementById('calories-burned');
        this.activeMinutesEl = document.getElementById('active-minutes');
        this.activeDaysEl = document.getElementById('active-days');
        
        // Log activity button
        this.logActivityBtn = document.getElementById('log-activity-btn');
        
        // Activity log container
        this.activityLogBody = document.getElementById('activity-log-body');
        
        // Filters
        this.activityFilter = document.getElementById('activity-filter');
        this.timeFilter = document.getElementById('time-filter');
        
        // Activity modal elements
        this.activityModal = document.getElementById('activity-modal');
        this.activityModalTitle = document.getElementById('activity-modal-title');
        this.activityForm = document.getElementById('activity-form');
        this.activityTypeGrid = document.getElementById('activity-type-grid');
        this.activityId = document.getElementById('activity-id');
        this.activityDate = document.getElementById('activity-date');
        this.activityDuration = document.getElementById('activity-duration');
        this.activityIntensity = document.getElementById('activity-intensity');
        this.activityCalories = document.getElementById('activity-calories');
        this.activityNotes = document.getElementById('activity-notes');
        this.saveActivityBtn = document.getElementById('save-activity-btn');
        
        // Delete modal elements
        this.deleteModal = document.getElementById('delete-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        
        // Chart elements
        this.activityChart = document.getElementById('activity-chart');
        this.activityDistributionChart = document.getElementById('activity-distribution-chart');
        
        // Close modal buttons
        this.closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');
    }
    
    initEventListeners() {
        // Open activity modal
        if (this.logActivityBtn) {
            this.logActivityBtn.addEventListener('click', () => this.openActivityModal());
        }
        
        // Save activity
        if (this.saveActivityBtn) {
            this.saveActivityBtn.addEventListener('click', () => this.saveActivity());
        }
        
        // Confirm delete
        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.deleteActivity());
        }
        
        // Close modals
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.activityModal.classList.remove('active');
                this.deleteModal.classList.remove('active');
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.activityModal) {
                this.activityModal.classList.remove('active');
            }
            if (e.target === this.deleteModal) {
                this.deleteModal.classList.remove('active');
            }
        });
        
        // Filters
        if (this.activityFilter) {
            this.activityFilter.addEventListener('change', () => this.renderActivities());
        }
        
        if (this.timeFilter) {
            this.timeFilter.addEventListener('change', () => this.renderActivities());
        }
        
        // Auto-calculate calories when duration or intensity changes
        if (this.activityDuration) {
            this.activityDuration.addEventListener('input', () => this.autoCalculateCalories());
        }
        
        if (this.activityIntensity) {
            this.activityIntensity.addEventListener('change', () => this.autoCalculateCalories());
        }
    }
    
    populateActivityTypeGrid() {
        if (!this.activityTypeGrid) return;
        
        this.activityTypeGrid.innerHTML = '';
        
        this.activityTypes.forEach(type => {
            const typeBtn = document.createElement('div');
            typeBtn.className = 'activity-type-btn';
            typeBtn.dataset.type = type.id;
            
            typeBtn.innerHTML = `
                <i class="fas ${type.icon}"></i>
                <span>${type.name}</span>
            `;
            
            typeBtn.addEventListener('click', () => {
                // Remove active class from all buttons
                document.querySelectorAll('.activity-type-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to selected button
                typeBtn.classList.add('active');
                
                // Auto-calculate calories
                this.autoCalculateCalories();
            });
            
            this.activityTypeGrid.appendChild(typeBtn);
        });
    }
    
    openActivityModal(activityId = null) {
        this.resetActivityForm();
        
        if (activityId) {
            // Edit existing activity
            const activity = this.activities.find(a => a.id === activityId);
            if (!activity) return;
            
            this.currentActivityId = activityId;
            this.activityModalTitle.textContent = 'Edit Activity';
            this.activityId.value = activity.id;
            this.activityDate.value = activity.date;
            this.activityDuration.value = activity.duration;
            this.activityIntensity.value = activity.intensity;
            this.activityCalories.value = activity.calories;
            this.activityNotes.value = activity.notes || '';
            
            // Select activity type
            const typeBtn = document.querySelector(`.activity-type-btn[data-type="${activity.type}"]`);
            if (typeBtn) {
                typeBtn.click();
            }
        } else {
            // New activity
            this.currentActivityId = null;
            this.activityModalTitle.textContent = 'Log Activity';
            
            // Select first activity type by default
            const firstTypeBtn = document.querySelector('.activity-type-btn');
            if (firstTypeBtn) {
                firstTypeBtn.click();
            }
        }
        
        this.activityModal.classList.add('active');
    }
    
    resetActivityForm() {
        this.activityForm.reset();
        this.setTodayAsDefault();
        
        // Remove active class from all activity type buttons
        document.querySelectorAll('.activity-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    setTodayAsDefault() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        this.activityDate.value = `${year}-${month}-${day}`;
    }
    
    saveActivity() {
        // Get selected activity type
        const selectedTypeBtn = document.querySelector('.activity-type-btn.active');
        if (!selectedTypeBtn) {
            this.showToast('Please select an activity type', 'error');
            return;
        }
        
        const activityType = selectedTypeBtn.dataset.type;
        
        // Validate form
        if (!this.activityDate.value || !this.activityDuration.value) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Get calories (auto-calculate if not provided)
        let calories = parseInt(this.activityCalories.value);
        if (!calories || isNaN(calories)) {
            calories = this.calculateCaloriesBurned(activityType, parseInt(this.activityDuration.value), this.activityIntensity.value);
        }
        
        // Prepare activity object
        const activity = {
            id: this.currentActivityId || Date.now().toString(),
            type: activityType,
            name: this.activityTypes.find(t => t.id === activityType).name,
            date: this.activityDate.value,
            duration: parseInt(this.activityDuration.value),
            intensity: this.activityIntensity.value,
            calories: calories,
            notes: this.activityNotes.value.trim(),
            timestamp: new Date().toISOString()
        };
        
        // Update or add activity
        if (this.currentActivityId) {
            // Update existing activity
            const index = this.activities.findIndex(a => a.id === this.currentActivityId);
            if (index !== -1) {
                this.activities[index] = activity;
            }
        } else {
            // Add new activity
            this.activities.push(activity);
        }
        
        // Save to local storage
        this.saveActivities();
        
        // Close modal and refresh UI
        this.activityModal.classList.remove('active');
        this.renderActivities();
        this.updateStats();
        this.updateCharts();
        
        // Show success message
        const message = this.currentActivityId ? 'Activity updated successfully' : 'Activity added successfully';
        this.showToast(message, 'success');
    }
    
    deleteActivity() {
        if (!this.currentActivityId) return;
        
        // Remove activity
        this.activities = this.activities.filter(a => a.id !== this.currentActivityId);
        
        // Save to local storage
        this.saveActivities();
        
        // Close modals and refresh UI
        this.deleteModal.classList.remove('active');
        this.renderActivities();
        this.updateStats();
        this.updateCharts();
        
        // Show success message
        this.showToast('Activity deleted successfully', 'info');
    }
    
    openDeleteModal(activityId) {
        this.currentActivityId = activityId;
        this.deleteModal.classList.add('active');
    }
    
    renderActivities() {
        if (!this.activityLogBody) return;
        
        // Apply filters
        const filteredActivities = this.filterActivities();
        
        // Clear current activities
        this.activityLogBody.innerHTML = '';
        
        if (filteredActivities.length === 0) {
            // Show empty state
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state';
            emptyRow.innerHTML = `
                <td colspan="6">
                    <div class="empty-message">
                        <i class="fas fa-running"></i>
                        <p>No activities logged yet. Start by adding your first activity!</p>
                    </div>
                </td>
            `;
            this.activityLogBody.appendChild(emptyRow);
        } else {
            // Render activities
            filteredActivities.forEach(activity => {
                const row = document.createElement('tr');
                row.dataset.id = activity.id;
                
                // Format date
                const formattedDate = this.formatDate(activity.date);
                
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>
                        <div class="activity-type">
                            <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                            <span>${activity.name}</span>
                        </div>
                    </td>
                    <td>${activity.duration} min</td>
                    <td>${activity.calories} cal</td>
                    <td>${activity.notes || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit-btn" data-id="${activity.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-btn" data-id="${activity.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                // Add event listeners to buttons
                row.querySelector('.edit-btn').addEventListener('click', () => {
                    this.openActivityModal(activity.id);
                });
                
                row.querySelector('.delete-btn').addEventListener('click', () => {
                    this.openDeleteModal(activity.id);
                });
                
                this.activityLogBody.appendChild(row);
            });
        }
        
        // Update stats
        this.updateStats();
    }
    
    filterActivities() {
        let filtered = [...this.activities];
        
        // Activity type filter
        const activityType = this.activityFilter.value;
        if (activityType !== 'all') {
            filtered = filtered.filter(a => a.type === activityType);
        }
        
        // Time period filter
        const timePeriod = this.timeFilter.value;
        const today = new Date();
        
        if (timePeriod === 'week') {
            // Get first day of the week (Sunday)
            const firstDay = new Date(today);
            firstDay.setDate(today.getDate() - today.getDay());
            firstDay.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === 'month') {
            // Get first day of the month
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            filtered = filtered.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === '3months') {
            // Get date 3 months ago
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            
            filtered = filtered.filter(a => new Date(a.date) >= threeMonthsAgo);
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return filtered;
    }
    
    updateStats() {
        // Apply time filter
        const timePeriod = this.timeFilter.value;
        let filteredActivities = this.activities;
        
        const today = new Date();
        
        if (timePeriod === 'week') {
            // Get first day of the week (Sunday)
            const firstDay = new Date(today);
            firstDay.setDate(today.getDate() - today.getDay());
            firstDay.setHours(0, 0, 0, 0);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === 'month') {
            // Get first day of the month
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === '3months') {
            // Get date 3 months ago
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= threeMonthsAgo);
        }
        
        // Calculate stats
        const totalCalories = filteredActivities.reduce((sum, activity) => sum + activity.calories, 0);
        const totalMinutes = filteredActivities.reduce((sum, activity) => sum + activity.duration, 0);
        
        // Count active days (unique dates)
        const activeDays = new Set(filteredActivities.map(a => a.date)).size;
        
        // Update UI
        this.caloriesBurnedEl.textContent = totalCalories.toLocaleString();
        this.activeMinutesEl.textContent = totalMinutes.toLocaleString();
        this.activeDaysEl.textContent = activeDays;
    }
    
    initCharts() {
        // Initialize activity chart
        if (this.activityChart) {
            this.activityChartInstance = new Chart(this.activityChart.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Calories Burned',
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        data: []
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Calories'
                            }
                        }
                    }
                }
            });
        }
        
        // Initialize activity distribution chart
        if (this.activityDistributionChart) {
            this.distributionChartInstance = new Chart(this.activityDistributionChart.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 159, 64, 0.7)',
                            'rgba(199, 199, 199, 0.7)',
                            'rgba(83, 102, 255, 0.7)',
                            'rgba(40, 159, 64, 0.7)',
                            'rgba(210, 199, 199, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(199, 199, 199, 1)',
                            'rgba(83, 102, 255, 1)',
                            'rgba(40, 159, 64, 1)',
                            'rgba(210, 199, 199, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Update charts with data
        this.updateCharts();
    }
    
    updateCharts() {
        // Apply time filter
        const timePeriod = this.timeFilter.value;
        let filteredActivities = this.activities;
        
        const today = new Date();
        
        if (timePeriod === 'week') {
            // Get first day of the week (Sunday)
            const firstDay = new Date(today);
            firstDay.setDate(today.getDate() - today.getDay());
            firstDay.setHours(0, 0, 0, 0);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === 'month') {
            // Get first day of the month
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= firstDay);
        } else if (timePeriod === '3months') {
            // Get date 3 months ago
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            
            filteredActivities = filteredActivities.filter(a => new Date(a.date) >= threeMonthsAgo);
        }
        
        // Update activity chart (daily calories burned)
        if (this.activityChartInstance) {
            // Group activities by date
            const dailyCalories = {};
            
            filteredActivities.forEach(activity => {
                if (!dailyCalories[activity.date]) {
                    dailyCalories[activity.date] = 0;
                }
                dailyCalories[activity.date] += activity.calories;
            });
            
            // Sort dates
            const sortedDates = Object.keys(dailyCalories).sort();
            
            // Format dates for display
            const formattedDates = sortedDates.map(date => this.formatDate(date, true));
            
            // Update chart data
            this.activityChartInstance.data.labels = formattedDates;
            this.activityChartInstance.data.datasets[0].data = sortedDates.map(date => dailyCalories[date]);
            
            // Update chart
            this.activityChartInstance.update();
        }
        
        // Update activity distribution chart
        if (this.distributionChartInstance) {
            // Group activities by type
            const activityDistribution = {};
            
            filteredActivities.forEach(activity => {
                if (!activityDistribution[activity.name]) {
                    activityDistribution[activity.name] = 0;
                }
                activityDistribution[activity.name] += activity.duration;
            });
            
            // Sort by total minutes (descending)
            const sortedTypes = Object.keys(activityDistribution).sort((a, b) => {
                return activityDistribution[b] - activityDistribution[a];
            });
            
            // Update chart data
            this.distributionChartInstance.data.labels = sortedTypes;
            this.distributionChartInstance.data.datasets[0].data = sortedTypes.map(type => activityDistribution[type]);
            
            // Update chart
            this.distributionChartInstance.update();
        }
    }
    
    autoCalculateCalories() {
        // Get selected activity type
        const selectedTypeBtn = document.querySelector('.activity-type-btn.active');
        if (!selectedTypeBtn) return;
        
        const activityType = selectedTypeBtn.dataset.type;
        
        // Get duration and intensity
        const duration = parseInt(this.activityDuration.value) || 0;
        const intensity = this.activityIntensity.value;
        
        // Calculate calories
        if (duration > 0) {
            const calories = this.calculateCaloriesBurned(activityType, duration, intensity);
            this.activityCalories.value = calories;
        }
    }
    
    calculateCaloriesBurned(activityType, duration, intensity) {
        // Get activity METs (Metabolic Equivalent of Task)
        const activity = this.activityTypes.find(a => a.id === activityType);
        let mets = activity ? activity.mets : 4.0;
        
        // Adjust METs based on intensity
        if (intensity === 'low') {
            mets = mets * 0.7;
        } else if (intensity === 'high') {
            mets = mets * 1.3;
        }
        
        // Calculate calories burned
        // Formula: calories = METs * weight in kg * duration in hours
        const durationInHours = duration / 60;
        const calories = Math.round(mets * this.userInfo.weight * durationInHours);
        
        return calories;
    }
    
    getActivityIcon(type) {
        const activity = this.activityTypes.find(a => a.id === type);
        return activity ? activity.icon : 'fa-running';
    }
    
    formatDate(dateString, short = false) {
        const date = new Date(dateString);
        
        if (short) {
            // Short format (e.g., "Apr 5")
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            // Full format (e.g., "Monday, April 5, 2023")
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
        }
    }
    
    saveActivities() {
        this.saveToStorage('activityData', this.activities);
    }
    
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            logError(`Error loading ${key} from storage:`, e);
            return null;
        }
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            logError(`Error saving ${key} to storage:`, e);
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add to DOM
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Toast styles
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        }
        
        .toast {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 10px;
            color: white;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            opacity: 0;
            transition: transform 0.3s, opacity 0.3s;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast.success {
            background-color: #4caf50;
        }
        
        .toast.error {
            background-color: #f44336;
        }
        
        .toast.info {
            background-color: #2196f3;
        }
    `;
    document.head.appendChild(style);
}); 