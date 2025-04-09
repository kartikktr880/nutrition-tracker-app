// auth.js - Basic authentication functions for the Nutrition Tracker app

// Auth functions are now defined in the global scope through firebase-config.js
// This file mainly handles UI interactions and basic auth state management

document.addEventListener('DOMContentLoaded', function() {
    // Initialize auth state
    checkAuthState();
    
    // Set up event listeners for logout buttons
    setupLogoutListeners();
});

// Check authentication state and update UI accordingly
function checkAuthState() {
    // Access the Firebase auth object
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // User is signed in
                updateUIForSignedInUser(user);
            } else {
                // User is signed out
                updateUIForSignedOutUser();
            }
        });
    }
}

// Update UI for signed in user
function updateUIForSignedInUser(user) {
    // Update login/logout elements
    document.getElementById('login-item') && (document.getElementById('login-item').style.display = 'none');
    document.getElementById('logout-item') && (document.getElementById('logout-item').style.display = 'block');
    document.getElementById('nav-login-item') && (document.getElementById('nav-login-item').style.display = 'none');
    document.getElementById('nav-logout-item') && (document.getElementById('nav-logout-item').style.display = 'block');
    
    // Update user name elements if they exist
    const userNameElements = document.querySelectorAll('.user-name');
    if (userNameElements.length > 0) {
        const displayName = user.displayName || user.email.split('@')[0];
        userNameElements.forEach(el => {
            el.textContent = displayName;
        });
    }
}

// Update UI for signed out user
function updateUIForSignedOutUser() {
    // Update login/logout elements
    document.getElementById('login-item') && (document.getElementById('login-item').style.display = 'block');
    document.getElementById('logout-item') && (document.getElementById('logout-item').style.display = 'none');
    document.getElementById('nav-login-item') && (document.getElementById('nav-login-item').style.display = 'block');
    document.getElementById('nav-logout-item') && (document.getElementById('nav-logout-item').style.display = 'none');
}

// Set up event listeners for logout buttons
function setupLogoutListeners() {
    // Find all logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn, #logout-item, #nav-logout-item, [data-action="logout"]');
    
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logoutUser();
            });
        }
    });
}

// Handle logout
function logoutUser() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(function() {
            // Sign-out successful
            console.log('User signed out successfully');
            window.location.href = 'login.html';
        }).catch(function(error) {
            // An error happened
            console.error('Logout Error:', error);
            alert('Error signing out. Please try again.');
        });
    }
}

// This file checks if a user is logged in and redirects to login page if not
document.addEventListener('DOMContentLoaded', function() {
    // Check if current user exists in localStorage
    const currentUser = localStorage.getItem('currentUser');
    
    // Get the current page
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that require authentication
    const protectedPages = ['tracker.html', 'meal-planner.html', 'profile.html', 'meal-suggestions.html', 'favorites.html', 'food-search.html', 'dashboard.html'];
    
    // Check if we're on a protected page
    if (protectedPages.includes(currentPage)) {
        // If no user is logged in, redirect to login page
        if (!currentUser) {
            // Save the page they were trying to access
            localStorage.setItem('redirectAfterLogin', currentPage);
            
            // Redirect to login page
            window.location.href = 'login.html';
        }
    }
});

// Import all necessary Firebase Auth components
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    FacebookAuthProvider, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize authentication providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Export all the necessary functions and objects
export { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    googleProvider, 
    facebookProvider, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    doc, 
    setDoc, 
    serverTimestamp, 
    getDoc, 
    sendPasswordResetEmail,
    onAuthStateChanged
};

// Function to sign in with Google
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // Check if user exists in Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            
            // If user doesn't exist, create a new document
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", result.user.uid), {
                    name: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    createdAt: serverTimestamp(),
                    preferences: {
                        calorieGoal: 2000,
                        proteinGoal: 150,
                        carbsGoal: 225,
                        fatGoal: 65
                    }
                });
            }
        } catch (firestoreError) {
            console.error("Error checking/creating user document:", firestoreError);
            // Continue anyway since auth was successful
        }
        return result;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
}

// Function to sign in with Facebook
export async function signInWithFacebook() {
    try {
        const result = await signInWithPopup(auth, facebookProvider);
        // Check if user exists in Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            
            // If user doesn't exist, create a new document
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", result.user.uid), {
                    name: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    createdAt: serverTimestamp(),
                    preferences: {
                        calorieGoal: 2000,
                        proteinGoal: 150,
                        carbsGoal: 225,
                        fatGoal: 65
                    }
                });
            }
        } catch (firestoreError) {
            console.error("Error checking/creating user document:", firestoreError);
            // Continue anyway since auth was successful
        }
        return result;
    } catch (error) {
        console.error("Error signing in with Facebook:", error);
        throw error;
    }
}

// Send password reset email
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: "Password reset email sent! Please check your inbox." };
    } catch (error) {
        console.error("Error sending password reset email:", error);
        
        let errorMessage = "Failed to send password reset email. Please try again.";
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = "No account found with this email";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format";
        }
        
        throw { code: error.code, message: errorMessage };
    }
} 