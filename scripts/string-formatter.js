/**
 * String formatting utilities for the Nutrition Tracker application
 */
class StringFormatter {
    /**
     * Formats a meal name by adding spaces before capital letters and capitalizing each word
     * @param {string} meal - The meal name to format
     * @returns {string} The formatted meal name
     */
    static formatMealName(meal) {
        return meal
            .replace(/([A-Z])/g, ' $1')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Formats a preparation metric by splitting on capital letters and capitalizing each word
     * @param {string} metric - The metric to format
     * @returns {string} The formatted metric
     */
    static formatPrepMetric(metric) {
        return metric
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Formats an activity level by capitalizing the first letter and appending "Activity"
     * @param {string} level - The activity level to format
     * @returns {string} The formatted activity level
     */
    static formatActivityLevel(level) {
        return level.charAt(0).toUpperCase() + level.slice(1) + ' Activity';
    }

    /**
     * Formats a date in YYYY-MM-DD format
     * @param {Date} date - The date to format
     * @returns {string} The formatted date
     */
    static formatDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    /**
     * Formats a meal type for display
     * @param {string} type - The meal type to format
     * @returns {string} The formatted meal type
     */
    static formatMealType(type) {
        const formats = {
            'breakfast': 'Breakfast',
            'morning-snack': 'Morning Snack',
            'lunch': 'Lunch',
            'afternoon-snack': 'Afternoon Snack',
            'dinner': 'Dinner',
            'evening-snack': 'Evening Snack',
            'pre-workout': 'Pre-Workout',
            'post-workout': 'Post-Workout'
        };
        
        return formats[type] || type;
    }

    /**
     * Formats a number to a specified number of decimal places
     * @param {number} number - The number to format
     * @param {number} [decimals=2] - The number of decimal places
     * @returns {string} The formatted number
     */
    static formatNumber(number, decimals = 2) {
        return Number(number).toFixed(decimals);
    }
}

// Export the class
export default StringFormatter; 