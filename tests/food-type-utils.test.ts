import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FoodTypeUtils } from '../scripts/utils/food-type-utils.ts';

describe('FoodTypeUtils', () => {
    let foodTypeUtils: FoodTypeUtils;

    beforeEach(() => {
        foodTypeUtils = new FoodTypeUtils();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should classify food type correctly', () => {
        const protein = foodTypeUtils.classifyFoodType('chicken breast');
        const carb = foodTypeUtils.classifyFoodType('rice');
        const fat = foodTypeUtils.classifyFoodType('olive oil');
        const vegetable = foodTypeUtils.classifyFoodType('broccoli');

        expect(protein).toBe('protein');
        expect(carb).toBe('carb');
        expect(fat).toBe('fat');
        expect(vegetable).toBe('vegetable');
    });

    it('should handle unknown food types', () => {
        const unknown = foodTypeUtils.classifyFoodType('unknown food');
        expect(unknown).toBe('other');
    });

    it('should calculate macronutrients', () => {
        const macros = foodTypeUtils.calculateMacronutrients({
            name: 'chicken breast',
            amount: 100,
            unit: 'g'
        });

        expect(macros).toHaveProperty('protein');
        expect(macros).toHaveProperty('carbs');
        expect(macros).toHaveProperty('fat');
    });

    it('should handle food entry validation', () => {
        const validEntry = {
            name: 'chicken breast',
            amount: 100,
            unit: 'g'
        };

        const invalidEntry = {
            name: '',
            amount: -1,
            unit: 'invalid'
        };

        expect(foodTypeUtils.validateFoodEntry(validEntry)).toBe(true);
        expect(foodTypeUtils.validateFoodEntry(invalidEntry)).toBe(false);
    });

    it('should handle unit conversion', () => {
        const converted = foodTypeUtils.convertUnit(100, 'g', 'oz');
        expect(typeof converted).toBe('number');
        expect(converted).toBeGreaterThan(0);
    });

    it('should handle food search', () => {
        const results = foodTypeUtils.searchFood('chicken');
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
    });

    it('should handle food categorization', () => {
        const categories = foodTypeUtils.getFoodCategories();
        expect(Array.isArray(categories)).toBe(true);
        expect(categories).toContain('protein');
        expect(categories).toContain('carb');
        expect(categories).toContain('fat');
    });

    it('should handle food history', () => {
        const entry = {
            name: 'chicken breast',
            amount: 100,
            unit: 'g',
            date: new Date()
        };

        foodTypeUtils.addToHistory(entry);
        const history = foodTypeUtils.getFoodHistory();
        expect(history).toContainEqual(entry);
    });

    it('should handle food favorites', () => {
        const entry = {
            name: 'chicken breast',
            amount: 100,
            unit: 'g'
        };

        foodTypeUtils.addToFavorites(entry);
        const favorites = foodTypeUtils.getFavorites();
        expect(favorites).toContainEqual(entry);
    });

    it('should handle food recommendations', () => {
        const recommendations = foodTypeUtils.getRecommendations('protein');
        expect(Array.isArray(recommendations)).toBe(true);
        expect(recommendations.length).toBeGreaterThan(0);
    });
}); 