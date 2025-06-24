// Import security dashboard
import { securityDashboard } from './security-dashboard.js';
import { SecurityAlerts } from './security-alerts.js';

// Initialize security alerts system
const securityAlerts = new SecurityAlerts();

// Initialize security dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize security dashboard
        await securityDashboard.initialize();
        
        // Initialize security alerts
        await securityAlerts.initialize();
        
        // Add security dashboard styles
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = '/styles/security-dashboard.css';
        document.head.appendChild(linkElement);
        
        // Example of triggering a security alert (for testing)
        setTimeout(() => {
            securityAlerts.showAlert({
                severity: 'high',
                message: 'Multiple failed login attempts detected',
                details: 'IP: 192.168.1.100 has attempted to login 5 times in the last minute'
            });
        }, 5000);
        
    } catch (error) {
        console.error('Failed to initialize security systems:', error);
    }
}); 