// auth-core.js - Unified authentication module for the Nutrition Tracker app

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail,
    setPersistence,
    browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Protected pages that require authentication
const PROTECTED_PAGES = [
    'dashboard.html',
    'tracker.html',
    'meal-planner.html',
    'food-search.html',
    'profile.html',
    'meal-suggestions.html',
    'favorites.html'
];

// Default user preferences
const DEFAULT_PREFERENCES = {
    calorieGoal: 2000,
    proteinGoal: 150,
    carbsGoal: 225,
    fatGoal: 65,
    theme: 'light',
    units: 'metric',
    notifications: true
};

// Initialize auth handler
export function initAuthHandler() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isProtectedPage = PROTECTED_PAGES.includes(currentPage);
    
    // Check protected pages immediately
    if (isProtectedPage) {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            return;
        }
    }
    
    // Listen for auth state changes
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            handleSignedInUser(user, currentPage);
        } else {
            // User is signed out
            handleSignedOutUser(currentPage, isProtectedPage);
        }
    });
}

// Handle signed in user
async function handleSignedInUser(user, currentPage) {
    // Store minimal user info in localStorage
    localStorage.setItem('currentUser', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email
    }));
    
    // Update last login time
    try {
        await updateDoc(doc(db, "users", user.uid), {
            lastLogin: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating last login time:', error);
    }
    
    // Update UI elements
    updateUIElements(user);
    
    // Handle redirects
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPage = urlParams.get('redirect');
        
        if (redirectPage && PROTECTED_PAGES.includes(redirectPage)) {
            window.location.href = redirectPage;
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

// Handle signed out user
function handleSignedOutUser(currentPage, isProtectedPage) {
    // Clear user from localStorage
    localStorage.removeItem('currentUser');
    
    // Update UI elements
    updateUIElements(null);
    
    // Redirect if on protected page
    if (isProtectedPage) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
    }
}

// Update UI elements based on auth state
function updateUIElements(user) {
    if (user) {
        // User is signed in
        document.getElementById('login-item')?.style.display = 'none';
        document.getElementById('logout-item')?.style.display = 'block';
        document.getElementById('nav-login-item')?.style.display = 'none';
        document.getElementById('nav-logout-item')?.style.display = 'block';
        
        // Update user name elements
        const userNameElements = document.querySelectorAll('.user-name');
        if (userNameElements.length > 0) {
            const displayName = user.displayName || user.email.split('@')[0];
            userNameElements.forEach(el => {
                el.textContent = displayName;
            });
        }
    } else {
        // User is signed out
        document.getElementById('login-item')?.style.display = 'block';
        document.getElementById('logout-item')?.style.display = 'none';
        document.getElementById('nav-login-item')?.style.display = 'block';
        document.getElementById('nav-logout-item')?.style.display = 'none';
    }
}

// Check if email exists
export async function checkIfEmailExists(email) {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        return { exists: methods.length > 0, methods };
    } catch (error) {
        console.error('Email check error:', error);
        return { exists: false, error: error.message };
    }
}

// Register with email/password
export async function registerWithEmail(name, email, password) {
    try {
        // Check if email exists
        const { exists } = await checkIfEmailExists(email);
        if (exists) {
            return { success: false, error: 'An account with this email already exists' };
        }
        
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user document
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name,
            email,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            preferences: DEFAULT_PREFERENCES
        });
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

// Login with email/password
export async function loginWithEmail(email, password) {
    try {
        // Set persistence
        await setPersistence(auth, browserLocalPersistence);
        
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update last login
        await updateDoc(doc(db, "users", userCredential.user.uid), {
            lastLogin: serverTimestamp()
        });
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Sign in with Google
export async function signInWithGoogle() {
    try {
        // Set persistence
        await setPersistence(auth, browserLocalPersistence);
        
        // Sign in
        const result = await signInWithPopup(auth, googleProvider);
        
        // Create/update user document
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", result.user.uid), {
                name: result.user.displayName || '',
                email: result.user.email,
                photoURL: result.user.photoURL || '',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                preferences: DEFAULT_PREFERENCES
            });
        } else {
            await updateDoc(doc(db, "users", result.user.uid), {
                lastLogin: serverTimestamp()
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Google sign-in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign in with Facebook
export async function signInWithFacebook() {
    try {
        // Set persistence
        await setPersistence(auth, browserLocalPersistence);
        
        // Sign in
        const result = await signInWithPopup(auth, facebookProvider);
        
        // Create/update user document
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", result.user.uid), {
                name: result.user.displayName || '',
                email: result.user.email,
                photoURL: result.user.photoURL || '',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                preferences: DEFAULT_PREFERENCES
            });
        } else {
            await updateDoc(doc(db, "users", result.user.uid), {
                lastLogin: serverTimestamp()
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Facebook sign-in error:', error);
        return { success: false, error: error.message };
    }
}

// Reset password
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Export auth instance and providers
export { auth, db, googleProvider, facebookProvider }; 