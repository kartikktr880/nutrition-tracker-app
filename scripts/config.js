// Configuration Module
// Stores and manages application configuration

class Config {
  constructor() {
    this.config = {
      firebase: this.loadFirebaseConfig(),
      security: this.loadSecurityConfig(),
      api: this.loadApiConfig()
    };
  }

  // Load Firebase configuration
  loadFirebaseConfig() {
    // In production, this should be loaded from a secure backend endpoint
    // For development, we'll use environment variables or fallback to placeholder values
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

  // Load security configuration
  loadSecurityConfig() {
    return {
      sessionTimeout: 3600 * 1000, // 1 hour
      maxLoginAttempts: 5,
      loginAttemptWindow: 300 * 1000, // 5 minutes
      maxOperationAge: 24 * 60 * 60 * 1000, // 24 hours
      maxPendingOperations: 100,
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      csrfSecret: process.env.CSRF_SECRET || 'placeholder_secret'
    };
  }

  // Load API configuration
  loadApiConfig() {
    return {
      rateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
      rateWindow: parseInt(process.env.API_RATE_WINDOW) || 3600,
      baseUrl: process.env.API_BASE_URL || 'https://api.nutritiontracker.com',
      timeout: 30000 // 30 seconds
    };
  }

  // Get configuration
  get(key) {
    return this.config[key];
  }

  // Get nested configuration
  getNested(key, subKey) {
    return this.config[key]?.[subKey];
  }

  // Update configuration
  update(key, value) {
    if (this.config[key]) {
      this.config[key] = { ...this.config[key], ...value };
      return true;
    }
    return false;
  }

  // Validate configuration
  validate() {
    const requiredKeys = ['firebase', 'security', 'api'];
    const missingKeys = requiredKeys.filter(key => !this.config[key]);
    
    if (missingKeys.length > 0) {
      console.error('Missing required configuration:', missingKeys);
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export const config = new Config();

// Configuration settings for the application
export const config = {
    // USDA Food Data Central API configuration
    usda: {
        apiKey: 'dSS7CH7xS0LdKHSV9DhK11FcKFx8CM6rmcfRfrbE', // Replace with your actual API key
        baseUrl: 'https://api.nal.usda.gov/fdc/v1'
    },
    
    // Application settings
    app: {
        name: 'Nutrition Tracker',
        version: '1.0.0'
    },
    
    // Feature flags
    features: {
        enableUsdaSearch: true,
        enableOfflineMode: false,
        enableDataExport: false
    }
};

export default config; 


// Focus on another area of the nutrition tracker

// i don't have idea but if  needed also can help to improve tool website or web app enhancement and user experience so go for it. keep in mind not add those  features that can slow website performance and can frustrate users