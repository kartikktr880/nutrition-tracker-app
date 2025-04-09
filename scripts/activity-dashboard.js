/**
 * Activity Dashboard - Handles displaying and managing user's fitness activity data
 */
class ActivityDashboard {
    constructor() {
        this.fitnessIntegration = new FitnessIntegration();
        this.currentDateRange = 'week'; // Default date range
        this.charts = {};
        this.activityData = null;
        this.trackers = [];
        
        // DOM elements
        this.elements = {
            trackersList: document.getElementById('connected-trackers-list'),
            noTrackersMessage: document.getElementById('no-trackers-message'),
            activityList: document.getElementById('activity-list'),
            noActivitiesMessage: document.getElementById('no-activities-message'),
            dateRangeButtons: document.querySelectorAll('.date-range-btn'),
            customDateInputs: document.querySelectorAll('.date-input'),
            applyCustomDateBtn: document.getElementById('apply-custom-date'),
            activityModal: document.getElementById('activity-detail-modal'),
            closeModalBtn: document.getElementById('close-modal'),
            
            // Summary elements
            stepsCount: document.getElementById('steps-count'),
            caloriesBurned: document.getElementById('calories-burned'),
            activeMinutes: document.getElementById('active-minutes'),
            distanceTraveled: document.getElementById('distance-traveled'),
            
            // Calorie summary
            caloriesIn: document.getElementById('calories-in'),
            caloriesOut: document.getElementById('calories-out'),
            caloriesNet: document.getElementById('calories-net')
        };
        
        this.init();
    }
    
