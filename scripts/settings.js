import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Settings Page JavaScript
 */
import fitnessIntegration from './fitness-integration.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const settingsNavItems = document.querySelectorAll('.settings-navigation li');
    const settingsSections = document.querySelectorAll('.settings-section');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importModal = document.getElementById('import-modal');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmTextInput = document.getElementById('confirm-text');
    const importDoneBtn = document.getElementById('import-done-btn');
    const clearNutritionBtn = document.getElementById('clear-nutrition-data-btn');
    const clearActivityBtn = document.getElementById('clear-activity-data-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    
    // Connect fitness tracker buttons
    const connectBtns = document.querySelectorAll('.connect-btn');
    
    // Import activity data elements
    const importProviderSelect = document.getElementById('import-provider');
    const importStartDate = document.getElementById('import-start-date');
    const importEndDate = document.getElementById('import-end-date');
    const importActivityBtn = document.getElementById('import-activity-btn');
    const importProgressBar = document.getElementById('import-progress-bar');
    const importStatus = document.getElementById('import-status');
    const importResults = document.getElementById('import-results');

    // Color scheme options
    const colorOptions = document.querySelectorAll('.color-option');

    // Original settings (for cancel functionality)
    let originalSettings = {};
    
    // Current settings
    let currentSettings = {};

    // Initialize the page
    init();

    /**
     * Initialize the settings page
     */
    function init() {
        // Load saved settings
        loadSettings();
        
        // Store original settings for cancel functionality
        originalSettings = JSON.parse(JSON.stringify(currentSettings));
        
        // Apply current settings to the form
        applySettingsToForm();
        
        // Initialize fitness integrations
        initFitnessIntegrations();
        
        // Set up event listeners
        setupEventListeners();
        
        // Check for URL parameters (e.g., after OAuth callback)
        checkUrlParams();

        initThemeSettings();
        initColorSettings();
    }

    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        // Default settings
        const defaultSettings = {
            units: {
                weight: 'kg',
                volume: 'ml',
                energy: 'kcal'
            },
            display: {
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h'
            },
            mealTimes: {
                breakfast: '07:30',
                lunch: '12:30',
                dinner: '18:30'
            },
            appearance: {
                theme: 'light',
                colorScheme: 'green',
                dashboardLayout: 'grid',
                fontSize: 'medium'
            },
            notifications: {
                mealReminders: true,
                waterReminders: true,
                waterReminderInterval: 60,
                goalNotifications: true,
                weeklySummary: true
            },
            privacy: {
                shareNutritionData: false,
                shareActivityData: false,
                shareAchievements: true,
                usageAnalytics: true,
                personalizedRecommendations: true
            }
        };
        
        // Try to load settings from localStorage
        try {
            const savedSettings = localStorage.getItem('settings');
            currentSettings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        } catch (error) {
            logError('Error loading settings:', error);
            currentSettings = defaultSettings;
        }
    }

    /**
     * Apply current settings to the form elements
     */
    function applySettingsToForm() {
        // Units
        document.getElementById('weight-unit').value = currentSettings.units.weight;
        document.getElementById('volume-unit').value = currentSettings.units.volume;
        document.getElementById('energy-unit').value = currentSettings.units.energy;
        
        // Display settings
        document.getElementById('date-format').value = currentSettings.display.dateFormat;
        document.getElementById('time-format').value = currentSettings.display.timeFormat;
        
        // Meal times
        document.getElementById('breakfast-time').value = currentSettings.mealTimes.breakfast;
        document.getElementById('lunch-time').value = currentSettings.mealTimes.lunch;
        document.getElementById('dinner-time').value = currentSettings.mealTimes.dinner;
        
        // Appearance
        document.getElementById('theme-select').value = currentSettings.appearance.theme;
        document.getElementById('dashboard-layout').value = currentSettings.appearance.dashboardLayout;
        document.getElementById('font-size').value = currentSettings.appearance.fontSize;
        
        // Select the correct color option
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === currentSettings.appearance.colorScheme) {
                option.classList.add('selected');
            }
        });
        
        // Notifications
        document.getElementById('breakfast-reminder').checked = currentSettings.notifications.mealReminders;
        document.getElementById('lunch-reminder').checked = currentSettings.notifications.mealReminders;
        document.getElementById('dinner-reminder').checked = currentSettings.notifications.mealReminders;
        document.getElementById('water-reminders').checked = currentSettings.notifications.waterReminders;
        document.getElementById('water-reminder-interval').value = currentSettings.notifications.waterReminderInterval;
        document.getElementById('goal-notifications').checked = currentSettings.notifications.goalNotifications;
        document.getElementById('weekly-summary').checked = currentSettings.notifications.weeklySummary;
        
        // Privacy
        document.getElementById('share-nutrition-data').checked = currentSettings.privacy.shareNutritionData;
        document.getElementById('share-activity-data').checked = currentSettings.privacy.shareActivityData;
        document.getElementById('share-achievements').checked = currentSettings.privacy.shareAchievements;
        document.getElementById('usage-analytics').checked = currentSettings.privacy.usageAnalytics;
        document.getElementById('personalized-recommendations').checked = currentSettings.privacy.personalizedRecommendations;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Settings navigation
        settingsNavItems.forEach(item => {
            item.addEventListener('click', function() {
                const section = this.dataset.section;
                switchSettingsSection(section);
            });
        });
        
        // Save settings button
        saveSettingsBtn.addEventListener('click', saveSettings);
        
        // Cancel settings button
        cancelSettingsBtn.addEventListener('click', cancelSettings);
        
        // Import data button
        importDataBtn.addEventListener('click', function() {
            // In a real app, this would open a file picker and process the file
            showImportModal('Importing data...', 0);
            simulateImport();
        });
        
        // Export data button
        exportDataBtn.addEventListener('click', exportData);
        
        // Close modal buttons
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                closeAllModals();
            });
        });
        
        // Import done button
        importDoneBtn.addEventListener('click', function() {
            closeAllModals();
        });
        
        // Color options
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        // Delete confirmation text input
        confirmTextInput.addEventListener('input', function() {
            confirmDeleteBtn.disabled = this.value !== 'DELETE';
        });
        
        // Cancel delete button
        cancelDeleteBtn.addEventListener('click', function() {
            closeAllModals();
        });
        
        // Danger zone buttons
        clearNutritionBtn.addEventListener('click', function() {
            showDeleteConfirmModal('Are you sure you want to clear all nutrition data? This action cannot be undone.', 'clearNutrition');
        });
        
        clearActivityBtn.addEventListener('click', function() {
            showDeleteConfirmModal('Are you sure you want to clear all activity data? This action cannot be undone.', 'clearActivity');
        });
        
        deleteAccountBtn.addEventListener('click', function() {
            showDeleteConfirmModal('Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.', 'deleteAccount');
        });
        
        // Confirm delete button
        confirmDeleteBtn.addEventListener('click', function() {
            const action = deleteConfirmModal.dataset.action;
            handleDeleteAction(action);
            closeAllModals();
        });
        
        // Import activity data button
        importActivityBtn.addEventListener('click', importActivityData);
    }

    /**
     * Initialize fitness integrations
     */
    function initFitnessIntegrations() {
        // Update UI for connected providers
        updateConnectedProvidersUI();
        
        // Set up connect buttons
        connectBtns.forEach(btn => {
            const providerId = btn.dataset.provider;
            
            btn.addEventListener('click', function() {
                if (fitnessIntegration.isConnected(providerId)) {
                    disconnectProvider(providerId);
                } else {
                    connectProvider(providerId);
                }
            });
        });
        
        // Populate the import provider dropdown
        updateImportProviderOptions();
        
        // Set default dates for import
        const today = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        
        importStartDate.valueAsDate = oneWeekAgo;
        importEndDate.valueAsDate = today;
    }

    /**
     * Update the UI for connected providers
     */
    function updateConnectedProvidersUI() {
        const connectedProviders = fitnessIntegration.getConnectedProviders();
        
        // Update each provider UI
        Object.values(fitnessIntegration.PROVIDERS).forEach(providerId => {
            const isConnected = fitnessIntegration.isConnected(providerId);
            const integrationItem = document.getElementById(`${providerId}-integration`);
            
            if (integrationItem) {
                const statusEl = integrationItem.querySelector('.integration-status');
                const connectBtn = integrationItem.querySelector('.connect-btn');
                
                if (isConnected) {
                    statusEl.textContent = 'Connected';
                    statusEl.style.color = 'var(--success-color)';
                    connectBtn.textContent = 'Disconnect';
                } else {
                    statusEl.textContent = 'Not connected';
                    statusEl.style.color = '';
                    connectBtn.textContent = 'Connect';
                }
            }
        });
    }

    /**
     * Update import provider options
     */
    function updateImportProviderOptions() {
        const connectedProviders = fitnessIntegration.getConnectedProviders();
        importProviderSelect.innerHTML = '<option value="">Select a connected provider</option>';
        
        connectedProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            importProviderSelect.appendChild(option);
        });
        
        // Disable the import button if no providers are connected
        importActivityBtn.disabled = connectedProviders.length === 0;
    }

    /**
     * Connect to a provider
     * @param {string} providerId - The ID of the provider to connect to
     */
    function connectProvider(providerId) {
        fitnessIntegration.connect(providerId);
    }

    /**
     * Disconnect from a provider
     * @param {string} providerId - The ID of the provider to disconnect from
     */
    function disconnectProvider(providerId) {
        fitnessIntegration.disconnect(providerId);
        updateConnectedProvidersUI();
        updateImportProviderOptions();
    }

    /**
     * Import activity data from the selected provider
     */
    function importActivityData() {
        const providerId = importProviderSelect.value;
        const startDate = new Date(importStartDate.value);
        const endDate = new Date(importEndDate.value);
        
        if (!providerId) {
            alert('Please select a provider');
            return;
        }
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert('Please select valid dates');
            return;
        }
        
        if (startDate > endDate) {
            alert('Start date must be before end date');
            return;
        }
        
        // Show the import modal
        showImportModal('Connecting to provider...', 0);
        
        // Start the import process
        fitnessIntegration.importActivityData(providerId, startDate, endDate, updateImportProgress)
            .then(data => {
                // Process the imported data
                processImportedActivityData(data);
            })
            .catch(error => {
                logError('Import error:', error);
                importStatus.textContent = `Error: ${error.message}`;
                importProgressBar.style.width = '0%';
                importDoneBtn.disabled = false;
            });
    }

    /**
     * Update the import progress UI
     * @param {Object} progress - Progress information
     */
    function updateImportProgress(progress) {
        switch (progress.status) {
            case 'started':
                importStatus.textContent = 'Starting import...';
                importProgressBar.style.width = '0%';
                break;
            case 'in_progress':
                importStatus.textContent = `Importing data for ${progress.currentDate} (${progress.processedDays}/${progress.totalDays})`;
                importProgressBar.style.width = `${progress.progress}%`;
                break;
            case 'completed':
                importStatus.textContent = 'Import completed successfully!';
                importProgressBar.style.width = '100%';
                importDoneBtn.disabled = false;
                break;
            case 'error':
                importStatus.textContent = `Error: ${progress.error}`;
                importProgressBar.style.width = '0%';
                importDoneBtn.disabled = false;
                break;
        }
    }

    /**
     * Process imported activity data
     * @param {Array} data - The imported activity data
     */
    function processImportedActivityData(data) {
        // In a real app, this would save the data to the database or localStorage
        
        // Display a summary of the imported data
        let summary = '';
        
        if (data.length > 0) {
            const totalSteps = data.reduce((sum, day) => {
                return sum + (day.summary?.steps || 0);
            }, 0);
            
            const totalCalories = data.reduce((sum, day) => {
                return sum + (day.summary?.caloriesBurned || 0);
            }, 0);
            
            const workouts = data.reduce((sum, day) => {
                if (day.exercises) {
                    return sum + day.exercises.length;
                } else if (day.workouts) {
                    return sum + day.workouts.length;
                } else if (day.activities) {
                    return sum + day.activities.length;
                }
                return sum;
            }, 0);
            
            summary = `
                <div class="import-summary">
                    <h3>Import Summary</h3>
                    <p><strong>Total Days:</strong> ${data.length}</p>
                    <p><strong>Total Steps:</strong> ${totalSteps.toLocaleString()}</p>
                    <p><strong>Total Calories Burned:</strong> ${totalCalories.toLocaleString()}</p>
                    <p><strong>Workouts/Activities:</strong> ${workouts}</p>
                </div>
            `;
        } else {
            summary = '<p>No data was imported.</p>';
        }
        
        importResults.innerHTML = summary;
        importDoneBtn.disabled = false;
    }

    /**
     * Switch to a different settings section
     * @param {string} section - The section ID to switch to
     */
    function switchSettingsSection(section) {
        // Update navigation
        settingsNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Show the selected section
        settingsSections.forEach(el => {
            const isActive = el.id === `${section}-settings`;
            el.classList.toggle('active', isActive);
        });
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings() {
        // Units
        currentSettings.units.weight = document.getElementById('weight-unit').value;
        currentSettings.units.volume = document.getElementById('volume-unit').value;
        currentSettings.units.energy = document.getElementById('energy-unit').value;
        
        // Display settings
        currentSettings.display.dateFormat = document.getElementById('date-format').value;
        currentSettings.display.timeFormat = document.getElementById('time-format').value;
        
        // Meal times
        currentSettings.mealTimes.breakfast = document.getElementById('breakfast-time').value;
        currentSettings.mealTimes.lunch = document.getElementById('lunch-time').value;
        currentSettings.mealTimes.dinner = document.getElementById('dinner-time').value;
        
        // Appearance
        currentSettings.appearance.theme = document.getElementById('theme-select').value;
        currentSettings.appearance.dashboardLayout = document.getElementById('dashboard-layout').value;
        currentSettings.appearance.fontSize = document.getElementById('font-size').value;
        
        // Get the selected color scheme
        const selectedColorOption = document.querySelector('.color-option.selected');
        if (selectedColorOption) {
            currentSettings.appearance.colorScheme = selectedColorOption.dataset.color;
        }
        
        // Notifications
        currentSettings.notifications.mealReminders = document.getElementById('breakfast-reminder').checked;
        currentSettings.notifications.waterReminders = document.getElementById('water-reminders').checked;
        currentSettings.notifications.waterReminderInterval = document.getElementById('water-reminder-interval').value;
        currentSettings.notifications.goalNotifications = document.getElementById('goal-notifications').checked;
        currentSettings.notifications.weeklySummary = document.getElementById('weekly-summary').checked;
        
        // Privacy
        currentSettings.privacy.shareNutritionData = document.getElementById('share-nutrition-data').checked;
        currentSettings.privacy.shareActivityData = document.getElementById('share-activity-data').checked;
        currentSettings.privacy.shareAchievements = document.getElementById('share-achievements').checked;
        currentSettings.privacy.usageAnalytics = document.getElementById('usage-analytics').checked;
        currentSettings.privacy.personalizedRecommendations = document.getElementById('personalized-recommendations').checked;
        
        // Save to localStorage
        try {
            localStorage.setItem('settings', JSON.stringify(currentSettings));
            showToast('Settings saved successfully!');
            
            // Update original settings
            originalSettings = JSON.parse(JSON.stringify(currentSettings));
            
            // Apply settings (e.g., theme changes)
            applyAppearanceSettings();
        } catch (error) {
            logError('Error saving settings:', error);
            showToast('Error saving settings', 'error');
        }
    }

    /**
     * Cancel settings changes
     */
    function cancelSettings() {
        // Restore original settings
        currentSettings = JSON.parse(JSON.stringify(originalSettings));
        
        // Apply to form
        applySettingsToForm();
        
        showToast('Changes discarded');
    }

    /**
     * Apply appearance settings to the app
     */
    function applyAppearanceSettings() {
        // This would apply theme changes to the entire app
        document.documentElement.dataset.theme = currentSettings.appearance.theme;
        
        // This would apply the color scheme
        document.documentElement.dataset.colorScheme = currentSettings.appearance.colorScheme;
        
        // This would apply the font size
        document.documentElement.dataset.fontSize = currentSettings.appearance.fontSize;
    }

    /**
     * Export user data
     */
    function exportData() {
        // In a real app, this would gather user data and export it
        const format = document.getElementById('export-format').value;
        const includeNutrition = document.getElementById('export-nutrition').checked;
        const includeActivity = document.getElementById('export-activity').checked;
        const includeGoals = document.getElementById('export-goals').checked;
        
        // For this demo, we'll create a dummy export object
        const exportData = {
            exportDate: new Date().toISOString(),
            userData: {
                settings: currentSettings
            }
        };
        
        if (includeNutrition) {
            exportData.nutritionData = {
                meals: [], // Would be loaded from data store
                waterIntake: [] // Would be loaded from data store
            };
        }
        
        if (includeActivity) {
            exportData.activityData = {
                exercises: [], // Would be loaded from data store
                steps: [] // Would be loaded from data store
            };
        }
        
        if (includeGoals) {
            exportData.goals = {
                nutritionGoals: {}, // Would be loaded from data store
                activityGoals: {} // Would be loaded from data store
            };
        }
        
        // Convert to the requested format
        let exportContent;
        let mimeType;
        let fileExtension;
        
        if (format === 'json') {
            exportContent = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
            fileExtension = 'json';
        } else {
            // Basic CSV conversion (in real app would be more comprehensive)
            exportContent = 'Export Date,' + exportData.exportDate + '\n';
            mimeType = 'text/csv';
            fileExtension = 'csv';
        }
        
        // Create a download link
        const blob = new Blob([exportContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nutrition-tracker-export.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!');
    }

    /**
     * Show the import modal
     * @param {string} statusText - The status text to display
     * @param {number} progress - The initial progress percentage
     */
    function showImportModal(statusText, progress) {
        importStatus.textContent = statusText;
        importProgressBar.style.width = `${progress}%`;
        importResults.innerHTML = '';
        importDoneBtn.disabled = true;
        importModal.style.display = 'block';
    }

    /**
     * Show the delete confirmation modal
     * @param {string} message - The confirmation message
     * @param {string} action - The action to perform on confirmation
     */
    function showDeleteConfirmModal(message, action) {
        document.getElementById('delete-message').textContent = message;
        confirmTextInput.value = '';
        confirmDeleteBtn.disabled = true;
        deleteConfirmModal.dataset.action = action;
        deleteConfirmModal.style.display = 'block';
    }

    /**
     * Close all modals
     */
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * Handle delete actions
     * @param {string} action - The action to perform
     */
    function handleDeleteAction(action) {
        switch (action) {
            case 'clearNutrition':
                // In a real app, this would clear all nutrition data
                localStorage.removeItem('meals');
                localStorage.removeItem('water_intake');
                showToast('Nutrition data cleared');
                break;
                
            case 'clearActivity':
                // In a real app, this would clear all activity data
                localStorage.removeItem('exercises');
                localStorage.removeItem('steps');
                showToast('Activity data cleared');
                break;
                
            case 'deleteAccount':
                // In a real app, this would delete the user account
                localStorage.clear();
                showToast('Account deleted');
                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                break;
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, warning)
     */
    function showToast(message, type = 'success') {
        // Create a toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add to the document
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * Simulate an import process for demonstration
     */
    function simulateImport() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            importProgressBar.style.width = `${progress}%`;
            importStatus.textContent = `Importing data... ${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                importStatus.textContent = 'Import completed successfully!';
                importResults.innerHTML = `
                    <div class="import-summary">
                        <h3>Import Summary</h3>
                        <p>Successfully imported:</p>
                        <ul>
                            <li>30 days of nutrition data</li>
                            <li>90 meals</li>
                            <li>45 snacks</li>
                            <li>15 custom recipes</li>
                        </ul>
                    </div>
                `;
                importDoneBtn.disabled = false;
            }
        }, 300);
    }

    /**
     * Check URL parameters
     */
    function checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('connected');
        
        if (connected) {
            // A provider was just connected, update the UI
            updateConnectedProvidersUI();
            updateImportProviderOptions();
            
            // Show a toast
            const providerName = fitnessIntegration.providerConfig[connected]?.name || 'Provider';
            showToast(`${providerName} connected successfully!`);
            
            // Clear the URL parameter
            history.replaceState(null, '', window.location.pathname);
        }
    }

    /**
     * Initialize theme settings
     */
    function initThemeSettings() {
        const themeOptions = document.querySelectorAll('.theme-option');
        const currentTheme = document.documentElement.className;
        
        // Add system theme indicator
        const systemThemeIndicator = document.createElement('div');
        systemThemeIndicator.className = 'system-theme-indicator';
        systemThemeIndicator.innerHTML = `
            <i class="fas fa-desktop"></i>
            <span>System theme: ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}</span>
        `;
        document.querySelector('.theme-options').appendChild(systemThemeIndicator);
        
        // Update system theme indicator when system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            systemThemeIndicator.querySelector('span').textContent = 
                `System theme: ${e.matches ? 'Dark' : 'Light'}`;
        });
        
        // Set initial active state
        themeOptions.forEach(option => {
            if (option.dataset.theme === currentTheme) {
                option.classList.add('active');
            }
            
            // Add click handler
            option.addEventListener('click', function() {
                const theme = this.dataset.theme;
                
                // Update active state
                themeOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Apply theme
                if (window.themeManager) {
                    window.themeManager.setTheme(theme);
                }
            });
        });
        
        // Listen for theme changes
        document.addEventListener('themechange', function(e) {
            const newTheme = e.detail.theme;
            themeOptions.forEach(option => {
                if (option.dataset.theme === newTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        });
    }

    /**
     * Initialize color settings
     */
    function initColorSettings() {
        const colorOptions = document.querySelectorAll('.color-option');
        const currentColor = localStorage.getItem('nutrition_tracker_color') || 'green';
        
        // Set initial active state
        colorOptions.forEach(option => {
            if (option.dataset.color === currentColor) {
                option.classList.add('selected');
            }
            
            // Add click handler
            option.addEventListener('click', function() {
                const color = this.dataset.color;
                
                // Update active state
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                // Save preference
                localStorage.setItem('nutrition_tracker_color', color);
                
                // Apply color scheme
                applyColorScheme(color);
            });
        });
    }

    /**
     * Apply color scheme
     * @param {string} color - The color scheme to apply
     */
    function applyColorScheme(color) {
        const root = document.documentElement;
        const colors = {
            green: {
                primary: '#1A3C34',
                primaryDark: '#0F2A24',
                primaryLight: '#2A5F52'
            },
            blue: {
                primary: '#1976D2',
                primaryDark: '#1565C0',
                primaryLight: '#2196F3'
            },
            purple: {
                primary: '#7B1FA2',
                primaryDark: '#6A1B9A',
                primaryLight: '#9C27B0'
            },
            orange: {
                primary: '#F57C00',
                primaryDark: '#EF6C00',
                primaryLight: '#FF9800'
            },
            red: {
                primary: '#D32F2F',
                primaryDark: '#C62828',
                primaryLight: '#F44336'
            }
        };
        
        const scheme = colors[color] || colors.green;
        
        // Update CSS variables
        root.style.setProperty('--primary', scheme.primary);
        root.style.setProperty('--primary-dark', scheme.primaryDark);
        root.style.setProperty('--primary-light', scheme.primaryLight);
        
        // Update meta theme color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', scheme.primary);
        }
    }
}); 