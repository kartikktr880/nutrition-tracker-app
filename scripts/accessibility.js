// Accessibility Enhancements for Nutrition Tracker
// - Adds ARIA labels, roles, and keyboard navigation support to key UI elements

document.addEventListener('DOMContentLoaded', function () {
    // 1. Theme Toggle Buttons
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        // Ensure ARIA label is descriptive and updates dynamically
        function updateAria() {
            const isDark = document.documentElement.className === 'dark';
            toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
            toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        }
        updateAria();
        toggle.addEventListener('click', updateAria);
        toggle.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                setTimeout(updateAria, 10);
            }
        });
    });

    // 2. Navigation Menus
    document.querySelectorAll('nav, .settings-navigation ul').forEach(nav => {
        nav.setAttribute('role', 'navigation');
        if (!nav.hasAttribute('aria-label')) {
            nav.setAttribute('aria-label', 'Main Navigation');
        }
        // Mark active item
        nav.querySelectorAll('li.active, a.active').forEach(item => {
            item.setAttribute('aria-current', 'page');
        });
    });

    // 3. Settings Controls (theme/color options)
    document.querySelectorAll('.theme-option, .color-option').forEach(btn => {
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('role', 'button');
        // Keyboard activation
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    // 4. Modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        // Trap focus when modal is open
        modal.addEventListener('shown', () => {
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length) focusable[0].focus();
        });
    });
    // ESC to close modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal[aria-modal="true"]:not([hidden])').forEach(modal => {
                const closeBtn = modal.querySelector('.close-modal, [data-dismiss]');
                if (closeBtn) closeBtn.click();
            });
        }
    });

    // 5. Focus Styles (ensure visible outline)
    const style = document.createElement('style');
    style.innerHTML = `
        :focus {
            outline: 2px solid var(--accent, #4CAF50) !important;
            outline-offset: 2px !important;
        }
    `;
    document.head.appendChild(style);
}); 