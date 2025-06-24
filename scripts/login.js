import { loginWithEmail, signInWithGoogle, signInWithFacebook, resetPassword } from './auth-core.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBox = document.querySelector('.login-box');
    const registerBox = document.querySelector('.register-box');
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    const errorMessage = document.getElementById('error-message');
    const registerErrorMessage = document.getElementById('register-error-message');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    loadingSpinner.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingSpinner);
    
    // Initialize auth state
    firebase.auth().onAuthStateChanged(user => {
        // Hide loading spinner once auth is initialized
        loadingSpinner.style.display = 'none';
        
        // Check if user is already logged in
        if (user) {
            // Redirect to tracker page if already logged in
            redirectAfterLogin();
        }
    });
    
    // Show/hide form functions
    function showLoginForm() {
        registerBox.style.display = 'none';
        loginBox.style.display = 'block';
    }
    
    function showRegisterForm() {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    }
    
    // Event listeners for form toggling
    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });
    
    showRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    
    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        
        // Get form values
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validate form
        if (!email || !password) {
            showError(errorMessage, 'Please fill in all fields');
            loadingSpinner.style.display = 'none';
            return;
        }
        
        try {
            // Use API service for login
            const result = await window.apiService.loginUser(email, password);
            
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
            
            if (result.success) {
                // Login successful
                redirectAfterLogin();
            } else {
                // Login failed
                showError(errorMessage, result.error || 'Invalid email or password');
            }
        } catch (error) {
            loadingSpinner.style.display = 'none';
            showError(errorMessage, 'An error occurred during login');
            console.error('Login error:', error);
        }
    });
    
    // Handle register form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading spinner
        loadingSpinner.style.display = 'flex';
        
        // Get form values
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate form
        if (!name || !email || !password || !confirmPassword) {
            showError(registerErrorMessage, 'Please fill in all fields');
            loadingSpinner.style.display = 'none';
            return;
        }
        
        if (password.length < 8) {
            showError(registerErrorMessage, 'Password must be at least 8 characters');
            loadingSpinner.style.display = 'none';
            return;
        }
        
        if (password !== confirmPassword) {
            showError(registerErrorMessage, 'Passwords do not match');
            loadingSpinner.style.display = 'none';
            return;
        }
        
        try {
            // Use API service for registration
            const result = await window.apiService.registerUser(email, password, name);
            
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
            
            if (result.success) {
                // Registration successful
                redirectAfterLogin();
            } else {
                // Registration failed
                showError(registerErrorMessage, result.error || 'Registration failed');
            }
        } catch (error) {
            loadingSpinner.style.display = 'none';
            showError(registerErrorMessage, 'An error occurred during registration');
            console.error('Registration error:', error);
        }
    });
    
    // Helper function to show error messages
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Hide error after 3 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
    
    // Helper function to handle redirect after login
    function redirectAfterLogin() {
        // Check if there's a redirect URL saved
        const redirectPage = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin'); // Clear it
        
        // Redirect to saved page or tracker page
        if (redirectPage) {
            window.location.href = redirectPage;
        } else {
            window.location.href = 'tracker.html';
        }
    }
}); 