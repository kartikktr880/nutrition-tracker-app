import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
/**
 * Fitness Integration Module
 * 
 * Handles integration with fitness trackers and activity data import.
 */
class FitnessIntegration {
    constructor() {
        this.initialized = false;
        this.providers = {
            FITBIT: 'Fitbit',
            GOOGLE_FIT: 'Google Fit',
            APPLE_HEALTH: 'Apple Health',
            GARMIN: 'Garmin',
            STRAVA: 'Strava'
        };
        
        this.authorizedProviders = {};
        this.init();
    }
    
    // Initialize the integration module
    init() {
        // Check if we're returning from OAuth flow
        if (this.isAuthCallback()) {
            // Handle in auth-callback.html
            return;
        }
        
        // Load authorized providers from storage
        this.loadAuthorizedProviders();
        
        this.initialized = true;
    }
    
    // Check if this is an OAuth callback
    isAuthCallback() {
        const url = new URL(window.location.href);
        return url.searchParams.has('state') && 
               (url.searchParams.has('code') || url.searchParams.has('error'));
    }
    
    // Load authorized providers from localStorage
    loadAuthorizedProviders() {
        const savedProviders = localStorage.getItem('authorizedFitnessProviders');
        if (savedProviders) {
            try {
                this.authorizedProviders = JSON.parse(savedProviders);
            } catch (e) {
                logError('Error loading authorized providers:', e);
                this.authorizedProviders = {};
            }
        }
    }
    
    // Save authorized providers to localStorage
    saveAuthorizedProviders() {
        localStorage.setItem('authorizedFitnessProviders', 
            JSON.stringify(this.authorizedProviders));
    }
    
    // Get list of supported providers
    getSupportedProviders() {
        return Object.values(this.providers);
    }
    
    // Get list of connected providers
    getConnectedProviders() {
        // Return as array of objects
        return Object.entries(this.authorizedProviders)
            .filter(([_, data]) => data.connected)
            .map(([provider, data]) => ({
                provider,
                connected: data.connected,
                lastSynced: data.lastSynced
            }));
    }
    
    // Check if a provider is connected
    isProviderConnected(provider) {
        return this.authorizedProviders[provider]?.connected === true;
    }
    
    // Connect to a provider (start OAuth flow)
    connectToProvider(provider) {
        return new Promise((resolve, reject) => {
            if (!Object.values(this.providers).includes(provider)) {
                reject(new Error(`Unsupported provider: ${provider}`));
                return;
            }
            
            // Generate a state value for OAuth security
            const state = this.generateRandomState();
            
            // Store state in sessionStorage
            sessionStorage.setItem('oauthState', state);
            sessionStorage.setItem('oauthProvider', provider);
            
            // Get authorization URL for the provider
            const authUrl = this.getAuthorizationUrl(provider, state);
            
            // Open authorization window
            window.location.href = authUrl;
            
            // This won't actually resolve here since we're redirecting
            resolve();
        });
    }
    
    // Disconnect from a provider
    disconnectProvider(provider) {
        return new Promise((resolve, reject) => {
            if (!this.isProviderConnected(provider)) {
                reject(new Error(`Provider not connected: ${provider}`));
                return;
            }
            
            // Update provider status
            if (this.authorizedProviders[provider]) {
                this.authorizedProviders[provider].connected = false;
                this.authorizedProviders[provider].token = null;
            }
            
            // Save changes
            this.saveAuthorizedProviders();
            
            resolve();
        });
    }
    
    // Handle OAuth callback
    handleAuthCallback(params) {
        return new Promise((resolve, reject) => {
            const state = params.get('state');
            const code = params.get('code');
            const error = params.get('error');
            
            // Get state and provider from sessionStorage
            const savedState = sessionStorage.getItem('oauthState');
            const provider = sessionStorage.getItem('oauthProvider');
            
            // Clear session storage
            sessionStorage.removeItem('oauthState');
            sessionStorage.removeItem('oauthProvider');
            
            // Validate state
            if (!state || state !== savedState) {
                reject(new Error('Invalid state parameter'));
                return;
            }
            
            // Check for error
            if (error) {
                reject(new Error(`Authorization error: ${error}`));
                return;
            }
            
            // Check for authorization code
            if (!code) {
                reject(new Error('No authorization code received'));
                return;
            }
            
            // For demo purposes, we'll simulate a successful token exchange
            // In a real app, we would exchange the code for tokens with the provider's API
            
            // Update provider authorization
            this.authorizedProviders[provider] = {
                connected: true,
                token: `mock_token_${Date.now()}`,
                lastSynced: null
            };
            
            // Save provider authorization
            this.saveAuthorizedProviders();
            
            resolve({ provider });
        });
    }
    
