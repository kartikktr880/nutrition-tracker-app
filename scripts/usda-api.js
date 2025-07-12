import { logError, logWarn, logInfo, logDebug } from '../utils/logger';
// USDA Food Data Central API Service
import { config } from './config.js';

const USDA_API_BASE_URL = config.usda.baseUrl;
const API_KEY = config.usda.apiKey;

// Helper function to format USDA food data into our app's format
function formatUsdaFood(usdaFood) {
    const nutrients = usdaFood.foodNutrients || [];
    
    // Helper function to find nutrient value by name
    const getNutrientValue = (name) => {
        const nutrient = nutrients.find(n => n.nutrientName.toLowerCase().includes(name.toLowerCase()));
        return nutrient ? nutrient.value : 0;
    };

    return {
        id: `usda-${usdaFood.fdcId}`,
        name: usdaFood.description,
        serving: `${usdaFood.servingSize || 100}${usdaFood.servingSizeUnit || 'g'}`,
        calories: getNutrientValue('energy'),
        protein: getNutrientValue('protein'),
        carbs: getNutrientValue('carbohydrate'),
        fat: getNutrientValue('total lipid'),
        fiber: getNutrientValue('fiber'),
        sugar: getNutrientValue('sugars'),
        sodium: getNutrientValue('sodium'),
        category: usdaFood.foodCategory?.description || 'Other',
        source: 'USDA',
        details: {
            brandOwner: usdaFood.brandOwner,
            ingredients: usdaFood.ingredients,
            servingSize: usdaFood.servingSize,
            servingSizeUnit: usdaFood.servingSizeUnit,
            brandedFoodCategory: usdaFood.brandedFoodCategory,
            fdcId: usdaFood.fdcId,
            publicationDate: usdaFood.publicationDate
        }
    };
}

// Search foods in USDA database
async function searchFoods(query, pageSize = 50) {
    try {
        const response = await fetch(`${USDA_API_BASE_URL}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('USDA API request failed');
        }

        const data = await response.json();
        return {
            foods: data.foods.map(formatUsdaFood),
            totalHits: data.totalHits,
            currentPage: data.currentPage,
            totalPages: data.totalPages
        };
    } catch (error) {
        logError('Error searching USDA foods:', error);
        throw error;
    }
}

// Get detailed food information by FDC ID
async function getFoodDetails(fdcId) {
    try {
        const response = await fetch(`${USDA_API_BASE_URL}/food/${fdcId}?api_key=${API_KEY}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('USDA API request failed');
        }

        const data = await response.json();
        return formatUsdaFood(data);
    } catch (error) {
        logError('Error getting food details:', error);
        throw error;
    }
}

// Get multiple foods by FDC IDs
async function getFoodsByIds(fdcIds) {
    try {
        const response = await fetch(`${USDA_API_BASE_URL}/foods?api_key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fdcIds: fdcIds
            })
        });

        if (!response.ok) {
            throw new Error('USDA API request failed');
        }

        const data = await response.json();
        return data.map(formatUsdaFood);
    } catch (error) {
        logError('Error getting foods by IDs:', error);
        throw error;
    }
}

// Export the API functions
export const UsdaAPI = {
    searchFoods,
    getFoodDetails,
    getFoodsByIds
};

export default UsdaAPI; 