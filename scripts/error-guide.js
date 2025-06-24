/**
 * Error Resolution Guide
 * Provides user-friendly error resolution steps and guidance
 */
import { errorHandler } from './error-handler.js';

class ErrorGuide {
    constructor() {
        this.guides = {
            validation: {
                email: {
                    title: 'Invalid Email Format',
                    steps: [
                        'Check that your email contains @ and a domain (e.g., .com)',
                        'Ensure there are no spaces in your email',
                        'Try using a different email address'
                    ],
                    prevention: 'Always double-check your email format before submitting'
                },
                password: {
                    title: 'Password Requirements Not Met',
                    steps: [
                        'Ensure your password is at least 8 characters long',
                        'Include at least one uppercase letter',
                        'Include at least one number',
                        'Include at least one special character'
                    ],
                    prevention: 'Use a password manager to generate and store secure passwords'
                },
                foodLog: {
                    title: 'Invalid Food Log Entry',
                    steps: [
                        'Check that all required fields are filled',
                        'Ensure quantities are positive numbers',
                        'Verify the date is not in the future'
                    ],
                    prevention: 'Use the food search feature to select items from our database'
                }
            },
            authentication: {
                login: {
                    title: 'Login Failed',
                    steps: [
                        'Check your email and password',
                        'Ensure caps lock is off',
                        'Try resetting your password if needed'
                    ],
                    prevention: 'Save your login credentials securely'
                },
                session: {
                    title: 'Session Expired',
                    steps: [
                        'Click the login button to sign in again',
                        'Your data will be saved automatically'
                    ],
                    prevention: 'Stay logged in by checking "Remember me" during login'
                }
            },
            network: {
                offline: {
                    title: 'You\'re Offline',
                    steps: [
                        'Check your internet connection',
                        'Try refreshing the page',
                        'Your data will sync when you\'re back online'
                    ],
                    prevention: 'Enable offline mode in settings for better offline experience'
                },
                timeout: {
                    title: 'Connection Timeout',
                    steps: [
                        'Check your internet speed',
                        'Try refreshing the page',
                        'Contact support if the issue persists'
                    ],
                    prevention: 'Use a stable internet connection'
                }
            },
            database: {
                sync: {
                    title: 'Sync Error',
                    steps: [
                        'Check your internet connection',
                        'Try refreshing the page',
                        'Your data is saved locally'
                    ],
                    prevention: 'Enable automatic sync in settings'
                }
            }
        };
    }

    /**
     * Get resolution guide for an error
     * @param {string} type - Error type
     * @param {string} code - Error code
     * @returns {Object|null} Resolution guide or null if not found
     */
    getGuide(type, code) {
        return this.guides[type]?.[code] || null;
    }

    /**
     * Show resolution guide to user
     * @param {string} type - Error type
     * @param {string} code - Error code
     * @param {string} message - Error message
     */
    showGuide(type, code, message) {
        const guide = this.getGuide(type, code);
        if (!guide) return;

        const modal = document.createElement('div');
        modal.className = 'error-guide-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 90%;
            width: 400px;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        modal.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #e74c3c;">${guide.title}</h3>
                <p style="margin: 0; color: #666;">${message}</p>
            </div>
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">Steps to resolve:</h4>
                <ol style="margin: 0; padding-left: 20px;">
                    ${guide.steps.map(step => `<li style="margin-bottom: 5px;">${step}</li>`).join('')}
                </ol>
            </div>
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0;">Prevention tip:</h4>
                <p style="margin: 0; color: #666;">${guide.prevention}</p>
            </div>
            <button style="
                background: #4a90e2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
            ">Got it</button>
        `;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'error-guide-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;

        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Handle close
        const close = () => {
            modal.remove();
            overlay.remove();
        };

        modal.querySelector('button').onclick = close;
        overlay.onclick = close;
    }
}

// Export singleton instance
export const errorGuide = new ErrorGuide(); 