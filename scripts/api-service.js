import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// API Service
// Provides a unified interface for all data operations with offline support

class ApiService {
    constructor() {
        // Initialize Firebase services
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        
        // Initialize offline support
        this.offlineSupport = window.offlineSupport;
        
        // Enhanced sync configuration with concurrent retry handling
        this.syncConfig = {
            maxConcurrentSyncs: 3,
            syncInterval: 5000, // 5 seconds
            maxRetries: 3,
            retryDelay: 1000,
            conflictStrategy: 'server-wins', // or 'client-wins', 'manual'
            batchSize: 10,
            concurrentRetryConfig: {
                maxConcurrentRetries: 2,
                retryTimeout: 30000, // 30 seconds
                retryQueue: new Map(),
                activeRetries: new Set()
            }
        };
        
        // Sync state management
        this.syncState = {
            isSyncing: false,
            lastSyncTime: null,
            pendingOperations: 0,
            failedOperations: [],
            syncQueue: [],
            activeSyncs: new Set()
        };
        
        // Initialize sync interval
        this.initSyncInterval();
        
        // Enhanced cache configuration
        this.cacheConfig = {
            foodLogs: {
                ttl: 3600, // 1 hour
                version: '1.0',
                maxSize: 50, // Maximum number of entries
                priority: 'high'
            },
            userProfile: {
                ttl: 1800, // 30 minutes
                version: '1.0',
                maxSize: 1,
                priority: 'high'
            },
            favorites: {
                ttl: 3600, // 1 hour
                version: '1.0',
                maxSize: 100,
                priority: 'medium'
            },
            foodHistory: {
                ttl: 7200, // 2 hours
                version: '1.0',
                maxSize: 30,
                priority: 'medium'
            }
        };
        
        // Cache management
        this.cacheManager = {
            getCacheKey: (type, id, date = null) => {
                const version = this.cacheConfig[type].version;
                return date ? `${type}_${id}_${date}_v${version}` : `${type}_${id}_v${version}`;
            },
            
            shouldInvalidateCache: (type, cachedData) => {
                if (!cachedData || !cachedData.metadata) return true;
                const config = this.cacheConfig[type];
                return cachedData.metadata.version !== config.version;
            },
            
            prepareCacheData: (type, data) => ({
                data,
                metadata: {
                    timestamp: Date.now(),
                    version: this.cacheConfig[type].version,
                    type
                }
            }),
            
            cleanupCache: async (type) => {
                const config = this.cacheConfig[type];
                const keys = await this.offlineSupport.getCacheKeys();
                const typeKeys = keys.filter(key => key.startsWith(type));
                
                if (typeKeys.length > config.maxSize) {
                    // Sort by timestamp and remove oldest entries
                    const sortedKeys = await Promise.all(typeKeys.map(async key => ({
                        key,
                        timestamp: (await this.offlineSupport.getCachedData(key))?.metadata?.timestamp || 0
                    })));
                    
                    sortedKeys.sort((a, b) => a.timestamp - b.timestamp);
                    const keysToRemove = sortedKeys
                        .slice(0, typeKeys.length - config.maxSize)
                        .map(item => item.key);
                    
                    await Promise.all(keysToRemove.map(key => 
                        this.offlineSupport.removeCachedData(key)
                    ));
                }
            }
        };
        
        // Track online status
        this.isOnline = navigator.onLine;
        
        // Security configuration
        this.securityConfig = {
            maxRetries: 3,
            retryDelay: 1000, // 1 second
            maxOperationAge: 24 * 60 * 60 * 1000, // 24 hours
            maxPendingOperations: 100
        };
        
        // Enhanced error tracking with better metrics
        this.errorTracking = {
            metrics: {
                totalErrors: 0,
                resolvedErrors: 0,
                unresolvedErrors: 0,
                averageResolutionTime: 0,
                errorSeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                errorCategories: {
                    network: 0,
                    server: 0,
                    validation: 0,
                    auth: 0,
                    data: 0,
                    system: 0
                },
                validationMetrics: {
                    totalValidations: 0,
                    failedValidations: 0,
                    validationSuccessRate: 1,
                    lastValidationTime: null,
                    validationLatency: 0,
                    fieldValidationErrors: new Map(),
                    typeValidationErrors: new Map()
                },
                dataIntegrityErrors: 0,
                recoveryMetrics: {
                    totalRecoveryAttempts: 0,
                    successfulRecoveries: 0,
                    recoverySuccessRate: 1,
                    lastRecoveryTime: null,
                    recoveryLatency: 0,
                    recoveryStrategies: {
                        retry: { attempts: 0, successes: 0, averageAttempts: 0 },
                        validate: { attempts: 0, successes: 0, averageAttempts: 0 },
                        reauthenticate: { attempts: 0, successes: 0, averageAttempts: 0 },
                        restore: { attempts: 0, successes: 0, averageAttempts: 0 },
                        restart: { attempts: 0, successes: 0, averageAttempts: 0 }
                    },
                    fallbackUsage: {
                        offline: { count: 0, successRate: 1 },
                        cache: { count: 0, successRate: 1 },
                        default: { count: 0, successRate: 1 }
                    },
                    recoveryPatterns: {
                        mostSuccessful: null,
                        leastSuccessful: null,
                        averageRecoveryTime: 0,
                        recoveryTimeDistribution: {
                            fast: 0,    // < 1s
                            medium: 0,  // 1-5s
                            slow: 0     // > 5s
                        }
                    }
                }
            },
            recentErrors: []
        };
        
        // Enhanced error handling configuration
        this.errorHandlingConfig = {
            retryStrategies: {
                network: {
                    maxRetries: 3,
                    baseDelay: 1000,
                    maxDelay: 5000,
                    backoffFactor: 2
                },
                server: {
                    maxRetries: 2,
                    baseDelay: 2000,
                    maxDelay: 8000,
                    backoffFactor: 2.5
                },
                validation: {
                    maxRetries: 1,
                    baseDelay: 500,
                    maxDelay: 2000,
                    backoffFactor: 1.5
                }
            },
            errorCategories: {
                network: ['timeout', 'connection-failed', 'offline'],
                server: ['server-error', 'service-unavailable', 'gateway-timeout'],
                validation: ['invalid-data', 'missing-required', 'format-error'],
                auth: ['unauthorized', 'token-expired', 'invalid-credentials'],
                data: ['not-found', 'conflict', 'invalid-state'],
                system: ['internal-error', 'resource-exhausted', 'system-failure']
            },
            recoveryStrategies: {
                network: {
                    primary: 'retry',
                    fallback: 'offline',
                    maxAttempts: 3,
                    timeout: 10000
                },
                server: {
                    primary: 'retry',
                    fallback: 'cache',
                    maxAttempts: 2,
                    timeout: 15000
                },
                validation: {
                    primary: 'validate',
                    fallback: 'default',
                    maxAttempts: 1,
                    timeout: 5000
                },
                auth: {
                    primary: 'reauthenticate',
                    fallback: 'offline',
                    maxAttempts: 1,
                    timeout: 8000
                },
                data: {
                    primary: 'restore',
                    fallback: 'cache',
                    maxAttempts: 2,
                    timeout: 12000
                },
                system: {
                    primary: 'restart',
                    fallback: 'default',
                    maxAttempts: 1,
                    timeout: 20000
                }
            }
        };
        
        // Enhanced validation configuration
        this.validationConfig = {
            user: {
                maxEmailLength: 100,
                maxNameLength: 50,
                minPasswordLength: 8,
                emailPattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                allowedNamePattern: /^[a-zA-Z0-9\s\-'.,]+$/,
                passwordPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
            },
            foodLog: {
                maxItemsPerMeal: 50,
                maxNotesLength: 500,
                maxNameLength: 100,
                maxNutrientValue: 10000,
                requiredFields: ['name', 'calories', 'servingSize'],
                allowedMeals: ['breakfast', 'lunch', 'dinner', 'snack'],
                nutrientPatterns: {
                    calories: /^\d{1,5}$/,
                    protein: /^\d{1,4}$/,
                    carbs: /^\d{1,4}$/,
                    fat: /^\d{1,4}$/
                }
            },
            meal: {
                maxNameLength: 100,
                maxNotesLength: 500,
                maxFoodsPerMeal: 50,
                requiredFields: ['name', 'mealType', 'foods'],
                allowedMealTypes: ['breakfast', 'lunch', 'dinner', 'snack']
            },
            food: {
                maxNameLength: 100,
                maxCalories: 10000,
                requiredFields: ['name', 'calories', 'servingSize'],
                allowedUnits: ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp']
            }
        };
        
        // Add data integrity configuration
        this.integrityConfig = {
            checksums: {
                enabled: true,
                algorithm: 'SHA-256',
                salt: 'nutrition-tracker-salt'
            },
            validation: {
                maxConsecutiveErrors: 3,
                errorThreshold: 5,
                resetInterval: 24 * 60 * 60 * 1000 // 24 hours
            },
            recovery: {
                autoRecovery: true,
                backupBeforeModify: true,
                maxBackups: 5
            }
        };
        
        // Initialize integrity state
        this.integrityState = {
            errorCount: 0,
            lastErrorTime: null,
            consecutiveErrors: 0,
            lastResetTime: Date.now()
        };
        
        // Initialize event listeners
        this.initEventListeners();

        this.errorMessages = {
            validation: {
                'invalid-email': 'Please enter a valid email address (e.g., user@example.com)',
                'invalid-password': 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
                'invalid-name': 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and basic punctuation',
                'missing-fields': 'Please fill in all required fields',
                'invalid-nutrient': 'Please enter a valid nutrient value (positive number)',
                'invalid-serving': 'Please enter a valid serving size',
                'invalid-meal-type': 'Please select a valid meal type (breakfast, lunch, dinner, or snack)',
                'invalid-unit': 'Please select a valid unit of measurement (g, ml, oz, cup, tbsp, or tsp)'
            },
            network: {
                'offline': 'You are currently offline. Please check your internet connection and try again',
                'timeout': 'The request timed out. Please try again in a few moments',
                'connection-lost': 'Connection was lost. Please check your internet connection and try again',
                'server-error': 'Server error occurred. Please try again later or contact support if the problem persists'
            },
            data: {
                'not-found': 'The requested data was not found. Please check your input and try again',
                'already-exists': 'This item already exists. Please use a different name or update the existing item',
                'invalid-format': 'The data format is invalid. Please check your input and try again',
                'data-corrupted': 'The data appears to be corrupted. We will attempt to recover it automatically'
            },
            auth: {
                'unauthenticated': 'Please log in to continue. Your session may have expired',
                'permission-denied': 'You do not have permission to perform this action. Please contact your administrator',
                'token-expired': 'Your session has expired. Please log in again to continue',
                'invalid-credentials': 'Invalid email or password. Please check your credentials and try again'
            },
            unknown: {
                'default': 'An unexpected error occurred. Please try again or contact support if the problem persists'
            }
        };

        this.getErrorMessage = (errorType) => {
            for (const category in this.errorMessages) {
                if (this.errorMessages[category][errorType]) {
                    return this.errorMessages[category][errorType];
                }
            }
            return this.errorMessages.unknown.default;
        };
    }
    
    initEventListeners() {
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    }
    
    handleOnlineStatusChange(isOnline) {
        this.isOnline = isOnline;
        if (isOnline) {
            this.syncPendingOperations();
        }
    }
    
    // Authentication Methods
    async registerUser(email, password, displayName) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            
            // Create user document
            await this.db.collection("users").doc(userCredential.user.uid).set({
                email,
                displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    calorieGoal: 2000,
                    proteinGoal: 150,
                    carbsGoal: 225,
                    fatGoal: 65
                }
            });
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            logError("Error registering user:", error);
            return { success: false, error: error.message };
        }
    }
    
    async loginUser(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            logError("Error logging in:", error);
            return { success: false, error: error.message };
        }
    }
    
    async logoutUser() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            logError("Error logging out:", error);
            return { success: false, error: error.message };
        }
    }
    
    // User Profile Methods
    async getUserProfile(userId) {
        try {
            // Check cache first
            const cachedProfile = await this.getCachedData('userProfile', userId);
            if (cachedProfile) {
                return { success: true, data: cachedProfile };
            }
            
            const docRef = this.db.collection("users").doc(userId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const profileData = docSnap.data();
                // Cache the profile using enhanced caching
                await this.setCachedData('userProfile', userId, profileData);
                return { success: true, data: profileData };
            } else {
                return { success: false, error: "User profile not found" };
            }
        } catch (error) {
            logError("Error getting user profile:", error);
            return { success: false, error: error.message };
        }
    }
    
    async updateUserProfile(userId, profileData) {
        try {
            if (!this.isOnline) {
                // Queue the operation for later
                this.offlineSupport.queueOperation({
                    type: 'updateDocument',
                    collection: 'users',
                    docId: userId,
                    data: profileData
                });
                return { success: true, offline: true };
            }
            
            const docRef = this.db.collection("users").doc(userId);
            await docRef.update(profileData);
            
            // Update cache
            this.offlineSupport.cacheData(`profile_${userId}`, profileData, this.cacheConfig.userProfile.ttl);
            
            return { success: true };
        } catch (error) {
            logError("Error updating user profile:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Food Log Methods
    async saveFoodLog(userId, date, foodLog) {
        try {
            // Validate input
            const validation = this.validateFoodLog(foodLog);
            if (!validation.isValid) {
                throw new Error(`Invalid food log: ${validation.errors.join(', ')}`);
            }
            
            // Log warnings if any
            if (validation.warnings.length > 0) {
                logWarn('Food log warnings:', validation.warnings);
            }
            
            // Use sanitized data
            const sanitizedFoodLog = validation.sanitizedData;
            
            if (!this.isOnline) {
                // Check if we have too many pending operations
                if (this.offlineSupport.pendingOperations.length >= this.securityConfig.maxPendingOperations) {
                    throw new Error('Too many pending operations. Please try again when online.');
                }
                
                // Queue the operation for later
                const operationId = this.offlineSupport.queueOperation({
                    type: 'addFoodLog',
                    userId,
                    date,
                    food: sanitizedFoodLog,
                    timestamp: Date.now()
                });
                
                return { 
                    success: true, 
                    offline: true,
                    operationId,
                    message: 'Operation queued for later execution'
                };
            }
            
            const docRef = this.db.collection("foodLogs").doc(userId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const logs = docSnap.data().logs || {};
                logs[date] = sanitizedFoodLog;
                await docRef.update({ logs });
            } else {
                await docRef.set({ 
                    logs: { [date]: sanitizedFoodLog }
                });
            }
            
            // Update cache
            this.offlineSupport.cacheData(`foodLog_${userId}_${date}`, sanitizedFoodLog, this.cacheConfig.foodLogs.ttl);
            
            // Save to history
            await this.saveFoodHistory(userId, date, sanitizedFoodLog);
            
            return { 
                success: true,
                message: 'Food log saved successfully'
            };
            
        } catch (error) {
            return this.handleError(error, {
                type: 'addFoodLog',
                userId,
                date,
                food: foodLog
            });
        }
    }
    
    validateFoodLog(foodLog) {
        const errors = [];
        const warnings = [];
        
        // Validate meal structure
        if (!foodLog || typeof foodLog !== 'object') {
            errors.push('Invalid food log structure');
            return { isValid: false, errors, warnings };
        }
        
        // Validate each meal
        this.validationConfig.foodLog.allowedMeals.forEach(meal => {
            if (!Array.isArray(foodLog[meal])) {
                errors.push(`Invalid ${meal} structure: must be an array`);
            }
            
            if (foodLog[meal].length > this.validationConfig.foodLog.maxItemsPerMeal) {
                errors.push(`${meal} exceeds maximum items (${this.validationConfig.foodLog.maxItemsPerMeal})`);
            }
            
            foodLog[meal].forEach((item, index) => {
                const itemValidation = this.validateFoodItem(item);
                if (itemValidation.errors.length > 0) {
                    errors.push(`${meal}[${index}]: ${itemValidation.errors.join(', ')}`);
                }
                if (itemValidation.warnings.length > 0) {
                    warnings.push(`${meal}[${index}]: ${itemValidation.warnings.join(', ')}`);
                }
            });
        });
        
        // Check for unknown meals
        Object.keys(foodLog).forEach(meal => {
            if (!this.validationConfig.foodLog.allowedMeals.includes(meal)) {
                warnings.push(`Unknown meal type: ${meal}`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            sanitizedData: errors.length === 0 ? this.sanitizeFoodLog(foodLog) : null
        };
    }
    
    validateFoodItem(item) {
        const errors = [];
        const warnings = [];
        
        // Validate required fields
        this.validationConfig.foodLog.requiredFields.forEach(field => {
            if (!item[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        // Enhanced name validation
        if (item.name) {
            if (typeof item.name !== 'string') {
                errors.push('Name must be a string');
            } else {
                const sanitizedName = this.sanitizeString(item.name);
                if (sanitizedName.length > this.validationConfig.foodLog.maxNameLength) {
                    errors.push(`Name exceeds maximum length (${this.validationConfig.foodLog.maxNameLength})`);
                }
                if (sanitizedName !== item.name) {
                    warnings.push('Name contained invalid characters that were removed');
                }
                // Check for common food name patterns
                if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(sanitizedName)) {
                    warnings.push('Food name contains unusual characters');
                }
            }
        }
        
        // Enhanced nutrient validation
        const nutrients = ['calories', 'protein', 'carbs', 'fat'];
        nutrients.forEach(nutrient => {
            const value = Number(item[nutrient]);
            if (isNaN(value)) {
                errors.push(`${nutrient} must be a valid number`);
            } else if (value < 0) {
                errors.push(`${nutrient} cannot be negative`);
            } else if (value > this.validationConfig.foodLog.maxNutrientValue) {
                errors.push(`${nutrient} exceeds maximum allowed value (${this.validationConfig.foodLog.maxNutrientValue})`);
            }
        });
        
        // Validate serving size
        if (item.servingSize) {
            const servingSize = Number(item.servingSize);
            if (isNaN(servingSize) || servingSize <= 0) {
                errors.push('Serving size must be a positive number');
            }
        }
        
        // Validate meal type if present
        if (item.mealType && !this.validationConfig.foodLog.allowedMeals.includes(item.mealType)) {
            errors.push(`Invalid meal type: ${item.mealType}`);
        }
        
        // Validate date format if present
        if (item.date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(item.date)) {
                errors.push('Date must be in YYYY-MM-DD format');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    sanitizeFoodLog(foodLog) {
        const sanitized = JSON.parse(JSON.stringify(foodLog));
        
        this.validationConfig.foodLog.allowedMeals.forEach(meal => {
            if (Array.isArray(sanitized[meal])) {
                sanitized[meal] = sanitized[meal].map(item => this.sanitizeFoodItem(item));
            } else {
                sanitized[meal] = [];
            }
        });
        
        // Remove unknown meals
        Object.keys(sanitized).forEach(meal => {
            if (!this.validationConfig.foodLog.allowedMeals.includes(meal)) {
                delete sanitized[meal];
            }
        });
        
        return sanitized;
    }
    
    sanitizeFoodItem(item) {
        const sanitized = { ...item };
        
        // Sanitize name
        if (sanitized.name) {
            sanitized.name = this.sanitizeString(sanitized.name).trim();
        }
        
        // Sanitize nutrients
        const nutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
        nutrients.forEach(nutrient => {
            if (sanitized[nutrient] !== undefined) {
                const value = Number(sanitized[nutrient]);
                sanitized[nutrient] = isNaN(value) ? 0 : Math.max(0, Math.min(value, this.validationConfig.foodLog.maxNutrientValue));
            }
        });
        
        // Sanitize serving size
        if (sanitized.servingSize) {
            const servingSize = Number(sanitized.servingSize);
            sanitized.servingSize = isNaN(servingSize) ? 1 : Math.max(0.1, servingSize);
        }
        
        // Sanitize meal type
        if (sanitized.mealType && !this.validationConfig.foodLog.allowedMeals.includes(sanitized.mealType)) {
            sanitized.mealType = 'snacks'; // Default to snacks if invalid
        }
        
        // Sanitize date
        if (sanitized.date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(sanitized.date)) {
                sanitized.date = new Date().toISOString().split('T')[0]; // Default to today
            }
        }
        
        // Remove any undefined or null values
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined || sanitized[key] === null) {
                delete sanitized[key];
            }
        });
        
        return sanitized;
    }
    
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        
        // Remove HTML tags if sanitizeHtml is enabled
        if (this.validationConfig.general.sanitizeHtml) {
            str = str.replace(/<[^>]*>/g, '');
        }
        
        // Remove SQL injection attempts if sanitizeSql is enabled
        if (this.validationConfig.general.sanitizeSql) {
            str = str.replace(/['";]/g, '');
        }
        
        // Trim and limit length
        return str.trim().slice(0, this.validationConfig.general.maxStringLength);
    }
    
    sanitizeNumber(num, min, max) {
        const value = Number(num);
        if (isNaN(value)) return min;
        return Math.min(Math.max(min, value), max);
    }
    
    sanitizeUnit(unit) {
        return this.validationConfig.foodLog.allowedUnits.includes(unit) ? unit : 'serving';
    }
    
    async getFoodLog(userId, date) {
        try {
            // Check cache first
            const cachedLog = await this.getCachedData('foodLogs', userId, date);
            if (cachedLog) {
                return { success: true, data: cachedLog };
            }
            
            const docRef = this.db.collection("foodLogs").doc(userId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists && docSnap.data().logs && docSnap.data().logs[date]) {
                const logData = docSnap.data().logs[date];
                // Cache the log using enhanced caching
                await this.setCachedData('foodLogs', userId, logData, date);
                return { success: true, data: logData };
            } else {
                return { success: true, data: { breakfast: [], lunch: [], dinner: [], snacks: [] } };
            }
        } catch (error) {
            logError("Error getting food log:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Food History Methods
    async saveFoodHistory(userId, date, foodLog) {
        try {
            if (!this.isOnline) {
                // Queue the operation for later
                this.offlineSupport.queueOperation({
                    type: 'updateDocument',
                    collection: 'foodHistory',
                    docId: userId,
                    data: {
                        history: [{
                            date,
                            totals: this.calculateTotals(foodLog)
                        }]
                    }
                });
                return { success: true, offline: true };
            }
            
            const totals = this.calculateTotals(foodLog);
            const docRef = this.db.collection("foodHistory").doc(userId);
            const docSnap = await docRef.get();
            
            const historyEntry = { date, totals };
            
            if (docSnap.exists) {
                const history = docSnap.data().history || [];
                const existingIndex = history.findIndex(entry => entry.date === date);
                
                if (existingIndex >= 0) {
                    history[existingIndex] = historyEntry;
                } else {
                    history.push(historyEntry);
                }
                
                await docRef.update({ history });
            } else {
                await docRef.set({
                    history: [historyEntry]
                });
            }
            
            // Update cache
            this.offlineSupport.cacheData(`history_${userId}`, historyEntry, this.cacheConfig.foodHistory.ttl);
            
            return { success: true };
        } catch (error) {
            logError("Error saving food history:", error);
            return { success: false, error: error.message };
        }
    }
    
    async getFoodHistory(userId, days = 30) {
        try {
            // Check cache first
            const cachedHistory = await this.getCachedData('foodHistory', userId);
            if (cachedHistory) {
                return { success: true, data: cachedHistory };
            }
            
            const docRef = this.db.collection("foodHistory").doc(userId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const history = docSnap.data().history || [];
                const sortedHistory = history
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, days);
                
                // Cache the history using enhanced caching
                await this.setCachedData('foodHistory', userId, sortedHistory);
                
                return { success: true, data: sortedHistory };
            } else {
                return { success: true, data: [] };
            }
        } catch (error) {
            logError("Error getting food history:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Helper Methods
    calculateTotals(foodLog) {
        const totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        for (const meal in foodLog) {
            foodLog[meal].forEach(food => {
                totals.calories += food.calories || 0;
                totals.protein += food.protein || 0;
                totals.carbs += food.carbs || 0;
                totals.fat += food.fat || 0;
            });
        }
        
        return totals;
    }
    
    initSyncInterval() {
        // Clear any existing interval
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
        }
        
        // Start new sync interval
        this.syncIntervalId = setInterval(() => {
            if (this.isOnline && !this.syncState.isSyncing) {
                this.syncPendingOperations();
            }
        }, this.syncConfig.syncInterval);
    }
    
    async syncPendingOperations() {
        if (this.syncState.isSyncing) return;
        
        try {
            this.syncState.isSyncing = true;
            this.syncState.lastSyncTime = Date.now();
            
            const pendingOps = await this.offlineSupport.getPendingOperations();
            if (!pendingOps.length) return;
            
            // Process operations in batches
            for (let i = 0; i < pendingOps.length; i += this.syncConfig.batchSize) {
                const batch = pendingOps.slice(i, i + this.syncConfig.batchSize);
                await this.processSyncBatch(batch);
            }
            
            // Handle any failed operations
            if (this.syncState.failedOperations.length > 0) {
                await this.handleFailedOperations();
            }
            
        } catch (error) {
            logError('Sync error:', error);
            this.handleSyncError(error);
        } finally {
            this.syncState.isSyncing = false;
        }
    }
    
    async processSyncBatch(batch) {
        const batchPromises = batch.map(async (operation) => {
            if (this.syncState.activeSyncs.size >= this.syncConfig.maxConcurrentSyncs) {
                return this.queueOperation(operation);
            }
            
            this.syncState.activeSyncs.add(operation.id);
            
            try {
                const result = await this.executeOperation(operation);
                if (result.success) {
                    await this.offlineSupport.removePendingOperation(operation.id);
                    this.syncState.pendingOperations--;
                } else {
                    this.syncState.failedOperations.push({
                        operation,
                        error: result.error,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                this.syncState.failedOperations.push({
                    operation,
                    error: error.message,
                    timestamp: Date.now()
                });
            } finally {
                this.syncState.activeSyncs.delete(operation.id);
            }
        });
        
        await Promise.all(batchPromises);
    }
    
    async executeOperation(operation) {
        let retryCount = 0;
        
        while (retryCount < this.syncConfig.maxRetries) {
            try {
                switch (operation.type) {
                    case 'addFoodLog':
                        return await this.saveFoodLog(
                            operation.userId,
                            operation.date,
                            operation.food
                        );
                    case 'updateDocument':
                        return await this.updateDocument(
                            operation.collection,
                            operation.docId,
                            operation.data
                        );
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
            } catch (error) {
                retryCount++;
                if (retryCount === this.syncConfig.maxRetries) {
                    throw error;
                }
                await new Promise(resolve => 
                    setTimeout(resolve, this.syncConfig.retryDelay * retryCount)
                );
            }
        }
    }
    
    async handleFailedOperations() {
        const now = Date.now();
        const recentFailures = this.syncState.failedOperations.filter(
            failure => now - failure.timestamp < 3600000 // 1 hour
        );
        
        for (const failure of recentFailures) {
            if (this.syncConfig.conflictStrategy === 'server-wins') {
                // Fetch latest server data
                const serverData = await this.fetchLatestServerData(failure.operation);
                await this.resolveConflict(failure.operation, serverData);
            } else if (this.syncConfig.conflictStrategy === 'client-wins') {
                // Retry the operation
                await this.retryOperation(failure.operation);
            }
            // For 'manual' strategy, leave the operation in failed state
        }
        
        // Clear old failures
        this.syncState.failedOperations = this.syncState.failedOperations.filter(
            failure => now - failure.timestamp < 3600000
        );
    }
    
    async fetchLatestServerData(operation) {
        try {
            const docRef = this.db.collection(operation.collection).doc(operation.docId);
            const docSnap = await docRef.get();
            return docSnap.exists ? docSnap.data() : null;
        } catch (error) {
            logError('Error fetching server data:', error);
            return null;
        }
    }
    
    async resolveConflict(operation, serverData) {
        try {
            if (!serverData) {
                // Server data doesn't exist, apply client changes
                await this.executeOperation(operation);
            } else {
                // Merge strategies based on operation type
                switch (operation.type) {
                    case 'addFoodLog':
                        await this.mergeFoodLogData(operation, serverData);
                        break;
                    case 'updateDocument':
                        await this.mergeDocumentData(operation, serverData);
                        break;
                }
            }
        } catch (error) {
            logError('Error resolving conflict:', error);
            throw error;
        }
    }
    
    async mergeFoodLogData(operation, serverData) {
        const clientData = operation.food;
        const mergedData = { ...serverData };
        
        // Merge meal data
        ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(meal => {
            if (clientData[meal] && Array.isArray(clientData[meal])) {
                mergedData[meal] = [
                    ...(serverData[meal] || []),
                    ...clientData[meal]
                ];
            }
        });
        
        // Update server with merged data
        await this.db.collection('foodLogs')
            .doc(operation.userId)
            .set({ logs: { [operation.date]: mergedData } }, { merge: true });
    }
    
    async mergeDocumentData(operation, serverData) {
        const mergedData = {
            ...serverData,
            ...operation.data,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await this.db.collection(operation.collection)
            .doc(operation.docId)
            .set(mergedData, { merge: true });
    }
    
    handleSyncError(error) {
        logError('Sync error:', error);
        // Implement error reporting or notification system here
    }
    
    // Enhanced cache methods
    async getCachedData(type, id, date = null) {
        try {
            const cacheKey = this.cacheManager.getCacheKey(type, id, date);
            const cachedData = await this.offlineSupport.getCachedData(cacheKey);
            
            if (!cachedData) return null;
            
            if (this.cacheManager.shouldInvalidateCache(type, cachedData)) {
                await this.offlineSupport.removeCachedData(cacheKey);
                return null;
            }
            
            return cachedData.data;
        } catch (error) {
            logError(`Error getting cached data for ${type}:`, error);
            return null;
        }
    }
    
    async setCachedData(type, id, data, date = null) {
        try {
            const cacheKey = this.cacheManager.getCacheKey(type, id, date);
            const cacheData = this.cacheManager.prepareCacheData(type, data);
            
            await this.offlineSupport.cacheData(cacheKey, cacheData, this.cacheConfig[type].ttl);
            await this.cacheManager.cleanupCache(type);
            
            return true;
        } catch (error) {
            logError(`Error setting cached data for ${type}:`, error);
            return false;
        }
    }
    
    // Enhanced error handling methods
    classifyError(error) {
        if (!error) return 'unknown';
        
        // Firebase specific errors
        if (error.code) {
            const code = error.code.toLowerCase();
            if (code.includes('permission-denied')) return 'permission-denied';
            if (code.includes('not-found')) return 'not-found';
            if (code.includes('already-exists')) return 'already-exists';
            if (code.includes('invalid-argument')) return 'invalid-argument';
            if (code.includes('failed-precondition')) return 'failed-precondition';
            if (code.includes('aborted')) return 'aborted';
            if (code.includes('out-of-range')) return 'out-of-range';
            if (code.includes('unimplemented')) return 'unimplemented';
            if (code.includes('internal')) return 'internal';
        }
        
        // Network related errors
        if (!navigator.onLine) return 'network-error';
        if (error.name === 'TimeoutError') return 'timeout';
        if (error.message?.includes('timeout')) return 'timeout';
        if (error.message?.includes('network')) return 'network-error';
        
        // Server related errors
        if (error.status >= 500) return 'server-error';
        if (error.status === 429) return 'quota-exceeded';
        if (error.status === 503) return 'unavailable';
        
        return 'unknown';
    }
    
    getErrorCategory(errorType) {
        for (const [category, types] of Object.entries(this.errorHandlingConfig.errorCategories)) {
            if (types.includes(errorType)) {
                return category;
            }
        }
        return 'unknown';
    }

    async attemptRecovery(errorType, category, context) {
        const recoveryAction = this.errorHandlingConfig.recoveryActions[category];
        if (!recoveryAction) {
            return { attempted: false, success: false };
        }

        try {
            switch (recoveryAction) {
                case 'retry':
                    return await this.retryOperation(context);
                case 'validate':
                    return await this.validateAndFixData(context);
                case 'reauthenticate':
                    return await this.reauthenticate(context);
                case 'restore':
                    return await this.restoreData(context);
                case 'restart':
                    return await this.restartOperation(context);
                default:
                    return { attempted: false, success: false };
            }
        } catch (recoveryError) {
            logError('Recovery attempt failed:', recoveryError);
            return { attempted: true, success: false, error: recoveryError.message };
        }
    }

    async handleError(error, context = {}) {
        const errorType = this.classifyError(error);
        const category = this.getErrorCategory(errorType);
        const severity = this.getErrorSeverity(errorType);
        
        // Update error metrics
        this.updateErrorMetrics(errorType, category, severity);
        
        // Log error with context
        logError(`[${category.toUpperCase()}] ${errorType}:`, {
            error,
            context,
            severity,
            timestamp: new Date().toISOString()
        });
        
        // Attempt recovery based on error category
        const recoveryStrategy = this.errorHandlingConfig.recoveryStrategies[category];
        if (recoveryStrategy) {
            try {
                const recoveryResult = await this.attemptRecovery(errorType, category, {
                    ...context,
                    maxAttempts: recoveryStrategy.maxAttempts,
                    timeout: recoveryStrategy.timeout
                });
                
                if (recoveryResult.success) {
                    this.updateRecoveryMetrics(recoveryResult);
                    return recoveryResult.data;
                }
            } catch (recoveryError) {
                logError('Recovery failed:', recoveryError);
            }
        }
        
        // If recovery fails or no strategy exists, use fallback
        const fallbackStrategy = recoveryStrategy?.fallbackStrategy || 'error';
        switch (fallbackStrategy) {
            case 'offline':
                return this.handleOfflineFallback(context);
            case 'cache':
                return this.handleCacheFallback(context);
            case 'default':
                return this.handleDefaultFallback(context);
            default:
                throw error;
        }
    }

    updateErrorMetrics(errorType, category, severity) {
        const metrics = this.errorTracking.metrics;
        
        // Update total errors
        metrics.totalErrors++;
        
        // Update category-specific metrics
        metrics.errorCategories[category]++;
        
        // Update severity metrics
        metrics.errorSeverity[severity]++;
        
        // Update error rate
        this.updateErrorRate();
    }

    updateRecoveryMetrics(recoveryResult) {
        const metrics = this.errorTracking.metrics.recoveryMetrics;
        
        // Update basic metrics
        metrics.totalRecoveryAttempts++;
        if (recoveryResult.success) {
            metrics.successfulRecoveries++;
            
            // Track recovery time distribution
            if (recoveryResult.startTime) {
                const recoveryTime = Date.now() - recoveryResult.startTime;
                
                // Initialize time distribution if not exists
                if (!metrics.recoveryPatterns.recoveryTimeDistribution) {
                    metrics.recoveryPatterns.recoveryTimeDistribution = {
                        fast: 0,    // < 1s
                        medium: 0,  // 1-5s
                        slow: 0     // > 5s
                    };
                }
                
                // Categorize recovery time
                if (recoveryTime < 1000) {
                    metrics.recoveryPatterns.recoveryTimeDistribution.fast++;
                } else if (recoveryTime < 5000) {
                    metrics.recoveryPatterns.recoveryTimeDistribution.medium++;
                } else {
                    metrics.recoveryPatterns.recoveryTimeDistribution.slow++;
                }
                
                // Update average recovery time
                metrics.recoveryPatterns.averageRecoveryTime = 
                    ((metrics.recoveryPatterns.averageRecoveryTime || 0) * 
                    (metrics.successfulRecoveries - 1) + recoveryTime) / 
                    metrics.successfulRecoveries;
            }
        }
        
        // Update strategy-specific metrics
        const strategy = recoveryResult.strategy;
        if (metrics.recoveryStrategies[strategy]) {
            metrics.recoveryStrategies[strategy].attempts++;
            if (recoveryResult.success) {
                metrics.recoveryStrategies[strategy].successes++;
                
                // Track strategy-specific recovery time
                if (recoveryResult.startTime) {
                    const recoveryTime = Date.now() - recoveryResult.startTime;
                    metrics.recoveryStrategies[strategy].lastRecoveryTime = recoveryTime;
                    metrics.recoveryStrategies[strategy].averageRecoveryTime = 
                        ((metrics.recoveryStrategies[strategy].averageRecoveryTime || 0) * 
                        (metrics.recoveryStrategies[strategy].successes - 1) + recoveryTime) / 
                        metrics.recoveryStrategies[strategy].successes;
                }
            }
        }
        
        // Track fallback usage
        if (recoveryResult.fallback) {
            const fallback = metrics.fallbackUsage[recoveryResult.fallback];
            if (fallback) {
                fallback.count++;
                if (recoveryResult.success) {
                    fallback.successRate = ((fallback.successRate * (fallback.count - 1)) + 1) / fallback.count;
                    fallback.lastSuccessTime = Date.now();
                }
            }
        }
        
        // Update overall success rate
        metrics.recoverySuccessRate = metrics.successfulRecoveries / metrics.totalRecoveryAttempts;
        metrics.lastRecoveryTime = Date.now();
    }

    updateErrorRate() {
        const now = Date.now();
        const window = 3600000; // 1 hour window
        
        // Remove errors outside the window
        this.errorTracking.recentErrors = this.errorTracking.recentErrors.filter(
            error => now - error.timestamp < window
        );
        
        // Calculate error rate (errors per hour)
        const errorRate = this.errorTracking.recentErrors.length;
        
        // Update metrics
        this.errorTracking.metrics.errorRate = errorRate;
    }

    getErrorSeverity(errorType) {
        const severityMap = {
            // Critical errors
            'data-loss': 'critical',
            'corrupted': 'critical',
            'system-failure': 'critical',
            
            // High severity errors
            'authentication-failed': 'high',
            'permission-denied': 'high',
            'quota-exceeded': 'high',
            
            // Medium severity errors
            'validation-failed': 'medium',
            'invalid-format': 'medium',
            'timeout': 'medium',
            
            // Low severity errors
            'temporary-failure': 'low',
            'retry-later': 'low',
            'warning': 'low'
        };
        
        return severityMap[errorType] || 'medium';
    }

    async verifyDataIntegrity(data, type) {
        try {
            // Check if we have stored checksums
            const storedChecksums = await this.getStoredChecksums(type);
            if (!storedChecksums) {
                logInfo('No stored checksums found, storing initial checksums');
                await this.storeChecksums(data);
                return { valid: true, message: 'Initial checksums stored' };
            }

            // Calculate current checksum with enhanced validation
            const currentChecksum = await this.calculateChecksum(data);
            const backupChecksum = storedChecksums.backup || null;
            
            // Compare checksums with enhanced error handling
            if (currentChecksum !== storedChecksums.current) {
                logError('Checksum mismatch detected');
                
                // Increment error count with rate limiting
                this.integrityState.errorCount++;
                this.integrityState.lastErrorTime = Date.now();
                
                // Check if we've exceeded the error threshold
                if (this.integrityState.errorCount >= this.integrityConfig.validation.errorThreshold) {
                    // Reset error count if enough time has passed
                    if (Date.now() - this.integrityState.lastResetTime > this.integrityConfig.validation.resetInterval) {
                        this.integrityState.errorCount = 0;
                        this.integrityState.lastResetTime = Date.now();
                    } else {
                        throw new Error('Multiple data integrity errors detected');
                    }
                }
                
                // Attempt recovery with enhanced strategy
                const recoveryResult = await this.recoverData(data, type, {
                    currentChecksum,
                    storedChecksum: storedChecksums.current,
                    backupChecksum
                });

                if (!recoveryResult.success) {
                    throw new Error('Data recovery failed: ' + recoveryResult.error);
                }
                
                // Update checksums after successful recovery
                await this.storeChecksums(recoveryResult.data, {
                    previous: storedChecksums.current,
                    backup: currentChecksum
                });
                
                return {
                    valid: true,
                    message: 'Data recovered and checksums updated',
                    recovered: true,
                    recoveryDetails: recoveryResult.details
                };
            }
            
            return { valid: true, message: 'Data integrity verified' };
        } catch (error) {
            logError('Data integrity verification failed:', error);
            return {
                valid: false,
                message: 'Data integrity verification failed',
                error: error.message,
                errorType: this.classifyError(error)
            };
        }
    }

    async recoverData(data, type, checksumInfo) {
        try {
            // First try to restore from backup with validation
            const backupData = await this.restoreFromBackup(type);
            if (backupData) {
                const backupChecksum = await this.calculateChecksum(backupData);
                if (backupChecksum === checksumInfo.backupChecksum) {
                    return { 
                        success: true, 
                        data: backupData,
                        details: 'Restored from verified backup'
                    };
                }
            }
            
            // If no valid backup, try to repair the data
            const repairedData = await this.repairData(data, type);
            if (repairedData) {
                // Validate repaired data
                const validationResult = await this.validateData(repairedData, type);
                if (validationResult.isValid) {
                    return { 
                        success: true, 
                        data: repairedData,
                        details: 'Data repaired and validated'
                    };
                }
            }
            
            throw new Error('Data recovery failed: Unable to restore or repair data');
        } catch (error) {
            logError('Data recovery failed:', error);
            return { 
                success: false, 
                error: error.message,
                errorType: this.classifyError(error)
            };
        }
    }

    async validateData(data, type) {
        const validationStrategies = {
            user: this.validateUserData,
            foodLog: this.validateFoodLogData,
            meal: this.validateMealData,
            food: this.validateFoodData
        };

        const validationStrategy = validationStrategies[type];
        if (!validationStrategy) {
            throw new Error(`No validation strategy for type: ${type}`);
        }

        return await validationStrategy(data);
    }

    async validateUserData(data) {
        const errors = [];
        const warnings = [];

        // Validate email
        if (!this.validationConfig.user.emailPattern.test(data.email)) {
            errors.push('Invalid email format');
        }

        // Validate name
        if (!this.validationConfig.user.allowedNamePattern.test(data.displayName)) {
            errors.push('Invalid name format');
        }

        // Validate preferences
        if (data.preferences) {
            const { calorieGoal, proteinGoal, carbsGoal, fatGoal } = data.preferences;
            if (calorieGoal < 0 || proteinGoal < 0 || carbsGoal < 0 || fatGoal < 0) {
                errors.push('Invalid goal values');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    async validateFoodLogData(data) {
        const errors = [];
        const warnings = [];

        // Validate required fields
        this.validationConfig.foodLog.requiredFields.forEach(field => {
            if (!data[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Validate nutrients
        const nutrients = ['calories', 'protein', 'carbs', 'fat'];
        nutrients.forEach(nutrient => {
            if (data[nutrient]) {
                const value = Number(data[nutrient]);
                if (isNaN(value) || value < 0) {
                    errors.push(`Invalid ${nutrient} value`);
                } else if (value > this.validationConfig.foodLog.maxNutrientValue) {
                    warnings.push(`${nutrient} exceeds maximum allowed value`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    async handleOfflineFallback(context) {
        try {
            // Check if we have cached data
            const cachedData = await this.getCachedData(context.type, context.id, context.date);
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData,
                    source: 'cache',
                    offline: true
                };
            }
            
            // If no cached data, queue the operation
            const operation = {
                type: context.operationType,
                data: context.data,
                timestamp: Date.now(),
                retryCount: 0
            };
            
            this.syncState.syncQueue.push(operation);
            return {
                success: true,
                message: 'Operation queued for sync when online',
                offline: true
            };
        } catch (error) {
            logError('Offline fallback failed:', error);
            throw error;
        }
    }

    async handleCacheFallback(context) {
        try {
            // Try to get the most recent valid data from cache
            const cachedData = await this.getCachedData(context.type, context.id, context.date);
            if (cachedData) {
                // Verify data integrity
                const integrityResult = await this.verifyDataIntegrity(cachedData, context.type);
                if (integrityResult.valid) {
                    return {
                        success: true,
                        data: cachedData,
                        source: 'cache',
                        integrity: integrityResult
                    };
                }
            }
            
            // If no valid cached data, return default values
            return this.handleDefaultFallback(context);
        } catch (error) {
            logError('Cache fallback failed:', error);
            return this.handleDefaultFallback(context);
        }
    }

    async handleDefaultFallback(context) {
        // Return safe default values based on context type
        const defaults = {
            foodLog: {
                items: [],
                totals: {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                },
                date: context.date || new Date().toISOString().split('T')[0]
            },
            userProfile: {
                displayName: '',
                preferences: {
                    units: 'metric',
                    theme: 'light'
                }
            }
        };

        return {
            success: true,
            data: defaults[context.type] || {},
            source: 'default',
            message: 'Using default values'
        };
    }

    // Create and export instance
    const apiService = new ApiService();
    window.apiService = apiService; 