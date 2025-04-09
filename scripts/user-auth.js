// User Authentication Manager
// Enhances existing auth system with additional features for user management, data synchronization,
// passwordless login, and social authentication

class UserAuthManager {
  constructor() {
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.currentUser = null;
    this.authStateListeners = [];
    this.providers = {
      google: new firebase.auth.GoogleAuthProvider(),
      facebook: new firebase.auth.FacebookAuthProvider(),
      twitter: new firebase.auth.TwitterAuthProvider(),
      apple: new firebase.auth.OAuthProvider('apple.com')
    };
    
    // Initialize authentication state observer
    this.initAuthStateObserver();
  }
  
  // Initialize the auth state observer
  initAuthStateObserver() {
    this.auth.onAuthStateChanged(user => {
      this.currentUser = user;
      
      if (user) {
        // User is signed in
        this._saveUserToLocalStorage(user);
        this._updateUserLastLoginTime(user.uid);
        this._syncUserData(user.uid);
      } else {
        // User is signed out
        localStorage.removeItem('currentUser');
      }
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(user));
    });
  }
  
  // Save minimal user info to localStorage for quick access
  _saveUserToLocalStorage(user) {
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      lastLogin: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
  }
  
  // Update user's last login time in Firestore
  async _updateUserLastLoginTime(uid) {
    try {
      await this.db.collection('users').doc(uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login time:', error);
    }
  }
  
  // Sync user data between local storage and Firestore
  async _syncUserData(uid) {
    try {
      // Get user's data from Firestore
      const userDoc = await this.db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Check if local data needs to be uploaded
        this._syncLocalDataToCloud(uid, userData);
        
        // Check if cloud data needs to be downloaded
        this._syncCloudDataToLocal(userData);
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }
  
  // Sync local data to Firestore if it's newer
  async _syncLocalDataToCloud(uid, cloudData) {
    // Implementation will check local storage timestamps and upload newer data
    console.log('Syncing local data to cloud for user:', uid);
    
    // This would include syncing food logs, water intake, etc.
    // that were recorded while offline
  }
  
  // Sync Firestore data to local storage if it's newer
  _syncCloudDataToLocal(cloudData) {
    console.log('Syncing cloud data to local storage');
    
    // This would include downloading updated settings, goals, etc.
    // from Firestore to local storage
  }
  
  // Register a new user with email and password
  async registerWithEmail(email, password, displayName) {
    try {
      // Create user account
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await user.updateProfile({ displayName });
      
      // Create user document in Firestore
      await this.db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email,
        displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        preferences: {
          calorieGoal: 2000,
          proteinGoal: 150,
          carbsGoal: 200,
          fatGoal: 65,
          theme: 'light',
          language: 'en'
        }
      });
      
      // Send email verification
      await user.sendEmailVerification();
      
      return { success: true, user };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Sign in with email and password
  async loginWithEmail(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Sign in with a social provider
  async loginWithSocialProvider(providerName) {
    try {
      const provider = this.providers[providerName];
      if (!provider) {
        throw new Error(`Provider ${providerName} not supported`);
      }
      
      // Add scopes for additional permissions if needed
      if (providerName === 'google') {
        provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      }
      
      const userCredential = await this.auth.signInWithPopup(provider);
      const user = userCredential.user;
      const isNewUser = userCredential.additionalUserInfo.isNewUser;
      
      if (isNewUser) {
        // Create user document for new social sign-in users
        await this.db.collection('users').doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          authProvider: providerName,
          preferences: {
            calorieGoal: 2000,
            proteinGoal: 150,
            carbsGoal: 200,
            fatGoal: 65,
            theme: 'light',
            language: 'en'
          }
        });
      }
      
      return { success: true, user, isNewUser };
    } catch (error) {
      console.error(`Error signing in with ${providerName}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Send a password reset email
  async sendPasswordResetEmail(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Send email verification to current user
  async sendEmailVerification() {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      await this.currentUser.sendEmailVerification();
      return { success: true };
    } catch (error) {
      console.error('Error sending email verification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update user profile information
  async updateProfile(profileData) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      const { displayName, photoURL } = profileData;
      
      // Update profile in Firebase Auth
      await this.currentUser.updateProfile({ displayName, photoURL });
      
      // Update profile in Firestore
      await this.db.collection('users').doc(this.currentUser.uid).update({
        displayName,
        photoURL,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update local storage
      this._saveUserToLocalStorage(this.currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update user email
  async updateEmail(newEmail) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      // Update email in Firebase Auth
      await this.currentUser.updateEmail(newEmail);
      
      // Update email in Firestore
      await this.db.collection('users').doc(this.currentUser.uid).update({
        email: newEmail,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Send new verification email
      await this.currentUser.sendEmailVerification();
      
      // Update local storage
      this._saveUserToLocalStorage(this.currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating email:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update user password
  async updatePassword(newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      await this.currentUser.updatePassword(newPassword);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Sign out user
  async signOut() {
    try {
      await this.auth.signOut();
      
      // Clear local storage
      localStorage.removeItem('currentUser');
      
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Delete user account and associated data
  async deleteAccount() {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      const uid = this.currentUser.uid;
      
      // Delete user data from Firestore collections
      const batch = this.db.batch();
      
      // Delete user document
      batch.delete(this.db.collection('users').doc(uid));
      
      // Delete food logs
      batch.delete(this.db.collection('foodLogs').doc(uid));
      
      // Delete food history
      batch.delete(this.db.collection('foodHistory').doc(uid));
      
      // Delete favorites
      batch.delete(this.db.collection('favorites').doc(uid));
      
      // Delete recipes
      batch.delete(this.db.collection('recipes').doc(uid));
      
      // Delete meal plans
      batch.delete(this.db.collection('mealPlans').doc(uid));
      
      // Delete water tracker data
      batch.delete(this.db.collection('waterTracker').doc(uid));
      
      // Execute batch delete
      await batch.commit();
      
      // Delete user account from Firebase Auth
      await this.currentUser.delete();
      
      // Clear local storage
      localStorage.removeItem('currentUser');
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Export user data for backup
  async exportUserData() {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      const uid = this.currentUser.uid;
      
      // Fetch user data from various collections
      const userData = await this._fetchUserCollectionData(uid);
      
      // Convert to JSON
      const jsonData = JSON.stringify(userData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Helper method to fetch user data from collections
  async _fetchUserCollectionData(uid) {
    const userData = {
      profile: {},
      foodLogs: {},
      recipes: [],
      mealPlans: {},
      waterTracker: {},
      favorites: []
    };
    
    try {
      // Fetch user profile
      const profileDoc = await this.db.collection('users').doc(uid).get();
      if (profileDoc.exists) {
        userData.profile = profileDoc.data();
      }
      
      // Fetch food logs
      const foodLogsDoc = await this.db.collection('foodLogs').doc(uid).get();
      if (foodLogsDoc.exists) {
        userData.foodLogs = foodLogsDoc.data().logs || {};
      }
      
      // Fetch recipes
      const recipesDoc = await this.db.collection('recipes').doc(uid).get();
      if (recipesDoc.exists) {
        userData.recipes = recipesDoc.data().items || [];
      }
      
      // Fetch meal plans
      const mealPlansDoc = await this.db.collection('mealPlans').doc(uid).get();
      if (mealPlansDoc.exists) {
        userData.mealPlans = mealPlansDoc.data().plans || {};
      }
      
      // Fetch water tracker data
      const waterTrackerDoc = await this.db.collection('waterTracker').doc(uid).get();
      if (waterTrackerDoc.exists) {
        userData.waterTracker = waterTrackerDoc.data() || {};
      }
      
      // Fetch favorites
      const favoritesDoc = await this.db.collection('favorites').doc(uid).get();
      if (favoritesDoc.exists) {
        userData.favorites = favoritesDoc.data().meals || [];
      }
      
      return userData;
    } catch (error) {
      console.error('Error fetching user collection data:', error);
      throw error;
    }
  }
  
  // Import user data from backup
  async importUserData(jsonData) {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }
      
      const uid = this.currentUser.uid;
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      // Validate data format
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // Import data to collections
      await this._importUserCollectionData(uid, data);
      
      return { success: true };
    } catch (error) {
      console.error('Error importing user data:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Helper method to import user data to collections
  async _importUserCollectionData(uid, data) {
    const batch = this.db.batch();
    
    try {
      // Import user profile (selected fields only)
      if (data.profile) {
        const profileRef = this.db.collection('users').doc(uid);
        const safeProfileData = {
          preferences: data.profile.preferences || {},
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        batch.update(profileRef, safeProfileData);
      }
      
      // Import food logs
      if (data.foodLogs) {
        const foodLogsRef = this.db.collection('foodLogs').doc(uid);
        batch.set(foodLogsRef, { logs: data.foodLogs }, { merge: true });
      }
      
      // Import recipes
      if (data.recipes && Array.isArray(data.recipes)) {
        const recipesRef = this.db.collection('recipes').doc(uid);
        batch.set(recipesRef, { items: data.recipes }, { merge: true });
      }
      
      // Import meal plans
      if (data.mealPlans) {
        const mealPlansRef = this.db.collection('mealPlans').doc(uid);
        batch.set(mealPlansRef, { plans: data.mealPlans }, { merge: true });
      }
      
      // Import water tracker data
      if (data.waterTracker) {
        const waterTrackerRef = this.db.collection('waterTracker').doc(uid);
        batch.set(waterTrackerRef, data.waterTracker, { merge: true });
      }
      
      // Import favorites
      if (data.favorites && Array.isArray(data.favorites)) {
        const favoritesRef = this.db.collection('favorites').doc(uid);
        batch.set(favoritesRef, { meals: data.favorites }, { merge: true });
      }
      
      // Execute batch
      await batch.commit();
    } catch (error) {
      console.error('Error importing user collection data:', error);
      throw error;
    }
  }
  
  // Add auth state change listener
  addAuthStateListener(listener) {
    if (typeof listener === 'function') {
      this.authStateListeners.push(listener);
      
      // Immediately call with current state
      listener(this.currentUser);
      
      return true;
    }
    return false;
  }
  
  // Remove auth state change listener
  removeAuthStateListener(listener) {
    const index = this.authStateListeners.indexOf(listener);
    if (index !== -1) {
      this.authStateListeners.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Check if user is logged in
  isLoggedIn() {
    return !!this.currentUser;
  }
  
  // Check if email is verified
  isEmailVerified() {
    return this.currentUser ? this.currentUser.emailVerified : false;
  }
}

// Initialize and export instance
const userAuthManager = new UserAuthManager();
window.userAuthManager = userAuthManager; // Make accessible globally 