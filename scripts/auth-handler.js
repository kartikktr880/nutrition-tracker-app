// auth-handler.js - Unified authentication handler for all pages
import { onAuthStateChange, logout } from './authentication.js';

// Detect if this is a protected page that requires authentication
const PROTECTED_PAGES = [
    'dashboard.html',
    'tracker.html',
    'meal-planner.html',
    'food-search.html',
    'profile.html'
];

// Initialize auth handler
export function initAuthHandler() {
    const currentPage = window.location.pathname.split('/').pop();
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
    onAuthStateChange((user) => {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.displayName || user.email);
            
            if (hasUserMenu) {
                // Update user menu
                updateUserMenu(userMenuContainer, user);
            }
            
            // If we're on login/signup page and user is authenticated, redirect to dashboard
            if (currentPage === 'login.html' || currentPage === 'signup.html') {
                window.location.href = 'dashboard.html';
            }
        } else {
            // User is signed out
            console.log('User signed out');
            
            if (hasUserMenu) {
                // Show sign in link
                userMenuContainer.innerHTML = '<a href="login.html">Sign In</a>';
            }
            
            // If on a protected page and not authenticated, redirect to login
            if (isProtectedPage) {
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

// Handle auth-related clicks (like logout)
async function handleAuthClick(e) {
    // Check if logout button was clicked
    if (e.target && e.target.id === 'logoutButton') {
        e.preventDefault();
        
        try {
            // Call logout function from authentication.js
            const result = await logout();
            
            if (result.success) {
                // Redirect to home page after logout
                window.location.href = 'index.html';
            } else {
                console.error('Logout failed:', result.error);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Close dropdown menus when clicking outside
    if (!e.target.closest('.user-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}

// CSS styles for user menu
export function injectUserMenuStyles() {
    // Check if styles already exist
    if (document.querySelector('#auth-handler-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'auth-handler-styles';
    style.textContent = `
        .user-menu {
            position: relative;
            cursor: pointer;
        }
        
        .user-menu .user-info {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            color: var(--text-primary);
            font-weight: 500;
        }
        
        .user-menu .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background-color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-md);
            padding: 8px 0;
            min-width: 180px;
            z-index: 1000;
            display: none;
        }
        
        .user-menu .dropdown-menu.show {
            display: block;
        }
        
        .user-menu .dropdown-menu a {
            display: block;
            padding: 8px 15px;
            color: var(--text-primary);
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .user-menu .dropdown-menu a:hover {
            background-color: var(--background-light);
            color: var(--primary-color);
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize when document is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuthHandler();
        injectUserMenuStyles();
    });
} else {
    initAuthHandler();
    injectUserMenuStyles();
} 