    // Import activity data from a connected provider
    importActivityData({ provider, startDate, endDate }) {
        return new Promise((resolve, reject) => {
            if (!this.isProviderConnected(provider)) {
                reject(new Error(`Provider not connected: ${provider}`));
                return;
            }
            
            logInfo(`Importing activity data from ${provider}...`);
            logInfo(`Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
            
            // Simulate API call delay
            setTimeout(() => {
                // Update last synced time
                if (this.authorizedProviders[provider]) {
                    this.authorizedProviders[provider].lastSynced = new Date().toISOString();
                    this.saveAuthorizedProviders();
                }
                
                // Generate mock activity data
                const mockData = this.generateMockActivityData(startDate, endDate, provider);
                
                // Save to localStorage (in a real app, this would be synced with your backend)
                this.saveActivityData(mockData, provider);
                
                resolve(mockData);
            }, 1500);
        });
    }
    
    // Get activity data for date range
    getActivityData(startDate, endDate) {
        return new Promise((resolve) => {
            logInfo(`Getting activity data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
            
            // Simulate API call delay
            setTimeout(() => {
                // Get data from all connected providers
                const connectedProviders = this.getConnectedProviders();
                let combinedData = {
                    summary: {
                        steps: 0,
                        caloriesBurned: 0,
                        activeMinutes: 0,
                        distance: 0
                    },
                    activities: [],
                    dailyStats: []
                };
                
                // Combine data from all providers
                connectedProviders.forEach(({ provider }) => {
                    const providerData = this.getStoredActivityData(provider);
                    if (providerData) {
                        // Filter data by date range
                        const filteredActivities = providerData.activities.filter(activity => {
                            const activityDate = new Date(activity.startTime);
                            return activityDate >= startDate && activityDate <= endDate;
                        });
                        
                        const filteredDailyStats = providerData.dailyStats.filter(stat => {
                            const statDate = new Date(stat.date);
                            return statDate >= startDate && statDate <= endDate;
                        });
                        
                        // Add to combined data
                        combinedData.activities = [...combinedData.activities, ...filteredActivities];
                        
                        // Merge daily stats
                        filteredDailyStats.forEach(stat => {
                            const existingStat = combinedData.dailyStats.find(s => 
                                new Date(s.date).toISOString().split('T')[0] === 
                                new Date(stat.date).toISOString().split('T')[0]
                            );
                            
                            if (existingStat) {
                                existingStat.steps += stat.steps;
                                existingStat.caloriesBurned += stat.caloriesBurned;
                                existingStat.activeMinutes += stat.activeMinutes;
                                existingStat.distance += stat.distance;
                            } else {
                                combinedData.dailyStats.push(stat);
                            }
                        });
                        
                        // Update summary
                        combinedData.summary.steps += filteredDailyStats.reduce((sum, stat) => sum + stat.steps, 0);
                        combinedData.summary.caloriesBurned += filteredDailyStats.reduce((sum, stat) => sum + stat.caloriesBurned, 0);
                        combinedData.summary.activeMinutes += filteredDailyStats.reduce((sum, stat) => sum + stat.activeMinutes, 0);
                        combinedData.summary.distance += filteredDailyStats.reduce((sum, stat) => sum + stat.distance, 0);
                    }
                });
                
                resolve(combinedData);
            }, 500);
        });
    }
    
    // Save activity data to localStorage
    saveActivityData(data, provider) {
        const key = `activityData_${provider}`;
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    // Get stored activity data for a provider
    getStoredActivityData(provider) {
        const key = `activityData_${provider}`;
        const data = localStorage.getItem(key);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                logError(`Error parsing activity data for ${provider}:`, e);
                return null;
            }
        }
        return null;
    }
    
