// Configuration settings for the application
export const config = {
    // USDA Food Data Central API configuration
    usda: {
        apiKey: 'dSS7CH7xS0LdKHSV9DhK11FcKFx8CM6rmcfRfrbE', // Replace with your actual API key
        baseUrl: 'https://api.nal.usda.gov/fdc/v1'
    },
    
    // Application settings
    app: {
        name: 'Nutrition Tracker',
        version: '1.0.0'
    },
    
    // Feature flags
    features: {
        enableUsdaSearch: true,
        enableOfflineMode: false,
        enableDataExport: false
    }
};

export default config; 


// Focus on another area of the nutrition tracker

// i don't have idea but if  needed also can help to improve tool website or web app enhancement and user experience so go for it. keep in mind not add those  features that can slow website performance and can frustrate users