    /**
     * Initialize the dashboard
     */
    async init() {
        this.setupEventListeners();
        await this.loadConnectedTrackers();
        await this.loadActivityData();
        this.initializeCharts();
        this.updateCalorieSummary();
    }
    
    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Date range selection
        this.elements.dateRangeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleDateRangeChange(button.dataset.range);
            });
        });
        
        // Apply custom date range
        if (this.elements.applyCustomDateBtn) {
            this.elements.applyCustomDateBtn.addEventListener('click', () => {
                this.applyCustomDateRange();
            });
        }
        
        // Modal closing
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => {
                this.elements.activityModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.activityModal) {
                this.elements.activityModal.style.display = 'none';
            }
        });
    }
    
    /**
     * Load and display connected fitness trackers
     */
    async loadConnectedTrackers() {
        this.trackers = await this.fitnessIntegration.getConnectedProviders();
        
        if (!this.elements.trackersList) return;
        
        if (this.trackers.length === 0) {
            if (this.elements.noTrackersMessage) {
                this.elements.noTrackersMessage.style.display = 'block';
            }
            if (this.elements.trackersList) {
                this.elements.trackersList.style.display = 'none';
            }
            return;
        }
        
        if (this.elements.noTrackersMessage) {
            this.elements.noTrackersMessage.style.display = 'none';
        }
        if (this.elements.trackersList) {
            this.elements.trackersList.style.display = 'block';
            
            this.elements.trackersList.innerHTML = '';
            
            this.trackers.forEach(tracker => {
                const trackerItem = document.createElement('div');
                trackerItem.className = 'tracker-item';
                trackerItem.innerHTML = `
                    <img src="./assets/icons/${tracker.provider.toLowerCase()}.png" alt="${tracker.provider} logo">
                    <div class="tracker-info">
                        <h3>${tracker.provider}</h3>
                        <p>Last synced: ${tracker.lastSynced ? new Date(tracker.lastSynced).toLocaleDateString() : 'Never'}</p>
                    </div>
                    <button class="btn primary-btn sync-btn" data-provider="${tracker.provider.toLowerCase()}">
                        <i class="fas fa-sync-alt"></i> Sync
                    </button>
                `;
                
                this.elements.trackersList.appendChild(trackerItem);
                
                // Add sync event listener
                const syncBtn = trackerItem.querySelector('.sync-btn');
                syncBtn.addEventListener('click', () => {
                    this.syncTracker(tracker.provider);
                });
            });
        }
    }
    
    /**
     * Sync data from a specific tracker
     */
    async syncTracker(provider) {
        const syncBtn = document.querySelector(`.sync-btn[data-provider="${provider.toLowerCase()}"]`);
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        }
        
        try {
            await this.fitnessIntegration.importActivityData({
                provider: provider,
                startDate: this.getDateRangeStart(),
                endDate: new Date()
            });
            
            // Update last synced time
            const trackerIndex = this.trackers.findIndex(t => t.provider.toLowerCase() === provider.toLowerCase());
            if (trackerIndex !== -1) {
                this.trackers[trackerIndex].lastSynced = new Date().toISOString();
            }
            
            // Reload data and update UI
            await this.loadActivityData();
            this.updateDashboard();
            
            this.showToast('Success! Your activity data has been synced.', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast('Failed to sync activity data. Please try again.', 'error');
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync';
            }
        }
    }
    
    /**
     * Load activity data based on the current date range
     */
    async loadActivityData() {
        const startDate = this.getDateRangeStart();
        const endDate = new Date();
        
        try {
            this.activityData = await this.fitnessIntegration.getActivityData(startDate, endDate);
            this.updateActivitySummary();
            this.displayRecentActivities();
        } catch (error) {
            console.error('Error loading activity data:', error);
            this.showToast('Failed to load activity data.', 'error');
        }
    }
    
    /**
     * Update the activity summary cards with the latest data
     */
    updateActivitySummary() {
        if (!this.activityData) return;
        
        const { summary } = this.activityData;
        
        // Update summary elements if they exist
        if (this.elements.stepsCount) {
            this.elements.stepsCount.textContent = summary.steps.toLocaleString();
            const stepsProgress = document.querySelector('#steps-card .progress');
            if (stepsProgress) {
                const percentage = Math.min(100, (summary.steps / 10000) * 100);
                stepsProgress.style.width = `${percentage}%`;
            }
        }
        
        if (this.elements.caloriesBurned) {
            this.elements.caloriesBurned.textContent = summary.caloriesBurned.toLocaleString();
            const caloriesProgress = document.querySelector('#calories-card .progress');
            if (caloriesProgress) {
                const percentage = Math.min(100, (summary.caloriesBurned / 2000) * 100);
                caloriesProgress.style.width = `${percentage}%`;
            }
        }
        
        if (this.elements.activeMinutes) {
            this.elements.activeMinutes.textContent = summary.activeMinutes.toLocaleString();
            const minutesProgress = document.querySelector('#minutes-card .progress');
            if (minutesProgress) {
                const percentage = Math.min(100, (summary.activeMinutes / 150) * 100);
                minutesProgress.style.width = `${percentage}%`;
            }
        }
        
        if (this.elements.distanceTraveled) {
            this.elements.distanceTraveled.textContent = summary.distance.toLocaleString();
            const distanceProgress = document.querySelector('#distance-card .progress');
            if (distanceProgress) {
                const percentage = Math.min(100, (summary.distance / 25) * 100);
                distanceProgress.style.width = `${percentage}%`;
            }
        }
    }
    
    /**
     * Display the list of recent activities
     */
    displayRecentActivities() {
        if (!this.elements.activityList || !this.activityData) return;
        
        const { activities } = this.activityData;
        
        if (activities.length === 0) {
            if (this.elements.noActivitiesMessage) {
                this.elements.noActivitiesMessage.style.display = 'block';
            }
            this.elements.activityList.style.display = 'none';
            return;
        }
        
        if (this.elements.noActivitiesMessage) {
            this.elements.noActivitiesMessage.style.display = 'none';
        }
        this.elements.activityList.style.display = 'block';
        this.elements.activityList.innerHTML = '';
        
        // Sort activities by date (newest first)
        const sortedActivities = [...activities].sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
        );
        
        // Display up to 5 recent activities
        const recentActivities = sortedActivities.slice(0, 5);
        
        recentActivities.forEach(activity => {
            const activityDate = new Date(activity.startTime);
            const duration = this.formatDuration(activity.durationMinutes);
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.dataset.id = activity.id;
            
            const iconClass = this.getActivityIconClass(activity.type);
            
            activityItem.innerHTML = `
                <div class="activity-icon ${iconClass}">
                    <i class="${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <h3>${activity.name || this.capitalizeFirstLetter(activity.type)}</h3>
                    <div class="activity-stats">
                        <span><i class="far fa-calendar"></i> ${activityDate.toLocaleDateString()}</span>
                        <span><i class="far fa-clock"></i> ${duration}</span>
                        <span><i class="fas fa-fire"></i> ${activity.caloriesBurned} cal</span>
                        ${activity.distance ? `<span><i class="fas fa-route"></i> ${activity.distance.toFixed(1)} km</span>` : ''}
                    </div>
                </div>
            `;
            
            activityItem.addEventListener('click', () => {
                this.showActivityDetail(activity);
            });
            
            this.elements.activityList.appendChild(activityItem);
        });
    }
    
    /**
     * Initialize charts for visualizing activity data
     */
    initializeCharts() {
        this.initializeActivityChart();
        this.initializeStepsChart();
    }
    
    /**
     * Initialize the activity chart showing workout types
     */
    initializeActivityChart() {
        const activityChartCanvas = document.getElementById('activity-type-chart');
        if (!activityChartCanvas || !this.activityData) return;
        
        // Count activities by type
        const activityTypes = {};
        this.activityData.activities.forEach(activity => {
            const type = this.capitalizeFirstLetter(activity.type);
            activityTypes[type] = (activityTypes[type] || 0) + 1;
        });
        
        const labels = Object.keys(activityTypes);
        const data = Object.values(activityTypes);
        const colors = labels.map(label => this.getActivityColor(label.toLowerCase()));
        
        this.charts.activityChart = new Chart(activityChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map(function(label, i) {
                                        const meta = chart.getDatasetMeta(0);
                                        const value = data.datasets[0].data[i];
                                        const total = meta.total;
                                        const percentage = total ? Math.round((value / total) * 100) : 0;
                                        
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Initialize the steps chart showing daily steps
     */
    initializeStepsChart() {
        const stepsChartCanvas = document.getElementById('steps-chart');
        if (!stepsChartCanvas || !this.activityData) return;
        
        // Group steps by day
        const stepsData = {};
        const now = new Date();
        const startDate = this.getDateRangeStart();
        
        // Create an array of dates in the selected range
        const dates = [];
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dates.push(dateStr);
            stepsData[dateStr] = 0;
        }
        
        // Fill in the actual steps data
        if (this.activityData.dailyStats) {
            this.activityData.dailyStats.forEach(stat => {
                const dateStr = new Date(stat.date).toISOString().split('T')[0];
                if (stepsData[dateStr] !== undefined) {
                    stepsData[dateStr] = stat.steps;
                }
            });
        }
        
        const labels = dates.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        const data = dates.map(date => stepsData[date]);
        
        this.charts.stepsChart = new Chart(stepsChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Steps',
                    data: data,
                    backgroundColor: 'rgba(var(--primary-rgb), 0.7)',
                    borderColor: 'var(--primary-color)',
                    borderWidth: 1
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
                            text: 'Steps'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return dates[context[0].dataIndex];
                            },
                            label: function(context) {
                                return `Steps: ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update the calorie summary section
     */
    async updateCalorieSummary() {
        if (!this.elements.caloriesIn || !this.elements.caloriesOut || !this.elements.caloriesNet) return;
        
        const startDate = this.getDateRangeStart();
        const endDate = new Date();
        
        try {
            // Get calories consumed from food logs
            const foodLogs = await this.getFoodLogsForDateRange(startDate, endDate);
            const caloriesIn = foodLogs.reduce((total, log) => total + log.calories, 0);
            
            // Get calories burned from activities
            const caloriesOut = this.activityData ? this.activityData.summary.caloriesBurned : 0;
            
            // Calculate net calories
            const netCalories = caloriesIn - caloriesOut;
            
            // Update UI
            this.elements.caloriesIn.textContent = caloriesIn.toLocaleString();
            this.elements.caloriesOut.textContent = caloriesOut.toLocaleString();
            this.elements.caloriesNet.textContent = netCalories.toLocaleString();
            
            // Set color for net calories
            this.elements.caloriesNet.style.color = netCalories > 0 ? '#FF5722' : '#4CAF50';
        } catch (error) {
            console.error('Error updating calorie summary:', error);
        }
    }
    
    /**
     * Get food logs for a date range
     */
    async getFoodLogsForDateRange(startDate, endDate) {
        // This would be implemented in your food logging system
        // For now, return dummy data
        return [
            { date: '2023-05-21', calories: 1850, protein: 95, carbs: 220, fat: 65 },
            { date: '2023-05-22', calories: 2100, protein: 110, carbs: 240, fat: 70 },
            { date: '2023-05-23', calories: 1950, protein: 105, carbs: 210, fat: 68 },
            { date: '2023-05-24', calories: 2000, protein: 100, carbs: 230, fat: 67 },
            { date: '2023-05-25', calories: 1875, protein: 98, carbs: 215, fat: 62 }
        ];
    }
    
    /**
     * Handle date range change
     */
    handleDateRangeChange(range) {
        this.currentDateRange = range;
        
        // Update active button
        this.elements.dateRangeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        // Update dashboard with new date range
        this.updateDashboard();
    }
    
    /**
     * Apply a custom date range
     */
    applyCustomDateRange() {
        const startInput = document.getElementById('custom-start-date');
        const endInput = document.getElementById('custom-end-date');
        
        if (!startInput || !endInput) return;
        
        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            this.showToast('Please enter valid dates.', 'error');
            return;
        }
        
        if (startDate > endDate) {
            this.showToast('Start date must be before end date.', 'error');
            return;
        }
        
        this.customStartDate = startDate;
        this.customEndDate = endDate;
        this.currentDateRange = 'custom';
        
        // Update active button
        this.elements.dateRangeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === 'custom');
        });
        
        // Update dashboard with custom date range
        this.updateDashboard();
    }
    
    /**
     * Update the entire dashboard with new data
     */
    async updateDashboard() {
        await this.loadActivityData();
        this.updateCharts();
        this.updateCalorieSummary();
    }
    
    /**
     * Update charts with new data
     */
    updateCharts() {
        if (this.charts.activityChart) {
            this.charts.activityChart.destroy();
        }
        
        if (this.charts.stepsChart) {
            this.charts.stepsChart.destroy();
        }
        
        this.initializeCharts();
    }
    
    /**
     * Get the start date based on the current date range
     */
    getDateRangeStart() {
        const now = new Date();
        
        switch(this.currentDateRange) {
            case 'day':
                const dayStart = new Date(now);
                dayStart.setHours(0, 0, 0, 0);
                return dayStart;
                
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                return weekStart;
                
            case 'month':
                const monthStart = new Date(now);
                monthStart.setMonth(now.getMonth() - 1);
                return monthStart;
                
            case 'year':
                const yearStart = new Date(now);
                yearStart.setFullYear(now.getFullYear() - 1);
                return yearStart;
                
            case 'custom':
                return this.customStartDate || new Date(now.setDate(now.getDate() - 7));
                
            default:
                const defaultStart = new Date(now);
                defaultStart.setDate(now.getDate() - 7);
                return defaultStart;
        }
    }
    
    /**
     * Show activity detail in a modal
     */
    showActivityDetail(activity) {
        if (!this.elements.activityModal) return;
        
        const activityDate = new Date(activity.startTime);
        const modalBody = this.elements.activityModal.querySelector('.modal-body');
        const iconClass = this.getActivityIconClass(activity.type);
        
        modalBody.innerHTML = `
            <div class="activity-detail-content">
                <div class="activity-detail-header">
                    <div class="activity-detail-icon ${iconClass}">
                        <i class="${this.getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-detail-info">
                        <h3>${activity.name || this.capitalizeFirstLetter(activity.type)}</h3>
                        <div class="activity-detail-date">
                            ${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
                
                <div class="activity-detail-grid">
                    <div class="activity-detail-stat">
                        <h4>Duration</h4>
                        <div class="activity-detail-stat-value">${this.formatDuration(activity.durationMinutes)}</div>
                    </div>
                    
                    <div class="activity-detail-stat">
                        <h4>Calories</h4>
                        <div class="activity-detail-stat-value">${activity.caloriesBurned}</div>
                    </div>
                    
                    ${activity.distance ? `
                    <div class="activity-detail-stat">
                        <h4>Distance</h4>
                        <div class="activity-detail-stat-value">${activity.distance.toFixed(2)} km</div>
                    </div>
                    ` : ''}
                    
                    ${activity.steps ? `
                    <div class="activity-detail-stat">
                        <h4>Steps</h4>
                        <div class="activity-detail-stat-value">${activity.steps.toLocaleString()}</div>
                    </div>
                    ` : ''}
                    
                    ${activity.heartRate ? `
                    <div class="activity-detail-stat">
                        <h4>Avg Heart Rate</h4>
                        <div class="activity-detail-stat-value">${activity.heartRate} bpm</div>
                    </div>
                    ` : ''}
                    
                    ${activity.elevationGain ? `
                    <div class="activity-detail-stat">
                        <h4>Elevation Gain</h4>
                        <div class="activity-detail-stat-value">${activity.elevationGain} m</div>
                    </div>
                    ` : ''}
                </div>
                
                ${activity.notes ? `
                <div class="activity-detail-notes">
                    <h4>Notes</h4>
                    <p>${activity.notes}</p>
                </div>
                ` : ''}
            </div>
        `;
        
        // Update modal title
        const modalTitle = this.elements.activityModal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Activity Details';
        }
        
        // Show the modal
        this.elements.activityModal.style.display = 'block';
    }
    
    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    /**
     * Format minutes into a readable duration
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours} hr`;
        }
        
        return `${hours} hr ${remainingMinutes} min`;
    }
    
    /**
     * Get the appropriate icon class for an activity type
     */
    getActivityIconClass(type) {
        const lowerType = type.toLowerCase();
        
        if (['run', 'running', 'jog', 'jogging'].includes(lowerType)) {
            return 'run';
        } else if (['walk', 'walking', 'hike', 'hiking'].includes(lowerType)) {
            return 'walk';
        } else if (['cycle', 'cycling', 'bike', 'biking', 'ride'].includes(lowerType)) {
            return 'cycle';
        } else if (['swim', 'swimming'].includes(lowerType)) {
            return 'swim';
        } else if (['weight', 'weights', 'weight_lifting', 'weightlifting', 'strength'].includes(lowerType)) {
            return 'weights';
        }
        
        return '';
    }
    
    /**
     * Get the appropriate icon for an activity type
     */
    getActivityIcon(type) {
        const lowerType = type.toLowerCase();
        
        if (['run', 'running', 'jog', 'jogging'].includes(lowerType)) {
            return 'fas fa-running';
        } else if (['walk', 'walking', 'hike', 'hiking'].includes(lowerType)) {
            return 'fas fa-walking';
        } else if (['cycle', 'cycling', 'bike', 'biking', 'ride'].includes(lowerType)) {
            return 'fas fa-bicycle';
        } else if (['swim', 'swimming'].includes(lowerType)) {
            return 'fas fa-swimmer';
        } else if (['weight', 'weights', 'weight_lifting', 'weightlifting', 'strength'].includes(lowerType)) {
            return 'fas fa-dumbbell';
        }
        
        return 'fas fa-heartbeat';
    }
    
    /**
     * Get the appropriate color for an activity type
     */
    getActivityColor(type) {
        const lowerType = type.toLowerCase();
        
        if (['run', 'running', 'jog', 'jogging'].includes(lowerType)) {
            return 'var(--activity-run-color)';
        } else if (['walk', 'walking', 'hike', 'hiking'].includes(lowerType)) {
            return 'var(--activity-walk-color)';
        } else if (['cycle', 'cycling', 'bike', 'biking', 'ride'].includes(lowerType)) {
            return 'var(--activity-cycle-color)';
        } else if (['swim', 'swimming'].includes(lowerType)) {
            return 'var(--activity-swim-color)';
        } else if (['weight', 'weights', 'weight_lifting', 'weightlifting', 'strength'].includes(lowerType)) {
            return 'var(--activity-weights-color)';
        }
        
        return 'var(--activity-other-color)';
    }
    
    /**
     * Capitalize the first letter of a string
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new ActivityDashboard();
}); 