    // Generate a random state string for OAuth
    generateRandomState() {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Get authorization URL for the provider
    getAuthorizationUrl(provider, state) {
        // In a real app, these would be actual OAuth URLs for each provider
        // For our demo, we'll use a mock URL that redirects back to our callback
        const baseUrl = `${window.location.origin}/auth-callback.html`;
        const redirectUri = encodeURIComponent(baseUrl);
        
        // Mock auth URLs for different providers
        switch(provider) {
            case this.providers.FITBIT:
                return `${baseUrl}?code=mock_fitbit_code&state=${state}`;
                
            case this.providers.GOOGLE_FIT:
                return `${baseUrl}?code=mock_google_fit_code&state=${state}`;
                
            case this.providers.APPLE_HEALTH:
                return `${baseUrl}?code=mock_apple_health_code&state=${state}`;
                
            case this.providers.GARMIN:
                return `${baseUrl}?code=mock_garmin_code&state=${state}`;
                
            case this.providers.STRAVA:
                return `${baseUrl}?code=mock_strava_code&state=${state}`;
                
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    
    // Generate mock activity data for demo purposes
    generateMockActivityData(startDate, endDate, provider) {
        const activities = [];
        const dailyStats = [];
        
        // Generate daily stats
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Generate more steps on weekdays
            const baseSteps = isWeekend ? 4000 + Math.random() * 6000 : 6000 + Math.random() * 8000;
            const steps = Math.round(baseSteps);
            
            // Calculate calories based on steps (rough estimate)
            const caloriesBurned = Math.round(steps * 0.05);
            
            // Calculate active minutes (roughly 1 active minute per 100 steps)
            const activeMinutes = Math.round(steps / 100);
            
            // Calculate distance (roughly 0.0008 km per step)
            const distance = parseFloat((steps * 0.0008).toFixed(2));
            
            dailyStats.push({
                date: new Date(date).toISOString(),
                steps,
                caloriesBurned,
                activeMinutes,
                distance
            });
            
            // Generate activities for this day (1-3 activities per day, with higher probability on weekends)
            const numActivities = isWeekend ? 
                Math.floor(Math.random() * 3) + 1 : 
                Math.floor(Math.random() * 2);
                
            for (let i = 0; i < numActivities; i++) {
                activities.push(this.generateMockActivity(new Date(date), provider));
            }
        }
        
        return {
            summary: {
                steps: dailyStats.reduce((sum, day) => sum + day.steps, 0),
                caloriesBurned: dailyStats.reduce((sum, day) => sum + day.caloriesBurned, 0),
                activeMinutes: dailyStats.reduce((sum, day) => sum + day.activeMinutes, 0),
                distance: parseFloat(dailyStats.reduce((sum, day) => sum + day.distance, 0).toFixed(2))
            },
            activities,
            dailyStats
        };
    }
    
    // Generate a random mock activity
    generateMockActivity(date, provider) {
        const activityTypes = ['running', 'walking', 'cycling', 'swimming', 'weight_lifting', 'hiking'];
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        // Random duration between 15 and 120 minutes
        const durationMinutes = Math.floor(Math.random() * 105) + 15;
        
        // Random hour of the day (between 6am and 9pm)
        const hour = Math.floor(Math.random() * 15) + 6;
        
        // Set the start time
        const startTime = new Date(date);
        startTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        
        // Calculate calories burned based on activity type and duration
        let caloriesBurned;
        let distance = null;
        let steps = null;
        let heartRate = null;
        let elevationGain = null;
        
        switch(type) {
            case 'running':
                caloriesBurned = Math.round(durationMinutes * (8 + Math.random() * 4));
                distance = parseFloat((durationMinutes * (0.15 + Math.random() * 0.05)).toFixed(2));
                steps = Math.round(distance * 1500);
                heartRate = Math.round(140 + Math.random() * 30);
                elevationGain = Math.random() > 0.7 ? Math.round(Math.random() * 200) : null;
                break;
                
            case 'walking':
                caloriesBurned = Math.round(durationMinutes * (3 + Math.random() * 2));
                distance = parseFloat((durationMinutes * (0.08 + Math.random() * 0.02)).toFixed(2));
                steps = Math.round(distance * 1300);
                heartRate = Math.round(110 + Math.random() * 20);
                elevationGain = Math.random() > 0.7 ? Math.round(Math.random() * 100) : null;
                break;
                
            case 'cycling':
                caloriesBurned = Math.round(durationMinutes * (6 + Math.random() * 4));
                distance = parseFloat((durationMinutes * (0.3 + Math.random() * 0.1)).toFixed(2));
                heartRate = Math.round(130 + Math.random() * 30);
                elevationGain = Math.random() > 0.6 ? Math.round(Math.random() * 300) : null;
                break;
                
            case 'swimming':
                caloriesBurned = Math.round(durationMinutes * (7 + Math.random() * 3));
                distance = parseFloat((durationMinutes * (0.05 + Math.random() * 0.02)).toFixed(2));
                heartRate = Math.round(120 + Math.random() * 30);
                break;
                
            case 'weight_lifting':
                caloriesBurned = Math.round(durationMinutes * (5 + Math.random() * 3));
                heartRate = Math.round(120 + Math.random() * 20);
                break;
                
            case 'hiking':
                caloriesBurned = Math.round(durationMinutes * (5 + Math.random() * 3));
                distance = parseFloat((durationMinutes * (0.07 + Math.random() * 0.03)).toFixed(2));
                steps = Math.round(distance * 1300);
                heartRate = Math.round(115 + Math.random() * 25);
                elevationGain = Math.round(50 + Math.random() * 500);
                break;
        }
        
        // Generate a unique ID
        const id = `${provider}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        // Activity name patterns
        const activityNames = {
            running: ['Morning Run', 'Evening Run', 'Quick Run', 'Long Run', 'Trail Run'],
            walking: ['Morning Walk', 'Evening Walk', 'Lunch Walk', 'Dog Walk', 'Nature Walk'],
            cycling: ['Bike Ride', 'Morning Ride', 'Evening Ride', 'Long Ride', 'Trail Ride'],
            swimming: ['Pool Swim', 'Lap Swim', 'Open Water Swim', 'Swimming', 'Quick Swim'],
            weight_lifting: ['Strength Training', 'Gym Workout', 'Weight Training', 'Resistance Training', 'HIIT'],
            hiking: ['Hike', 'Trail Hike', 'Mountain Hike', 'Nature Hike', 'Forest Hike']
        };
        
        const nameOptions = activityNames[type] || [`${type.charAt(0).toUpperCase() + type.slice(1)}`];
        const name = nameOptions[Math.floor(Math.random() * nameOptions.length)];
        
        return {
            id,
            type,
            name,
            startTime: startTime.toISOString(),
            durationMinutes,
            caloriesBurned,
            distance,
            steps,
            heartRate,
            elevationGain,
            source: provider
        };
    }
}

// Make the class globally available
window.FitnessIntegration = FitnessIntegration; 