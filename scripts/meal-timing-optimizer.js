import StringFormatter from './string-formatter.js';

class MealTimingOptimizer {
    constructor() {
        this.cache = new Map();
        this.isInitialized = false;
        this.defaultSchedule = {
            breakfast: { start: '07:00', end: '09:00' },
            morningSnack: { start: '10:30', end: '11:00' },
            lunch: { start: '12:30', end: '13:30' },
            afternoonSnack: { start: '15:30', end: '16:00' },
            dinner: { start: '18:30', end: '19:30' },
            eveningSnack: { start: '20:30', end: '21:00' }
        };
        this.activityLevels = ['low', 'moderate', 'high'];
        this.mealImportance = {
            breakfast: 0.3,
            morningSnack: 0.1,
            lunch: 0.3,
            afternoonSnack: 0.1,
            dinner: 0.2
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        // Add optimizer button to main content area instead of header
        const optimizerBtn = document.createElement('button');
        optimizerBtn.className = 'action-button optimizer-button';
        optimizerBtn.innerHTML = '<i class="fas fa-clock"></i> Optimize Timing';

        // Add to main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            let buttonContainer = document.querySelector('.action-buttons-container');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'action-buttons-container';
                mainContent.insertBefore(buttonContainer, mainContent.firstChild);
            }
            buttonContainer.appendChild(optimizerBtn);
        }

