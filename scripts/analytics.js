// Analytics.js - Handles charts and data visualization for the Reports & Analytics page

document.addEventListener('DOMContentLoaded', function() {
    const analytics = new AnalyticsManager();
});

class AnalyticsManager {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeCharts();
        this.loadData();
    }

    initializeElements() {
        // Date range elements
        this.dateRangeBtns = document.querySelectorAll('.date-range-btn');
        this.customDateRange = document.querySelector('.custom-date-range');
        this.startDateInput = document.getElementById('start-date');
        this.endDateInput = document.getElementById('end-date');
        this.applyDateRangeBtn = document.getElementById('apply-date-range');

        // Chart elements
        this.caloriesChart = document.getElementById('calories-chart');
        this.macroDonutChart = document.getElementById('macro-donut-chart');
        this.nutrientTrendChart = document.getElementById('nutrient-trend-chart');
        this.mealsBreakdownChart = document.getElementById('meals-breakdown-chart');
        this.weeklyPatternChart = document.getElementById('weekly-pattern-chart');

        // Chart type toggle
        this.chartTypeBtns = document.querySelectorAll('.chart-type-btn');

        // Nutrient trend tabs
        this.chartTabs = document.querySelectorAll('.chart-tab');

        // Summary metrics
        this.avgCalories = document.getElementById('avg-calories');
        this.avgProtein = document.getElementById('avg-protein');
        this.avgCarbs = document.getElementById('avg-carbs');
        this.avgFat = document.getElementById('avg-fat');
        this.macroProteinPercent = document.getElementById('macro-protein-percent');
        this.macroCarbsPercent = document.getElementById('macro-carbs-percent');
        this.macroFatPercent = document.getElementById('macro-fat-percent');

        // Export buttons
        this.exportBtns = document.querySelectorAll('.export-btn');

        // Mobile menu toggle
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.sideNav = document.querySelector('.side-nav');
    }

    initializeEventListeners() {
        // Date range selection
        this.dateRangeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dateRangeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show/hide custom date range inputs
                if (btn.dataset.range === 'custom') {
                    this.customDateRange.style.display = 'flex';
                } else {
                    this.customDateRange.style.display = 'none';
                    this.updateDateRange(btn.dataset.range);
                }
            });
        });

        // Custom date range apply button
        this.applyDateRangeBtn.addEventListener('click', () => {
            if (this.startDateInput.value && this.endDateInput.value) {
                this.updateDateRange('custom', this.startDateInput.value, this.endDateInput.value);
            } else {
                this.showToast('Please select both start and end dates', 'error');
            }
        });

        // Chart type toggle
        this.chartTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.chartTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateChartType(btn.dataset.type);
            });
        });

        // Nutrient trend tabs
        this.chartTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.chartTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateNutrientTrend(tab.dataset.nutrient);
            });
        });

        // Export buttons
        this.exportBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.exportData(btn.dataset.format);
            });
        });

        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => {
                this.sideNav.classList.toggle('active');
            });
        }
    }

    updateDateRange(range, startDate, endDate) {
        // In a real app, this would fetch data for the selected date range
        // For this demo, we'll just update the charts with simulated data
        console.log(`Date range updated to: ${range}`);
        
        if (range === 'custom') {
            console.log(`Custom date range: ${startDate} to ${endDate}`);
        }
        
        // Refresh charts and data
        this.loadData();
    }

    updateChartType(type) {
        // Update the calories chart type (line or bar)
        if (this.caloriesChartInstance) {
            this.caloriesChartInstance.destroy();
        }
        
        this.createCaloriesChart(type);
    }

    updateNutrientTrend(nutrient) {
        // Update the nutrient trend chart based on selected nutrient category
        if (this.nutrientTrendChartInstance) {
            this.nutrientTrendChartInstance.destroy();
        }
        
        this.createNutrientTrendChart(nutrient);
    }

    initializeCharts() {
        // Create all charts with default settings
        this.createCaloriesChart('line');
        this.createMacroDonutChart();
        this.createNutrientTrendChart('macros');
        this.createMealsBreakdownChart();
        this.createWeeklyPatternChart();
    }

    loadData() {
        // In a real app, this would fetch data from an API or local storage
        // For this demo, we'll use simulated data
        
        // Update summary metrics
        this.avgCalories.textContent = '1,850';
        this.avgProtein.textContent = '98g';
        this.avgCarbs.textContent = '215g';
        this.avgFat.textContent = '65g';
        
        this.macroProteinPercent.textContent = '21%';
        this.macroCarbsPercent.textContent = '48%';
        this.macroFatPercent.textContent = '31%';
        
        // Refresh charts
        this.updateCharts();
    }

    updateCharts() {
        // Update all charts with new data
        this.updateCaloriesChart();
        this.updateMacroDonutChart();
        this.updateNutrientTrendChart();
        this.updateMealsBreakdownChart();
        this.updateWeeklyPatternChart();
    }

    createCaloriesChart(type) {
        const ctx = this.caloriesChart.getContext('2d');
        
        // Sample data for the calories chart
        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Calories Consumed',
                    data: [1950, 1750, 2100, 1850, 2250, 1950, 1800],
                    backgroundColor: 'rgba(74, 111, 165, 0.2)',
                    borderColor: 'rgba(74, 111, 165, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Target',
                    data: [2000, 2000, 2000, 2000, 2000, 2000, 2000],
                    backgroundColor: 'rgba(108, 117, 125, 0.2)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0,
                    fill: false
                },
                {
                    label: 'Calories Burned',
                    data: [250, 350, 400, 300, 450, 500, 250],
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
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
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        };
        
        this.caloriesChartInstance = new Chart(ctx, {
            type: type,
            data: data,
            options: options
        });
    }

    createMacroDonutChart() {
        const ctx = this.macroDonutChart.getContext('2d');
        
        // Sample data for macronutrient breakdown
        const data = {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [21, 48, 31],
                backgroundColor: [
                    'rgba(66, 165, 245, 0.8)',
                    'rgba(102, 187, 106, 0.8)',
                    'rgba(255, 202, 40, 0.8)'
                ],
                borderColor: [
                    'rgba(66, 165, 245, 1)',
                    'rgba(102, 187, 106, 1)',
                    'rgba(255, 202, 40, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '70%'
        };
        
        this.macroDonutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }

    createNutrientTrendChart(nutrientType) {
        const ctx = this.nutrientTrendChart.getContext('2d');
        
        // Sample data based on nutrient type
        let data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: []
        };
        
        if (nutrientType === 'macros') {
            data.datasets = [
                {
                    label: 'Protein (g)',
                    data: [95, 88, 110, 92, 115, 102, 90],
                    borderColor: 'rgba(66, 165, 245, 1)',
                    backgroundColor: 'rgba(66, 165, 245, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Carbs (g)',
                    data: [225, 195, 240, 210, 250, 220, 195],
                    borderColor: 'rgba(102, 187, 106, 1)',
                    backgroundColor: 'rgba(102, 187, 106, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Fat (g)',
                    data: [62, 58, 72, 65, 75, 67, 60],
                    borderColor: 'rgba(255, 202, 40, 1)',
                    backgroundColor: 'rgba(255, 202, 40, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ];
        } else if (nutrientType === 'vitamins') {
            data.datasets = [
                {
                    label: 'Vitamin A (%)',
                    data: [55, 65, 75, 60, 80, 70, 65],
                    borderColor: 'rgba(255, 112, 67, 1)',
                    backgroundColor: 'rgba(255, 112, 67, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Vitamin C (%)',
                    data: [80, 90, 75, 85, 95, 100, 85],
                    borderColor: 'rgba(255, 167, 38, 1)',
                    backgroundColor: 'rgba(255, 167, 38, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Vitamin D (%)',
                    data: [40, 45, 50, 55, 45, 60, 50],
                    borderColor: 'rgba(141, 110, 99, 1)',
                    backgroundColor: 'rgba(141, 110, 99, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ];
        } else if (nutrientType === 'minerals') {
            data.datasets = [
                {
                    label: 'Calcium (%)',
                    data: [65, 70, 80, 75, 85, 75, 70],
                    borderColor: 'rgba(63, 81, 181, 1)',
                    backgroundColor: 'rgba(63, 81, 181, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Iron (%)',
                    data: [55, 60, 70, 65, 75, 80, 65],
                    borderColor: 'rgba(121, 85, 72, 1)',
                    backgroundColor: 'rgba(121, 85, 72, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Potassium (%)',
                    data: [60, 65, 75, 70, 80, 75, 65],
                    borderColor: 'rgba(156, 39, 176, 1)',
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ];
        }
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
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
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        };
        
        this.nutrientTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });
    }

    createMealsBreakdownChart() {
        const ctx = this.mealsBreakdownChart.getContext('2d');
        
        // Sample data for meals breakdown
        const data = {
            labels: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
            datasets: [{
                data: [25, 30, 35, 10],
                backgroundColor: [
                    'rgba(74, 111, 165, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(253, 126, 20, 0.8)',
                    'rgba(108, 117, 125, 0.8)'
                ],
                borderColor: [
                    'rgba(74, 111, 165, 1)',
                    'rgba(40, 167, 69, 1)',
                    'rgba(253, 126, 20, 1)',
                    'rgba(108, 117, 125, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        };
        
        this.mealsBreakdownChartInstance = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: options
        });
    }

    createWeeklyPatternChart() {
        const ctx = this.weeklyPatternChart.getContext('2d');
        
        // Sample data for weekly pattern
        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Calories In',
                    data: [1950, 1750, 2100, 1850, 2250, 2400, 2200],
                    backgroundColor: 'rgba(74, 111, 165, 0.8)',
                    borderColor: 'rgba(74, 111, 165, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Calories Out',
                    data: [2100, 1900, 2200, 2000, 2300, 2500, 2100],
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
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
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        };
        
        this.weeklyPatternChartInstance = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    }

    updateCaloriesChart() {
        // In a real app, this would update with real data
        // For this demo, we're keeping the original sample data
    }

    updateMacroDonutChart() {
        // In a real app, this would update with real data
        // For this demo, we're keeping the original sample data
    }

    updateNutrientTrendChart() {
        // Find the active nutrient tab
        const activeTab = document.querySelector('.chart-tab.active');
        if (activeTab) {
            this.updateNutrientTrend(activeTab.dataset.nutrient);
        }
    }

    updateMealsBreakdownChart() {
        // In a real app, this would update with real data
        // For this demo, we're keeping the original sample data
    }

    updateWeeklyPatternChart() {
        // In a real app, this would update with real data
        // For this demo, we're keeping the original sample data
    }

    exportData(format) {
        // In a real app, this would generate and download data in the specified format
        console.log(`Exporting data in ${format} format`);
        
        if (format === 'pdf' && window.advancedAnalytics) {
            this.exportInsightsPDF();
        } else {
            // Simple demo of the export functionality for other formats
            this.showToast(`Nutrition data exported as ${format.toUpperCase()} successfully!`, 'success');
        }
    }
    
    async exportInsightsPDF() {
        try {
            this.showToast('Generating PDF report...', 'info');
            
            // Check if jsPDF is available (would be loaded in a real app)
            if (typeof jsPDF === 'undefined') {
                // For this demo, we'll fake it
                setTimeout(() => {
                    this.showToast('PDF export feature requires jsPDF library. This is a demo.', 'info');
                }, 1500);
                return;
            }
            
            // Get analytics data for the report
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30); // Last 30 days
            
            const analytics = await window.advancedAnalytics.getAnalytics(startDate, endDate);
            
            if (!analytics || !analytics.trends || !analytics.trends.hasSufficientData) {
                this.showToast('Not enough data to generate a PDF report', 'error');
                return;
            }
            
            // Create PDF document (using jsPDF)
            const doc = new jsPDF();
            
            // Add header
            doc.setFontSize(22);
            doc.setTextColor(74, 111, 165);
            doc.text('Nutrition Insights Report', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
            doc.text(`Report period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 105, 40, { align: 'center' });
            
            // Add line
            doc.setDrawColor(74, 111, 165);
            doc.line(20, 45, 190, 45);
            
            // Nutrition summary
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Nutrition Summary', 20, 60);
            
            doc.setFontSize(12);
            doc.text(`Daily Average Calories: ${analytics.trends.calories.average} kcal`, 25, 70);
            doc.text(`Daily Average Protein: ${analytics.trends.protein.average}g`, 25, 80);
            doc.text(`Daily Average Carbs: ${analytics.trends.carbs.average}g`, 25, 90);
            doc.text(`Daily Average Fat: ${analytics.trends.fat.average}g`, 25, 100);
            
            // Recommendations
            doc.setFontSize(16);
            doc.text('Personalized Recommendations', 20, 120);
            
            if (analytics.insights.recommendations && analytics.insights.recommendations.length > 0) {
                let yPos = 130;
                analytics.insights.recommendations.forEach((rec, i) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(12);
                    doc.setTextColor(74, 111, 165);
                    doc.text(`${i + 1}. ${rec.nutrient} ${rec.type === 'increase' ? 'Increase' : 'Decrease'}`, 25, yPos);
                    
                    doc.setTextColor(80, 80, 80);
                    doc.text(rec.description, 30, yPos + 10, { maxWidth: 160 });
                    
                    yPos += 25;
                });
            } else {
                doc.setFontSize(12);
                doc.setTextColor(80, 80, 80);
                doc.text('No specific recommendations at this time.', 25, 130);
            }
            
            // Alerts
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Nutrition Alerts', 20, 20);
            
            if (analytics.insights.alerts && analytics.insights.alerts.length > 0) {
                let yPos = 30;
                analytics.insights.alerts.forEach((alert, i) => {
                    doc.setFontSize(12);
                    doc.setTextColor(255, 87, 34); // Orange-red for alerts
                    doc.text(`${i + 1}. ${alert.metric} ${alert.direction} Trend`, 25, yPos);
                    
                    doc.setTextColor(80, 80, 80);
                    doc.text(alert.description, 30, yPos + 10, { maxWidth: 160 });
                    
                    yPos += 25;
                });
            } else {
                doc.setFontSize(12);
                doc.setTextColor(40, 167, 69); // Green for positive message
                doc.text('No concerning nutrition trends detected.', 25, 30);
            }
            
            // Patterns
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Eating Patterns', 20, 80);
            
            if (analytics.patterns && analytics.patterns.mealTiming && analytics.patterns.mealTiming.length > 0) {
                let yPos = 90;
                analytics.patterns.mealTiming.forEach((timing, i) => {
                    doc.setFontSize(12);
                    doc.setTextColor(74, 111, 165);
                    doc.text(`${timing.mealType} Timing`, 25, yPos);
                    
                    doc.setTextColor(80, 80, 80);
                    doc.text(`You typically have ${timing.mealType} at ${timing.time} with ${timing.consistency} consistency.`, 
                            30, yPos + 10, { maxWidth: 160 });
                    
                    yPos += 25;
                });
            } else {
                doc.setFontSize(12);
                doc.setTextColor(80, 80, 80);
                doc.text('Not enough data to detect patterns yet.', 25, 90);
            }
            
            // Data quality section
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Data Quality', 20, 180);
            
            if (analytics.dataQuality) {
                doc.setFontSize(12);
                doc.setTextColor(80, 80, 80);
                
                const qualityLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
                const score = Math.min(Math.max(Math.round(analytics.dataQuality.score), 1), 5);
                
                doc.text(`Overall Quality: ${qualityLabels[score - 1]}`, 25, 190);
                doc.text(`Completeness: ${analytics.dataQuality.completeness}%`, 25, 200);
                doc.text(`Consistency: ${analytics.dataQuality.consistency}%`, 25, 210);
                doc.text(`Detail Level: ${analytics.dataQuality.detailLevel}%`, 25, 220);
            }
            
            // Footer
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(10);
            doc.text('Nutrition Tracker Analytics Report', 105, 280, { align: 'center' });
            
            // Save the PDF
            doc.save(`nutrition-insights-${new Date().toISOString().slice(0, 10)}.pdf`);
            
            this.showToast('PDF report generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating PDF report:', error);
            this.showToast('Failed to generate PDF report', 'error');
        }
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add to DOM
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}
