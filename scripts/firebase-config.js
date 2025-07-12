import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqaqMiGkPNocVLpYYTrsybLFrW7JliPpI",
    authDomain: "nutrition-tracking-c98bd.firebaseapp.com",
    projectId: "nutrition-tracking-c98bd",
    storageBucket: "nutrition-tracking-c98bd.appspot.com",
    messagingSenderId: "264877786232",
    appId: "1:264877786232:web:e45ac9f37649c5b57ad98d",
    measurementId: "G-0VB4P3TVFH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const firebaseAuth = firebase.auth();
const firebaseDb = firebase.firestore();

// Export configuration and services
window.firebaseServices = {
    auth: firebaseAuth,
    db: firebaseDb,
    config: firebaseConfig
};

// Check if user is authenticated and update UI
function initializeAuth() {
    return new Promise((resolve) => {
        firebaseAuth.onAuthStateChanged((user) => {
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
                // Clear user from localStorage
                localStorage.removeItem('currentUser');
            }
            resolve(user);
        });
    });
}

// User authentication functions
async function registerUser(email, password, displayName) {
    try {
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName });
        
        // Create user document in Firestore
        await firebaseDb.collection("users").doc(userCredential.user.uid).set({
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

async function loginUser(email, password) {
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        logError("Error logging in:", error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        await firebaseAuth.signOut();
        return { success: true };
    } catch (error) {
        logError("Error logging out:", error);
        return { success: false, error: error.message };
    }
}

// User data functions
async function getUserProfile(userId) {
    try {
        const docRef = firebaseDb.collection("users").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            return { success: true, data: docSnap.data() };
        } else {
            return { success: false, error: "User profile not found" };
        }
    } catch (error) {
        logError("Error getting user profile:", error);
        return { success: false, error: error.message };
    }
}

async function updateUserProfile(userId, profileData) {
    try {
        const docRef = firebaseDb.collection("users").doc(userId);
        await docRef.update(profileData);
        return { success: true };
    } catch (error) {
        logError("Error updating user profile:", error);
        return { success: false, error: error.message };
    }
}

// Nutrition tracking functions
async function saveFoodLog(userId, date, foodLog) {
    try {
        const docRef = firebaseDb.collection("foodLogs").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            // Update existing document
            const logs = docSnap.data().logs || {};
            logs[date] = foodLog;
            
            await docRef.update({ logs });
        } else {
            // Create new document
            await docRef.set({ 
                logs: { [date]: foodLog }
            });
        }
        
        // Add to history collection for analytics
        await saveFoodHistory(userId, date, foodLog);
        
        return { success: true };
    } catch (error) {
        logError("Error saving food log:", error);
        return { success: false, error: error.message };
    }
}

async function getFoodLog(userId, date) {
    try {
        const docRef = firebaseDb.collection("foodLogs").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists && docSnap.data().logs && docSnap.data().logs[date]) {
            return { success: true, data: docSnap.data().logs[date] };
        } else {
            return { success: true, data: { breakfast: [], lunch: [], dinner: [], snacks: [] } };
        }
    } catch (error) {
        logError("Error getting food log:", error);
        return { success: false, error: error.message };
    }
}

async function saveFoodHistory(userId, date, foodLog) {
    try {
        // Calculate totals from the food log
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
        
        const docRef = firebaseDb.collection("foodHistory").doc(userId);
        const docSnap = await docRef.get();
        
        const historyEntry = { date, totals };
        
        if (docSnap.exists) {
            // Check if entry for this date already exists
            const history = docSnap.data().history || [];
            const existingIndex = history.findIndex(entry => entry.date === date);
            
            if (existingIndex >= 0) {
                // Update existing entry
                history[existingIndex] = historyEntry;
            } else {
                // Add new entry
                history.push(historyEntry);
            }
            
            await docRef.update({ history });
        } else {
            // Create new document
            await docRef.set({
                history: [historyEntry]
            });
        }
        
        return { success: true };
    } catch (error) {
        logError("Error saving food history:", error);
        return { success: false, error: error.message };
    }
}

async function getFoodHistory(userId, days = 30) {
    try {
        const docRef = firebaseDb.collection("foodHistory").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const history = docSnap.data().history || [];
            // Sort by date (descending) and limit to specified days
            const sortedHistory = history
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, days);
            
            return { success: true, data: sortedHistory };
        } else {
            return { success: true, data: [] };
        }
    } catch (error) {
        logError("Error getting food history:", error);
        return { success: false, error: error.message };
    }
}

async function saveFavorite(userId, meal) {
    try {
        // Generate a unique ID for the meal if it doesn't have one
        if (!meal.id) {
            meal.id = firebaseDb.collection("temp").doc().id; // Create a new ID
        }
        
        const docRef = firebaseDb.collection("favorites").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            // Update existing document
            const meals = docSnap.data().meals || [];
            
            // Check if already in favorites
            const existingIndex = meals.findIndex(m => m.id === meal.id);
            if (existingIndex >= 0) {
                return { success: true, message: "Meal already in favorites" };
            }
            
            await docRef.update({
                meals: firebase.firestore.FieldValue.arrayUnion(meal)
            });
        } else {
            // Create new document
            await docRef.set({
                meals: [meal]
            });
        }
        
        return { success: true };
    } catch (error) {
        logError("Error saving favorite:", error);
        return { success: false, error: error.message };
    }
}

async function removeFavorite(userId, mealId) {
    try {
        const docRef = firebaseDb.collection("favorites").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const meals = docSnap.data().meals || [];
            const updatedMeals = meals.filter(meal => meal.id !== mealId);
            
            await docRef.update({ meals: updatedMeals });
        }
        
        return { success: true };
    } catch (error) {
        logError("Error removing favorite:", error);
        return { success: false, error: error.message };
    }
}

async function getFavorites(userId) {
    try {
        const docRef = firebaseDb.collection("favorites").doc(userId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const meals = docSnap.data().meals || [];
            return { success: true, data: meals };
        } else {
            return { success: true, data: [] };
        }
    } catch (error) {
        logError("Error getting favorites:", error);
        return { success: false, error: error.message };
    }
}

// Expose functions globally for easier access
window.firebaseUtils = {
    initializeAuth,
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    saveFoodLog,
    getFoodLog,
    saveFoodHistory,
    getFoodHistory,
    saveFavorite,
    removeFavorite,
    getFavorites
}; 