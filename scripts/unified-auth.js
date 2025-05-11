// unified-auth.js - Comprehensive authentication handler for all pages

// Get Firebase services
const { auth, db } = window.firebaseServices;

// Initialize providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Detect if this is a protected page that requires authentication
const PROTECTED_PAGES = [
    'dashboard.html',
    'tracker.html',
    'meal-planner.html',
    'food-search.html',
    'profile.html'
];

// Immediate authentication check on page load for protected pages
(function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isProtectedPage = PROTECTED_PAGES.includes(currentPage);
    
    if (isProtectedPage) {
        // Check if user is logged in via localStorage first for immediate feedback
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            // Redirect immediately to prevent page content from loading
            // console.log('Access denied: Authentication required');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            // Stop further execution
            throw new Error('Authentication required');
        }
        
        // Additional verification with Firebase (more secure)
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Unsubscribe immediately after first check
            if (!user) {
                // Clear any potentially incorrect local storage
                localStorage.removeItem('currentUser');
                // console.log('Access denied: Firebase authentication required');
                window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            }
        });
    }
})();

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email
        }));
        
        // Update last login time
        db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            // console.error('Error updating last login time:', error);
        });
    } else {
        // User is signed out
        localStorage.removeItem('currentUser');
    }
});

// Export auth instance and functions globally
window.auth = {
    auth: auth, // The actual Firebase auth instance
    db: db, // The Firestore instance
    initAuthHandler,
    checkIfEmailExists,
    loginWithEmail,
    registerWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    resetPassword,
    logoutUser,
    onAuthStateChange
};

// Initialize auth handler
function initAuthHandler() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isProtectedPage = PROTECTED_PAGES.includes(currentPage);
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            // console.log('User signed in:', user.displayName || user.email);
            
            // Store minimal user info in localStorage for backward compatibility
            localStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email
            }));
            
            // Update any other UI elements that show user state
            updateUIElements(user);
            
            // If we're on login/signup page and user is authenticated, redirect to dashboard
            if (currentPage === 'login.html' || currentPage === 'signup.html') {
                // Check if there's a redirect parameter
                const urlParams = new URLSearchParams(window.location.search);
                const redirectPage = urlParams.get('redirect');
                
                if (redirectPage && PROTECTED_PAGES.includes(redirectPage)) {
                    window.location.href = redirectPage;
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        } else {
            // User is signed out
            // console.log('User signed out');
            
            // Clear user from localStorage
            localStorage.removeItem('currentUser');
            
            // Update any other UI elements that show user state
            updateUIElements(null);
            
            // If on a protected page and not authenticated, redirect to login
            if (isProtectedPage) {
                // console.log('Protected page access denied: redirecting to login');
                window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            }
        }
    });
}

// Update UI elements based on auth state
function updateUIElements(user) {
    if (user) {
        // User is signed in
        document.getElementById('login-item') && (document.getElementById('login-item').style.display = 'none');
        document.getElementById('logout-item') && (document.getElementById('logout-item').style.display = 'block');
        document.getElementById('nav-login-item') && (document.getElementById('nav-login-item').style.display = 'none');
        document.getElementById('nav-logout-item') && (document.getElementById('nav-logout-item').style.display = 'block');
        
        // Update user name if elements exist
        const userNameElements = document.querySelectorAll('.user-name');
        if (userNameElements.length > 0) {
            userNameElements.forEach(el => {
                el.textContent = user.displayName || 'User';
            });
        }
    } else {
        // User is signed out
        document.getElementById('login-item') && (document.getElementById('login-item').style.display = 'block');
        document.getElementById('logout-item') && (document.getElementById('logout-item').style.display = 'none');
        document.getElementById('nav-login-item') && (document.getElementById('nav-login-item').style.display = 'block');
        document.getElementById('nav-logout-item') && (document.getElementById('nav-logout-item').style.display = 'none');
    }
}

// Check if email exists
async function checkIfEmailExists(email) {
    try {
        const signInMethods = await auth.fetchSignInMethodsForEmail(email);
        return {
            exists: signInMethods.length > 0,
            methods: signInMethods
        };
    } catch (error) {
        // console.error('Error checking email:', error);
        return {
            exists: false,
            error: error.message
        };
    }
}

// Login with email/password
async function loginWithEmail(email, password) {
    try {
        // First check if user exists
        const { exists } = await checkIfEmailExists(email);
        
        if (!exists) {
            return {
                success: false,
                userExists: false,
                error: 'No account found with this email address'
            };
        }
        
        // User exists, attempt to sign in
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update last login timestamp
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            success: true,
            user: user
        };
    } catch (error) {
        // console.error('Login error:', error);
        return {
            success: false,
            userExists: true,
            error: error.message
        };
    }
}

// Register with email/password
async function registerWithEmail(name, email, password) {
    try {
        // Check if email already exists
        const { exists } = await checkIfEmailExists(email);
        
        if (exists) {
            return {
                success: false,
                error: 'An account with this email already exists'
            };
        }
        
        // Create the user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile with display name
        await user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create default profile and user preferences
        await db.collection('userPreferences').doc(user.uid).set({
            theme: 'light',
            units: 'metric',
            notifications: true,
            privacySettings: {
                shareActivity: false,
                shareMeals: false
            }
        });
        
        return {
            success: true,
            user: user
        };
    } catch (error) {
        // console.error('Registration error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Social login functions
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await auth.signInWithPopup(provider);
        
        if (result.user) {
            // Create or update user document in Firestore
            await db.collection('users').doc(result.user.uid).set({
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                authProvider: 'google',
                preferences: {
                    calorieGoal: 2000,
                    proteinGoal: 150,
                    carbsGoal: 225,
                    fatGoal: 65
                }
            }, { merge: true });
            
            // Store minimal user info in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                uid: result.user.uid,
                displayName: result.user.displayName,
                email: result.user.email
            }));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            return result.user;
        }
    } catch (error) {
        // console.error('Google sign in error:', error);
        throw error;
    }
}

async function signInWithFacebook() {
    try {
        const provider = new firebase.auth.FacebookAuthProvider();
        provider.addScope('email');
        provider.addScope('public_profile');
        
        const result = await auth.signInWithPopup(provider);
        
        if (result.user) {
            // Create or update user document in Firestore
            await db.collection('users').doc(result.user.uid).set({
                displayName: result.user.displayName,
                email: result.user.email,
                photoURL: result.user.photoURL,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                authProvider: 'facebook',
                preferences: {
                    calorieGoal: 2000,
                    proteinGoal: 150,
                    carbsGoal: 225,
                    fatGoal: 65
                }
            }, { merge: true });
            
            // Store minimal user info in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                uid: result.user.uid,
                displayName: result.user.displayName,
                email: result.user.email
            }));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            return result.user;
        }
    } catch (error) {
        // console.error('Facebook sign in error:', error);
        throw error;
    }
}

// Reset password
async function resetPassword(email) {
    try {
        // Check if email exists first
        const { exists } = await checkIfEmailExists(email);
        
        if (!exists) {
            return {
                success: false,
                userExists: false,
                error: 'No account found with this email address'
            };
        }
        
        // Send password reset email
        await auth.sendPasswordResetEmail(email);
        
        return {
            success: true
        };
    } catch (error) {
        // console.error('Password reset error:', error);
        return {
            success: false,
            userExists: true,
            error: error.message
        };
    }
}

// Logout user
async function logoutUser() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        // console.error('Logout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Register a callback for auth state changes
function onAuthStateChange(callback) {
    return auth.onAuthStateChanged(callback);
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    initAuthHandler();
}); 