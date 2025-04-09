import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, limit, orderBy, startAfter, setDoc } from 'firebase/firestore';
import { app } from './firebase-config.js';
import dataManager from './data-manager.js';

document.addEventListener('DOMContentLoaded', function() {
    // Add feature detection
    const features = {
        supportsIntersectionObserver: 'IntersectionObserver' in window,
        supportsResizeObserver: 'ResizeObserver' in window,
        supportsLocalStorage: (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        supportsServiceWorker: 'serviceWorker' in navigator,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    // Initialize performance monitoring
    const performanceMetrics = {
        firstContentfulPaint: 0,
        timeToInteractive: 0,
        lastAnimationFrame: 0
    };

    // Monitor frame rate
    let frameCounter = 0;
    function monitorFrameRate(timestamp) {
        if (performanceMetrics.lastAnimationFrame) {
            const delta = timestamp - performanceMetrics.lastAnimationFrame;
            if (delta > 50) { // Frame drop detected (less than 20fps)
                console.warn('Performance: Frame drop detected');
                optimizeForPerformance();
            }
        }
        performanceMetrics.lastAnimationFrame = timestamp;
        frameCounter++;
        requestAnimationFrame(monitorFrameRate);
    }
    requestAnimationFrame(monitorFrameRate);

    // Optimize performance when needed
    function optimizeForPerformance() {
        document.body.classList.add('reduce-animations');
        // Disable non-essential animations
        document.querySelectorAll('.progress-bar.high-progress').forEach(bar => {
            bar.style.animation = 'none';
        });
    }

    // Initialize intersection observer for lazy loading if supported
    if (features.supportsIntersectionObserver) {
        const lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.dataset.src) {
                        entry.target.src = entry.target.dataset.src;
                        entry.target.removeAttribute('data-src');
                    }
                    lazyLoadObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '50px' });

        document.querySelectorAll('[data-src]').forEach(element => {
            lazyLoadObserver.observe(element);
        });
    }

    // Add touch gesture support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    }, { passive: true });

    function handleSwipeGesture() {
        const SWIPE_THRESHOLD = 50;
        const diff = touchEndX - touchStartX;

        if (Math.abs(diff) < SWIPE_THRESHOLD) return;

        // Swipe right (previous period)
        if (diff > 0) {
            const currentButton = document.querySelector('.date-range-selector .active');
            const prevButton = currentButton.previousElementSibling;
            if (prevButton) prevButton.click();
        }
        // Swipe left (next period)
        else {
            const currentButton = document.querySelector('.date-range-selector .active');
            const nextButton = currentButton.nextElementSibling;
            if (nextButton) nextButton.click();
        }
    }

    // Add offline support
    if (features.supportsServiceWorker) {
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
            loadUserData(auth.currentUser?.uid);
        });

        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
            showOfflineNotification();
        });
    }

    function showOfflineNotification() {
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.innerHTML = `
            <i class="fas fa-wifi-slash"></i>
            <span>You're offline. Some features may be limited.</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Initialize Firebase
    const auth = getAuth(app);
    const db = getFirestore(app);

    // DOM Elements
    const dateRangeButtons = document.querySelectorAll('.date-range-selector button');
    const chartControls = document.querySelectorAll('.chart-controls button');
    const trendsChart = document.getElementById('trendsChart');
    const printReportBtn = document.getElementById('printReport');
    const nutritionScoreValue = document.querySelector('.score-value');
    const nutritionScoreBadge = document.querySelector('.score-badge');
    const analyticsContainer = document.querySelector('.analytics-container');

    // Chart instances
    let currentChart = null;

    // State
    let currentRange = 'month';
    let currentChartType = 'calories';
    let userData = null;

    // Theme Management
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Enhanced UI Interactions
    const metricCards = document.querySelectorAll('.metric-card');
    const insightCards = document.querySelectorAll('.insight-card');
    const goalCards = document.querySelectorAll('.goal-card');

    // Add tooltips to metric cards
    metricCards.forEach(card => {
        const title = card.querySelector('.metric-title').textContent;
        const value = card.querySelector('.metric-value').textContent;
        card.setAttribute('data-tooltip', `${title}: ${value}`);
    });

    // Add click handlers for insights
    insightCards.forEach(card => {
        card.addEventListener('click', () => {
            const content = card.querySelector('.insight-content').textContent;
            const metric = card.querySelector('.insight-metric span').textContent;
            
            showInsightDetails(card.querySelector('.insight-title').textContent, content, metric);
        });
    });

    function showInsightDetails(title, content, metric) {
        // Create and show a modal with detailed information
        const modal = document.createElement('div');
        modal.className = 'insight-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${title}</h3>
                <p>${content}</p>
                <div class="metric-detail">${metric}</div>
                <button class="btn btn-secondary modal-close">Close</button>
            </div>
        `;

        // Add styles for the modal
        const style = document.createElement('style');
        style.textContent = `
            .insight-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .modal-content {
                background: var(--card-light);
                padding: 24px;
                border-radius: var(--border-radius);
                max-width: 500px;
                width: 90%;
                transform: translateY(20px);
                transition: transform 0.3s;
            }
            .modal-content h3 {
                color: var(--primary-color);
                margin-bottom: 16px;
            }
            .metric-detail {
                margin: 16px 0;
                padding: 8px;
                background: var(--background-light);
                border-radius: var(--border-radius);
                font-weight: 500;
            }
            .modal-close {
                width: 100%;
                margin-top: 16px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // Animate modal entrance
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        });

        // Close modal handler
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.style.opacity = '0';
            modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
            setTimeout(() => modal.remove(), 300);
        });
    }

    // Animate progress bars on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.width = entry.target.getAttribute('data-width');
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.progress-bar').forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        bar.setAttribute('data-width', width);
        observer.observe(bar);
    });

    // Add pulse animation to high achievements
    goalCards.forEach(card => {
        const progressValue = parseInt(card.querySelector('.progress-value').textContent);
        if (progressValue >= 90) {
            card.classList.add('pulse-animation');
        }
    });

    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserData(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Event Listeners
    dateRangeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const range = validateDateRange(button.dataset.range);
            dateRangeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentRange = range;
            clearCache(); // Clear cache when changing date range
            updateAnalytics();
        });
    });

    chartControls.forEach(button => {
        button.addEventListener('click', () => {
            chartControls.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentChartType = button.dataset.chart;
            updateChart();
        });
    });

    printReportBtn.addEventListener('click', generateReport);

    // Add loading state management
    function showLoading() {
        analyticsContainer.classList.add('loading');
    }

    function hideLoading() {
        analyticsContainer.classList.remove('loading');
        // Add fade-in effect to content
        analyticsContainer.classList.add('fade-in');
        setTimeout(() => analyticsContainer.classList.remove('fade-in'), 500);
    }

    // Keyboard Navigation
    function initKeyboardNavigation() {
        // Make cards focusable
        document.querySelectorAll('.metric-card, .insight-card, .goal-card').forEach(card => {
            card.setAttribute('tabindex', '0');
            
            // Handle keyboard interaction
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        // Add keyboard shortcuts for common actions
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts if not in an input/textarea
            if (e.target.matches('input, textarea')) return;

            if (e.key === 'p' && e.ctrlKey) {
                e.preventDefault();
                printReportBtn.click();
            }
            if (e.key === 't' && e.ctrlKey) {
                e.preventDefault();
                themeToggle.click();
            }
        });
    }

    // Enhanced error handling with user feedback
    function handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-toast';
        errorMessage.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>Unable to ${context}. Please try again.</span>
            </div>
        `;
        
        document.body.appendChild(errorMessage);
        setTimeout(() => {
            errorMessage.classList.add('show');
            setTimeout(() => {
                errorMessage.classList.remove('show');
                setTimeout(() => errorMessage.remove(), 300);
            }, 3000);
        }, 100);
    }

    // Debounce function for performance optimization
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Optimize chart updates
    const debouncedUpdateChart = debounce(updateChart, 250);

    // Progressive Loading States
    const loadingStates = {
        metrics: false,
        charts: false,
        insights: false,
        goals: false
    };

    // Update loading indicator based on states
    function updateLoadingState() {
        const isLoading = Object.values(loadingStates).some(state => state);
        if (isLoading) {
            showLoading();
        } else {
            hideLoading();
        }
    }

    // Cache Management
    const cache = {
        data: new Map(),
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxSize: 50 // Maximum number of items to cache
    };

    function setCache(key, value) {
        // Remove oldest items if cache is full
        if (cache.data.size >= cache.maxSize) {
            const oldestKey = cache.data.keys().next().value;
            cache.data.delete(oldestKey);
        }

        cache.data.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    function getCache(key) {
        const item = cache.data.get(key);
        if (!item) return null;

        // Check if cache is still valid
        if (Date.now() - item.timestamp > cache.maxAge) {
            cache.data.delete(key);
            return null;
        }

        return item.value;
    }

    function clearCache() {
        cache.data.clear();
    }

    // Memory Management
    function cleanupMemory() {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }

        // Clear unused data
        if (userData?.meals) {
            userData.meals = userData.meals.map(meal => ({
                id: meal.id,
                date: meal.date,
                nutrition: meal.nutrition,
                planned: meal.planned,
                completed: meal.completed,
                workoutDay: meal.workoutDay
            }));
        }

        // Clear any detached DOM elements
        const modals = document.querySelectorAll('.insight-modal');
        modals.forEach(modal => modal.remove());
    }

    // Enhanced Security
    function sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }

    function validateDateRange(range) {
        const validRanges = ['week', 'month', '3months', 'year'];
        return validRanges.includes(range) ? range : 'month';
    }

    // Update the loadUserData function with caching and security
    async function loadUserData(userId) {
        try {
            // Validate user ID
            if (!userId || typeof userId !== 'string') {
                throw new Error('Invalid user ID');
            }

            // Check cache first
            const cacheKey = `${userId}_${currentRange}`;
            const cachedData = getCache(cacheKey);
            if (cachedData) {
                userData = cachedData;
                updateAnalytics();
                return;
            }

            // Progressive loading with security checks
            loadingStates.metrics = true;
            updateLoadingState();
            await loadMetrics(userId);
            loadingStates.metrics = false;

            loadingStates.goals = true;
            updateLoadingState();
            await loadGoals(userId);
            loadingStates.goals = false;

            loadingStates.charts = true;
            updateLoadingState();
            await loadChartData(userId);
            loadingStates.charts = false;

            loadingStates.insights = true;
            updateLoadingState();
            await loadInsights(userId);
            loadingStates.insights = false;

            // Cache the loaded data
            setCache(cacheKey, userData);

            updateLoadingState();
            
            // Cleanup memory periodically
            setTimeout(cleanupMemory, 1000);

        } catch (error) {
            handleError(error, 'load data');
            Object.keys(loadingStates).forEach(key => loadingStates[key] = false);
            updateLoadingState();
        }
    }

    async function loadMetrics(userId) {
        const startDate = getStartDate(currentRange);
        const mealsRef = collection(db, 'meals');
        const q = query(
            mealsRef,
            where('userId', '==', userId),
            where('date', '>=', startDate),
            // Limit initial load for better performance
            limit(50)
        );

        const querySnapshot = await getDocs(q);
        const meals = [];
        querySnapshot.forEach(doc => {
            meals.push({
                id: doc.id,
                ...doc.data()
            });
        });

        userData = { meals };
        updateMetrics();
    }

    async function loadGoals(userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        userData.goals = userDoc.data()?.goals || {};
        updateGoals();
    }

    async function loadChartData(userId) {
        // Load chart data in chunks
        const chunks = await loadDataInChunks(userId);
        userData.chartData = chunks;
        debouncedUpdateChart();
    }

    async function loadInsights(userId) {
        // Load additional data needed for insights
        const additionalData = await loadAdditionalData(userId);
        userData.additionalData = additionalData;
        updateInsights();
    }

    async function loadDataInChunks(userId, chunkSize = 30) {
        const startDate = getStartDate(currentRange);
        const mealsRef = collection(db, 'meals');
        let lastDoc = null;
        const chunks = [];

        while (true) {
            let q = query(
                mealsRef,
                where('userId', '==', userId),
                where('date', '>=', startDate),
                orderBy('date'),
                limit(chunkSize)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            if (snapshot.empty) break;

            const chunk = [];
            snapshot.forEach(doc => {
                chunk.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            chunks.push(...chunk);
            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            // Update chart with available data
            userData.chartData = chunks;
            debouncedUpdateChart();

            // Break if we have enough data or reached the end
            if (snapshot.docs.length < chunkSize) break;
        }

        return chunks;
    }

    async function loadAdditionalData(userId) {
        // Load any additional data needed for insights
        const startDate = getStartDate(currentRange);
        const additionalRef = collection(db, 'userStats');
        const q = query(
            additionalRef,
            where('userId', '==', userId),
            where('date', '>=', startDate)
        );

        const snapshot = await getDocs(q);
        const data = [];
        snapshot.forEach(doc => {
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return data;
    }

    // Update the updateAnalytics function to handle partial data
    function updateAnalytics() {
        if (!userData) return;

        if (userData.meals) {
            updateMetrics();
        }
        
        if (userData.chartData) {
            debouncedUpdateChart();
        }

        if (userData.goals) {
            updateGoals();
        }

        if (userData.additionalData) {
            updateInsights();
        }

        updateNutritionScore();
    }

    function updateMetrics() {
        const metrics = calculateMetrics(userData.meals);
        const previousMetrics = calculateMetrics(
            userData.meals,
            getStartDate(currentRange, true)
        );

        // Update metric cards
        updateMetricCard('Average Daily Calories', metrics.avgCalories, previousMetrics.avgCalories);
        updateMetricCard('Protein Intake', metrics.avgProtein, previousMetrics.avgProtein);
        updateMetricCard('Goal Progress', metrics.goalProgress, previousMetrics.goalProgress);
        updateMetricCard('Meal Plan Adherence', metrics.adherence, previousMetrics.adherence);
    }

    function updateChart() {
        if (currentChart) {
            currentChart.destroy();
        }

        const chartData = generateChartData();
        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        currentChart = new Chart(trendsChart, config);
    }

    function updateInsights() {
        const insights = generateInsights();
        // Update insight cards with the generated insights
        // This would involve updating the DOM with new insight data
    }

    function updateGoals() {
        if (!userData?.goals) return;

        const goalData = {
            'Daily Calories': {
                current: calculateDailyCalories(),
                target: userData.goals.calories || 2000,
                unit: ' kcal'
            },
            'Protein Target': {
                current: calculateDailyProtein(),
                target: userData.goals.protein || 80,
                unit: 'g'
            },
            'Water Intake': {
                current: calculateDailyWater(),
                target: userData.goals.water || 2000,
                unit: 'ml'
            }
        };

        goalTracker.updateGoalProgress(goalData);
    }

    // Utility functions
    function calculateMetrics(meals, startDate = null) {
        if (startDate) {
            meals = meals.filter(meal => meal.date.toDate() >= startDate);
        }

        const totalDays = getDaysBetween(
            meals[0]?.date.toDate(),
            meals[meals.length - 1]?.date.toDate()
        ) || 1;

        const totalCalories = meals.reduce((sum, meal) => sum + (meal.nutrition?.calories || 0), 0);
        const totalProtein = meals.reduce((sum, meal) => sum + (meal.nutrition?.protein || 0), 0);

        return {
            avgCalories: Math.round(totalCalories / totalDays),
            avgProtein: Math.round(totalProtein / totalDays),
            goalProgress: calculateOverallProgress(meals),
            adherence: calculateAdherence(meals)
        };
    }

    function generateChartData() {
        const data = {
            labels: [],
            datasets: []
        };

        switch (currentChartType) {
            case 'calories':
                data.datasets = [{
                    label: 'Daily Calories',
                    data: getDailyData('calories'),
                    borderColor: '#1A3C34',
                    tension: 0.4
                }];
                break;

            case 'macros':
                data.datasets = [
                    {
                        label: 'Protein',
                        data: getDailyData('protein'),
                        borderColor: '#48BB78',
                        tension: 0.4
                    },
                    {
                        label: 'Carbs',
                        data: getDailyData('carbs'),
                        borderColor: '#3D5A80',
                        tension: 0.4
                    },
                    {
                        label: 'Fat',
                        data: getDailyData('fat'),
                        borderColor: '#FF8C42',
                        tension: 0.4
                    }
                ];
                break;

            case 'goals':
                data.datasets = [{
                    label: 'Goal Progress',
                    data: getGoalProgress(),
                    borderColor: '#1A3C34',
                    tension: 0.4
                }];
                break;
        }

        return data;
    }

    function generateInsights() {
        const insights = [];
        const meals = userData.meals;

        // Analyze meal timing
        const mealTiming = analyzeMealTiming(meals);
        if (mealTiming.earlyEating > 0.7) {
            insights.push({
                type: 'timing',
                title: 'Healthy Eating Pattern',
                content: 'You consume most of your calories earlier in the day, which is great for metabolism.',
                metric: `${Math.round(mealTiming.earlyEating * 100)}% calories before 6 PM`
            });
        }

        // Analyze protein intake on workout days
        const proteinAnalysis = analyzeProteinIntake(meals);
        if (proteinAnalysis.workoutDayDifference > 0.2) {
            insights.push({
                type: 'protein',
                title: 'Smart Protein Timing',
                content: 'Higher protein intake on workout days supports muscle recovery.',
                metric: `${Math.round(proteinAnalysis.workoutDayDifference * 100)}% more protein on workout days`
            });
        }

        return insights;
    }

    function calculateGoalProgress() {
        const progress = {};
        const goals = userData.goals;
        const metrics = calculateMetrics(userData.meals);

        if (goals.calories) {
            progress.calories = Math.min(100, (metrics.avgCalories / goals.calories) * 100);
        }

        if (goals.protein) {
            progress.protein = Math.min(100, (metrics.avgProtein / goals.protein) * 100);
        }

        return progress;
    }

    function getStartDate(range, previous = false) {
        const date = new Date();
        if (previous) {
            date.setDate(date.getDate() - getDaysInRange(range) * 2);
        }
        
        switch (range) {
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
            case '3months':
                date.setMonth(date.getMonth() - 3);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - 1);
                break;
        }
        return date;
    }

    function getDaysInRange(range) {
        switch (range) {
            case 'week': return 7;
            case 'month': return 30;
            case '3months': return 90;
            case 'year': return 365;
            default: return 30;
        }
    }

    function getDaysBetween(start, end) {
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }

    function updateMetricCard(title, current, previous) {
        const card = document.querySelector(`.metric-card:has(.metric-title:contains("${title}"))`);
        if (!card) return;

        const valueElement = card.querySelector('.metric-value');
        const changeElement = card.querySelector('.metric-change');

        valueElement.textContent = formatMetricValue(title, current);

        const percentChange = ((current - previous) / previous) * 100;
        const isPositive = percentChange > 0;
        
        changeElement.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
        changeElement.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            <span>${Math.abs(percentChange).toFixed(1)}% vs last period</span>
        `;
    }

    function formatMetricValue(title, value) {
        switch (title) {
            case 'Average Daily Calories':
                return Math.round(value).toLocaleString();
            case 'Protein Intake':
                return `${Math.round(value)}g`;
            case 'Goal Progress':
            case 'Meal Plan Adherence':
                return `${Math.round(value)}%`;
            default:
                return value;
        }
    }

    function getDailyData(metric) {
        const data = [];
        const startDate = getStartDate(currentRange);
        const days = getDaysInRange(currentRange);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dayMeals = userData.meals.filter(meal => 
                meal.date.toDate().toDateString() === date.toDateString()
            );

            let value = 0;
            dayMeals.forEach(meal => {
                value += meal.nutrition?.[metric] || 0;
            });

            data.push(value);
        }

        return data;
    }

    function getGoalProgress() {
        const data = [];
        const startDate = getStartDate(currentRange);
        const days = getDaysInRange(currentRange);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dayMeals = userData.meals.filter(meal => 
                meal.date.toDate().toDateString() === date.toDateString()
            );

            const progress = calculateOverallProgress(dayMeals);
            data.push(progress);
        }

        return data;
    }

    function calculateOverallProgress(meals) {
        if (!meals.length || !userData.goals) return 0;

        const metrics = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };

        meals.forEach(meal => {
            if (meal.nutrition) {
                Object.keys(metrics).forEach(metric => {
                    metrics[metric] += meal.nutrition[metric] || 0;
                });
            }
        });

        const progressPercentages = Object.keys(metrics).map(metric => {
            if (!userData.goals[metric]) return 100;
            return Math.min(100, (metrics[metric] / userData.goals[metric]) * 100);
        });

        return progressPercentages.reduce((sum, value) => sum + value, 0) / progressPercentages.length;
    }

    function calculateAdherence(meals) {
        if (!meals.length) return 0;

        const plannedMeals = meals.filter(meal => meal.planned);
        const completedMeals = plannedMeals.filter(meal => meal.completed);

        return (completedMeals.length / plannedMeals.length) * 100 || 0;
    }

    function analyzeMealTiming(meals) {
        let earlyCalories = 0;
        let totalCalories = 0;

        meals.forEach(meal => {
            const mealTime = meal.date.toDate().getHours();
            const calories = meal.nutrition?.calories || 0;

            totalCalories += calories;
            if (mealTime < 18) { // Before 6 PM
                earlyCalories += calories;
            }
        });

        return {
            earlyEating: totalCalories ? earlyCalories / totalCalories : 0
        };
    }

    function analyzeProteinIntake(meals) {
        const workoutDays = {};
        const nonWorkoutDays = {};

        meals.forEach(meal => {
            const date = meal.date.toDate().toDateString();
            const protein = meal.nutrition?.protein || 0;

            if (meal.workoutDay) {
                workoutDays[date] = (workoutDays[date] || 0) + protein;
            } else {
                nonWorkoutDays[date] = (nonWorkoutDays[date] || 0) + protein;
            }
        });

        const avgWorkoutProtein = Object.values(workoutDays).reduce((sum, val) => sum + val, 0) / 
            (Object.keys(workoutDays).length || 1);
        const avgNonWorkoutProtein = Object.values(nonWorkoutDays).reduce((sum, val) => sum + val, 0) / 
            (Object.keys(nonWorkoutDays).length || 1);

        return {
            workoutDayDifference: avgNonWorkoutProtein ? 
                (avgWorkoutProtein - avgNonWorkoutProtein) / avgNonWorkoutProtein : 0
        };
    }

    // Initialize enhancements
    function initEnhancements() {
        initKeyboardNavigation();
        
        // Add subtle hover effect to buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-1px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
            });
        });
    }

    // Call initialization after DOM content is loaded
    initEnhancements();

    // Chart Optimization
    class ChartManager {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent charts
            this.currentChart = null;
            this.chartData = null;
            this.renderTimeout = null;
            this.isAnimating = false;
            this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
            this.resizeObserver.observe(this.canvas.parentElement);
            
            // Performance optimization flags
            this.useHardwareAcceleration = true;
            this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            // Initialize canvas with device pixel ratio
            this.setupCanvas();
        }

        setupCanvas() {
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.parentElement.getBoundingClientRect();
            
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = `${rect.width}px`;
            this.canvas.style.height = `${rect.height}px`;
            
            this.ctx.scale(dpr, dpr);
        }

        handleResize(entries) {
            if (!entries[0]) return;
            
            cancelAnimationFrame(this.renderTimeout);
            this.renderTimeout = requestAnimationFrame(() => {
                this.setupCanvas();
                if (this.chartData) {
                    this.render();
                }
            });
        }

        setData(data) {
            try {
                this.chartData = this.optimizeChartData(data);
                this.scheduleRender();
            } catch (error) {
                console.error('Error setting chart data:', error);
                this.handleChartError(error);
            }
        }

        optimizeChartData(data) {
            if (!data || !data.datasets) return data;

            // Calculate optimal data point count based on canvas width
            const maxDataPoints = Math.floor(this.canvas.width / 5);
            const currentPoints = data.labels.length;

            if (currentPoints > maxDataPoints) {
                const skipFactor = Math.ceil(currentPoints / maxDataPoints);
                
                return {
                    labels: data.labels.filter((_, i) => i % skipFactor === 0),
                    datasets: data.datasets.map(dataset => ({
                        ...dataset,
                        data: dataset.data.filter((_, i) => i % skipFactor === 0),
                        borderWidth: 2,
                        pointRadius: this.reduceMotion ? 0 : 2,
                        pointHoverRadius: 4,
                        tension: 0.4
                    }))
                };
            }

            return data;
        }

        scheduleRender() {
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
            }
            this.renderTimeout = requestAnimationFrame(() => this.render());
        }

        async render() {
            if (!this.chartData || this.isAnimating) return;

            try {
                this.isAnimating = true;
                
                // Clear previous chart
                if (this.currentChart) {
                    this.currentChart.destroy();
                }

                // Apply performance optimizations
                const config = this.createOptimizedConfig();
                
                // Create and render new chart
                this.currentChart = new Chart(this.ctx, config);
                
                // Wait for animation to complete
                await this.waitForChartAnimation();

            } catch (error) {
                console.error('Chart rendering error:', error);
                this.handleChartError(error);
            } finally {
                this.isAnimating = false;
            }
        }

        createOptimizedConfig() {
            return {
                type: 'line',
                data: this.chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: this.reduceMotion ? 0 : 750,
                        easing: 'easeOutQuart'
                    },
                    elements: {
                        line: {
                            tension: 0.4,
                            borderWidth: 2
                        },
                        point: {
                            radius: this.reduceMotion ? 0 : 2,
                            hoverRadius: 4
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    },
                    plugins: {
                        decimation: {
                            enabled: true,
                            algorithm: 'min-max'
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    }
                }
            };
        }

        async waitForChartAnimation() {
            if (this.reduceMotion || !this.currentChart) return;
            
            return new Promise(resolve => {
                if (!this.currentChart.animating) {
                    resolve();
                    return;
                }
                this.currentChart.options.animation.onComplete = () => resolve();
            });
        }

        handleChartError(error) {
            // Create fallback visualization
            const fallbackChart = document.createElement('div');
            fallbackChart.className = 'fallback-chart';
            fallbackChart.innerHTML = `
                <div class="fallback-message">
                    <i class="fas fa-chart-line"></i>
                    <p>Unable to display chart. Showing simplified view.</p>
                    <small>${error.message}</small>
                </div>
                <div class="fallback-data"></div>
            `;

            // Show simplified data
            if (this.chartData && this.chartData.datasets && this.chartData.datasets[0]) {
                const dataset = this.chartData.datasets[0];
                const lastValue = dataset.data[dataset.data.length - 1];
                const avgValue = dataset.data.reduce((a, b) => a + b, 0) / dataset.data.length;
                
                const fallbackData = fallbackChart.querySelector('.fallback-data');
                fallbackData.innerHTML = `
                    <div>Latest value: ${lastValue}</div>
                    <div>Average: ${avgValue.toFixed(2)}</div>
                `;
            }

            // Replace canvas with fallback
            this.canvas.style.display = 'none';
            this.canvas.parentNode.insertBefore(fallbackChart, this.canvas);
        }

        destroy() {
            if (this.currentChart) {
                this.currentChart.destroy();
                this.currentChart = null;
            }
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
            }
            this.resizeObserver.disconnect();
        }
    }

    // Error Recovery System
    class ErrorRecoverySystem {
        constructor() {
            this.errorCount = 0;
            this.lastError = null;
            this.recoveryStrategies = new Map();
            this.retryTimeouts = new Map();
            this.maxRetries = 3;
            this.initializeRecoveryStrategies();
            this.setupNetworkListener();
        }

        initializeRecoveryStrategies() {
            // Data loading errors
            this.recoveryStrategies.set('LOAD_ERROR', async (error) => {
                if (this.errorCount < this.maxRetries) {
                    await this.retryWithBackoff(error.operation);
                } else {
                    this.fallbackToCache();
                    this.notifyUser('Unable to load new data. Showing cached data.');
                }
            });

            // Chart rendering errors
            this.recoveryStrategies.set('CHART_ERROR', async (error) => {
                if (this.errorCount < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    chartManager.render();
                } else {
                    chartManager.handleChartError(error);
                    this.notifyUser('Chart rendering failed. Showing simplified view.');
                }
            });

            // Network errors
            this.recoveryStrategies.set('NETWORK_ERROR', async (error) => {
                if (navigator.onLine) {
                    await this.retryWithBackoff(error.operation);
                } else {
                    this.enableOfflineMode();
                    this.notifyUser('You are offline. Some features may be limited.');
                }
            });

            // Firebase errors
            this.recoveryStrategies.set('FIREBASE_ERROR', async (error) => {
                if (error.code === 'permission-denied') {
                    this.handleAuthError();
                } else if (this.errorCount < this.maxRetries) {
                    await this.retryWithBackoff(error.operation);
                } else {
                    this.fallbackToCache();
                    this.notifyUser('Database connection failed. Using cached data.');
                }
            });
        }

        setupNetworkListener() {
            window.addEventListener('online', () => {
                this.notifyUser('Connection restored. Refreshing data...', 'success');
                this.errorCount = 0;
                document.body.classList.remove('offline-mode');
                this.refreshData();
            });

            window.addEventListener('offline', () => {
                this.enableOfflineMode();
                this.notifyUser('You are offline. Some features may be limited.');
            });
        }

        async handleError(error, context) {
            this.errorCount++;
            this.lastError = { error, context, timestamp: Date.now() };

            // Log error for monitoring
            this.logError(error, context);

            // Clear any existing retry timeouts for this context
            if (this.retryTimeouts.has(context)) {
                clearTimeout(this.retryTimeouts.get(context));
            }

            // Determine error type and execute recovery strategy
            const errorType = this.classifyError(error);
            const recoveryStrategy = this.recoveryStrategies.get(errorType);

            if (recoveryStrategy) {
                try {
                    await recoveryStrategy(error);
                } catch (recoveryError) {
                    this.handleRecoveryFailure(recoveryError, context);
                }
            } else {
                this.handleUnknownError(error);
            }

            // Reset error count after successful recovery or max retries
            if (this.errorCount >= this.maxRetries) {
                setTimeout(() => this.reset(), 60000); // Reset after 1 minute
            }
        }

        classifyError(error) {
            if (!navigator.onLine || error.name === 'NetworkError' || error.message.includes('network')) {
                return 'NETWORK_ERROR';
            }
            if (error.name === 'FirebaseError' || error.code?.includes('firebase')) {
                return 'FIREBASE_ERROR';
            }
            if (error.message.includes('chart') || error.message.includes('canvas')) {
                return 'CHART_ERROR';
            }
            if (error.message.includes('load') || error.message.includes('data')) {
                return 'LOAD_ERROR';
            }
            return 'UNKNOWN_ERROR';
        }

        async retryWithBackoff(operation) {
            const maxRetries = this.maxRetries;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                try {
                    const result = await operation();
                    this.errorCount = 0; // Reset on success
                    return result;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) throw error;

                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                    this.notifyUser(`Retrying in ${delay/1000} seconds... (Attempt ${retryCount}/${maxRetries})`);
                    
                    await new Promise(resolve => {
                        const timeoutId = setTimeout(resolve, delay);
                        this.retryTimeouts.set(operation.name, timeoutId);
                    });
                }
            }
        }

        fallbackToCache() {
            const cachedData = getCache(currentCacheKey);
            if (cachedData) {
                userData = cachedData;
                updateAnalytics();
                document.body.classList.add('using-cached-data');
            } else {
                this.showOfflineMessage();
            }
        }

        enableOfflineMode() {
            document.body.classList.add('offline-mode');
            this.showOfflineMessage();
            
            // Disable real-time updates
            if (window.realtimeUnsubscribe) {
                window.realtimeUnsubscribe();
            }
        }

        showOfflineMessage() {
            const existingMessage = document.querySelector('.offline-message');
            if (existingMessage) return;

            const message = document.createElement('div');
            message.className = 'offline-message';
            message.innerHTML = `
                <i class="fas fa-wifi-slash"></i>
                <p>You're currently offline. Some features may be limited.</p>
                <button class="btn btn-secondary retry-button">
                    <i class="fas fa-sync"></i> Retry Connection
                </button>
            `;

            const retryButton = message.querySelector('.retry-button');
            retryButton.addEventListener('click', () => {
                if (navigator.onLine) {
                    location.reload();
                } else {
                    this.notifyUser('Still offline. Please check your connection.');
                    retryButton.classList.add('shake');
                    setTimeout(() => retryButton.classList.remove('shake'), 820);
                }
            });

            document.body.appendChild(message);
        }

        notifyUser(message, type = 'warning') {
            const toast = document.createElement('div');
            toast.className = `error-toast ${type}`;
            toast.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }

        handleAuthError() {
            this.notifyUser('Authentication error. Please log in again.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }

        handleRecoveryFailure(error, context) {
            console.error('Recovery failed:', error);
            this.notifyUser('Unable to recover from error. Please refresh the page.');
            this.logError(error, `Recovery failure for ${context}`);
        }

        handleUnknownError(error) {
            console.error('Unknown error:', error);
            this.notifyUser('An unexpected error occurred. Please try again later.');
            this.logError(error, 'Unknown error');
        }

        logError(error, context) {
            const errorLog = {
                timestamp: new Date().toISOString(),
                context,
                message: error.message,
                stack: error.stack,
                count: this.errorCount,
                userAgent: navigator.userAgent,
                online: navigator.onLine
            };
            
            console.error('Error Log:', errorLog);
            // Here you would typically send this to your error monitoring service
        }

        refreshData() {
            // Reload data and update UI
            loadUserData(auth.currentUser?.uid);
        }

        reset() {
            this.errorCount = 0;
            this.lastError = null;
            this.retryTimeouts.forEach(clearTimeout);
            this.retryTimeouts.clear();
            document.body.classList.remove('using-cached-data');
        }
    }

    // Initialize managers
    const chartManager = new ChartManager('trendsChart');
    const errorRecovery = new ErrorRecoverySystem();

    // Update chart rendering
    function updateChart() {
        if (!userData?.chartData) return;

        const chartData = prepareChartData(userData.chartData);
        chartManager.setData(chartData);
    }

    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        chartManager.resize();
    }, 250));

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        chartManager.destroy();
    });

    function updateNutritionScore() {
        if (!userData?.meals || !userData?.goals) return;

        const score = calculateNutritionScore();
        updateScoreDisplay(score);
        updateScoreBadge(score);
        generateScoreInsights(score);
    }

    function calculateNutritionScore() {
        const metrics = {
            calorieAdherence: calculateCalorieAdherence(),
            macroBalance: calculateMacroBalance(),
            mealTiming: calculateMealTimingScore(),
            consistency: calculateConsistencyScore(),
            nutrientDensity: calculateNutrientDensityScore()
        };

        // Weight factors for different components
        const weights = {
            calorieAdherence: 0.25,
            macroBalance: 0.25,
            mealTiming: 0.15,
            consistency: 0.20,
            nutrientDensity: 0.15
        };

        // Calculate weighted score
        const weightedScore = Object.keys(metrics).reduce((score, metric) => {
            return score + (metrics[metric] * weights[metric]);
        }, 0);

        return Math.round(weightedScore * 100);
    }

    function calculateCalorieAdherence() {
        const meals = userData.meals;
        const calorieGoal = userData.goals.calories || 2000;
        let adherenceScore = 0;

        meals.forEach(meal => {
            const calories = meal.nutrition?.calories || 0;
            const deviation = Math.abs(calories - calorieGoal);
            const maxDeviation = calorieGoal * 0.2; // 20% deviation threshold
            
            adherenceScore += 1 - Math.min(deviation / maxDeviation, 1);
        });

        return adherenceScore / meals.length;
    }

    function calculateMacroBalance() {
        const meals = userData.meals;
        let macroScore = 0;

        const idealRatios = {
            protein: 0.25,
            carbs: 0.45,
            fat: 0.30
        };

        meals.forEach(meal => {
            if (!meal.nutrition) return;

            const totalMacros = (meal.nutrition.protein * 4) + 
                              (meal.nutrition.carbs * 4) + 
                              (meal.nutrition.fat * 9);

            if (totalMacros === 0) return;

            const actualRatios = {
                protein: (meal.nutrition.protein * 4) / totalMacros,
                carbs: (meal.nutrition.carbs * 4) / totalMacros,
                fat: (meal.nutrition.fat * 9) / totalMacros
            };

            const ratioScore = 1 - (
                Math.abs(actualRatios.protein - idealRatios.protein) +
                Math.abs(actualRatios.carbs - idealRatios.carbs) +
                Math.abs(actualRatios.fat - idealRatios.fat)
            ) / 2;

            macroScore += ratioScore;
        });

        return macroScore / meals.length;
    }

    function calculateMealTimingScore() {
        const meals = userData.meals;
        let timingScore = 0;

        const idealMealTimes = [8, 13, 19]; // Ideal meal times (24-hour format)
        const timeWindow = 1.5; // 1.5 hour window around ideal times

        meals.forEach(meal => {
            const mealTime = meal.date.toDate().getHours() + 
                            (meal.date.toDate().getMinutes() / 60);

            // Find closest ideal meal time
            const timeDeviation = idealMealTimes.reduce((min, ideal) => {
                const deviation = Math.abs(mealTime - ideal);
                return Math.min(min, deviation);
            }, 24);

            timingScore += timeDeviation <= timeWindow ? 1 : 
                           1 - Math.min((timeDeviation - timeWindow) / 2, 1);
        });

        return timingScore / meals.length;
    }

    function calculateConsistencyScore() {
        const meals = userData.meals;
        if (meals.length < 2) return 1;

        let consistencyScore = 0;
        const mealCounts = new Map();
        const calorieVariance = [];

        // Analyze meal frequency and calorie variance
        meals.forEach(meal => {
            const dayKey = meal.date.toDate().toDateString();
            mealCounts.set(dayKey, (mealCounts.get(dayKey) || 0) + 1);
            calorieVariance.push(meal.nutrition?.calories || 0);
        });

        // Score based on consistent meal frequency
        const avgMealsPerDay = Array.from(mealCounts.values()).reduce((a, b) => a + b, 0) / mealCounts.size;
        const frequencyScore = Array.from(mealCounts.values()).reduce((score, count) => {
            return score + (1 - Math.abs(count - avgMealsPerDay) / avgMealsPerDay);
        }, 0) / mealCounts.size;

        // Score based on calorie consistency
        const avgCalories = calorieVariance.reduce((a, b) => a + b, 0) / calorieVariance.length;
        const varianceScore = calorieVariance.reduce((score, calories) => {
            return score + (1 - Math.min(Math.abs(calories - avgCalories) / avgCalories, 1));
        }, 0) / calorieVariance.length;

        return (frequencyScore * 0.5) + (varianceScore * 0.5);
    }

    function calculateNutrientDensityScore() {
        const meals = userData.meals;
        let densityScore = 0;

        const nutrientTargets = {
            fiber: 25, // grams
            vitamins: 100, // percentage of RDA
            minerals: 100, // percentage of RDA
            water: 2000 // ml
        };

        meals.forEach(meal => {
            if (!meal.nutrition) return;

            // Calculate nutrient density relative to calories
            const calories = meal.nutrition.calories || 1;
            const fiberScore = Math.min((meal.nutrition.fiber || 0) / (nutrientTargets.fiber / 3), 1);
            const waterScore = Math.min((meal.nutrition.water || 0) / (nutrientTargets.water / 3), 1);
            
            // Simplified scoring for vitamins and minerals if available
            const vitaminScore = meal.nutrition.vitamins ? 
                Math.min(meal.nutrition.vitamins / nutrientTargets.vitamins, 1) : 0.5;
            const mineralScore = meal.nutrition.minerals ? 
                Math.min(meal.nutrition.minerals / nutrientTargets.minerals, 1) : 0.5;

            densityScore += (fiberScore + waterScore + vitaminScore + mineralScore) / 4;
        });

        return densityScore / meals.length;
    }

    function updateScoreDisplay(score) {
        if (!nutritionScoreValue) return;

        // Animate score counter
        const startValue = parseInt(nutritionScoreValue.textContent) || 0;
        const duration = 1000;
        const steps = 20;
        const increment = (score - startValue) / steps;
        
        let currentStep = 0;
        const animateScore = () => {
            currentStep++;
            const currentValue = Math.round(startValue + (increment * currentStep));
            nutritionScoreValue.textContent = currentValue;
            
            if (currentStep < steps) {
                requestAnimationFrame(animateScore);
            } else {
                nutritionScoreValue.textContent = score;
            }
        };
        
        requestAnimationFrame(animateScore);
    }

    function updateScoreBadge(score) {
        if (!nutritionScoreBadge) return;

        let badgeClass = 'score-badge';
        let badgeText = '';

        if (score >= 90) {
            badgeClass += ' excellent';
            badgeText = 'Excellent';
        } else if (score >= 75) {
            badgeClass += ' good';
            badgeText = 'Good';
        } else if (score >= 60) {
            badgeClass += ' fair';
            badgeText = 'Fair';
        } else {
            badgeClass += ' needs-improvement';
            badgeText = 'Needs Improvement';
        }

        nutritionScoreBadge.className = badgeClass;
        nutritionScoreBadge.textContent = badgeText;
    }

    function generateScoreInsights(score) {
        const insights = [];
        const metrics = {
            calorieAdherence: calculateCalorieAdherence(),
            macroBalance: calculateMacroBalance(),
            mealTiming: calculateMealTimingScore(),
            consistency: calculateConsistencyScore(),
            nutrientDensity: calculateNutrientDensityScore()
        };

        // Generate insights based on lowest scoring metrics
        const sortedMetrics = Object.entries(metrics)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 2);

        sortedMetrics.forEach(([metric, value]) => {
            const percentage = Math.round(value * 100);
            let insight = {
                type: 'improvement',
                title: '',
                content: '',
                metric: `${percentage}% score`
            };

            switch(metric) {
                case 'calorieAdherence':
                    insight.title = 'Calorie Goal Adherence';
                    insight.content = percentage < 70 ? 
                        'Try to stay closer to your daily calorie goals for better results.' :
                        'Good job maintaining your calorie goals!';
                    break;
                case 'macroBalance':
                    insight.title = 'Macro Nutrient Balance';
                    insight.content = percentage < 70 ?
                        'Consider adjusting your protein, carb, and fat ratios for better balance.' :
                        'Your macro nutrient balance is well maintained!';
                    break;
                case 'mealTiming':
                    insight.title = 'Meal Timing';
                    insight.content = percentage < 70 ?
                        'Try to maintain more consistent meal times throughout the day.' :
                        'Your meal timing is well structured!';
                    break;
                case 'consistency':
                    insight.title = 'Meal Consistency';
                    insight.content = percentage < 70 ?
                        'More consistent meal patterns could help improve your nutrition score.' :
                        'You\'re maintaining good consistency in your meals!';
                    break;
                case 'nutrientDensity':
                    insight.title = 'Nutrient Density';
                    insight.content = percentage < 70 ?
                        'Including more nutrient-rich foods could improve your overall nutrition.' :
                        'Great job choosing nutrient-dense foods!';
                    break;
            }

            insights.push(insight);
        });

        // Update insights in the UI
        const insightContainer = document.querySelector('.nutrition-insights');
        if (insightContainer) {
            insightContainer.innerHTML = insights.map(insight => `
                <div class="insight-card ${insight.type}">
                    <h4 class="insight-title">${insight.title}</h4>
                    <p class="insight-content">${insight.content}</p>
                    <div class="insight-metric">
                        <i class="fas fa-chart-line"></i>
                        <span>${insight.metric}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    class GoalTrackingSystem {
        constructor() {
            this.goals = new Map();
            this.progressHistory = new Map();
            this.streaks = new Map();
            this.milestones = new Set();
            this.reminders = new Map();
            this.charts = new Map();
            this.initializeGoalTracking();
            this.setupGoalEditing();
            this.setupNotifications();
            this.setupDetailedAnalytics();
        }

        initializeGoalTracking() {
            // Initialize goal tracking elements
            this.goalCards = document.querySelectorAll('.goal-card');
            this.setupGoalInteractions();
            this.initializeProgressAnimations();
        }

        setupGoalInteractions() {
            this.goalCards.forEach(card => {
                // Add click handler for detailed view
                card.addEventListener('click', () => {
                    const goalName = card.querySelector('.goal-name').textContent;
                    this.showGoalDetails(goalName);
                });

                // Add hover effects for progress bars
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.addEventListener('mouseover', (e) => {
                        this.showProgressTooltip(e, progressBar);
                    });
                    progressBar.addEventListener('mouseout', () => {
                        this.hideProgressTooltip();
                    });
                }
            });
        }

        initializeProgressAnimations() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const progressBar = entry.target;
                        const targetWidth = progressBar.getAttribute('data-progress');
                        this.animateProgress(progressBar, targetWidth);
                    }
                });
            }, { threshold: 0.2 });

            document.querySelectorAll('.progress-bar').forEach(bar => observer.observe(bar));
        }

        animateProgress(progressBar, targetWidth) {
            progressBar.style.transition = 'width 1s ease-out';
            progressBar.style.width = `${targetWidth}%`;

            // Add glow effect for high progress
            if (parseInt(targetWidth) >= 90) {
                progressBar.classList.add('high-progress');
            }
        }

        updateGoalProgress(goalData) {
            Object.entries(goalData).forEach(([goalName, progress]) => {
                const goalCard = this.findGoalCard(goalName);
                if (!goalCard) return;

                const progressBar = goalCard.querySelector('.progress-bar');
                const progressValue = goalCard.querySelector('.progress-value');
                const currentValue = goalCard.querySelector('.goal-info div:last-child');

                // Update progress bar and value
                const percentage = Math.min(100, Math.round(progress.current / progress.target * 100));
                progressBar.setAttribute('data-progress', percentage);
                progressBar.style.width = `${percentage}%`;
                progressValue.textContent = `${percentage}% achieved`;
                currentValue.textContent = `${progress.current} / ${progress.target}${progress.unit || ''}`;

                // Update progress history
                this.updateProgressHistory(goalName, percentage);

                // Check for streaks and milestones
                this.checkStreakAndMilestones(goalName, percentage);
            });
        }

        updateProgressHistory(goalName, percentage) {
            if (!this.progressHistory.has(goalName)) {
                this.progressHistory.set(goalName, []);
            }

            const history = this.progressHistory.get(goalName);
            history.push({
                value: percentage,
                date: new Date()
            });

            // Keep last 30 days of history
            if (history.length > 30) {
                history.shift();
            }

            this.analyzeProgress(goalName, history);
        }

        analyzeProgress(goalName, history) {
            if (history.length < 2) return;

            // Calculate trend
            const recentAvg = history.slice(-7).reduce((sum, entry) => sum + entry.value, 0) / 7;
            const previousAvg = history.slice(-14, -7).reduce((sum, entry) => sum + entry.value, 0) / 7;

            const trend = recentAvg - previousAvg;
            this.updateTrendIndicator(goalName, trend);
        }

        updateTrendIndicator(goalName, trend) {
            const goalCard = this.findGoalCard(goalName);
            if (!goalCard) return;

            const trendIndicator = goalCard.querySelector('.trend-indicator') || 
                this.createTrendIndicator(goalCard);

            trendIndicator.className = 'trend-indicator';
            if (trend > 2) {
                trendIndicator.classList.add('positive');
                trendIndicator.innerHTML = '<i class="fas fa-arrow-trend-up"></i> Improving';
            } else if (trend < -2) {
                trendIndicator.classList.add('negative');
                trendIndicator.innerHTML = '<i class="fas fa-arrow-trend-down"></i> Declining';
            } else {
                trendIndicator.classList.add('neutral');
                trendIndicator.innerHTML = '<i class="fas fa-arrows-left-right"></i> Stable';
            }
        }

        createTrendIndicator(goalCard) {
            const trendIndicator = document.createElement('div');
            trendIndicator.className = 'trend-indicator';
            goalCard.appendChild(trendIndicator);
            return trendIndicator;
        }

        checkStreakAndMilestones(goalName, percentage) {
            // Update streak
            if (percentage >= 100) {
                const currentStreak = (this.streaks.get(goalName) || 0) + 1;
                this.streaks.set(goalName, currentStreak);

                // Check for streak milestones
                if (currentStreak === 7) {
                    this.addMilestone(goalName, 'Week-long streak achieved! 🎉');
                } else if (currentStreak === 30) {
                    this.addMilestone(goalName, 'Month-long streak achieved! 🏆');
                }
            } else {
                this.streaks.set(goalName, 0);
            }

            // Check for percentage milestones
            if (percentage >= 90 && !this.milestones.has(`${goalName}-90`)) {
                this.addMilestone(goalName, '90% completion milestone reached! 🌟');
                this.milestones.add(`${goalName}-90`);
            }
        }

        addMilestone(goalName, message) {
            const goalCard = this.findGoalCard(goalName);
            if (!goalCard) return;

            // Create milestone notification
            const milestone = document.createElement('div');
            milestone.className = 'milestone-notification';
            milestone.innerHTML = `
                <div class="milestone-content">
                    <i class="fas fa-trophy"></i>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(milestone);

            // Animate milestone
            requestAnimationFrame(() => {
                milestone.classList.add('show');
                setTimeout(() => {
                    milestone.classList.remove('show');
                    setTimeout(() => milestone.remove(), 300);
                }, 3000);
            });
        }

        showGoalDetails(goalName) {
            const history = this.progressHistory.get(goalName) || [];
            const streak = this.streaks.get(goalName) || 0;

            const modal = document.createElement('div');
            modal.className = 'goal-detail-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${goalName} Details</h3>
                    <div class="goal-stats">
                        <div class="stat-item">
                            <span class="stat-label">Current Streak</span>
                            <span class="stat-value">${streak} days</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Average Progress</span>
                            <span class="stat-value">${this.calculateAverage(history)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Best Progress</span>
                            <span class="stat-value">${this.calculateBest(history)}%</span>
                        </div>
                    </div>
                    <div class="goal-chart">
                        <canvas id="goalProgressChart"></canvas>
                    </div>
                    <button class="btn btn-secondary modal-close">Close</button>
                </div>
            `;

            document.body.appendChild(modal);
            this.createGoalChart(history);

            // Add close handler
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.add('fade-out');
                setTimeout(() => modal.remove(), 300);
            });

            // Animate modal entrance
            requestAnimationFrame(() => modal.classList.add('show'));
        }

        createGoalChart(history) {
            const ctx = document.getElementById('goalProgressChart').getContext('2d');
            const data = history.map(entry => ({
                x: entry.date,
                y: entry.value
            }));

            new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Progress',
                        data: data,
                        borderColor: '#48BB78',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(72, 187, 120, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            }
                        },
                        y: {
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }

        showProgressTooltip(event, progressBar) {
            const tooltip = document.createElement('div');
            tooltip.className = 'progress-tooltip';
            tooltip.textContent = `${progressBar.style.width} complete`;
            
            const rect = progressBar.getBoundingClientRect();
            tooltip.style.left = `${event.clientX}px`;
            tooltip.style.top = `${rect.top - 30}px`;
            
            document.body.appendChild(tooltip);
        }

        hideProgressTooltip() {
            const tooltip = document.querySelector('.progress-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        }

        findGoalCard(goalName) {
            return Array.from(this.goalCards).find(card => 
                card.querySelector('.goal-name').textContent === goalName
            );
        }

        calculateAverage(history) {
            if (!history.length) return 0;
            return Math.round(history.reduce((sum, entry) => sum + entry.value, 0) / history.length);
        }

        calculateBest(history) {
            if (!history.length) return 0;
            return Math.max(...history.map(entry => entry.value));
        }

        setupGoalEditing() {
            const modal = document.getElementById('goalEditModal');
            const form = document.getElementById('goalEditForm');
            const closeBtn = modal.querySelector('.close-modal');
            const goalValueInput = document.getElementById('goalValue');
            const unitSpan = modal.querySelector('.unit');
            const reminderInput = document.getElementById('reminderTime');
            let currentGoalType = '';

            // Handle edit button clicks
            document.querySelectorAll('.edit-goal-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentGoalType = btn.dataset.goal;
                    this.openGoalEditModal(currentGoalType);
                });
            });

            // Close modal
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
            });

            // Handle click outside modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });

            // Handle form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const value = Number(goalValueInput.value);
                const reminderTime = reminderInput.value;

                await this.updateGoal(currentGoalType, value, reminderTime);
                modal.classList.remove('show');
            });
        }

        openGoalEditModal(goalType) {
            const modal = document.getElementById('goalEditModal');
            const goalValueInput = document.getElementById('goalValue');
            const unitSpan = modal.querySelector('.unit');
            const reminderInput = document.getElementById('reminderTime');

            // Set current values
            const currentGoal = this.goals.get(goalType) || this.getDefaultGoal(goalType);
            goalValueInput.value = currentGoal.target;
            reminderInput.value = this.reminders.get(goalType) || '';

            // Set unit based on goal type
            switch (goalType) {
                case 'calories':
                    unitSpan.textContent = 'kcal';
                    goalValueInput.step = '50';
                    break;
                case 'protein':
                    unitSpan.textContent = 'g';
                    goalValueInput.step = '1';
                    break;
                case 'water':
                    unitSpan.textContent = 'ml';
                    goalValueInput.step = '100';
                    break;
            }

            modal.classList.add('show');
        }

        async updateGoal(type, value, reminderTime) {
            try {
                // Update local goal
                this.goals.set(type, {
                    target: value,
                    current: this.goals.get(type)?.current || 0
                });

                // Update reminder if set
                if (reminderTime) {
                    this.reminders.set(type, reminderTime);
                    this.scheduleReminder(type, reminderTime);
                } else {
                    this.reminders.delete(type);
                }

                // Update UI
                const goalCard = this.findGoalCard(type);
                if (goalCard) {
                    const currentValue = goalCard.querySelector('.current-value');
                    const current = this.goals.get(type)?.current || 0;
                    currentValue.textContent = `${current} / ${value}${this.getUnit(type)}`;
                    
                    // Update progress
                    const percentage = Math.min(100, Math.round((current / value) * 100));
                    const progressBar = goalCard.querySelector('.progress-bar div');
                    const progressValue = goalCard.querySelector('.progress-value');
                    
                    progressBar.style.width = `${percentage}%`;
                    progressValue.textContent = `${percentage}%`;
                }

                // Save to database
                await this.saveGoalToDatabase(type, value, reminderTime);

                // Show success message
                this.showNotification('Goal updated successfully', 'success');

            } catch (error) {
                console.error('Error updating goal:', error);
                this.showNotification('Failed to update goal', 'error');
            }
        }

        getDefaultGoal(type) {
            const defaults = {
                calories: { target: 2000, current: 0 },
                protein: { target: 80, current: 0 },
                water: { target: 2000, current: 0 },
                carbs: { target: 250, current: 0 },
                fat: { target: 65, current: 0 },
                fiber: { target: 25, current: 0 }
            };
            return defaults[type];
        }

        getUnit(type) {
            const units = {
                calories: ' kcal',
                protein: 'g',
                water: 'ml',
                carbs: 'g',
                fat: 'g',
                fiber: 'g'
            };
            return units[type];
        }

        setupNotifications() {
            // Request notification permission
            if ('Notification' in window) {
                Notification.requestPermission();
            }

            // Check and schedule saved reminders
            this.reminders.forEach((time, type) => {
                this.scheduleReminder(type, time);
            });
        }

        scheduleReminder(type, time) {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            const [hours, minutes] = time.split(':');
            const now = new Date();
            const reminderTime = new Date(now);
            reminderTime.setHours(parseInt(hours), parseInt(minutes), 0);

            // If time has passed today, schedule for tomorrow
            if (reminderTime < now) {
                reminderTime.setDate(reminderTime.getDate() + 1);
            }

            const timeUntilReminder = reminderTime - now;
            setTimeout(() => {
                this.showReminderNotification(type);
                // Schedule next reminder for tomorrow
                this.scheduleReminder(type, time);
            }, timeUntilReminder);
        }

        showReminderNotification(type) {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            const messages = {
                calories: 'Time to check your calorie intake!',
                protein: 'Don\'t forget to track your protein intake!',
                water: 'Remember to stay hydrated!'
            };

            new Notification('Nutrition Tracker Reminder', {
                body: messages[type],
                icon: '/images/logo.png'
            });
        }

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(notification);
            setTimeout(() => {
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }, 100);
        }

        async saveGoalToDatabase(type, value, reminderTime) {
            if (!auth.currentUser) return;

            const goalData = {
                target: value,
                reminderTime: reminderTime || null,
                updatedAt: new Date()
            };

            try {
                await setDoc(doc(db, 'users', auth.currentUser.uid, 'goals', type), goalData);
            } catch (error) {
                console.error('Error saving goal to database:', error);
                throw error;
            }
        }

        setupDetailedAnalytics() {
            // Set up detailed analytics for each goal card
            document.querySelectorAll('.goal-card').forEach(card => {
                const goalType = card.dataset.goalType;
                const detailsSection = card.querySelector('.goal-details');
                
                // Create trend indicator
                const trendIndicator = detailsSection.querySelector('.trend-indicator');
                this.updateTrendIndicator(goalType, 0); // Initial state

                // Create streak counter
                const streakCounter = detailsSection.querySelector('.streak-counter');
                this.updateStreakCounter(goalType, streakCounter);

                // Add click listener for detailed view
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.edit-goal-btn')) {
                        this.showDetailedGoalAnalytics(goalType);
                    }
                });
            });
        }

        updateTrendIndicator(goalType, trend) {
            const goalCard = this.findGoalCard(goalType);
            if (!goalCard) return;

            const trendIndicator = goalCard.querySelector('.trend-indicator');
            if (!trendIndicator) return;

            let icon, text, className;
            if (trend > 5) {
                icon = 'fa-arrow-trend-up';
                text = 'Improving';
                className = 'up';
            } else if (trend < -5) {
                icon = 'fa-arrow-trend-down';
                text = 'Declining';
                className = 'down';
            } else {
                icon = 'fa-arrow-right';
                text = 'Stable';
                className = 'stable';
            }

            trendIndicator.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${text}</span>
            `;
            trendIndicator.className = `trend-indicator ${className}`;
        }

        updateStreakCounter(goalType, element) {
            const streak = this.streaks.get(goalType) || 0;
            element.innerHTML = `
                <i class="fas ${streak > 0 ? 'fa-fire' : 'fa-fire-alt'}"></i>
                <span>Streak: ${streak} days</span>
            `;
        }

        showDetailedGoalAnalytics(goalType) {
            const history = this.progressHistory.get(goalType) || [];
            const modal = document.createElement('div');
            modal.className = 'modal goal-analytics-modal';
            
            const chartData = this.prepareChartData(history);
            const stats = this.calculateGoalStats(goalType);
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.getGoalTitle(goalType)} Analytics</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="goal-stats-grid">
                            <div class="stat-card">
                                <div class="stat-value">${stats.average}${this.getUnit(goalType)}</div>
                                <div class="stat-label">Average</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.best}${this.getUnit(goalType)}</div>
                                <div class="stat-label">Best Day</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.consistency}%</div>
                                <div class="stat-label">Consistency</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.streak}</div>
                                <div class="stat-label">Current Streak</div>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="goalDetailChart"></canvas>
                        </div>
                        <div class="insights-section">
                            <h4>Insights</h4>
                            <ul class="insights-list">
                                ${this.generateGoalInsights(goalType, stats).map(insight => 
                                    `<li class="insight-item">
                                        <i class="fas ${insight.icon}"></i>
                                        <span>${insight.text}</span>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.setupDetailedChart('goalDetailChart', chartData);
            
            // Add event listeners
            const closeBtn = modal.querySelector('.close-modal');
            closeBtn.addEventListener('click', () => {
                modal.classList.add('fade-out');
                setTimeout(() => modal.remove(), 300);
            });

            // Show modal with animation
            requestAnimationFrame(() => modal.classList.add('show'));
        }

        prepareChartData(history) {
            return history.map(entry => ({
                x: entry.date,
                y: entry.value
            })).slice(-30); // Last 30 days
        }

        calculateGoalStats(goalType) {
            const history = this.progressHistory.get(goalType) || [];
            const values = history.map(entry => entry.value);
            
            return {
                average: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) || 0,
                best: Math.max(...values, 0),
                consistency: this.calculateConsistency(values),
                streak: this.streaks.get(goalType) || 0
            };
        }

        calculateConsistency(values) {
            if (!values.length) return 0;
            const threshold = 0.9; // 90% of target is considered consistent
            const consistentDays = values.filter(value => value >= threshold * 100).length;
            return Math.round((consistentDays / values.length) * 100);
        }

        generateGoalInsights(goalType, stats) {
            const insights = [];
            const goal = this.goals.get(goalType);
            
            if (!goal) return insights;

            // Trend analysis
            const recentTrend = this.calculateRecentTrend(goalType);
            if (Math.abs(recentTrend) > 5) {
                insights.push({
                    icon: recentTrend > 0 ? 'fa-chart-line' : 'fa-chart-line-down',
                    text: `Your ${this.getGoalTitle(goalType).toLowerCase()} is ${recentTrend > 0 ? 'improving' : 'declining'} by ${Math.abs(recentTrend)}% over the past week.`
                });
            }

            // Streak insight
            if (stats.streak > 0) {
                insights.push({
                    icon: 'fa-fire',
                    text: `You're on a ${stats.streak}-day streak! Keep it up!`
                });
            }

            // Consistency insight
            if (stats.consistency >= 80) {
                insights.push({
                    icon: 'fa-star',
                    text: `Great consistency! You've hit your goal ${stats.consistency}% of the time.`
                });
            } else if (stats.consistency < 50) {
                insights.push({
                    icon: 'fa-triangle-exclamation',
                    text: `Try to be more consistent. You're hitting your goal ${stats.consistency}% of the time.`
                });
            }

            // Best performance
            if (stats.best >= goal.target) {
                insights.push({
                    icon: 'fa-trophy',
                    text: `Your best day was ${stats.best}${this.getUnit(goalType)}!`
                });
            }

            return insights;
        }

        calculateRecentTrend(goalType) {
            const history = this.progressHistory.get(goalType) || [];
            if (history.length < 7) return 0;

            const recent = history.slice(-7);
            const previous = history.slice(-14, -7);

            const recentAvg = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
            const previousAvg = previous.reduce((sum, entry) => sum + entry.value, 0) / previous.length;

            return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
        }

        setupDetailedChart(canvasId, data) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Progress',
                        data: data,
                        borderColor: '#48BB78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.05)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
        }

        getGoalTitle(type) {
            const titles = {
                calories: 'Calorie',
                protein: 'Protein',
                water: 'Water',
                carbs: 'Carbohydrate',
                fat: 'Fat',
                fiber: 'Fiber'
            };
            return titles[type] || type;
        }
    }

    // Initialize goal tracking system
    const goalTracker = new GoalTrackingSystem();

    // Helper functions for goal calculations
    function calculateDailyCalories() {
        if (!userData?.meals) return 0;
        return userData.meals.reduce((sum, meal) => sum + (meal.nutrition?.calories || 0), 0);
    }

    function calculateDailyProtein() {
        if (!userData?.meals) return 0;
        return userData.meals.reduce((sum, meal) => sum + (meal.nutrition?.protein || 0), 0);
    }

    function calculateDailyWater() {
        if (!userData?.meals) return 0;
        return userData.meals.reduce((sum, meal) => sum + (meal.nutrition?.water || 0), 0);
    }

    // Add smart loading for components
    loadingManager.addToQueue('analytics-grid', 3);
    loadingManager.addToQueue('chart-section', 2);
    loadingManager.addToQueue('insights-grid', 1);

    // Apply user preferences
    const prefs = preferencesManager.preferences;
    document.body.setAttribute('data-theme', prefs.theme);
    
    // Set initial date range based on preference
    const dateRangeButtons = document.querySelectorAll('.date-range-selector button');
    dateRangeButtons.forEach(button => {
        if (button.dataset.range === prefs.dateRange) {
            button.classList.add('active');
        }
    });

    // Add double-tap to zoom prevention
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        const timeDiff = now - (this.lastTouch || now);
        
        this.lastTouch = now;
        
        if (timeDiff < 500 && timeDiff > 0) {
            event.preventDefault();
        }
    }, { passive: false });

    // Add touch feedback
    document.querySelectorAll('.btn, .goal-card, .insight-card').forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        element.addEventListener('touchend', function() {
            this.style.transform = '';
        }, { passive: true });
    });

    // Update preferences when user changes settings
    document.getElementById('themeToggle').addEventListener('click', function() {
        const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        preferencesManager.updatePreference('theme', newTheme);
    });

    dateRangeButtons.forEach(button => {
        button.addEventListener('click', function() {
            preferencesManager.updatePreference('dateRange', this.dataset.range);
        });
    });

    // Add mobile enhancements
    class MobileEnhancer {
        constructor() {
            this.setupPullToRefresh();
            this.setupMobileNavigation();
            this.setupBottomSheets();
            this.setupFAB();
            this.setupTouchGestures();
            this.setupCardInteractions();
            this.setupChartGestures();
            this.setupQuickActions();
        }

        setupPullToRefresh() {
            let startY = 0;
            let pullDistance = 0;
            const pullThreshold = 80;
            const container = document.querySelector('.analytics-container');
            const indicator = document.querySelector('.pull-to-refresh');

            container.addEventListener('touchstart', (e) => {
                if (container.scrollTop === 0) {
                    startY = e.touches[0].clientY;
                }
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (container.scrollTop === 0 && e.touches[0].clientY > startY) {
                    pullDistance = e.touches[0].clientY - startY;
                    if (pullDistance > 0 && pullDistance <= pullThreshold) {
                        indicator.style.transform = `translateY(${pullDistance}px)`;
                        e.preventDefault();
                    }
                }
            }, { passive: false });

            container.addEventListener('touchend', () => {
                if (pullDistance >= pullThreshold) {
                    this.performRefresh();
                }
                pullDistance = 0;
                indicator.style.transform = '';
            });
        }

        async performRefresh() {
            const indicator = document.querySelector('.pull-to-refresh');
            indicator.querySelector('span').textContent = 'Refreshing...';
            
            try {
                await loadUserData(auth.currentUser?.uid);
                indicator.querySelector('span').textContent = 'Updated successfully';
            } catch (error) {
                indicator.querySelector('span').textContent = 'Failed to refresh';
            }

            setTimeout(() => {
                indicator.querySelector('span').textContent = 'Pull to refresh';
            }, 2000);
        }

        setupMobileNavigation() {
            const navItems = document.querySelectorAll('.mobile-nav-item');
            const sections = document.querySelectorAll('.section');

            // Handle navigation clicks
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = item.getAttribute('href').substring(1);
                    
                    // Update active states
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');

                    // Scroll to section
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });

            // Update active nav item on scroll
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navItems.forEach(item => {
                            item.classList.toggle('active', item.getAttribute('href') === `#${id}`);
                        });
                    }
                });
            }, { threshold: 0.5 });

            sections.forEach(section => observer.observe(section));
        }

        setupBottomSheets() {
            // Convert modals to bottom sheets on mobile
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('[data-sheet-target]');
                if (!trigger) return;

                e.preventDefault();
                const targetId = trigger.dataset.sheetTarget;
                const sheet = document.getElementById(targetId);
                
                if (sheet) {
                    sheet.classList.add('mobile-sheet');
                    sheet.classList.add('show');

                    // Add close button if not exists
                    if (!sheet.querySelector('.sheet-close')) {
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'sheet-close';
                        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                        sheet.insertBefore(closeBtn, sheet.firstChild);

                        closeBtn.addEventListener('click', () => {
                            sheet.classList.remove('show');
                        });
                    }

                    // Handle sheet dragging
                    let startY = 0;
                    let currentY = 0;

                    sheet.addEventListener('touchstart', (e) => {
                        startY = e.touches[0].clientY;
                        sheet.style.transition = 'none';
                    }, { passive: true });

                    sheet.addEventListener('touchmove', (e) => {
                        currentY = e.touches[0].clientY;
                        const diff = currentY - startY;
                        if (diff > 0) {
                            sheet.style.transform = `translateY(${diff}px)`;
                        }
                    }, { passive: true });

                    sheet.addEventListener('touchend', () => {
                        sheet.style.transition = 'transform 0.3s';
                        if (currentY - startY > 100) {
                            sheet.classList.remove('show');
                        } else {
                            sheet.style.transform = '';
                        }
                    });
                }
            });
        }

        setupFAB() {
            const fab = document.querySelector('.fab');
            if (!fab) return;

            fab.addEventListener('click', () => {
                // Show add entry form in a bottom sheet
                const sheet = document.createElement('div');
                sheet.className = 'mobile-sheet';
                sheet.innerHTML = `
                    <div class="sheet-header">
                        <h3>Add New Entry</h3>
                        <button class="sheet-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="sheet-content">
                        <!-- Add your form content here -->
                    </div>
                `;

                document.body.appendChild(sheet);
                requestAnimationFrame(() => sheet.classList.add('show'));

                sheet.querySelector('.sheet-close').addEventListener('click', () => {
                    sheet.classList.remove('show');
                    setTimeout(() => sheet.remove(), 300);
                });
            });

            // Hide FAB on scroll down, show on scroll up
            let lastScroll = 0;
            document.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                fab.style.transform = currentScroll > lastScroll ? 'translateY(100px)' : '';
                lastScroll = currentScroll;
            }, { passive: true });
        }

        setupTouchGestures() {
            const container = document.querySelector('.analytics-container');
            let touchStartX = 0;
            let touchStartY = 0;

            container.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (!touchStartX || !touchStartY) return;

                const touchEndX = e.touches[0].clientX;
                const touchEndY = e.touches[0].clientY;
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                // Only handle horizontal swipes
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                        // Swipe right - previous period
                        const currentButton = document.querySelector('.date-range-selector .active');
                        const prevButton = currentButton?.previousElementSibling;
                        if (prevButton) prevButton.click();
                    } else {
                        // Swipe left - next period
                        const currentButton = document.querySelector('.date-range-selector .active');
                        const nextButton = currentButton?.nextElementSibling;
                        if (nextButton) nextButton.click();
                    }

                    touchStartX = 0;
                    touchStartY = 0;
                }
            }, { passive: true });
        }

        setupCardInteractions() {
            const cards = document.querySelectorAll('.metric-card, .insight-card, .goal-card');
            
            cards.forEach(card => {
                let startX = 0;
                let startY = 0;
                let startTime = 0;
                let isSwiping = false;
                let originalTransform = '';

                // Add ripple effect
                card.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    startTime = Date.now();
                    originalTransform = card.style.transform;
                    
                    // Add ripple effect
                    const ripple = document.createElement('div');
                    ripple.className = 'touch-ripple';
                    const rect = card.getBoundingClientRect();
                    const x = e.touches[0].clientX - rect.left;
                    const y = e.touches[0].clientY - rect.top;
                    ripple.style.left = `${x}px`;
                    ripple.style.top = `${y}px`;
                    card.appendChild(ripple);

                    // Remove ripple after animation
                    setTimeout(() => ripple.remove(), 1000);
                }, { passive: true });

                card.addEventListener('touchmove', (e) => {
                    if (isSwiping) return;

                    const deltaX = e.touches[0].clientX - startX;
                    const deltaY = e.touches[0].clientY - startY;

                    // If horizontal swipe is greater than vertical, prevent scrolling
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                        isSwiping = true;
                        e.preventDefault();
                        
                        // Limit swipe to 100px and add resistance
                        const swipeAmount = Math.min(Math.abs(deltaX), 100) * Math.sign(deltaX);
                        card.style.transform = `translateX(${swipeAmount}px)`;
                    }
                }, { passive: false });

                card.addEventListener('touchend', (e) => {
                    const deltaTime = Date.now() - startTime;
                    const deltaX = e.changedTouches[0].clientX - startX;
    }

    // Initialize mobile enhancements
    const mobileEnhancer = new MobileEnhancer();

    class MobileFormEnhancer {
        constructor() {
            this.setupQuickAdd();
            this.setupSmartKeyboard();
            this.setupGestureShortcuts();
            this.setupVibrationFeedback();
        }

        setupQuickAdd() {
            const fab = document.querySelector('.fab');
            if (!fab) return;

            fab.addEventListener('click', () => {
                const sheet = document.createElement('div');
                sheet.className = 'mobile-sheet quick-add-sheet';
                sheet.innerHTML = `
                    <div class="sheet-header">
                        <h3>Quick Add</h3>
                        <button class="sheet-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="quick-add-options">
                        <button class="quick-add-btn" data-type="meal">
                            <i class="fas fa-utensils"></i>
                            <span>Add Meal</span>
                        </button>
                        <button class="quick-add-btn" data-type="water">
                            <i class="fas fa-glass-water"></i>
                            <span>Log Water</span>
                        </button>
                        <button class="quick-add-btn" data-type="snack">
                            <i class="fas fa-apple-alt"></i>
                            <span>Add Snack</span>
                        </button>
                    </div>
                    <form class="quick-add-form" style="display: none;">
                        <div class="form-group">
                            <label for="quickAddName">Name</label>
                            <input type="text" id="quickAddName" placeholder="Enter name" autocomplete="off">
                        </div>
                        <div class="form-group">
                            <label for="quickAddCalories">Calories</label>
                            <input type="number" id="quickAddCalories" placeholder="0" pattern="[0-9]*" inputmode="numeric">
                        </div>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </form>
                `;

                document.body.appendChild(sheet);
                requestAnimationFrame(() => sheet.classList.add('show'));

                // Handle quick add options
                const options = sheet.querySelectorAll('.quick-add-btn');
                const form = sheet.querySelector('.quick-add-form');
                
                options.forEach(btn => {
                    btn.addEventListener('click', () => {
                        sheet.querySelector('.quick-add-options').style.display = 'none';
                        form.style.display = 'block';
                        const type = btn.dataset.type;
                        this.setupFormForType(type, form);
                    });
                });

                // Handle close
                sheet.querySelector('.sheet-close').addEventListener('click', () => {
                    sheet.classList.remove('show');
                    setTimeout(() => sheet.remove(), 300);
                });
            });
        }

        setupFormForType(type, form) {
            const nameInput = form.querySelector('#quickAddName');
            nameInput.focus();

            // Use native keyboard features
            switch (type) {
                case 'meal':
                    nameInput.setAttribute('enterkeyhint', 'next');
                    break;
                case 'water':
                    nameInput.value = 'Water';
                    form.querySelector('#quickAddCalories').focus();
                    break;
                case 'snack':
                    nameInput.setAttribute('enterkeyhint', 'done');
                    break;
            }
        }

        setupSmartKeyboard() {
            // Optimize keyboard behavior for mobile
            document.querySelectorAll('input[type="number"]').forEach(input => {
                input.addEventListener('focus', () => {
                    input.setAttribute('inputmode', 'numeric');
                    input.setAttribute('pattern', '[0-9]*');
                });
            });

            // Add keyboard shortcuts
            document.addEventListener('keyup', (e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                    const form = e.target.closest('form');
                    if (form) {
                        const inputs = Array.from(form.querySelectorAll('input'));
                        const index = inputs.indexOf(e.target);
                        if (index < inputs.length - 1) {
                            inputs[index + 1].focus();
                        } else {
                            form.requestSubmit();
                        }
                    }
                }
            });
        }

        setupGestureShortcuts() {
            let startX = 0;
            let startY = 0;
            let startTime = 0;

            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                const deltaX = e.changedTouches[0].clientX - startX;
                const deltaY = e.changedTouches[0].clientY - startY;
                const deltaTime = Date.now() - startTime;

                // Quick gestures only (less than 300ms)
                if (deltaTime < 300) {
                    // Right edge swipe for quick add
                    if (startX > window.innerWidth - 30 && deltaX < -50) {
                        document.querySelector('.fab')?.click();
                    }
                    
                    // Left edge swipe for navigation
                    if (startX < 30 && deltaX > 50) {
                        this.toggleNavigation();
                    }
                }
            }, { passive: true });
        }

        setupVibrationFeedback() {
            // Only setup if vibration is supported and user hasn't disabled it
            if (!navigator.vibrate) return;

            const vibrateOnClick = (element, duration = 10) => {
                element.addEventListener('click', () => {
                    navigator.vibrate(duration);
                });
            };

            // Add subtle vibration feedback to interactive elements
            document.querySelectorAll('.btn, .fab, .quick-add-btn').forEach(el => {
                vibrateOnClick(el);
            });

            // Longer vibration for important actions
            document.querySelectorAll('form').forEach(form => {
                form.addEventListener('submit', () => {
                    navigator.vibrate([20, 50, 20]);
                });
            });
        }

        toggleNavigation() {
            const nav = document.querySelector('.mobile-nav');
            if (nav) {
                nav.classList.toggle('show');
            }
        }
    }

    // Initialize mobile form enhancements
    const mobileFormEnhancer = new MobileFormEnhancer();

    // Add performance monitoring and optimization
    class PerformanceOptimizer {
        constructor() {
            this.isLiteMode = false;
            this.metrics = {
                fps: [],
                loadTimes: [],
                memoryUsage: []
            };
            this.thresholds = {
                poorFps: 30,
                slowLoad: 2000,
                highMemory: 50 // MB
            };
            this.setupPerformanceMonitoring();
            this.setupLazyLoading();
            this.setupConnectionAwareLoading();
        }

        setupPerformanceMonitoring() {
            // Monitor FPS
            let lastTime = performance.now();
            let frames = 0;

            const measureFPS = () => {
                frames++;
                const now = performance.now();
                if (now - lastTime > 1000) {
                    const fps = Math.round(frames * 1000 / (now - lastTime));
                    this.metrics.fps.push(fps);
                    if (this.metrics.fps.length > 60) this.metrics.fps.shift();
                    
                    if (this.shouldEnableLiteMode()) {
                        this.enableLiteMode();
                    }
                    
                    frames = 0;
                    lastTime = now;
                }
                requestAnimationFrame(measureFPS);
            };
            requestAnimationFrame(measureFPS);

            // Monitor page load performance
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        this.metrics.loadTimes.push(entry.duration);
                        if (this.metrics.loadTimes.length > 10) this.metrics.loadTimes.shift();
                    }
                }
            }).observe({ entryTypes: ['navigation'] });

            // Monitor memory usage if available
            if (performance.memory) {
                setInterval(() => {
                    const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
                    this.metrics.memoryUsage.push(memoryUsage);
                    if (this.metrics.memoryUsage.length > 10) this.metrics.memoryUsage.shift();
                }, 10000);
            }
        }

        shouldEnableLiteMode() {
            if (this.isLiteMode) return false;

            const avgFps = this.getAverage(this.metrics.fps);
            const avgLoadTime = this.getAverage(this.metrics.loadTimes);
            const avgMemory = this.getAverage(this.metrics.memoryUsage);

            return (
                avgFps < this.thresholds.poorFps ||
                avgLoadTime > this.thresholds.slowLoad ||
                (avgMemory && avgMemory > this.thresholds.highMemory)
            );
        }

        getAverage(array) {
            if (!array.length) return 0;
            return array.reduce((a, b) => a + b, 0) / array.length;
        }

        setupLazyLoading() {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const element = entry.target;
                            if (element.dataset.src) {
                                if (element.tagName === 'IMG') {
                                    this.loadImage(element);
                                } else {
                                    this.loadComponent(element);
                                }
                                observer.unobserve(element);
                            }
                        }
                    });
                },
                { rootMargin: '50px' }
            );

            document.querySelectorAll('[data-src]').forEach(element => {
                observer.observe(element);
            });
        }

        loadImage(img) {
            const src = img.dataset.src;
            if (this.isLiteMode && img.dataset.liteSrc) {
                img.src = img.dataset.liteSrc;
            } else {
                img.src = src;
            }
            img.removeAttribute('data-src');
        }

        loadComponent(element) {
            if (this.isLiteMode) {
                element.innerHTML = element.dataset.liteContent || element.dataset.src;
            } else {
                element.innerHTML = element.dataset.src;
            }
            element.removeAttribute('data-src');
        }

        setupConnectionAwareLoading() {
            if ('connection' in navigator) {
                navigator.connection.addEventListener('change', () => {
                    this.updateForConnection();
                });
                this.updateForConnection();
            }
        }

        updateForConnection() {
            const connection = navigator.connection;
            const isSlowConnection = connection.effectiveType === '2g' || 
                                    connection.effectiveType === 'slow-2g' ||
                                    connection.saveData;

            if (isSlowConnection && !this.isLiteMode) {
                this.enableLiteMode();
            }
        }

        enableLiteMode() {
            if (this.isLiteMode) return;
            this.isLiteMode = true;

            // Disable non-essential animations
            document.body.classList.add('lite-mode');
            
            // Switch to low-res images
            this.switchToLowResImages();
            
            // Simplify charts
            this.simplifyCharts();
            
            // Show lite mode indicator
            this.showLiteModeIndicator();
        }

        switchToLowResImages() {
            document.querySelectorAll('img[data-lite-src]').forEach(img => {
                if (!img.dataset.originalSrc) {
                    img.dataset.originalSrc = img.src;
                }
                img.src = img.dataset.liteSrc;
            });
        }

        simplifyCharts() {
            const charts = document.querySelectorAll('canvas');
            charts.forEach(canvas => {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    const options = chart.options;
                    options.animation = false;
                    options.elements.line.tension = 0;
                    options.elements.point.radius = 0;
                    chart.update();
                }
            });
        }

        showLiteModeIndicator() {
            const indicator = document.createElement('div');
            indicator.className = 'lite-mode-indicator';
            indicator.innerHTML = `
                <i class="fas fa-bolt"></i>
                <span>Lite Mode Active</span>
            `;
            document.body.appendChild(indicator);
        }
    }

    // Initialize performance optimizer
    const performanceOptimizer = new PerformanceOptimizer();

    // Smart UI Manager for better UX
    class SmartUIManager {
        constructor() {
            this.setupSmartRefresh();
            this.setupProgressiveLoading();
            this.setupErrorBoundary();
            this.setupUserPreferences();
        }

        setupSmartRefresh() {
            let lastRefresh = Date.now();
            const refreshThreshold = 30000; // 30 seconds

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    const timeSinceLastRefresh = Date.now() - lastRefresh;
                    if (timeSinceLastRefresh > refreshThreshold) {
                        this.refreshData();
                    }
                }
            });
        }

        setupProgressiveLoading() {
            const loadPriorities = ['critical', 'important', 'optional'];
            
            loadPriorities.forEach((priority, index) => {
                setTimeout(() => {
                    document.querySelectorAll(`[data-load-priority="${priority}"]`)
                        .forEach(element => this.loadElement(element));
                }, index * 100);
            });
        }

        loadElement(element) {
            element.classList.remove('loading-placeholder');
            if (element.dataset.content) {
                element.textContent = element.dataset.content;
            }
        }

        setupErrorBoundary() {
            window.addEventListener('error', (event) => {
                this.handleError(event.error);
                event.preventDefault();
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleError(event.reason);
                event.preventDefault();
            });
        }

        handleError(error) {
            console.error('Error caught by boundary:', error);
            // Show user-friendly error message without disrupting the experience
            this.showErrorMessage('Something went wrong. Retrying...');
            this.attemptRecovery();
        }

        showErrorMessage(message) {
            const toast = document.createElement('div');
            toast.className = 'error-toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        setupUserPreferences() {
            // Load and apply user preferences
            const preferences = localStorage.getItem('userPreferences');
            if (preferences) {
                this.applyPreferences(JSON.parse(preferences));
            }

            // Watch for preference changes
            this.setupPreferenceObserver();
        }

        applyPreferences(preferences) {
            if (preferences.reduceMotion) {
                document.body.classList.add('reduce-motion');
            }
            if (preferences.highContrast) {
                document.body.classList.add('high-contrast');
            }
            if (preferences.largeText) {
                document.body.classList.add('large-text');
            }
        }

        setupPreferenceObserver() {
            // Watch for system preference changes
            const mediaQueries = {
                reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
                highContrast: window.matchMedia('(prefers-contrast: more)'),
                largeText: window.matchMedia('(prefers-reduced-motion: reduce)')
            };

            Object.entries(mediaQueries).forEach(([preference, query]) => {
                query.addEventListener('change', (e) => {
                    this.updatePreference(preference, e.matches);
                });
            });
        }

        updatePreference(preference, value) {
            const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
            preferences[preference] = value;
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            this.applyPreferences(preferences);
        }
    }

    // Initialize optimizations
    const smartUIManager = new SmartUIManager();

    // Simplified Nutrition Tracker
    class NutritionTracker {
        constructor() {
            this.initializeTracker();
        }

        initializeTracker() {
            this.loadUserData();
            this.setupEventListeners();
        }

        setupEventListeners() {
            // Date range buttons
            document.querySelectorAll('.date-range .btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelector('.date-range .active')?.classList.remove('active');
                    btn.classList.add('active');
                    this.loadUserData();
                });
            });

            // Quick add button
            document.querySelector('.fab')?.addEventListener('click', () => this.showQuickAddForm());
        }

        async loadUserData() {
            try {
                const range = this.getDateRange();
                const [meals, goals] = await Promise.all([
                    dataManager.getMeals(range.start, range.end),
                    dataManager.getGoals()
                ]);

                if (meals.success && goals.success) {
                    const data = {
                        meals: meals.data,
                        goals: this.processGoals(goals.data)
                    };
                    this.updateMetrics(data);
                    this.updateGoals(data);
                    this.updateChart(data);
                } else {
                    throw new Error('Failed to load data');
                }
            } catch (error) {
                console.error('Error loading data:', error);
                this.showError('Failed to load data. Please try again.');
            }
        }

        getDateRange() {
            const now = new Date();
            const range = document.querySelector('.date-range .active')?.dataset.range || 'week';
            
            let start = new Date(now);
            switch (range) {
                case 'week':
                    start.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    start.setMonth(now.getMonth() - 1);
                    break;
                case '3months':
                    start.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    start.setFullYear(now.getFullYear() - 1);
                    break;
            }

            return {
                start: start.toISOString(),
                end: now.toISOString()
            };
        }

        processGoals(goals) {
            const defaultGoals = {
                calories: { type: 'calories', target: 2000 },
                protein: { type: 'protein', target: 80 },
                water: { type: 'water', target: 2000 }
            };

            const goalsMap = goals.reduce((map, goal) => {
                map[goal.type] = goal;
                return map;
            }, {});

            return { ...defaultGoals, ...goalsMap };
        }

        updateMetrics(data) {
            const metrics = {
                calories: this.calculateDailyCalories(data),
                protein: this.calculateProteinIntake(data),
                water: this.calculateWaterIntake(data)
            };

            Object.entries(metrics).forEach(([key, value]) => {
                const element = document.querySelector(`[data-metric="${key}"] .metric-value`);
                if (element) {
                    element.textContent = this.formatMetricValue(key, value);
                }
            });
        }

        updateGoals(data) {
            Object.entries(data.goals).forEach(([type, goal]) => {
                const card = document.querySelector(`[data-goal-type="${type}"]`);
                if (!card) return;

                const current = this.calculateMetricTotal(data.meals, type);
                const percentage = Math.min(100, Math.round((current / goal.target) * 100));
                
                card.querySelector('.progress-bar div').style.width = `${percentage}%`;
                card.querySelector('.progress-value').textContent = `${percentage}%`;
                card.querySelector('.current-value').textContent = 
                    `${Math.round(current)} / ${goal.target}${this.getUnitForType(type)}`;
            });
        }

        updateChart(data) {
            const ctx = document.getElementById('trendsChart')?.getContext('2d');
            if (!ctx) return;

            const chartData = this.prepareChartData(data);
            
            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        prepareChartData(data) {
            const dateLabels = this.generateDateLabels(data.meals);
            const datasets = this.generateDatasets(data.meals, dateLabels);

            return {
                labels: dateLabels,
                datasets: datasets
            };
        }

        generateDateLabels(meals) {
            const dates = new Set(meals.map(meal => meal.date.split('T')[0]));
            return Array.from(dates).sort();
        }

        generateDatasets(meals, labels) {
            const metrics = ['calories', 'protein', 'water'];
            const colors = {
                calories: 'rgb(255, 99, 132)',
                protein: 'rgb(54, 162, 235)',
                water: 'rgb(75, 192, 192)'
            };

            return metrics.map(metric => {
                const data = labels.map(date => {
                    const dailyMeals = meals.filter(meal => meal.date.startsWith(date));
                    return this.calculateMetricTotal(dailyMeals, metric);
                });

                return {
                    label: this.getMetricLabel(metric),
                    data: data,
                    borderColor: colors[metric],
                    tension: 0.1
                };
            });
        }

        showQuickAddForm() {
            const form = document.createElement('div');
            form.className = 'quick-add-form';
            form.innerHTML = `
                <h3>Quick Add</h3>
                <form id="quickAddForm">
                    <div class="form-group">
                        <label for="foodName">Food Name</label>
                        <input type="text" id="foodName" required>
                    </div>
                    <div class="form-group">
                        <label for="calories">Calories</label>
                        <input type="number" id="calories" required min="0">
                    </div>
                    <div class="form-group">
                        <label for="protein">Protein (g)</label>
                        <input type="number" id="protein" min="0" step="0.1">
                    </div>
                    <button type="submit" class="btn">Add</button>
                </form>
            `;

            document.body.appendChild(form);
            form.querySelector('form').addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        async handleFormSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            const mealData = {
                name: formData.get('foodName'),
                calories: Number(formData.get('calories')),
                protein: Number(formData.get('protein')) || 0
            };

            const validation = dataManager.validateMeal(mealData);
            if (!validation.valid) {
                this.showError(validation.errors);
                return;
            }

            try {
                const result = await dataManager.addMeal(mealData);
                if (result.success) {
                    await this.loadUserData();
                    form.parentElement.remove();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error saving meal:', error);
                this.showError('Failed to save meal. Please try again.');
            }
        }

        calculateDailyCalories(data) {
            return this.calculateMetricTotal(data.meals, 'calories');
        }

        calculateProteinIntake(data) {
            return this.calculateMetricTotal(data.meals, 'protein');
        }

        calculateWaterIntake(data) {
            return this.calculateMetricTotal(data.meals, 'water');
        }

        calculateMetricTotal(meals, metric) {
            return meals.reduce((sum, meal) => sum + (meal[metric] || 0), 0);
        }

        formatMetricValue(metric, value) {
            switch (metric) {
                case 'calories':
                    return `${Math.round(value)}`;
                case 'protein':
                    return `${Math.round(value)}g`;
                case 'water':
                    return `${Math.round(value)}ml`;
                default:
                    return value;
            }
        }

        getMetricLabel(metric) {
            switch (metric) {
                case 'calories':
                    return 'Calories';
                case 'protein':
                    return 'Protein (g)';
                case 'water':
                    return 'Water (ml)';
                default:
                    return metric;
            }
        }

        getUnitForType(type) {
            switch (type) {
                case 'calories':
                    return 'kcal';
                case 'protein':
                    return 'g';
                case 'water':
                    return 'ml';
                default:
                    return '';
            }
        }

        showError(message) {
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            document.body.appendChild(error);
            setTimeout(() => error.remove(), 3000);
        }
    }

    // Initialize the tracker
    const tracker = new NutritionTracker();
}); 
}); 