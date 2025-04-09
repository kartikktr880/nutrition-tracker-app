/**
 * Activity Log - Manages the activity log interface and data
 */
class ActivityLog {
    constructor() {
        this.fitnessIntegration = new FitnessIntegration();
        this.activities = [];
        this.filteredActivities = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentActivity = null;
        this.selectedActivityId = null;
        
        // Initialize filters
        this.filters = {
            dateRange: 'week',
            activityType: 'all',
            searchQuery: '',
            sortBy: 'date-desc',
            customStartDate: null,
            customEndDate: null
        };
        
        // DOM elements
        this.elements = {
            addActivityBtn: document.getElementById('add-activity-btn'),
            addFirstActivityBtn: document.getElementById('add-first-activity-btn'),
            
            // Filters
            dateFilter: document.getElementById('date-filter'),
            typeFilter: document.getElementById('type-filter'),
            searchInput: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-btn'),
            sortFilter: document.getElementById('sort-filter'),
            customDateRange: document.querySelector('.custom-date-range'),
            dateStart: document.getElementById('date-start'),
            dateEnd: document.getElementById('date-end'),
            applyDateRangeBtn: document.getElementById('apply-date-range'),
            
            // Activity list
            activityTableBody: document.getElementById('activity-table-body'),
            emptyState: document.querySelector('.activity-log-empty'),
            activityTable: document.querySelector('.activity-table'),
            
            // Pagination
            currentPageEl: document.getElementById('current-page'),
            totalPagesEl: document.getElementById('total-pages'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            
            // Add/Edit modal
            activityModal: document.getElementById('activity-modal'),
            modalTitle: document.getElementById('modal-title'),
            activityForm: document.getElementById('activity-form'),
            activityId: document.getElementById('activity-id'),
            activityName: document.getElementById('activity-name'),
            activityType: document.getElementById('activity-type'),
            activityDate: document.getElementById('activity-date'),
            activityTime: document.getElementById('activity-time'),
            activityDurationHours: document.getElementById('activity-duration-hours'),
            activityDurationMinutes: document.getElementById('activity-duration-minutes'),
            activityCalories: document.getElementById('activity-calories'),
            activityDistance: document.getElementById('activity-distance'),
            activitySteps: document.getElementById('activity-steps'),
            activityHeartRate: document.getElementById('activity-heart-rate'),
            activityElevation: document.getElementById('activity-elevation'),
            activityNotes: document.getElementById('activity-notes'),
            saveActivityBtn: document.getElementById('save-activity-btn'),
            cancelActivityBtn: document.getElementById('cancel-activity-btn'),
            
            // Detail modal
            activityDetailModal: document.getElementById('activity-detail-modal'),
            activityDetailContent: document.getElementById('activity-detail-content'),
            editActivityBtn: document.getElementById('edit-activity-btn'),
            deleteActivityBtn: document.getElementById('delete-activity-btn'),
            closeDetailBtn: document.getElementById('close-detail-btn'),
            
            // Confirm delete modal
            confirmModal: document.getElementById('confirm-modal'),
            confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
            cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
            
            // Modal close buttons
            closeModalBtns: document.querySelectorAll('.close-modal')
        };
        
        this.init();
    }
    
    /**
     * Initialize the activity log
     */
    async init() {
        this.setupEventListeners();
        await this.loadActivities();
        this.updateActivityList();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add activity buttons
        this.elements.addActivityBtn.addEventListener('click', () => this.openAddActivityModal());
        if (this.elements.addFirstActivityBtn) {
            this.elements.addFirstActivityBtn.addEventListener('click', () => this.openAddActivityModal());
        }
        
        // Filter events
        this.elements.dateFilter.addEventListener('change', () => {
            this.filters.dateRange = this.elements.dateFilter.value;
            
            // Show/hide custom date range inputs
            if (this.filters.dateRange === 'custom') {
                this.elements.customDateRange.style.display = 'flex';
            } else {
                this.elements.customDateRange.style.display = 'none';
                this.updateActivityList();
            }
        });
        
        this.elements.typeFilter.addEventListener('change', () => {
            this.filters.activityType = this.elements.typeFilter.value;
            this.updateActivityList();
        });
        
        this.elements.searchBtn.addEventListener('click', () => {
            this.filters.searchQuery = this.elements.searchInput.value.trim().toLowerCase();
            this.updateActivityList();
        });
        
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.filters.searchQuery = this.elements.searchInput.value.trim().toLowerCase();
                this.updateActivityList();
            }
        });
        
        this.elements.sortFilter.addEventListener('change', () => {
            this.filters.sortBy = this.elements.sortFilter.value;
            this.updateActivityList();
        });
        
        // Custom date range
        this.elements.applyDateRangeBtn.addEventListener('click', () => {
            const startDate = this.elements.dateStart.value;
            const endDate = this.elements.dateEnd.value;
            
            if (!startDate || !endDate) {
                this.showToast('Please select both start and end dates.', 'error');
                return;
            }
            
            this.filters.customStartDate = new Date(startDate);
            this.filters.customEndDate = new Date(endDate);
            this.filters.customEndDate.setHours(23, 59, 59, 999); // End of day
            
            if (this.filters.customStartDate > this.filters.customEndDate) {
                this.showToast('Start date must be before end date.', 'error');
                return;
            }
            
            this.updateActivityList();
        });
        
        // Pagination
        this.elements.prevPageBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderActivities();
                this.updatePagination();
            }
        });
        
        this.elements.nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredActivities.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderActivities();
                this.updatePagination();
            }
        });
        
        // Activity form modal
        this.elements.saveActivityBtn.addEventListener('click', () => this.saveActivity());
        this.elements.cancelActivityBtn.addEventListener('click', () => this.closeActivityModal());
        
        // Activity detail modal
        this.elements.editActivityBtn.addEventListener('click', () => {
            this.closeDetailModal();
            this.openEditActivityModal(this.selectedActivityId);
        });
        
        this.elements.deleteActivityBtn.addEventListener('click', () => {
            this.openConfirmModal();
        });
        
        this.elements.closeDetailBtn.addEventListener('click', () => {
            this.closeDetailModal();
        });
        
        // Confirm delete modal
        this.elements.confirmDeleteBtn.addEventListener('click', () => {
            this.deleteActivity(this.selectedActivityId);
            this.closeConfirmModal();
        });
        
        this.elements.cancelDeleteBtn.addEventListener('click', () => {
            this.closeConfirmModal();
        });
        
        // Close buttons for all modals
        this.elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }
    
    /**
     * Load activities from all sources
     */
    async loadActivities() {
        try {
            // Load activities from fitness integrations
            const data = await this.fitnessIntegration.getActivityData(
                new Date(0), // From beginning of time
                new Date()   // To now
            );
            
            // Load activities from local storage
            const manualActivities = this.getManualActivities();
            
            // Combine all activities
            this.activities = [
                ...data.activities,
                ...manualActivities
            ];
            
            console.log(`Loaded ${this.activities.length} activities`);
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showToast('Failed to load activities.', 'error');
            this.activities = [];
        }
    }
    
    /**
     * Get manually added activities from local storage
     */
    getManualActivities() {
        const stored = localStorage.getItem('manualActivities');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing manual activities:', e);
                return [];
            }
        }
        return [];
    }
    
    /**
     * Save manually added activities to local storage
     */
    saveManualActivities(activities) {
        localStorage.setItem('manualActivities', JSON.stringify(activities));
    }
    
    /**
     * Update the activity list based on filters
     */
    updateActivityList() {
        this.currentPage = 1;
        this.applyFilters();
        this.renderActivities();
        this.updatePagination();
    }
    
    /**
     * Apply filters to the activities
     */
    applyFilters() {
        // Start with all activities
        let filtered = [...this.activities];
        
        // Filter by date range
        const now = new Date();
        let startDate;
        
        switch (this.filters.dateRange) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                filtered = filtered.filter(activity => {
                    const activityDate = new Date(activity.startTime);
                    return activityDate >= startDate && activityDate <= now;
                });
                break;
                
            case 'yesterday':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(now);
                endDate.setDate(now.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                filtered = filtered.filter(activity => {
                    const activityDate = new Date(activity.startTime);
                    return activityDate >= startDate && activityDate <= endDate;
                });
                break;
                
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                filtered = filtered.filter(activity => {
                    const activityDate = new Date(activity.startTime);
                    return activityDate >= startDate && activityDate <= now;
                });
                break;
                
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                filtered = filtered.filter(activity => {
                    const activityDate = new Date(activity.startTime);
                    return activityDate >= startDate && activityDate <= now;
                });
                break;
                
            case 'custom':
                if (this.filters.customStartDate && this.filters.customEndDate) {
                    filtered = filtered.filter(activity => {
                        const activityDate = new Date(activity.startTime);
                        return activityDate >= this.filters.customStartDate && 
                               activityDate <= this.filters.customEndDate;
                    });
                }
                break;
                
            // 'all' case: no date filtering
        }
        
        // Filter by activity type
        if (this.filters.activityType !== 'all') {
            filtered = filtered.filter(activity => 
                activity.type === this.filters.activityType
            );
        }
        
        // Filter by search query
        if (this.filters.searchQuery) {
            filtered = filtered.filter(activity => {
                const name = activity.name ? activity.name.toLowerCase() : '';
                const type = activity.type ? activity.type.toLowerCase() : '';
                const notes = activity.notes ? activity.notes.toLowerCase() : '';
                
                return name.includes(this.filters.searchQuery) || 
                       type.includes(this.filters.searchQuery) ||
                       notes.includes(this.filters.searchQuery);
            });
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.filters.sortBy) {
                case 'date-asc':
                    return new Date(a.startTime) - new Date(b.startTime);
                    
                case 'date-desc':
                    return new Date(b.startTime) - new Date(a.startTime);
                    
                case 'duration-asc':
                    return a.durationMinutes - b.durationMinutes;
                    
                case 'duration-desc':
                    return b.durationMinutes - a.durationMinutes;
                    
                case 'calories-asc':
                    return a.caloriesBurned - b.caloriesBurned;
                    
                case 'calories-desc':
                    return b.caloriesBurned - a.caloriesBurned;
                    
                default:
                    return new Date(b.startTime) - new Date(a.startTime);
            }
        });
        
        this.filteredActivities = filtered;
    }
    
    /**
     * Render activities in the table
     */
    renderActivities() {
        if (!this.elements.activityTableBody) return;
        
        // Check if we have activities
        if (this.filteredActivities.length === 0) {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'block';
            }
            if (this.elements.activityTable) {
                this.elements.activityTable.style.display = 'none';
            }
            return;
        }
        
        // We have activities to show
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
        if (this.elements.activityTable) {
            this.elements.activityTable.style.display = 'table';
        }
        
        // Clear the table body
        this.elements.activityTableBody.innerHTML = '';
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredActivities.length);
        const activitiesToShow = this.filteredActivities.slice(startIndex, endIndex);
        
        // Add activities to table
        activitiesToShow.forEach(activity => {
            const row = document.createElement('tr');
            row.dataset.id = activity.id;
            
            const activityDate = new Date(activity.startTime);
            const formattedDate = activityDate.toLocaleDateString();
            const formattedTime = activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const iconClass = this.getActivityIconClass(activity.type);
            const iconElement = `<i class="${this.getActivityIcon(activity.type)}"></i>`;
            
            row.innerHTML = `
                <td>
                    <div class="activity-type">
                        <div class="activity-type-icon ${iconClass}">${iconElement}</div>
                        <div>
                            <div>${activity.name || this.capitalizeFirstLetter(activity.type)}</div>
                        </div>
                    </div>
                </td>
                <td>${formattedDate}<br>${formattedTime}</td>
                <td>${this.formatDuration(activity.durationMinutes)}</td>
                <td>${activity.caloriesBurned}</td>
                <td>${activity.distance ? activity.distance.toFixed(2) + ' km' : '-'}</td>
                <td>${activity.steps ? activity.steps.toLocaleString() : '-'}</td>
                <td>
                    <div class="activity-source">
                        ${activity.source === 'manual' 
                            ? '<i class="fas fa-user"></i> Manual' 
                            : `<i class="fas fa-sync"></i> ${activity.source}`
                        }
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${activity.source === 'manual' ? `
                        <button class="action-btn edit" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            // Add event listeners for action buttons
            const viewBtn = row.querySelector('.view');
            viewBtn.addEventListener('click', () => this.viewActivityDetail(activity.id));
            
            if (activity.source === 'manual') {
                const editBtn = row.querySelector('.edit');
                editBtn.addEventListener('click', () => this.openEditActivityModal(activity.id));
                
                const deleteBtn = row.querySelector('.delete');
                deleteBtn.addEventListener('click', () => {
                    this.selectedActivityId = activity.id;
                    this.openConfirmModal();
                });
            }
            
            // Add row click event to view details
            row.addEventListener('click', (e) => {
                // Only trigger if not clicking an action button
                if (!e.target.closest('.action-buttons')) {
                    this.viewActivityDetail(activity.id);
                }
            });
            
            this.elements.activityTableBody.appendChild(row);
        });
    }
    
    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredActivities.length / this.itemsPerPage);
        
        this.elements.currentPageEl.textContent = this.currentPage;
        this.elements.totalPagesEl.textContent = totalPages;
        
        // Enable/disable pagination buttons
        this.elements.prevPageBtn.disabled = this.currentPage === 1;
        this.elements.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }
    
    /**
     * View activity details in modal
     */
    viewActivityDetail(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) return;
        
        this.selectedActivityId = activityId;
        
        // Create content for detail modal
        const activityDate = new Date(activity.startTime);
        const formattedDate = activityDate.toLocaleDateString();
        const formattedTime = activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const iconClass = this.getActivityIconClass(activity.type);
        const iconElement = `<i class="${this.getActivityIcon(activity.type)}"></i>`;
        
        this.elements.activityDetailContent.innerHTML = `
            <div class="activity-header">
                <div class="activity-icon ${iconClass}">${iconElement}</div>
                <div class="activity-info">
                    <h3>${activity.name || this.capitalizeFirstLetter(activity.type)}</h3>
                    <div class="activity-date">
                        ${formattedDate} at ${formattedTime}
                    </div>
                </div>
            </div>
            
            <div class="activity-stats">
                <div class="stat-card">
                    <h4>Duration</h4>
                    <div class="stat-value">${this.formatDuration(activity.durationMinutes)}</div>
                </div>
                
                <div class="stat-card">
                    <h4>Calories Burned</h4>
                    <div class="stat-value">${activity.caloriesBurned}</div>
                </div>
                
                ${activity.distance ? `
                <div class="stat-card">
                    <h4>Distance</h4>
                    <div class="stat-value">${activity.distance.toFixed(2)} km</div>
                </div>
                ` : ''}
                
                ${activity.steps ? `
                <div class="stat-card">
                    <h4>Steps</h4>
                    <div class="stat-value">${activity.steps.toLocaleString()}</div>
                </div>
                ` : ''}
                
                ${activity.heartRate ? `
                <div class="stat-card">
                    <h4>Avg Heart Rate</h4>
                    <div class="stat-value">${activity.heartRate} bpm</div>
                </div>
                ` : ''}
                
                ${activity.elevationGain ? `
                <div class="stat-card">
                    <h4>Elevation Gain</h4>
                    <div class="stat-value">${activity.elevationGain} m</div>
                </div>
                ` : ''}
            </div>
            
            ${activity.notes ? `
            <div class="activity-notes">
                <h4>Notes</h4>
                <p>${activity.notes}</p>
            </div>
            ` : ''}
            
            <div class="activity-source-detail">
                <h4>Source</h4>
                <p>${activity.source === 'manual' 
                    ? '<i class="fas fa-user"></i> Manually entered' 
                    : `<i class="fas fa-sync"></i> Imported from ${activity.source}`
                }</p>
            </div>
        `;
        
        // Toggle edit/delete buttons based on source
        this.elements.editActivityBtn.style.display = activity.source === 'manual' ? 'block' : 'none';
        this.elements.deleteActivityBtn.style.display = activity.source === 'manual' ? 'block' : 'none';
        
        // Open modal
        this.elements.activityDetailModal.style.display = 'block';
    }
    
    /**
     * Open modal to add a new activity
     */
    openAddActivityModal() {
        this.elements.modalTitle.textContent = 'Add Activity';
        this.elements.activityId.value = '';
        this.elements.activityForm.reset();
        
        // Set default values
        const now = new Date();
        this.elements.activityDate.value = now.toISOString().split('T')[0];
        this.elements.activityTime.value = now.toTimeString().substring(0, 5);
        this.elements.activityDurationHours.value = '0';
        this.elements.activityDurationMinutes.value = '30';
        
        this.elements.activityModal.style.display = 'block';
    }
    
    /**
     * Open modal to edit an existing activity
     */
    openEditActivityModal(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity || activity.source !== 'manual') return;
        
        this.elements.modalTitle.textContent = 'Edit Activity';
        this.elements.activityId.value = activity.id;
        
        // Fill form with activity data
        this.elements.activityName.value = activity.name || '';
        this.elements.activityType.value = activity.type || '';
        
        const activityDate = new Date(activity.startTime);
        this.elements.activityDate.value = activityDate.toISOString().split('T')[0];
        this.elements.activityTime.value = activityDate.toTimeString().substring(0, 5);
        
        const hours = Math.floor(activity.durationMinutes / 60);
        const minutes = activity.durationMinutes % 60;
        this.elements.activityDurationHours.value = hours;
        this.elements.activityDurationMinutes.value = minutes;
        
        this.elements.activityCalories.value = activity.caloriesBurned || '';
        this.elements.activityDistance.value = activity.distance || '';
        this.elements.activitySteps.value = activity.steps || '';
        this.elements.activityHeartRate.value = activity.heartRate || '';
        this.elements.activityElevation.value = activity.elevationGain || '';
        this.elements.activityNotes.value = activity.notes || '';
        
        this.elements.activityModal.style.display = 'block';
    }
    
    /**
     * Save a new or edited activity
     */
    saveActivity() {
        // Validate form
        if (!this.elements.activityForm.checkValidity()) {
            this.elements.activityForm.reportValidity();
            return;
        }
        
        // Get form values
        const activityId = this.elements.activityId.value || `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const name = this.elements.activityName.value;
        const type = this.elements.activityType.value;
        const date = this.elements.activityDate.value;
        const time = this.elements.activityTime.value;
        const durationHours = parseInt(this.elements.activityDurationHours.value) || 0;
        const durationMinutes = parseInt(this.elements.activityDurationMinutes.value) || 0;
        const calories = parseInt(this.elements.activityCalories.value) || 0;
        const distance = parseFloat(this.elements.activityDistance.value) || null;
        const steps = parseInt(this.elements.activitySteps.value) || null;
        const heartRate = parseInt(this.elements.activityHeartRate.value) || null;
        const elevationGain = parseInt(this.elements.activityElevation.value) || null;
        const notes = this.elements.activityNotes.value;
        
        // Calculate total duration in minutes
        const totalDurationMinutes = (durationHours * 60) + durationMinutes;
        
        // Create start time
        const startTime = new Date(`${date}T${time}`);
        
        // Create activity object
        const activity = {
            id: activityId,
            name,
            type,
            startTime: startTime.toISOString(),
            durationMinutes: totalDurationMinutes,
            caloriesBurned: calories,
            distance,
            steps,
            heartRate,
            elevationGain,
            notes,
            source: 'manual'
        };
        
        // Get manual activities
        const manualActivities = this.getManualActivities();
        
        // Check if this is an edit or a new activity
        const existingIndex = manualActivities.findIndex(a => a.id === activityId);
        
        if (existingIndex !== -1) {
            // Update existing activity
            manualActivities[existingIndex] = activity;
        } else {
            // Add new activity
            manualActivities.push(activity);
        }
        
        // Save to local storage
        this.saveManualActivities(manualActivities);
        
        // Reload activities and update the list
        this.loadActivities().then(() => {
            this.updateActivityList();
            this.closeActivityModal();
            this.showToast('Activity saved successfully!', 'success');
        });
    }
    
    /**
     * Delete an activity
     */
    deleteActivity(activityId) {
        // Get manual activities
        const manualActivities = this.getManualActivities();
        
        // Find and remove the activity
        const activityIndex = manualActivities.findIndex(a => a.id === activityId);
        
        if (activityIndex !== -1) {
            manualActivities.splice(activityIndex, 1);
            
            // Save to local storage
            this.saveManualActivities(manualActivities);
            
            // Reload activities and update the list
            this.loadActivities().then(() => {
                this.updateActivityList();
                this.closeDetailModal();
                this.showToast('Activity deleted successfully!', 'success');
            });
        }
    }
    
    /**
     * Open confirm delete modal
     */
    openConfirmModal() {
        this.elements.confirmModal.style.display = 'block';
    }
    
    /**
     * Close confirm delete modal
     */
    closeConfirmModal() {
        this.elements.confirmModal.style.display = 'none';
    }
    
    /**
     * Close activity form modal
     */
    closeActivityModal() {
        this.elements.activityModal.style.display = 'none';
    }
    
    /**
     * Close activity detail modal
     */
    closeDetailModal() {
        this.elements.activityDetailModal.style.display = 'none';
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
            return 'running';
        } else if (['walk', 'walking', 'hike', 'hiking'].includes(lowerType)) {
            return 'walking';
        } else if (['cycle', 'cycling', 'bike', 'biking', 'ride'].includes(lowerType)) {
            return 'cycling';
        } else if (['swim', 'swimming'].includes(lowerType)) {
            return 'swimming';
        } else if (['weight', 'weights', 'weight_lifting', 'weightlifting', 'strength'].includes(lowerType)) {
            return 'weight_lifting';
        }
        
        return 'other';
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
     * Capitalize the first letter of a string
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize the activity log when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const activityLog = new ActivityLog();
}); 