// Offline Support Module
// Provides offline capabilities and synchronization for the Nutrition Tracker app

class OfflineSupport {
  constructor() {
    // Track online status
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];
    this.offlineStatusElement = null;
    this.offlineMessageDisplayed = false;
    
    // Security configuration
    this.securityConfig = {
      maxOperationAge: 24 * 60 * 60 * 1000, // 24 hours
      maxPendingOperations: 100,
      maxRetries: 3,
      retryDelay: 1000 // 1 second
    };
    
    // Load any pending operations from localStorage
    this.loadPendingOperations();
    
    // Clean up old operations
    this.cleanupOldOperations();
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Create offline UI elements
    this.createOfflineStatusElement();
    
    // Check current status
    this.updateOnlineStatus();
    
    // Register service worker if supported
    this.registerServiceWorker();
    
    console.log('Offline Support initialized');
  }
  
  initEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    
    // Listen for beforeunload to save pending operations
    window.addEventListener('beforeunload', () => this.savePendingOperations());
  }
  
  handleOnlineStatusChange(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    // Update UI
    this.updateOnlineStatus();
    
    // If we just came back online, sync pending operations
    if (isOnline && !wasOnline) {
      this.syncPendingOperations();
    }
  }
  
  createOfflineStatusElement() {
    // Create offline status element if it doesn't exist
    if (!document.getElementById('offline-status')) {
      const offlineStatus = document.createElement('div');
      offlineStatus.id = 'offline-status';
      offlineStatus.innerHTML = `
        <div class="offline-indicator">
          <i class="fas fa-wifi-slash"></i>
          <span>You are offline. Some features may be limited.</span>
          <button class="retry-button"><i class="fas fa-sync"></i> Retry</button>
        </div>
      `;
      
      offlineStatus.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #f44336;
        color: white;
        text-align: center;
        padding: 8px 16px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      
      document.body.appendChild(offlineStatus);
      this.offlineStatusElement = offlineStatus;
      
      // Add event listener to retry button
      const retryButton = offlineStatus.querySelector('.retry-button');
      retryButton.addEventListener('click', () => {
        this.checkConnection();
      });
    } else {
      this.offlineStatusElement = document.getElementById('offline-status');
    }
  }
  
  updateOnlineStatus() {
    if (!this.offlineStatusElement) return;
    
    if (!this.isOnline) {
      // Show offline message
      this.offlineStatusElement.style.display = 'block';
      this.offlineMessageDisplayed = true;
      
      // Add offline class to body
      document.body.classList.add('offline-mode');
      
      // Disable network-dependent buttons
      this.disableNetworkDependentElements();
    } else {
      // Hide offline message
      this.offlineStatusElement.style.display = 'none';
      this.offlineMessageDisplayed = false;
      
      // Remove offline class from body
      document.body.classList.remove('offline-mode');
      
      // Re-enable network-dependent buttons
      this.enableNetworkDependentElements();
    }
  }
  
  disableNetworkDependentElements() {
    // Find all elements that require network connectivity
    const networkDependentElements = document.querySelectorAll('[data-requires-network="true"]');
    
    networkDependentElements.forEach(element => {
      // Store original disabled state
      element.dataset.originalDisabled = element.disabled;
      
      // Disable the element
      element.disabled = true;
      element.classList.add('network-disabled');
      
      // Add a tooltip explaining why it's disabled
      element.title = 'This feature requires an internet connection';
    });
  }
  
  enableNetworkDependentElements() {
    // Find all network-dependent elements
    const networkDependentElements = document.querySelectorAll('[data-requires-network="true"]');
    
    networkDependentElements.forEach(element => {
      // Restore original disabled state
      if (element.dataset.originalDisabled) {
        element.disabled = element.dataset.originalDisabled === 'true';
      } else {
        element.disabled = false;
      }
      
      // Remove network-disabled class
      element.classList.remove('network-disabled');
      
      // Remove tooltip
      if (element.title === 'This feature requires an internet connection') {
        element.title = '';
      }
    });
  }
  
  checkConnection() {
    return new Promise((resolve) => {
      // Try to fetch a small file to check real connectivity
      fetch('/ping.json', { 
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      .then(response => {
        if (response.ok) {
          this.handleOnlineStatusChange(true);
          resolve(true);
        } else {
          this.handleOnlineStatusChange(false);
          resolve(false);
        }
      })
      .catch(() => {
        this.handleOnlineStatusChange(false);
        resolve(false);
      });
    });
  }
  
  // Queue an operation to be executed when back online
  queueOperation(operation) {
    if (!operation || !operation.type) {
      console.error('Invalid operation:', operation);
      return false;
    }
    
    // Check if we have too many pending operations
    if (this.pendingOperations.length >= this.securityConfig.maxPendingOperations) {
      console.error('Too many pending operations');
      return false;
    }
    
    // Add timestamp and unique ID
    operation.timestamp = new Date().toISOString();
    operation.id = this.generateUniqueId();
    
    // Validate operation data
    if (!this.validateOperation(operation)) {
      console.error('Invalid operation data:', operation);
      return false;
    }
    
    // Add to pending operations
    this.pendingOperations.push(operation);
    
    // Save to localStorage
    this.savePendingOperations();
    
    console.log(`Operation queued for later execution:`, operation);
    
    return operation.id;
  }
  
  // Generate a unique ID for operations
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // Save pending operations to localStorage
  savePendingOperations() {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }
  
  // Load pending operations from localStorage
  loadPendingOperations() {
    try {
      const storedOperations = localStorage.getItem('pendingOperations');
      this.pendingOperations = storedOperations ? JSON.parse(storedOperations) : [];
    } catch (error) {
      console.error('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }
  
  // Sync all pending operations with the server
  async syncPendingOperations() {
    if (this.pendingOperations.length === 0) {
      console.log('No pending operations to sync');
      return { success: true, synced: 0 };
    }
    
    if (!this.isOnline) {
      console.log('Cannot sync while offline');
      return { success: false, error: 'Offline' };
    }
    
    console.log(`Syncing ${this.pendingOperations.length} pending operations...`);
    
    const successfulOperations = [];
    const failedOperations = [];
    
    // Process operations one by one
    for (const operation of this.pendingOperations) {
      try {
        // Check operation age
        const operationAge = Date.now() - new Date(operation.timestamp).getTime();
        if (operationAge > this.securityConfig.maxOperationAge) {
          console.warn('Operation too old, skipping:', operation);
          failedOperations.push({ ...operation, error: 'Operation too old' });
          continue;
        }
        
        // Implement retry logic
        let retryCount = 0;
        let success = false;
        
        while (retryCount < this.securityConfig.maxRetries && !success) {
          try {
            await this.processOperation(operation);
            success = true;
          } catch (error) {
            retryCount++;
            if (retryCount === this.securityConfig.maxRetries) {
              throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => 
              setTimeout(resolve, this.securityConfig.retryDelay * Math.pow(2, retryCount))
            );
          }
        }
        
        if (success) {
          successfulOperations.push(operation);
        }
      } catch (error) {
        console.error('Failed to process operation:', error);
        failedOperations.push({ ...operation, error: error.message });
      }
    }
    
    // Update pending operations list
    this.pendingOperations = failedOperations;
    this.savePendingOperations();
    
    return {
      success: true,
      synced: successfulOperations.length,
      failed: failedOperations.length
    };
  }
  
  // Process a single operation
  async processOperation(operation) {
    console.log(`Processing operation: ${operation.type}`, operation);
    
    switch (operation.type) {
      case 'createDocument':
        return this.processCreateDocument(operation);
        
      case 'updateDocument':
        return this.processUpdateDocument(operation);
        
      case 'deleteDocument':
        return this.processDeleteDocument(operation);
        
      case 'addFoodLog':
        return this.processAddFoodLog(operation);
        
      case 'updateWaterLog':
        return this.processUpdateWaterLog(operation);
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
  
  // Process specific operation types
  async processCreateDocument(operation) {
    const { collection, docId, data } = operation;
    
    if (!firebase || !firebase.firestore) {
      throw new Error('Firebase not initialized');
    }
    
    const db = firebase.firestore();
    
    if (docId) {
      await db.collection(collection).doc(docId).set(data);
    } else {
      await db.collection(collection).add(data);
    }
    
    return true;
  }
  
  async processUpdateDocument(operation) {
    const { collection, docId, data } = operation;
    
    if (!firebase || !firebase.firestore) {
      throw new Error('Firebase not initialized');
    }
    
    const db = firebase.firestore();
    
    await db.collection(collection).doc(docId).update(data);
    
    return true;
  }
  
  async processDeleteDocument(operation) {
    const { collection, docId } = operation;
    
    if (!firebase || !firebase.firestore) {
      throw new Error('Firebase not initialized');
    }
    
    const db = firebase.firestore();
    
    await db.collection(collection).doc(docId).delete();
    
    return true;
  }
  
  async processAddFoodLog(operation) {
    const { userId, date, meal, food } = operation;
    
    if (!firebase || !firebase.firestore) {
      throw new Error('Firebase not initialized');
    }
    
    const db = firebase.firestore();
    
    // Get current food log
    const docRef = db.collection('foodLogs').doc(userId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      // Update existing document
      const logs = docSnap.data().logs || {};
      const dayLog = logs[date] || { breakfast: [], lunch: [], dinner: [], snacks: [] };
      
      // Add food to the specified meal
      dayLog[meal] = dayLog[meal] || [];
      dayLog[meal].push(food);
      
      // Update logs
      logs[date] = dayLog;
      
      await docRef.update({ logs });
    } else {
      // Create new document
      const logs = {
        [date]: { 
          breakfast: meal === 'breakfast' ? [food] : [],
          lunch: meal === 'lunch' ? [food] : [],
          dinner: meal === 'dinner' ? [food] : [],
          snacks: meal === 'snacks' ? [food] : []
        }
      };
      
      await docRef.set({ logs });
    }
    
    return true;
  }
  
  async processUpdateWaterLog(operation) {
    const { userId, date, entries } = operation;
    
    if (!firebase || !firebase.firestore) {
      throw new Error('Firebase not initialized');
    }
    
    const db = firebase.firestore();
    
    // Update water log
    const docRef = db.collection('waterTracker').doc(userId);
    
    await docRef.set({
      logs: {
        [date]: { entries }
      }
    }, { merge: true });
    
    return true;
  }
  
  // Register service worker for offline support
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }
  
  // Get cached data by key
  getCachedData(key) {
    try {
      const data = localStorage.getItem(`cache_${key}`);
      if (!data) return null;
      
      const { value, expiry } = JSON.parse(data);
      
      // Check if cache has expired
      if (expiry && expiry < Date.now()) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return value;
    } catch (error) {
      console.error(`Error retrieving cached data for ${key}:`, error);
      return null;
    }
  }
  
  // Cache data with optional expiry time (in seconds)
  cacheData(key, value, expiryInSeconds = null) {
    try {
      const data = {
        value,
        expiry: expiryInSeconds ? Date.now() + (expiryInSeconds * 1000) : null
      };
      
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error caching data for ${key}:`, error);
      return false;
    }
  }
  
  // Clear specific cache entry
  clearCache(key) {
    localStorage.removeItem(`cache_${key}`);
  }
  
  // Clear all cached data
  clearAllCache() {
    const cacheKeys = [];
    
    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        cacheKeys.push(key);
      }
    }
    
    // Remove all cache entries
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    return cacheKeys.length;
  }
  
  cleanupOldOperations() {
    const now = Date.now();
    this.pendingOperations = this.pendingOperations.filter(operation => {
      const operationAge = now - new Date(operation.timestamp).getTime();
      return operationAge < this.securityConfig.maxOperationAge;
    });
    this.savePendingOperations();
  }
  
  validateOperation(operation) {
    // Basic validation
    if (!operation.type || !operation.timestamp || !operation.id) {
      return false;
    }
    
    // Type-specific validation
    switch (operation.type) {
      case 'addFoodLog':
        return this.validateFoodLogOperation(operation);
      case 'updateDocument':
        return this.validateUpdateOperation(operation);
      case 'createDocument':
        return this.validateCreateOperation(operation);
      case 'deleteDocument':
        return this.validateDeleteOperation(operation);
      default:
        return false;
    }
  }
  
  validateFoodLogOperation(operation) {
    return operation.userId && 
           operation.date && 
           operation.food && 
           typeof operation.food === 'object' &&
           Array.isArray(operation.food.breakfast) &&
           Array.isArray(operation.food.lunch) &&
           Array.isArray(operation.food.dinner) &&
           Array.isArray(operation.food.snacks);
  }
  
  validateUpdateOperation(operation) {
    return operation.collection && 
           operation.docId && 
           operation.data && 
           typeof operation.data === 'object';
  }
  
  validateCreateOperation(operation) {
    return operation.collection && 
           operation.data && 
           typeof operation.data === 'object';
  }
  
  validateDeleteOperation(operation) {
    return operation.collection && operation.docId;
  }
}

// Create instance and export
const offlineSupport = new OfflineSupport();
window.offlineSupport = offlineSupport;

// Add CSS for offline mode
const style = document.createElement('style');
style.textContent = `
  .offline-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  
  .retry-button {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 10px;
  }
  
  .retry-button:hover {
    background: rgba(255,255,255,0.3);
  }
  
  .network-disabled {
    opacity: 0.7;
    cursor: not-allowed !important;
  }
  
  body.offline-mode .online-only {
    display: none !important;
  }
  
  body.offline-mode .offline-only {
    display: block !important;
  }
`;
document.head.appendChild(style); 