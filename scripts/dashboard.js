// Non-module version of dashboard.js

class NutritionDashboard {
    constructor() {
        this.timeRange = '7days'; // Default time range
        this.currentData = null;
        this.charts = {};
        this.goals = null;
        
        // Initialize dashboard
        this.init();
    }
    
    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Load user goals
            await this.loadGoals();
            
            // Load initial data
            await this.loadData();
            
            // Render dashboard
            this.renderDashboard();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showError('Failed to initialize dashboard. Please try again later.');
        }
    }
    
    setupEventListeners() {
        // Time range selector
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', () => {
                this.timeRange = timeRangeSelect.value;
                this.loadData().then(() => this.renderDashboard());
            });
        }
        
        // Chart type buttons
        const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
        chartTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                chartTypeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const chartType = button.dataset.type;
                this.updateTrendsChart(chartType);
            });
        });
        
        // Report generation buttons
        const reportButtons = document.querySelectorAll('.report-btn');
        reportButtons.forEach(button => {
            button.addEventListener('click', () => {
                const reportType = button.dataset.report;
                this.showReportModal(reportType);
            });
        });
        
        // Generate report button in modal
        const generateReportBtn = document.getElementById('generate-report-btn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }
        
        // Close modal buttons
        const closeModalButtons = document.querySelectorAll('.close-modal, .cancel-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
    }
    
    async loadGoals() {
        try {
            this.goals = await dataManager.getGoals();
            
            // Set default goals if none exist
            if (!this.goals) {
                this.goals = {
                    calories: 2000,
                    protein: 50,
                    carbs: 250,
                    fat: 70,
                    water: 2000
                };
                await dataManager.saveGoals(this.goals);
            }
        } catch (error) {
            console.error('Error loading goals:', error);
            this.showError('Failed to load nutrition goals.');
        }
    }
    
    async loadData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Calculate date range based on selected time range
            const { startDate, endDate } = this.calculateDateRange();
            
            // Get food entries for the selected period
            const foodEntries = await dataManager.getMeals(startDate, endDate);
            
            // Get water intake data
            const waterData = await dataManager.getWaterIntake(startDate, endDate);
            
            // Process the data for dashboard
            this.currentData = this.processData(foodEntries, waterData, startDate, endDate);
            
            // Hide loading state
            this.showLoading(false);
            
            return this.currentData;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data. Please try again later.');
            this.showLoading(false);
        }
    }
    
    calculateDateRange() {
        const endDate = new Date();
        let startDate = new Date();
        
        switch (this.timeRange) {
            case '7days':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90days':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 7);
        }
        
        // Reset hours to get full days
        startDate.setHours(0, 0, 0, 0);
        
        return { startDate, endDate };
    }
    
    processData(foodEntries, waterData, startDate, endDate) {
        // Initialize processed data structure
        const processedData = {
            summary: {
                calories: { total: 0, average: 0 },
                protein: { total: 0, average: 0 },
                carbs: { total: 0, average: 0 },
                fat: { total: 0, average: 0 },
                water: { total: 0, average: 0 }
            },
            dailyData: {},
            mealBreakdown: {
                breakfast: { calories: 0, count: 0, foods: {} },
                lunch: { calories: 0, count: 0, foods: {} },
                dinner: { calories: 0, count: 0, foods: {} },
                snacks: { calories: 0, count: 0, foods: {} }
            },
            goalProgress: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                water: 0
            }
        };
        
        // Generate dates array for the period
        const dateRange = this.generateDateRange(startDate, endDate);
        
        // Initialize daily data structure
        dateRange.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            processedData.dailyData[dateStr] = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                water: 0,
                meals: {
                    breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                    lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                    dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                    snacks: { calories: 0, protein: 0, carbs: 0, fat: 0 }
                }
            };
        });
        
        // Process food entries
        if (foodEntries && foodEntries.length > 0) {
            foodEntries.forEach(entry => {
                const entryDate = new Date(entry.date);
                const dateStr = entryDate.toISOString().split('T')[0];
                
                // Skip if outside the date range
                if (!processedData.dailyData[dateStr]) return;
                
                // Update daily totals
                processedData.dailyData[dateStr].calories += entry.calories;
                processedData.dailyData[dateStr].protein += entry.protein;
                processedData.dailyData[dateStr].carbs += entry.carbs;
                processedData.dailyData[dateStr].fat += entry.fat;
                
                // Update meal breakdown
                const mealType = entry.mealType || 'snacks';
                processedData.dailyData[dateStr].meals[mealType].calories += entry.calories;
                processedData.dailyData[dateStr].meals[mealType].protein += entry.protein;
                processedData.dailyData[dateStr].meals[mealType].carbs += entry.carbs;
                processedData.dailyData[dateStr].meals[mealType].fat += entry.fat;
                
                // Update meal type totals for averages
                processedData.mealBreakdown[mealType].calories += entry.calories;
                processedData.mealBreakdown[mealType].count++;
                
                // Track food frequency
                const foodName = entry.name;
                if (foodName) {
                    if (!processedData.mealBreakdown[mealType].foods[foodName]) {
                        processedData.mealBreakdown[mealType].foods[foodName] = {
                            count: 0,
                            calories: 0
                        };
                    }
                    processedData.mealBreakdown[mealType].foods[foodName].count++;
                    processedData.mealBreakdown[mealType].foods[foodName].calories += entry.calories;
                }
                
                // Update summary totals
                processedData.summary.calories.total += entry.calories;
                processedData.summary.protein.total += entry.protein;
                processedData.summary.carbs.total += entry.carbs;
                processedData.summary.fat.total += entry.fat;
            });
        }
        
        // Process water intake data
        if (waterData && waterData.length > 0) {
            waterData.forEach(entry => {
                const entryDate = new Date(entry.date);
                const dateStr = entryDate.toISOString().split('T')[0];
                
                // Skip if outside the date range
                if (!processedData.dailyData[dateStr]) return;
                
                // Update daily water intake
                processedData.dailyData[dateStr].water += entry.amount;
                
                // Update summary total
                processedData.summary.water.total += entry.amount;
            });
        }
        
        // Calculate averages and percentages
        const dayCount = Object.keys(processedData.dailyData).length;
        
        if (dayCount > 0) {
            // Calculate daily averages
            processedData.summary.calories.average = processedData.summary.calories.total / dayCount;
            processedData.summary.protein.average = processedData.summary.protein.total / dayCount;
            processedData.summary.carbs.average = processedData.summary.carbs.total / dayCount;
            processedData.summary.fat.average = processedData.summary.fat.total / dayCount;
            processedData.summary.water.average = processedData.summary.water.total / dayCount;
            
            // Calculate goal progress (based on averages)
            if (this.goals) {
                processedData.goalProgress.calories = (processedData.summary.calories.average / this.goals.calories) * 100;
                processedData.goalProgress.protein = (processedData.summary.protein.average / this.goals.protein) * 100;
                processedData.goalProgress.carbs = (processedData.summary.carbs.average / this.goals.carbs) * 100;
                processedData.goalProgress.fat = (processedData.summary.fat.average / this.goals.fat) * 100;
                processedData.goalProgress.water = (processedData.summary.water.average / this.goals.water) * 100;
            }
        }
        
        // Calculate meal type averages
        Object.keys(processedData.mealBreakdown).forEach(mealType => {
            const mealData = processedData.mealBreakdown[mealType];
            if (mealData.count > 0) {
                mealData.averageCalories = mealData.calories / mealData.count;
            }
            
            // Sort and limit top foods
            mealData.topFoods = Object.entries(mealData.foods)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([name, data]) => ({ 
                    name, 
                    count: data.count,
                    calories: data.calories
                }));
        });
        
        return processedData;
    }
    
    generateDateRange(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }
    
    renderDashboard() {
        if (!this.currentData) return;
        
        this.renderSummaryCards();
        this.renderTrendsChart();
        this.renderGoalTracker();
        this.renderMacroDistribution();
        this.renderMealAnalysis();
        this.generateInsights();
    }
    
    renderSummaryCards() {
        const { summary } = this.currentData;
        
        // Update calorie card
        document.getElementById('calories-value').textContent = Math.round(summary.calories.average);
        
        // Update protein card
        document.getElementById('protein-value').textContent = Math.round(summary.protein.average);
        
        // Update carbs card
        document.getElementById('carbs-value').textContent = Math.round(summary.carbs.average);
        
        // Update fat card
        document.getElementById('fat-value').textContent = Math.round(summary.fat.average);
    }
    
    renderTrendsChart(chartType = 'calories') {
        const ctx = document.getElementById('trends-chart');
        
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.trendsChart) {
            this.charts.trendsChart.destroy();
        }
        
        // Prepare data for the chart
        const dates = Object.keys(this.currentData.dailyData).sort();
        const values = dates.map(date => this.currentData.dailyData[date][chartType]);
        
        // Format dates for display
        const formattedDates = dates.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        
        // Chart configuration
        const config = {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [{
                    label: this.capitalizeFirstLetter(chartType),
                    data: values,
                    borderColor: this.getChartColor(chartType),
                    backgroundColor: this.getChartColor(chartType, 0.1),
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.getChartColor(chartType),
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            title: function(context) {
                                return dates[context[0].dataIndex];
                            },
                            label: function(context) {
                                const value = context.raw;
                                return `${chartType}: ${Math.round(value)} ${chartType === 'water' ? 'ml' : 'g'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return Math.round(value);
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        this.charts.trendsChart = new Chart(ctx, config);
    }
    
    renderGoalTracker() {
        const { goalProgress } = this.currentData;
        
        // Update progress bars
        Object.keys(goalProgress).forEach(nutrient => {
            const progressBar = document.getElementById(`${nutrient}-progress`);
            const progressValue = document.getElementById(`${nutrient}-progress-value`);
            const currentValue = document.getElementById(`${nutrient}-current`);
            const goalValue = document.getElementById(`${nutrient}-goal`);
            
            if (progressBar && progressValue && currentValue && goalValue) {
                const progress = Math.min(goalProgress[nutrient], 100);
                progressBar.style.width = `${progress}%`;
                progressValue.textContent = `${Math.round(progress)}%`;
                
                // Set current value
                currentValue.textContent = Math.round(this.currentData.summary[nutrient].average);
                
                // Set goal value
                goalValue.textContent = this.goals[nutrient];
            }
        });
    }
    
    renderMacroDistribution() {
        const ctx = document.getElementById('macro-chart');
        
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.macroChart) {
            this.charts.macroChart.destroy();
        }
        
        // Calculate macro percentages
        const totalCalories = 
            this.currentData.summary.protein.average * 4 + 
            this.currentData.summary.carbs.average * 4 + 
            this.currentData.summary.fat.average * 9;
        
        const proteinPercentage = (this.currentData.summary.protein.average * 4 / totalCalories) * 100;
        const carbsPercentage = (this.currentData.summary.carbs.average * 4 / totalCalories) * 100;
        const fatPercentage = (this.currentData.summary.fat.average * 9 / totalCalories) * 100;
        
        // Update stat values
        document.getElementById('protein-percentage').textContent = `${Math.round(proteinPercentage)}%`;
        document.getElementById('carbs-percentage').textContent = `${Math.round(carbsPercentage)}%`;
        document.getElementById('fat-percentage').textContent = `${Math.round(fatPercentage)}%`;
        
        // Chart configuration
        const config = {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fat'],
                datasets: [{
                    data: [proteinPercentage, carbsPercentage, fatPercentage],
                    backgroundColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--protein-color'),
                        getComputedStyle(document.documentElement).getPropertyValue('--carbs-color'),
                        getComputedStyle(document.documentElement).getPropertyValue('--fat-color')
                    ],
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        this.charts.macroChart = new Chart(ctx, config);
    }
    
    renderMealAnalysis() {
        const ctx = document.getElementById('meal-chart');
        
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.charts.mealChart) {
            this.charts.mealChart.destroy();
        }
        
        // Prepare data for meal analysis
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
        const mealCalories = mealTypes.map(meal => 
            this.currentData.mealBreakdown[meal].count > 0 ? 
            this.currentData.mealBreakdown[meal].averageCalories : 0
        );
        
        // Chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: mealTypes.map(this.capitalizeFirstLetter),
                datasets: [{
                    label: 'Average Calories',
                    data: mealCalories,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderWidth: 0,
                    borderRadius: 5,
                    maxBarThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#e0e0e0',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return Math.round(value);
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        this.charts.mealChart = new Chart(ctx, config);
        
        // Populate meal stats
        mealTypes.forEach(meal => {
            const mealData = this.currentData.mealBreakdown[meal];
            const topFoodsContainer = document.getElementById(`${meal}-top-foods`);
            
            if (topFoodsContainer) {
                // Clear previous content
                topFoodsContainer.innerHTML = '';
                
                if (mealData.topFoods && mealData.topFoods.length > 0) {
                    // Create top foods list
                    mealData.topFoods.forEach(food => {
                        const statRow = document.createElement('div');
                        statRow.className = 'stat-row';
                        
                        const statLabel = document.createElement('span');
                        statLabel.className = 'stat-label';
                        statLabel.textContent = food.name;
                        
                        const statValue = document.createElement('span');
                        statValue.className = 'stat-value';
                        statValue.textContent = `${food.count} times`;
                        
                        statRow.appendChild(statLabel);
                        statRow.appendChild(statValue);
                        topFoodsContainer.appendChild(statRow);
                    });
                } else {
                    // No data
                    const noData = document.createElement('div');
                    noData.className = 'stat-row';
                    noData.textContent = 'No data available';
                    topFoodsContainer.appendChild(noData);
                }
            }
        });
    }
    
    generateInsights() {
        const insightsContainer = document.getElementById('insights-container');
        
        if (!insightsContainer) return;
        
        // Clear previous insights
        insightsContainer.innerHTML = '';
        
        const insights = [];
        
        // Goal-based insights
        const { goalProgress } = this.currentData;
        
        // Calorie insights
        if (goalProgress.calories > 105) {
            insights.push({
                title: 'Calorie Intake Above Target',
                message: `Your average calorie intake is ${Math.round(goalProgress.calories - 100)}% above your goal. Consider adjusting portion sizes or choosing lower-calorie alternatives.`,
                type: 'warning'
            });
        } else if (goalProgress.calories < 80) {
            insights.push({
                title: 'Calorie Intake Below Target',
                message: `Your average calorie intake is ${Math.round(100 - goalProgress.calories)}% below your goal. Consider adding more nutrient-dense foods to your meals.`,
                type: 'warning'
            });
        } else if (goalProgress.calories >= 90 && goalProgress.calories <= 110) {
            insights.push({
                title: 'Great Calorie Balance',
                message: 'You\'re maintaining a consistent calorie intake close to your target goal. Great job!',
                type: 'positive'
            });
        }
        
        // Protein insights
        if (goalProgress.protein < 80) {
            insights.push({
                title: 'Low Protein Intake',
                message: `Your protein intake is ${Math.round(100 - goalProgress.protein)}% below your goal. Try adding more lean meats, legumes, or dairy to your meals.`,
                type: 'negative'
            });
        } else if (goalProgress.protein >= 90) {
            insights.push({
                title: 'Excellent Protein Intake',
                message: 'You\'re meeting your protein goals consistently. This helps with muscle maintenance and satiety.',
                type: 'positive'
            });
        }
        
        // Meal pattern insights
        const { mealBreakdown } = this.currentData;
        const totalMeals = Object.values(mealBreakdown).reduce((sum, meal) => sum + meal.count, 0);
        
        if (mealBreakdown.breakfast.count === 0 || (mealBreakdown.breakfast.count / totalMeals) < 0.1) {
            insights.push({
                title: 'Missing Breakfast',
                message: 'You rarely eat breakfast. Starting your day with a balanced meal can help stabilize blood sugar and improve energy levels.',
                type: 'warning'
            });
        }
        
        if (mealBreakdown.snacks.count > (mealBreakdown.breakfast.count + mealBreakdown.lunch.count + mealBreakdown.dinner.count)) {
            insights.push({
                title: 'High Snacking Frequency',
                message: 'You\'re snacking more frequently than eating main meals. Consider more balanced main meals to reduce between-meal hunger.',
                type: 'warning'
            });
        }
        
        // Water insights
        if (goalProgress.water < 70) {
            insights.push({
                title: 'Low Water Intake',
                message: `You're only reaching ${Math.round(goalProgress.water)}% of your hydration goal. Aim to drink water throughout the day for optimal hydration.`,
                type: 'negative'
            });
        } else if (goalProgress.water >= 100) {
            insights.push({
                title: 'Excellent Hydration',
                message: 'You\'re meeting or exceeding your water intake goals. Great job staying hydrated!',
                type: 'positive'
            });
        }
        
        // Macro balance insight
        const totalCalories = 
            this.currentData.summary.protein.average * 4 + 
            this.currentData.summary.carbs.average * 4 + 
            this.currentData.summary.fat.average * 9;
        
        const proteinPercentage = (this.currentData.summary.protein.average * 4 / totalCalories) * 100;
        const carbsPercentage = (this.currentData.summary.carbs.average * 4 / totalCalories) * 100;
        const fatPercentage = (this.currentData.summary.fat.average * 9 / totalCalories) * 100;
        
        if (proteinPercentage < 15) {
            insights.push({
                title: 'Low Protein Ratio',
                message: `Protein makes up only ${Math.round(proteinPercentage)}% of your calories. Most nutritionists recommend 15-35% for optimal health and satiety.`,
                type: 'warning'
            });
        }
        
        if (fatPercentage > 40) {
            insights.push({
                title: 'High Fat Ratio',
                message: `Fat makes up ${Math.round(fatPercentage)}% of your calories. Consider reducing high-fat foods for better macronutrient balance.`,
                type: 'warning'
            });
        }
        
        // Display insights or loading message
        if (insights.length > 0) {
            insights.forEach(insight => {
                const insightCard = document.createElement('div');
                insightCard.className = `insight-card ${insight.type}`;
                
                const insightTitle = document.createElement('h4');
                insightTitle.textContent = insight.title;
                
                const insightMessage = document.createElement('p');
                insightMessage.textContent = insight.message;
                
                insightCard.appendChild(insightTitle);
                insightCard.appendChild(insightMessage);
                insightsContainer.appendChild(insightCard);
            });
        } else {
            const noInsights = document.createElement('div');
            noInsights.className = 'loading-insights';
            noInsights.textContent = 'Not enough data to generate insights. Keep logging your nutrition to receive personalized feedback.';
            insightsContainer.appendChild(noInsights);
        }
    }
    
    showReportModal(reportType) {
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Set the report type in the modal title
            const modalTitle = modal.querySelector('.modal-header h2');
            if (modalTitle) {
                modalTitle.textContent = `Generate ${this.capitalizeFirstLetter(reportType)} Report`;
            }
            
            // Set report type as data attribute
            modal.dataset.reportType = reportType;
            
            // Set default date range based on report type
            const startDateInput = document.getElementById('report-start-date');
            const endDateInput = document.getElementById('report-end-date');
            
            if (startDateInput && endDateInput) {
                const today = new Date();
                let startDate = new Date();
                
                if (reportType === 'weekly') {
                    startDate.setDate(today.getDate() - 7);
                } else if (reportType === 'monthly') {
                    startDate.setMonth(today.getMonth() - 1);
                } else {
                    startDate.setDate(today.getDate() - 30);
                }
                
                startDateInput.value = startDate.toISOString().split('T')[0];
                endDateInput.value = today.toISOString().split('T')[0];
            }
        }
    }
    
    async generateReport() {
        const modal = document.getElementById('report-modal');
        if (!modal) return;
        
        const reportType = modal.dataset.reportType;
        
        // Get date range
        const startDate = new Date(document.getElementById('report-start-date').value);
        const endDate = new Date(document.getElementById('report-end-date').value);
        
        // Get selected sections
        const includeSummary = document.getElementById('include-summary').checked;
        const includeDetails = document.getElementById('include-details').checked;
        const includeCharts = document.getElementById('include-charts').checked;
        const includeInsights = document.getElementById('include-insights').checked;
        
        // Get format
        const formatPDF = document.getElementById('format-pdf').checked;
        const formatCSV = document.getElementById('format-csv').checked;
        
        try {
            // Load data for the report period
            const foodEntries = await dataManager.getMeals(startDate, endDate);
            const waterData = await dataManager.getWaterIntake(startDate, endDate);
            
            const reportData = this.processData(foodEntries, waterData, startDate, endDate);
            
            // Generate report based on format
            if (formatPDF) {
                this.generatePDFReport(reportData, reportType, {
                    startDate,
                    endDate,
                    includeSummary,
                    includeDetails,
                    includeCharts,
                    includeInsights
                });
            } else if (formatCSV) {
                this.generateCSVReport(reportData, reportType, {
                    startDate,
                    endDate
                });
            }
            
            // Close modal
            modal.classList.remove('active');
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showError('Failed to generate report. Please try again later.');
        }
    }
    
    generatePDFReport(reportData, reportType, options) {
        // This is a placeholder for PDF generation
        // In a real application, you would use a library like jsPDF or pdfmake
        alert('PDF report generation would be implemented here with a proper PDF library.');
        console.log('Generating PDF report with data:', reportData, 'Options:', options);
    }
    
    generateCSVReport(reportData, reportType, options) {
        const { startDate, endDate } = options;
        
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // Add headers
        csvContent += 'Date,Calories,Protein (g),Carbs (g),Fat (g),Water (ml)\n';
        
        // Add daily data
        Object.entries(reportData.dailyData).forEach(([date, data]) => {
            csvContent += `${date},${Math.round(data.calories)},${Math.round(data.protein)},${Math.round(data.carbs)},${Math.round(data.fat)},${Math.round(data.water)}\n`;
        });
        
        // Add summary
        csvContent += '\nSummary,,,,,\n';
        csvContent += `Average,${Math.round(reportData.summary.calories.average)},${Math.round(reportData.summary.protein.average)},${Math.round(reportData.summary.carbs.average)},${Math.round(reportData.summary.fat.average)},${Math.round(reportData.summary.water.average)}\n`;
        csvContent += `Total,${Math.round(reportData.summary.calories.total)},${Math.round(reportData.summary.protein.total)},${Math.round(reportData.summary.carbs.total)},${Math.round(reportData.summary.fat.total)},${Math.round(reportData.summary.water.total)}\n`;
        
        // Create file name
        const dateString = `${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`;
        const fileName = `nutrition_report_${dateString}.csv`;
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
    }
    
    updateTrendsChart(chartType) {
        this.renderTrendsChart(chartType);
    }
    
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    getChartColor(type, alpha = 1) {
        const colors = {
            calories: `rgba(255, 90, 95, ${alpha})`,
            protein: `rgba(67, 97, 238, ${alpha})`,
            carbs: `rgba(76, 201, 240, ${alpha})`,
            fat: `rgba(247, 37, 133, ${alpha})`,
            water: `rgba(65, 147, 239, ${alpha})`
        };
        
        return colors[type] || `rgba(58, 134, 255, ${alpha})`;
    }
    
    showLoading(isLoading) {
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(el => {
            el.style.display = isLoading ? 'block' : 'none';
        });
        
        const contentElements = document.querySelectorAll('.dashboard-content');
        contentElements.forEach(el => {
            el.style.display = isLoading ? 'none' : 'block';
        });
    }
    
    showError(message) {
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.add('active');
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorContainer.classList.remove('active');
            }, 5000);
        } else {
            console.error(message);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NutritionDashboard();
}); 