        this.setupDataListeners();
        this.isInitialized = true;
    }

    setupDataListeners() {
        // Listen for meal time updates
        document.addEventListener('mealTimeUpdated', (e) => {
            this.updateTimingAnalysis(e.detail);
        });

        // Listen for activity level changes
        document.addEventListener('activityUpdated', (e) => {
            this.updateRecommendations(e.detail);
        });
    }

    async showOptimizer() {
        const modal = document.createElement('div');
        modal.className = 'timing-modal';
        
        modal.innerHTML = `
            <div class="modal-content timing-content">
                <div class="modal-header">
                    <h3>Smart Meal Timing Optimizer</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="timing-body">
                    ${await this.renderCurrentSchedule()}
                    ${this.renderActivityLevel()}
                    ${this.renderTimingRecommendations()}
                    ${this.renderEnergyDistribution()}
                    ${this.renderScheduleAdjuster()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        this.setupInteractions(modal);
        
        // Initialize charts
        this.initializeEnergyChart();
        this.initializeTimingChart();
    }

    async renderCurrentSchedule() {
        const schedule = await this.getCurrentSchedule();
        
        return `
            <section class="timing-section">
                <h4>Current Meal Schedule</h4>
                <div class="schedule-timeline">
                    ${Object.entries(schedule).map(([meal, time]) => `
                        <div class="meal-slot">
                            <div class="meal-time">
                                <span class="time-range">${time.start} - ${time.end}</span>
                                <span class="meal-name">${this.formatMealName(meal)}</span>
                            </div>
                            <div class="meal-metrics">
                                <span class="energy-level ${this.getEnergyClass(meal)}">
                                    <i class="fas fa-bolt"></i> ${this.getEnergyLevel(meal)}
                                </span>
                                <span class="timing-score">
                                    <i class="fas fa-star"></i> ${this.getTimingScore(meal)}%
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderActivityLevel() {
        return `
            <section class="timing-section">
                <h4>Daily Activity Pattern</h4>
                <div class="activity-selector">
                    ${this.activityLevels.map(level => `
                        <button class="activity-btn ${level === this.getCurrentActivity() ? 'active' : ''}" 
                                data-level="${level}">
                            <i class="fas ${this.getActivityIcon(level)}"></i>
                            ${this.formatActivityLevel(level)}
                        </button>
                    `).join('')}
                </div>
                <div class="activity-chart">
                    <canvas id="activityChart"></canvas>
                </div>
            </section>
        `;
    }

    renderTimingRecommendations() {
        const recommendations = this.generateTimingRecommendations();
        
        return `
            <section class="timing-section">
                <h4>Smart Recommendations</h4>
                <div class="timing-recommendations">
                    ${recommendations.map(rec => `
                        <div class="timing-recommendation ${rec.priority}">
                            <div class="rec-icon">
                                <i class="fas ${this.getRecommendationIcon(rec.type)}"></i>
                            </div>
                            <div class="rec-content">
                                <h5>${rec.title}</h5>
                                <p>${rec.description}</p>
                                ${rec.adjustment ? `
                                    <button class="apply-btn" data-adjustment='${JSON.stringify(rec.adjustment)}'>
                                        Apply Adjustment
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderEnergyDistribution() {
        return `
            <section class="timing-section">
                <h4>Energy Distribution</h4>
                <div class="energy-chart">
                    <canvas id="energyChart"></canvas>
                </div>
                <div class="energy-insights">
                    ${this.generateEnergyInsights().map(insight => `
                        <div class="energy-insight">
                            <i class="fas ${insight.icon}"></i>
                            <span>${insight.text}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderScheduleAdjuster() {
        return `
            <section class="timing-section">
                <h4>Fine-Tune Schedule</h4>
                <div class="schedule-adjuster">
                    ${Object.entries(this.defaultSchedule).map(([meal, time]) => `
                        <div class="meal-adjuster">
                            <label>${this.formatMealName(meal)}</label>
                            <div class="time-inputs">
                                <input type="time" 
                                       class="time-input start-time" 
                                       data-meal="${meal}" 
                                       value="${time.start}" 
                                       min="05:00" 
                                       max="23:00">
                                <span>to</span>
                                <input type="time" 
                                       class="time-input end-time" 
                                       data-meal="${meal}" 
                                       value="${time.end}" 
                                       min="05:00" 
                                       max="23:00">
                            </div>
                        </div>
                    `).join('')}
                    <button class="save-schedule">Save Schedule</button>
                </div>
            </section>
        `;
    }

    formatMealName(meal) {
        return StringFormatter.formatMealName(meal);
    }

    getEnergyClass(meal) {
        const energyLevels = {
            breakfast: 'high',
            morningSnack: 'moderate',
            lunch: 'high',
            afternoonSnack: 'moderate',
            dinner: 'moderate',
            eveningSnack: 'low'
        };
        return energyLevels[meal] || 'moderate';
    }

    getEnergyLevel(meal) {
        const levels = {
            high: 'Peak Energy',
            moderate: 'Sustained',
            low: 'Light'
        };
        return levels[this.getEnergyClass(meal)];
    }

    getTimingScore(meal) {
        // Mock scores - replace with actual calculations
        const scores = {
            breakfast: 95,
            morningSnack: 85,
            lunch: 90,
            afternoonSnack: 88,
            dinner: 92,
            eveningSnack: 82
        };
        return scores[meal] || 85;
    }

    getCurrentActivity() {
        // Mock data - replace with actual user data
        return 'moderate';
    }

    getActivityIcon(level) {
        const icons = {
            low: 'fa-person-walking',
            moderate: 'fa-person-running',
            high: 'fa-person-biking'
        };
        return icons[level] || 'fa-person';
    }

    formatActivityLevel(level) {
        return StringFormatter.formatActivityLevel(level);
    }

    generateTimingRecommendations() {
        // Mock recommendations - replace with actual analysis
        return [
            {
                type: 'adjustment',
                priority: 'high',
                title: 'Optimize Breakfast Timing',
                description: 'Moving breakfast 30 minutes earlier could improve morning energy levels.',
                adjustment: {
                    meal: 'breakfast',
                    shift: -30
                }
            },
            {
                type: 'spacing',
                priority: 'medium',
                title: 'Meal Spacing',
                description: 'Consider adding a light afternoon snack to maintain energy levels.'
            },
            {
                type: 'duration',
                priority: 'low',
                title: 'Meal Duration',
                description: 'Try to extend lunch duration to 45 minutes for better digestion.'
            }
        ];
    }

    getRecommendationIcon(type) {
        const icons = {
            adjustment: 'fa-arrows-left-right',
            spacing: 'fa-arrows-left-right-to-line',
            duration: 'fa-hourglass-half'
        };
        return icons[type] || 'fa-clock';
    }

    generateEnergyInsights() {
        // Mock insights - replace with actual analysis
        return [
            {
                icon: 'fa-sun',
                text: 'Peak energy levels observed between 9-11 AM'
            },
            {
                icon: 'fa-battery-half',
                text: 'Afternoon energy dip detected around 2-3 PM'
            },
            {
                icon: 'fa-moon',
                text: 'Evening meal timing supports good sleep quality'
            }
        ];
    }

    async getCurrentSchedule() {
        // Mock schedule - replace with actual user data
        return this.defaultSchedule;
    }

    setupInteractions(modal) {
        // Close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.cleanup();
            modal.remove();
        });

        // Activity level buttons
        modal.querySelectorAll('.activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.activity-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateActivityLevel(e.target.dataset.level);
            });
        });

        // Apply recommendation buttons
        modal.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const adjustment = JSON.parse(e.target.dataset.adjustment);
                this.applyScheduleAdjustment(adjustment);
            });
        });

        // Save schedule button
        modal.querySelector('.save-schedule').addEventListener('click', () => {
            this.saveSchedule(modal);
        });

        // Time input validation
        modal.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.validateTimeInput(e.target);
            });
        });
    }

    cleanup() {
        // Cleanup chart instances
        if (this.energyChart) {
            this.energyChart.destroy();
        }
        if (this.timingChart) {
            this.timingChart.destroy();
        }
    }

    initializeEnergyChart() {
        const ctx = document.getElementById('energyChart');
        if (!ctx) return;

        this.energyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                datasets: [{
                    label: 'Energy Level',
                    data: [60, 90, 75, 65, 80, 70],
                    borderColor: 'rgba(65, 184, 131, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Energy Level (%)'
                        }
                    }
                }
            }
        });
    }

    initializeTimingChart() {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;

        this.timingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Morning', 'Mid-day', 'Afternoon', 'Evening'],
                datasets: [{
                    label: 'Activity Level',
                    data: [80, 60, 70, 40],
                    backgroundColor: 'rgba(65, 184, 131, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Activity Level (%)'
                        }
                    }
                }
            }
        });
    }

    validateTimeInput(input) {
        const time = input.value;
        const [hours] = time.split(':');
        
        if (hours < 5 || hours > 23) {
            input.setCustomValidity('Please select a time between 5:00 AM and 11:00 PM');
            input.reportValidity();
        } else {
            input.setCustomValidity('');
        }
    }

    updateActivityLevel(level) {
        // Update activity level and refresh recommendations
        this.updateRecommendations({ activityLevel: level });
    }

    applyScheduleAdjustment(adjustment) {
        const { meal, shift } = adjustment;
        const inputs = document.querySelectorAll(`[data-meal="${meal}"]`);
        
        inputs.forEach(input => {
            const currentTime = input.value;
            const [hours, minutes] = currentTime.split(':');
            const date = new Date();
            date.setHours(hours);
            date.setMinutes(parseInt(minutes) + shift);
            
            const newHours = date.getHours().toString().padStart(2, '0');
            const newMinutes = date.getMinutes().toString().padStart(2, '0');
            input.value = `${newHours}:${newMinutes}`;
        });
    }

    async saveSchedule(modal) {
        const newSchedule = {};
        modal.querySelectorAll('.meal-adjuster').forEach(adjuster => {
            const meal = adjuster.querySelector('.time-input').dataset.meal;
            const start = adjuster.querySelector('.start-time').value;
            const end = adjuster.querySelector('.end-time').value;
            newSchedule[meal] = { start, end };
        });

        // Save schedule and show confirmation
        await this.updateSchedule(newSchedule);
        this.showConfirmation('Schedule updated successfully!');
    }

    async updateSchedule(newSchedule) {
        // Mock update - replace with actual API call
        this.defaultSchedule = newSchedule;
        return Promise.resolve();
    }

    showConfirmation(message) {
        const toast = document.createElement('div');
        toast.className = 'timing-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

export const mealTimingOptimizer = new MealTimingOptimizer(); 