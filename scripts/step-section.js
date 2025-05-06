/**
 * Step Section Handler for Nutrition Tracker
 * Manages animations, equal height cards, and responsive behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize step section
    initStepSection();
    
    // Set up intersection observer for animations
    setupStepAnimations();
});

/**
 * Initialize step section functionality
 */
function initStepSection() {
    // Ensure steps have equal heights
    equalizeStepHeights();
    
    // Fill in any empty step slots
    fillEmptySteps();
    
    // Handle window resize events
    window.addEventListener('resize', function() {
        // Reset heights before recalculating
        resetStepHeights();
        
        // Recalculate equal heights
        equalizeStepHeights();
    });
}

/**
 * Make all step cards the same height for better alignment
 */
function equalizeStepHeights() {
    const steps = document.querySelectorAll('.step');
    if (steps.length === 0) return;
    
    // Only apply on tablet and larger screens
    if (window.innerWidth >= 768) {
        // First reset heights
        resetStepHeights();
        
        // Get highest step card
        let maxHeight = 0;
        steps.forEach(step => {
            const height = step.offsetHeight;
            if (height > maxHeight) {
                maxHeight = height;
            }
        });
        
        // Apply max height to all
        steps.forEach(step => {
            step.style.height = maxHeight + 'px';
        });
    } else {
        // On mobile, let them be natural height
        resetStepHeights();
    }
}

/**
 * Reset step heights to auto
 */
function resetStepHeights() {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        step.style.height = 'auto';
    });
}

/**
 * Fill in any empty steps or missing content
 */
function fillEmptySteps() {
    const stepsContainer = document.querySelector('.steps-container');
    const steps = document.querySelectorAll('.step');
    
    if (!stepsContainer || steps.length === 0) return;
    
    // Check if we need to add placeholder steps
    const expectedSteps = 3; // We expect 3 steps in a row
    
    if (steps.length < expectedSteps) {
        // Create placeholder steps
        for (let i = steps.length; i < expectedSteps; i++) {
            const placeholderStep = createPlaceholderStep(i + 1);
            stepsContainer.appendChild(placeholderStep);
        }
    }
    
    // Check each step for missing content and fill it
    steps.forEach((step, index) => {
        ensureStepContent(step, index + 1);
    });
}

/**
 * Create a placeholder step with sample content
 * @param {number} stepNumber - The step number to use
 * @returns {HTMLElement} - The created step element
 */
function createPlaceholderStep(stepNumber) {
    // Default content for each step position
    const defaultContent = [
        {
            icon: 'fa-utensils',
            title: 'Track Your Meals',
            description: 'Log your daily meals and snacks with our extensive food database for accurate nutrition tracking.'
        },
        {
            icon: 'fa-chart-pie',
            title: 'Analyze Nutrients',
            description: 'Get detailed breakdowns of macronutrients, vitamins, and minerals to ensure balanced nutrition.'
        },
        {
            icon: 'fa-bullseye',
            title: 'Reach Your Goals',
            description: 'Set personalized goals and track your progress with visual charts and achievement badges.'
        }
    ];
    
    // Get the appropriate default content
    const content = defaultContent[stepNumber - 1] || defaultContent[0];
    
    // Create the step element
    const step = document.createElement('div');
    step.className = 'step';
    step.innerHTML = `
        <div class="step-number">${stepNumber}</div>
        <div class="step-icon">
            <i class="fas ${content.icon}"></i>
        </div>
        <h3 class="step-title">${content.title}</h3>
        <p class="step-description">${content.description}</p>
        <a href="#" class="step-link">Learn more <i class="fas fa-arrow-right"></i></a>
    `;
    
    return step;
}

/**
 * Ensure a step has all required content
 * @param {HTMLElement} step - The step element to check
 * @param {number} stepNumber - The position of the step
 */
function ensureStepContent(step, stepNumber) {
    // Check for step number
    let stepNumberEl = step.querySelector('.step-number');
    if (!stepNumberEl) {
        stepNumberEl = document.createElement('div');
        stepNumberEl.className = 'step-number';
        stepNumberEl.textContent = stepNumber;
        step.appendChild(stepNumberEl);
    }
    
    // Check for step icon
    let stepIconEl = step.querySelector('.step-icon');
    if (!stepIconEl) {
        stepIconEl = document.createElement('div');
        stepIconEl.className = 'step-icon';
        stepIconEl.innerHTML = `<i class="fas fa-${getDefaultIcon(stepNumber)}"></i>`;
        step.insertBefore(stepIconEl, step.firstChild);
    }
    
    // Check for step title
    let stepTitleEl = step.querySelector('.step-title');
    if (!stepTitleEl || !stepTitleEl.textContent.trim()) {
        if (!stepTitleEl) {
            stepTitleEl = document.createElement('h3');
            stepTitleEl.className = 'step-title';
            step.appendChild(stepTitleEl);
        }
        stepTitleEl.textContent = getDefaultTitle(stepNumber);
    }
    
    // Check for step description
    let stepDescEl = step.querySelector('.step-description');
    if (!stepDescEl || !stepDescEl.textContent.trim()) {
        if (!stepDescEl) {
            stepDescEl = document.createElement('p');
            stepDescEl.className = 'step-description';
            step.appendChild(stepDescEl);
        }
        stepDescEl.textContent = getDefaultDescription(stepNumber);
    }
    
    // Check for step link
    let stepLinkEl = step.querySelector('.step-link');
    if (!stepLinkEl) {
        stepLinkEl = document.createElement('a');
        stepLinkEl.className = 'step-link';
        stepLinkEl.href = '#';
        stepLinkEl.innerHTML = 'Learn more <i class="fas fa-arrow-right"></i>';
        step.appendChild(stepLinkEl);
    }
}

/**
 * Get default icon based on step number
 */
function getDefaultIcon(stepNumber) {
    const icons = ['utensils', 'chart-pie', 'bullseye'];
    return icons[stepNumber - 1] || icons[0];
}

/**
 * Get default title based on step number
 */
function getDefaultTitle(stepNumber) {
    const titles = ['Track Your Meals', 'Analyze Nutrients', 'Reach Your Goals'];
    return titles[stepNumber - 1] || titles[0];
}

/**
 * Get default description based on step number
 */
function getDefaultDescription(stepNumber) {
    const descriptions = [
        'Log your daily meals and snacks with our extensive food database for accurate nutrition tracking.',
        'Get detailed breakdowns of macronutrients, vitamins, and minerals to ensure balanced nutrition.',
        'Set personalized goals and track your progress with visual charts and achievement badges.'
    ];
    return descriptions[stepNumber - 1] || descriptions[0];
}

/**
 * Set up intersection observer for step animations
 */
function setupStepAnimations() {
    const steps = document.querySelectorAll('.step');
    if (steps.length === 0) return;
    
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, options);
    
    steps.forEach(step => {
        observer.observe(step);
    });
} 