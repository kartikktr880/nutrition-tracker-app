import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Unified API Layer
// Combines Firebase and offline support functionality into a single, robust API layer

import { config } from './config.js';
import { validation } from './validation.js';
import { errorHandler } from './error-handler.js';

class ApiLayer {
  constructor() {
    // Initialize Firebase services
    this.firebaseConfig = config.get('firebase');

    // Initialize Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.auth = firebase.auth();
    this.db = firebase.firestore();

    // Initialize offline support
    this.offlineSupport = new OfflineSupport();
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];

    // Load security configuration
    this.securityConfig = config.get('security');
    this.securityConfig.csrfToken = this.generateCSRFToken();

    // Initialize session management
    this.sessionManager = {
      lastActivity: Date.now(),
      isActive: true,
      checkInterval: null
    };

    // Initialize event listeners
    this.initEventListeners();
    
    // Start session monitoring
    this.startSessionMonitoring();
    
    this.activityListeners = new Map();
    
    logInfo('API Layer initialized');
  }

  // Get Firebase configuration from secure source
  getFirebaseConfig() {
    // In production, this should be loaded from a secure backend endpoint
    // For development, we'll use a placeholder that should be replaced
    return {
      apiKey: process.env.FIREBASE_API_KEY || 'placeholder_key',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'placeholder_domain',
      projectId: process.env.FIREBASE_PROJECT_ID || 'placeholder_project',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'placeholder_bucket',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'placeholder_sender',
      appId: process.env.FIREBASE_APP_ID || 'placeholder_app',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'placeholder_measurement'
    };
  }

  // Generate CSRF token
  generateCSRFToken() {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  }

  // Start session monitoring
  startSessionMonitoring() {
    // Update last activity on user interaction
    const updateActivity = () => {
      this.sessionManager.lastActivity = Date.now();
      this.sessionManager.isActive = true;
    };

    // Add activity listeners
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
      document.addEventListener(event, updateActivity);
      this.activityListeners.set(event, updateActivity);
    });

    // Check session status periodically
    this.sessionManager.checkInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - this.sessionManager.lastActivity;

      if (inactiveTime > this.securityConfig.sessionTimeout) {
        this.handleSessionTimeout();
      }
    }, 60000); // Check every minute
  }

  // Handle session timeout
  async handleSessionTimeout() {
    if (this.sessionManager.isActive) {
      this.sessionManager.isActive = false;
      
      // Clear session data
      localStorage.removeItem('currentUser');
      
      // Sign out from Firebase
      try {
        await this.auth.signOut();
      } catch (error) {
        logError('Error signing out:', error);
      }

      // Redirect to login page
      window.location.href = 'login.html?timeout=true';
    }
  }

  // Validate CSRF token
  validateCSRFToken(token) {
    return token === this.securityConfig.csrfToken;
  }

  // Add CSRF token to requests
  addCSRFToken(headers = {}) {
    return {
      ...headers,
      'X-CSRF-Token': this.securityConfig.csrfToken
    };
  }

  initEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged((user) => this.handleAuthStateChange(user));
  }

  handleOnlineStatusChange(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    logInfo(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    // Update UI
    this.offlineSupport.updateOnlineStatus();
    
    // If we just came back online, sync pending operations
    if (isOnline && !wasOnline) {
      this.syncPendingOperations();
    }
  }

  handleAuthStateChange(user) {
    if (user) {
      logInfo("User is signed in:", user.displayName);
      // Store minimal user info in localStorage for backward compatibility
      localStorage.setItem('currentUser', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email
      }));
    } else {
      logInfo("User is signed out");
      localStorage.removeItem('currentUser');
    }
  }

  // Authentication Methods
  async registerUser(email, password, displayName) {
    try {
      // Validate inputs
      const emailValidation = validation.validateEmail(email);
      if (!emailValidation.valid) {
        return errorHandler.handleValidationError(new Error(emailValidation.error), 'email');
      }

      const passwordValidation = validation.validatePassword(password);
      if (!passwordValidation.valid) {
        return errorHandler.handleValidationError(new Error(passwordValidation.error), 'password');
      }

      const displayNameValidation = validation.validateDisplayName(displayName);
      if (!displayNameValidation.valid) {
        return errorHandler.handleValidationError(new Error(displayNameValidation.error), 'displayName');
      }

      if (!this.isOnline) {
        return this.queueOperation({
          type: 'register',
          data: { email, password, displayName }
        });
      }

      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName });
      
      // Create user document in Firestore
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
      return errorHandler.handleAuthError(error, 'register');
    }
  }

  async loginUser(email, password) {
    try {
      if (!this.isOnline) {
        return errorHandler.handleNetworkError(new Error("Cannot login while offline"), 'login');
      }

      // Check rate limiting
      const loginAttempts = this.getLoginAttempts(email);
      if (loginAttempts.count >= this.securityConfig.maxLoginAttempts) {
        const timeLeft = this.securityConfig.loginAttemptWindow - (Date.now() - loginAttempts.timestamp);
        if (timeLeft > 0) {
          return errorHandler.handleAuthError(
            new Error(`Too many login attempts. Please try again in ${Math.ceil(timeLeft / 1000)} seconds.`),
            'login'
          );
        }
        // Reset attempts if window has passed
        this.resetLoginAttempts(email);
      }

      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Reset login attempts on success
      this.resetLoginAttempts(email);
      
      // Update session
      this.sessionManager.lastActivity = Date.now();
      this.sessionManager.isActive = true;

      return { success: true, user: userCredential.user };
    } catch (error) {
      // Increment failed attempts
      this.incrementLoginAttempts(email);
      return errorHandler.handleAuthError(error, 'login');
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

  // Track login attempts
  getLoginAttempts(email) {
    const attempts = localStorage.getItem(`login_attempts_${email}`);
    return attempts ? JSON.parse(attempts) : { count: 0, timestamp: Date.now() };
  }

  incrementLoginAttempts(email) {
    const attempts = this.getLoginAttempts(email);
    attempts.count++;
    attempts.timestamp = Date.now();
    localStorage.setItem(`login_attempts_${email}`, JSON.stringify(attempts));
  }

  resetLoginAttempts(email) {
    localStorage.removeItem(`login_attempts_${email}`);
  }

  // Data Methods
  async getUserProfile(userId) {
    try {
      if (!this.isOnline) {
        const cachedData = this.offlineSupport.getCachedData(`user_${userId}`);
        if (cachedData) {
          return { success: true, data: cachedData, fromCache: true };
        }
        return { success: false, error: "Cannot fetch user profile while offline" };
      }

      const docRef = this.db.collection("users").doc(userId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        this.offlineSupport.cacheData(`user_${userId}`, data);
        return { success: true, data };
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
      // Validate profile data
      const profileValidation = validation.validateProfileUpdate(profileData);
      if (!profileValidation.valid) {
        return errorHandler.handleValidationError(new Error(profileValidation.error), 'profile');
      }

      // Sanitize inputs
      const sanitizedProfile = {
        displayName: validation.sanitizeString(profileData.displayName),
        calorieGoal: validation.sanitizeNumber(profileData.calorieGoal),
        proteinGoal: validation.sanitizeNumber(profileData.proteinGoal),
        carbsGoal: validation.sanitizeNumber(profileData.carbsGoal),
        fatGoal: validation.sanitizeNumber(profileData.fatGoal)
      };

      if (!this.isOnline) {
        return this.queueOperation({
          type: 'updateProfile',
          data: { userId, profileData: sanitizedProfile }
        });
      }

      const docRef = this.db.collection("users").doc(userId);
      await docRef.update(sanitizedProfile);
      
      // Update cache
      const cachedData = this.offlineSupport.getCachedData(`user_${userId}`);
      if (cachedData) {
        this.offlineSupport.cacheData(`user_${userId}`, { ...cachedData, ...sanitizedProfile });
      }
      
      return { success: true };
    } catch (error) {
      return errorHandler.handleDatabaseError(error, 'updateProfile');
    }
  }

  // Food Log Methods
  async saveFoodLog(userId, date, foodLog) {
    try {
      // Validate date
      const dateValidation = validation.validateDate(date);
      if (!dateValidation.valid) {
        return errorHandler.handleValidationError(new Error(dateValidation.error), 'date');
      }

      // Validate each food log entry
      for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
        if (foodLog[meal]) {
          for (const entry of foodLog[meal]) {
            const entryValidation = validation.validateFoodLogEntry(entry);
            if (!entryValidation.valid) {
              return errorHandler.handleValidationError(new Error(entryValidation.error), 'foodLog');
            }
          }
        }
      }

      // Sanitize food log entries
      const sanitizedFoodLog = {};
      for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
        if (foodLog[meal]) {
          sanitizedFoodLog[meal] = foodLog[meal].map(entry => ({
            name: validation.sanitizeString(entry.name),
            amount: validation.sanitizeNumber(entry.amount),
            unit: validation.sanitizeString(entry.unit)
          }));
        }
      }

      if (!this.isOnline) {
        return this.queueOperation({
          type: 'saveFoodLog',
          data: { userId, date, foodLog: sanitizedFoodLog }
        });
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
      
      await this.saveFoodHistory(userId, date, sanitizedFoodLog);
      this.offlineSupport.cacheData(`foodLog_${userId}_${date}`, sanitizedFoodLog);
      
      return { success: true };
    } catch (error) {
      return errorHandler.handleDatabaseError(error, 'saveFoodLog');
    }
  }

  async getFoodLog(userId, date) {
    try {
      if (!this.isOnline) {
        const cachedData = this.offlineSupport.getCachedData(`foodLog_${userId}_${date}`);
        if (cachedData) {
          return { success: true, data: cachedData, fromCache: true };
        }
        return { success: true, data: { breakfast: [], lunch: [], dinner: [], snacks: [] } };
      }

      const docRef = this.db.collection("foodLogs").doc(userId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists && docSnap.data().logs && docSnap.data().logs[date]) {
        const data = docSnap.data().logs[date];
        this.offlineSupport.cacheData(`foodLog_${userId}_${date}`, data);
        return { success: true, data };
      } else {
        return { success: true, data: { breakfast: [], lunch: [], dinner: [], snacks: [] } };
      }
    } catch (error) {
      logError("Error getting food log:", error);
      return { success: false, error: error.message };
    }
  }

  // Offline Support Methods
  queueOperation(operation) {
    if (!operation || !operation.type) {
      logError('Invalid operation:', operation);
      return { success: false, error: 'Invalid operation' };
    }

    // Validate operation
    if (!this.validateOperation(operation)) {
      return { success: false, error: 'Invalid operation data' };
    }

    // Add timestamp
    operation.timestamp = Date.now();
    
    // Add to pending operations
    this.pendingOperations.push(operation);
    
    // Save to localStorage
    this.savePendingOperations();
    
    return { 
      success: true, 
      message: 'Operation queued for when online',
      operation
    };
  }

  async syncPendingOperations() {
    if (!this.isOnline) {
      logInfo('Cannot sync while offline');
      return;
    }

    logInfo('Syncing pending operations...');
    
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];
    
    for (const operation of operations) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        logError('Error processing operation:', error);
        // Add failed operation back to queue
        this.pendingOperations.push(operation);
      }
    }
    
    // Save updated queue
    this.savePendingOperations();
  }

  validateOperation(operation) {
    if (!operation.type || !operation.data) {
      return false;
    }

    switch (operation.type) {
      case 'register':
        return this.validateCreateOperation(operation);
      case 'updateProfile':
        return this.validateUpdateOperation(operation);
      case 'saveFoodLog':
        return this.validateFoodLogOperation(operation);
      default:
        return false;
    }
  }

  validateCreateOperation(operation) {
    const { email, password, displayName } = operation.data;
    return email && password && displayName;
  }

  validateUpdateOperation(operation) {
    const { userId, profileData } = operation.data;
    return userId && profileData && typeof profileData === 'object';
  }

  validateFoodLogOperation(operation) {
    const { userId, date, foodLog } = operation.data;
    return userId && date && foodLog && typeof foodLog === 'object';
  }

  savePendingOperations() {
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
  }

  loadPendingOperations() {
    const stored = localStorage.getItem('pendingOperations');
    if (stored) {
      this.pendingOperations = JSON.parse(stored);
    }
  }

  // Cache Methods
  getCachedData(key) {
    return this.offlineSupport.getCachedData(key);
  }

  cacheData(key, value, expiryInSeconds = null) {
    return this.offlineSupport.cacheData(key, value, expiryInSeconds);
  }

  clearCache(key) {
    return this.offlineSupport.clearCache(key);
  }

  clearAllCache() {
    return this.offlineSupport.clearAllCache();
  }

  // Clean up event listeners and intervals
  cleanup() {
    // Remove activity listeners
    this.activityListeners.forEach((listener, event) => {
      document.removeEventListener(event, listener);
    });
    this.activityListeners.clear();

    // Clear session check interval
    if (this.sessionManager.checkInterval) {
      clearInterval(this.sessionManager.checkInterval);
      this.sessionManager.checkInterval = null;
    }
  }
}

// Export the API layer
window.apiLayer = new ApiLayer(); 