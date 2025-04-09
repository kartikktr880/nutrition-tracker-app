/**
 * Guided Tour Manager
 * Provides interactive walkthroughs for new users
 */

class GuidedTour {
    constructor(options = {}) {
        this.options = Object.assign({
            storageKey: 'guided_tour_completed',
            showOnce: true,
            steps: [],
            onComplete: () => {},
            onSkip: () => {},
            autoStart: false,
            overlayOpacity: 0.7,
            className: 'guided-tour',
            nextBtnText: 'Next',
            prevBtnText: 'Previous',
            skipBtnText: 'Skip Tour',
            finishBtnText: 'Finish',
            closeTooltip: true
        }, options);
        
        this.currentStep = 0;
        this.isActive = false;
        this.elements = {
            overlay: null,
            tooltip: null,
            highlightElement: null,
            actionButtons: null
        };
        
        // Initialize the tour elements
        this.initElements();
        
        // Auto start if specified
        if (this.options.autoStart) {
            this.start();
        }
    }
    
    /**
     * Initialize the tour elements
     */
    initElements() {
        // Create the overlay
        this.elements.overlay = document.createElement('div');
        this.elements.overlay.className = `${this.options.className}-overlay`;
        this.elements.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, ${this.options.overlayOpacity});
            z-index: 9998;
            display: none;
            pointer-events: auto;
        `;
        
        // Create the highlight element
        this.elements.highlightElement = document.createElement('div');
        this.elements.highlightElement.className = `${this.options.className}-highlight`;
        this.elements.highlightElement.style.cssText = `
            position: absolute;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, ${this.options.overlayOpacity});
            border-radius: 4px;
            z-index: 9999;
            pointer-events: none;
            transition: all 0.3s ease;
        `;
        
        // Create the tooltip
        this.elements.tooltip = document.createElement('div');
        this.elements.tooltip.className = `${this.options.className}-tooltip`;
        this.elements.tooltip.style.cssText = `
            position: absolute;
            background-color: white;
            color: #333;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            max-width: 300px;
            z-index: 10000;
            transition: opacity 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        `;

        // Create the action buttons
        this.elements.actionButtons = document.createElement('div');
        this.elements.actionButtons.className = `${this.options.className}-actions`;
        this.elements.actionButtons.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
        `;
        
        // Append elements to the body
        document.body.appendChild(this.elements.overlay);
        document.body.appendChild(this.elements.highlightElement);
        document.body.appendChild(this.elements.tooltip);
        this.elements.tooltip.appendChild(this.elements.actionButtons);
        
        // Add close button to the tooltip if enabled
        if (this.options.closeTooltip) {
            const closeBtn = document.createElement('button');
            closeBtn.className = `${this.options.className}-close`;
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 10px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            `;
            closeBtn.addEventListener('click', () => this.end());
            this.elements.tooltip.appendChild(closeBtn);
        }
        
        // Add CSS to the document
        const style = document.createElement('style');
        style.textContent = `
            .${this.options.className}-btn {
                background-color: #3a7bd5;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 15px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }
            
            .${this.options.className}-btn:hover {
                background-color: #2c5499;
            }
            
            .${this.options.className}-btn.secondary {
                background-color: #f0f0f0;
                color: #333;
            }
            
            .${this.options.className}-btn.secondary:hover {
                background-color: #e0e0e0;
            }
            
            .${this.options.className}-step-counter {
                margin-top: 10px;
                font-size: 12px;
                color: #666;
                text-align: center;
            }
            
            .${this.options.className}-tooltip h3 {
                margin: 0 0 10px 0;
                font-size: 18px;
            }
            
            .${this.options.className}-tooltip p {
                margin: 0 0 15px 0;
                font-size: 14px;
                line-height: 1.5;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Start the guided tour
     */
    start() {
        // Check if user has already completed the tour
        if (this.options.showOnce) {
            const completed = localStorage.getItem(this.options.storageKey);
            if (completed) return;
        }
        
        // Initialize first step
        this.isActive = true;
        this.currentStep = 0;
        
        // Show the tour elements
        this.elements.overlay.style.display = 'block';
        
        // Show the first step
        this.showStep(0);
        
        // Add event listener for escape key
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    /**
     * End the guided tour
     */
    end() {
        this.isActive = false;
        
        // Hide the tour elements
        this.elements.overlay.style.display = 'none';
        this.elements.tooltip.style.display = 'none';
        this.elements.highlightElement.style.display = 'none';
        
        // Remove the event listener
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Mark as completed if showing once
        if (this.options.showOnce) {
            localStorage.setItem(this.options.storageKey, 'true');
        }
    }
    
    /**
     * Skip the guided tour
     */
    skip() {
        this.end();
        if (typeof this.options.onSkip === 'function') {
            this.options.onSkip();
        }
    }
    
    /**
     * Complete the guided tour
     */
    complete() {
        this.end();
        if (typeof this.options.onComplete === 'function') {
            this.options.onComplete();
        }
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            this.end();
        } else if (event.key === 'ArrowRight') {
            this.next();
        } else if (event.key === 'ArrowLeft') {
            this.prev();
        }
    }
    
    /**
     * Show a specific step
     * @param {number} index - Step index to show
     */
    showStep(index) {
        if (index < 0 || index >= this.options.steps.length) {
            this.complete();
            return;
        }
        
        const step = this.options.steps[index];
        
        // Get the target element
        let targetElement = null;
        if (typeof step.target === 'string') {
            targetElement = document.querySelector(step.target);
        } else if (step.target instanceof HTMLElement) {
            targetElement = step.target;
        }
        
        // If target element doesn't exist, move to the next step
        if (!targetElement && step.target) {
            console.warn(`Target element "${step.target}" not found. Skipping to next step.`);
            this.next();
            return;
        }
        
        // Update the current step
        this.currentStep = index;
        
        // Update the tooltip content
        this.elements.tooltip.innerHTML = `
            <h3>${step.title || `Step ${index + 1}`}</h3>
            <p>${step.content}</p>
        `;
        
        // Update the action buttons
        this.elements.actionButtons = document.createElement('div');
        this.elements.actionButtons.className = `${this.options.className}-actions`;
        this.elements.actionButtons.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
        `;
        
        // Add the action buttons
        const leftButtons = document.createElement('div');
        const rightButtons = document.createElement('div');
        
        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.className = `${this.options.className}-btn secondary skip-btn`;
        skipBtn.textContent = this.options.skipBtnText;
        skipBtn.addEventListener('click', () => this.skip());
        leftButtons.appendChild(skipBtn);
        
        // Previous button (not shown on first step)
        if (index > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.className = `${this.options.className}-btn secondary prev-btn`;
            prevBtn.textContent = this.options.prevBtnText;
            prevBtn.addEventListener('click', () => this.prev());
            rightButtons.appendChild(prevBtn);
        }
        
        // Next/Finish button
        const nextBtn = document.createElement('button');
        nextBtn.className = `${this.options.className}-btn next-btn`;
        
        if (index === this.options.steps.length - 1) {
            nextBtn.textContent = this.options.finishBtnText;
            nextBtn.addEventListener('click', () => this.complete());
        } else {
            nextBtn.textContent = this.options.nextBtnText;
            nextBtn.addEventListener('click', () => this.next());
        }
        
        rightButtons.appendChild(nextBtn);
        
        // Add the buttons to the actions div
        this.elements.actionButtons.appendChild(leftButtons);
        this.elements.actionButtons.appendChild(rightButtons);
        
        // Add step counter
        const stepCounter = document.createElement('div');
        stepCounter.className = `${this.options.className}-step-counter`;
        stepCounter.textContent = `Step ${index + 1} of ${this.options.steps.length}`;
        
        // Append elements to the tooltip
        this.elements.tooltip.appendChild(this.elements.actionButtons);
        this.elements.tooltip.appendChild(stepCounter);
        
        // Add close button to the tooltip if enabled
        if (this.options.closeTooltip) {
            const closeBtn = document.createElement('button');
            closeBtn.className = `${this.options.className}-close`;
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 10px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            `;
            closeBtn.addEventListener('click', () => this.end());
            this.elements.tooltip.appendChild(closeBtn);
        }
        
        // Position the tooltip and highlight element
        if (targetElement) {
            // Make the target element visible through the overlay
            const rect = targetElement.getBoundingClientRect();
            const margin = 5; // Extra margin around the element
            
            this.elements.highlightElement.style.display = 'block';
            this.elements.highlightElement.style.left = `${rect.left - margin}px`;
            this.elements.highlightElement.style.top = `${rect.top - margin}px`;
            this.elements.highlightElement.style.width = `${rect.width + (margin * 2)}px`;
            this.elements.highlightElement.style.height = `${rect.height + (margin * 2)}px`;
            
            // Position tooltip
            const tooltipRect = this.elements.tooltip.getBoundingClientRect();
            const position = step.position || 'bottom';
            
            let top, left;
            
            switch (position) {
                case 'top':
                    top = rect.top - tooltipRect.height - 10;
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    break;
                case 'right':
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    left = rect.right + 10;
                    break;
                case 'left':
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    left = rect.left - tooltipRect.width - 10;
                    break;
                case 'bottom':
                default:
                    top = rect.bottom + 10;
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
            }
            
            // Make sure tooltip is always in the viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Adjust horizontal position
            if (left < 10) {
                left = 10;
            } else if (left + tooltipRect.width > viewportWidth - 10) {
                left = viewportWidth - tooltipRect.width - 10;
            }
            
            // Adjust vertical position
            if (top < 10) {
                top = 10;
            } else if (top + tooltipRect.height > viewportHeight - 10) {
                top = viewportHeight - tooltipRect.height - 10;
            }
            
            this.elements.tooltip.style.top = `${top}px`;
            this.elements.tooltip.style.left = `${left}px`;
            
            // Ensure target element is visible
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Add tooltip arrow
            const arrow = document.createElement('div');
            arrow.className = `${this.options.className}-arrow`;
            arrow.style.cssText = `
                position: absolute;
                width: 12px;
                height: 12px;
                background-color: white;
                transform: rotate(45deg);
            `;
            
            // Position the arrow based on tooltip position
            switch (position) {
                case 'top':
                    arrow.style.bottom = '-6px';
                    arrow.style.left = '50%';
                    arrow.style.marginLeft = '-6px';
                    break;
                case 'right':
                    arrow.style.left = '-6px';
                    arrow.style.top = '50%';
                    arrow.style.marginTop = '-6px';
                    break;
                case 'left':
                    arrow.style.right = '-6px';
                    arrow.style.top = '50%';
                    arrow.style.marginTop = '-6px';
                    break;
                case 'bottom':
                default:
                    arrow.style.top = '-6px';
                    arrow.style.left = '50%';
                    arrow.style.marginLeft = '-6px';
            }
            
            this.elements.tooltip.appendChild(arrow);
        } else {
            // Center the tooltip in the middle of the screen
            this.elements.highlightElement.style.display = 'none';
            
            const tooltipRect = this.elements.tooltip.getBoundingClientRect();
            const left = (window.innerWidth - tooltipRect.width) / 2;
            const top = (window.innerHeight - tooltipRect.height) / 2;
            
            this.elements.tooltip.style.top = `${top}px`;
            this.elements.tooltip.style.left = `${left}px`;
        }
        
        // Show the tooltip
        this.elements.tooltip.style.display = 'block';
        
        // Execute callback if exists
        if (typeof step.onShow === 'function') {
            step.onShow(targetElement, this);
        }
    }
    
    /**
     * Go to the next step
     */
    next() {
        this.showStep(this.currentStep + 1);
    }
    
    /**
     * Go to the previous step
     */
    prev() {
        this.showStep(this.currentStep - 1);
    }
    
    /**
     * Go to a specific step
     * @param {number} index - Step index to go to
     */
    goToStep(index) {
        this.showStep(index);
    }
}

// Create specific tours for different pages
class TourManager {
    constructor() {
        this.tours = {};
        this.initTours();
    }
    
    initTours() {
        // Dashboard tour
        this.tours.dashboard = new GuidedTour({
            storageKey: 'dashboard_tour_completed',
            steps: [
                {
                    title: 'Welcome to Your Dashboard',
                    content: 'This is your nutrition tracking dashboard where you can see an overview of your nutrition goals and progress.',
                    target: '.dashboard-container',
                    position: 'bottom'
                },
                {
                    title: 'Daily Macros',
                    content: 'Here you can see your daily macronutrient targets and current progress. Track your protein, carbs, and fat intake at a glance.',
                    target: '.macro-cards',
                    position: 'bottom'
                },
                {
                    title: 'Quick Add',
                    content: 'Use the quick add feature to log your meals and water intake quickly without navigating away from the dashboard.',
                    target: '.quick-actions',
                    position: 'left'
                },
                {
                    title: 'Weekly Progress',
                    content: 'View your nutrition trends over the past week to track your consistency and identify patterns.',
                    target: '.weekly-chart',
                    position: 'top'
                },
                {
                    title: 'Navigation Menu',
                    content: 'Access all features of the Nutrition Tracker from this menu, including food logging, meal planning, and more.',
                    target: '.side-nav',
                    position: 'right'
                }
            ]
        });
        
        // Food Logger tour
        this.tours.foodLogger = new GuidedTour({
            storageKey: 'food_logger_tour_completed',
            steps: [
                {
                    title: 'Welcome to the Food Logger',
                    content: 'This is where you can log your daily food intake and track your nutrition.',
                    target: '.food-logger-container',
                    position: 'bottom'
                },
                {
                    title: 'Search for Foods',
                    content: 'Use this search box to find foods in our extensive database. You can search by name or browse by category.',
                    target: '#food-search',
                    position: 'bottom'
                },
                {
                    title: 'Meal Sections',
                    content: 'Your day is divided into meal sections like breakfast, lunch, dinner, and snacks. Click on a tab to add foods to that meal.',
                    target: '.meal-tabs',
                    position: 'bottom'
                },
                {
                    title: 'Daily Summary',
                    content: 'This summary shows your total calories and macronutrients for the day compared to your goals.',
                    target: '.daily-summary',
                    position: 'left'
                },
                {
                    title: 'Date Navigation',
                    content: 'Use these buttons to navigate between different days and log your food for past or future dates.',
                    target: '.date-navigation',
                    position: 'top'
                }
            ]
        });
        
        // Meal Planner tour
        this.tours.mealPlanner = new GuidedTour({
            storageKey: 'meal_planner_tour_completed',
            steps: [
                {
                    title: 'Welcome to the Meal Planner',
                    content: 'Plan your meals for the week ahead to stay organized and meet your nutrition goals.',
                    target: '.meal-planner-container',
                    position: 'bottom'
                },
                {
                    title: 'Weekly Calendar',
                    content: 'This calendar view shows your planned meals for each day of the week. Click on a day to add or edit meals.',
                    target: '.weekly-calendar',
                    position: 'bottom'
                },
                {
                    title: 'Recipe Library',
                    content: 'Browse and search through your saved recipes to add to your meal plan.',
                    target: '.recipe-library',
                    position: 'right'
                },
                {
                    title: 'Nutritional Summary',
                    content: 'See the nutritional breakdown of your meal plan for the entire week or for individual days.',
                    target: '.nutritional-summary',
                    position: 'left'
                },
                {
                    title: 'Generate Shopping List',
                    content: 'Click here to automatically generate a shopping list based on your meal plan for the week.',
                    target: '.generate-shopping-list-btn',
                    position: 'top'
                }
            ]
        });
        
        // Advanced Analytics tour
        this.tours.analytics = new GuidedTour({
            storageKey: 'analytics_tour_completed',
            steps: [
                {
                    title: 'Welcome to Advanced Analytics',
                    content: 'Discover deeper insights into your nutrition patterns and trends with our advanced analytics features.',
                    target: '.analytics-container',
                    position: 'bottom'
                },
                {
                    title: 'Nutrition Summary',
                    content: 'This section provides a quick overview of your key nutritional metrics, including daily averages and trends.',
                    target: '.nutrition-summary',
                    position: 'bottom'
                },
                {
                    title: 'Calorie and Nutrient Trends',
                    content: 'These charts show how your calorie and nutrient intake has changed over time, helping you identify patterns.',
                    target: '.calorie-trends',
                    position: 'bottom'
                },
                {
                    title: 'Macronutrient Breakdown',
                    content: 'Visualize the balance of your macronutrients and compare to your targets with these intuitive charts.',
                    target: '.macronutrient-breakdown',
                    position: 'bottom'
                },
                {
                    title: 'Food Insights',
                    content: 'See your most frequent foods and meal patterns to understand your eating habits better.',
                    target: '.food-insights',
                    position: 'top'
                },
                {
                    title: 'Advanced Insights Section',
                    content: 'This is where the power of advanced analytics shines! Get personalized recommendations and detect patterns in your eating habits.',
                    target: '.advanced-insights',
                    position: 'top'
                },
                {
                    title: 'Personalized Recommendations',
                    content: 'Based on your nutrition data, we provide tailored recommendations to help improve your diet quality.',
                    target: '.insights-cards > .insight-card:nth-child(1)',
                    position: 'right'
                },
                {
                    title: 'Nutrition Alerts',
                    content: 'Important alerts about concerning trends in your nutrition that may need your attention.',
                    target: '.insights-cards > .insight-card:nth-child(2)',
                    position: 'bottom'
                },
                {
                    title: 'Eating Patterns',
                    content: 'We analyze when you eat and what food combinations you typically enjoy to help you understand your habits.',
                    target: '.insights-cards > .insight-card:nth-child(3)',
                    position: 'left'
                },
                {
                    title: 'Day of Week Patterns',
                    content: 'See how your nutrition varies by day of the week, including differences between weekdays and weekends.',
                    target: '.insights-cards > .insight-card:nth-child(4)',
                    position: 'left'
                },
                {
                    title: 'Data Quality Indicator',
                    content: 'This shows how complete and consistent your nutrition data is, which affects the accuracy of our insights. Click on it for more details.',
                    target: '.data-quality',
                    position: 'top',
                    onShow: (element) => {
                        // Highlight the clickable nature
                        element.style.boxShadow = '0 0 8px rgba(0, 123, 255, 0.5)';
                        
                        // Reset after tour moves to next step
                        setTimeout(() => {
                            element.style.boxShadow = '';
                        }, 5000);
                    }
                },
                {
                    title: 'Refresh Insights',
                    content: 'Click this button to refresh your analytics data and get the most up-to-date insights.',
                    target: '#refresh-insights',
                    position: 'left'
                },
                {
                    title: 'Export Options',
                    content: 'You can export your nutrition data in various formats for external analysis or record-keeping.',
                    target: '.export-section',
                    position: 'top'
                },
                {
                    title: 'That\'s it!',
                    content: 'You\'re now ready to use the advanced analytics features to gain deeper insights into your nutrition journey. Check back regularly as more data will lead to better insights!',
                    position: 'center'
                }
            ]
        });
    }
    
    /**
     * Start a specific tour
     * @param {string} tourName - Name of the tour to start
     */
    startTour(tourName) {
        if (this.tours[tourName]) {
            this.tours[tourName].start();
        } else {
            console.warn(`Tour "${tourName}" not found.`);
        }
    }
    
    /**
     * Reset a specific tour so it will show again
     * @param {string} tourName - Name of the tour to reset
     */
    resetTour(tourName) {
        if (this.tours[tourName]) {
            localStorage.removeItem(this.tours[tourName].options.storageKey);
        } else {
            console.warn(`Tour "${tourName}" not found.`);
        }
    }
    
    /**
     * Reset all tours so they will show again
     */
    resetAllTours() {
        for (const tourName in this.tours) {
            localStorage.removeItem(this.tours[tourName].options.storageKey);
        }
    }
}

// Create and export a singleton instance
const tourManager = new TourManager();
window.tourManager = tourManager;

export default tourManager; 