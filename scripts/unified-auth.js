// unified-auth.js - Comprehensive authentication handler for all pages

// Initialize Firebase Auth
const auth = firebase.auth();
const db = firebase.firestore();

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
            console.log('Access denied: Authentication required');
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
                console.log('Access denied: Firebase authentication required');
                window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            }
        });
    }
})();

// Global authentication object
window.auth = {
    initAuthHandler,
    injectUserMenuStyles,
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
    
    // User menu elements
    let userMenuContainer = document.querySelector('.user-menu');
    const hasUserMenu = !!userMenuContainer;
    
    if (!userMenuContainer && document.querySelector('header nav ul')) {
        // If user menu container doesn't exist but we have a navigation, create it
        const navList = document.querySelector('header nav ul');
        const menuItem = document.createElement('li');
        userMenuContainer = document.createElement('div');
        userMenuContainer.className = 'user-menu';
        menuItem.appendChild(userMenuContainer);
        navList.appendChild(menuItem);
    }
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.displayName || user.email);
            
            // Store minimal user info in localStorage for backward compatibility
            localStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email
            }));
            
            if (hasUserMenu) {
                // Update user menu
                updateUserMenu(userMenuContainer, user);
            }
            
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
            console.log('User signed out');
            
            // Clear user from localStorage
            localStorage.removeItem('currentUser');
            
            if (hasUserMenu) {
                // Show sign in link
                userMenuContainer.innerHTML = '<a href="login.html">Sign In</a>';
            }
            
            // Update any other UI elements that show user state
            updateUIElements(null);
            
            // If on a protected page and not authenticated, redirect to login
            if (isProtectedPage) {
                console.log('Protected page access denied: redirecting to login');
                window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
            }
        }
    });
    
    // Add event listeners if we're on a page with the user menu
    if (hasUserMenu) {
        document.addEventListener('click', handleAuthClick);
    }
}

// Update the user menu with user info and logout option
function updateUserMenu(container, user) {
    const displayName = user.displayName || user.email.split('@')[0];
    
    container.innerHTML = `
        <div class="user-info">
            <span class="username">${displayName}</span>
            <i class="fas fa-caret-down"></i>
        </div>
        <div class="dropdown-menu">
            <a href="profile.html">Profile</a>
            <a href="dashboard.html">Dashboard</a>
            <a href="#" id="logoutButton">Logout</a>
        </div>
    `;
    
    // Add event listener for dropdown toggle
    const userInfo = container.querySelector('.user-info');
    userInfo.addEventListener('click', () => {
        container.querySelector('.dropdown-menu').classList.toggle('show');
    });
}

// Update other UI elements based on auth state
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
        
        // Add a welcome message if header-username exists
        const headerUsername = document.getElementById('header-username');
        if (headerUsername) {
            headerUsername.textContent = user.displayName || 'User';
        }
    } else {
        // User is signed out
        document.getElementById('login-item') && (document.getElementById('login-item').style.display = 'block');
        document.getElementById('logout-item') && (document.getElementById('logout-item').style.display = 'none');
        document.getElementById('nav-login-item') && (document.getElementById('nav-login-item').style.display = 'block');
        document.getElementById('nav-logout-item') && (document.getElementById('nav-logout-item').style.display = 'none');
    }
}

// Handle authentication-related clicks
async function handleAuthClick(e) {
    // Handle logout button click
    if (e.target.id === 'logoutButton' || e.target.closest('#logoutButton')) {
        e.preventDefault();
        await logoutUser();
        
        // Close dropdown menu
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// Injects user menu styles
function injectUserMenuStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .user-menu {
            position: relative;
            display: inline-block;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background-color 0.3s;
        }
        
        .user-info:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        .username {
            margin-right: 8px;
            font-weight: 500;
        }
        
        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            padding: 8px 0;
            display: none;
            z-index: 100;
            width: 160px;
        }
        
        .dropdown-menu.show {
            display: block;
        }
        
        .dropdown-menu a {
            display: block;
            padding: 8px 16px;
            color: #333;
            text-decoration: none;
            transition: background-color 0.3s;
        }
        
        .dropdown-menu a:hover {
            background-color: #f5f5f5;
        }
    `;
    document.head.appendChild(style);
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
        console.error('Error checking email:', error);
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
        console.error('Login error:', error);
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
        console.error('Registration error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        const userCredential = await auth.signInWithPopup(googleProvider);
        const user = userCredential.user;
        const isNewUser = userCredential.additionalUserInfo.isNewUser;
        
        if (isNewUser) {
            // Create user document for new user
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                authProvider: 'google'
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
        } else {
            // Update last login for existing user
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return {
            success: true,
            isNewUser,
            user
        };
    } catch (error) {
        console.error('Google sign in error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Sign in with Facebook
async function signInWithFacebook() {
    try {
        const userCredential = await auth.signInWithPopup(facebookProvider);
        const user = userCredential.user;
        const isNewUser = userCredential.additionalUserInfo.isNewUser;
        
        if (isNewUser) {
            // Create user document for new user
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                authProvider: 'facebook'
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
        } else {
            // Update last login for existing user
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return {
            success: true,
            isNewUser,
            user
        };
    } catch (error) {
        console.error('Facebook sign in error:', error);
        return {
            success: false,
            error: error.message
        };
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
        console.error('Password reset error:', error);
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
        console.error('Logout error:', error);
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
    injectUserMenuStyles();
}); 