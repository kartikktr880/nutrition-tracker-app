import '../scripts/utils/nutrition-utils.js';
const { nutritionUtils } = window;

describe('NutritionUtils', () => {
  beforeEach(() => {
    nutritionUtils.state.cache.clear();
  });

  test('should calculate basic nutrition values', () => {
    const food = {
      name: 'apple',
      serving: 100,
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2
    };

    const result = nutritionUtils.calculateNutrition(food);
    expect(result).toEqual({
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  });

  test('should handle different serving sizes', () => {
    const food = {
      name: 'apple',
      serving: 100,
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2
    };

    const result = nutritionUtils.calculateNutrition(food, 200);
    expect(result).toEqual({
      calories: 104,
      protein: 0.6,
      carbs: 27.6,
      fat: 0.4,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  });

  test('should calculate daily values', () => {
    const nutrition = {
      calories: 2000,
      protein: 50,
      carbs: 250,
      fat: 65,
      fiber: 25,
      sugar: 50,
      sodium: 2300
    };

    const result = nutritionUtils.calculateDailyValues(nutrition);
    expect(result).toEqual({
      calories: 100,
      protein: 100,
      carbs: 100,
      fat: 100,
      fiber: 100,
      sugar: 100,
      sodium: 100
    });
  });

  test('should validate nutrition data', () => {
    const validData = {
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5
    };

    const invalidData = {
      calories: -100,
      protein: 'invalid',
      carbs: null,
      fat: undefined
    };

    expect(nutritionUtils.isValidNutritionData(validData)).toBe(true);
    expect(nutritionUtils.isValidNutritionData(invalidData)).toBe(false);
  });

  test('should handle missing nutrition values', () => {
    const food = {
      name: 'apple',
      serving: 100,
      calories: 52
    };

    const result = nutritionUtils.calculateNutrition(food);
    expect(result).toEqual({
      calories: 52,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  });

  test('should calculate macronutrient ratios', () => {
    const nutrition = {
      calories: 1000,
      protein: 50,
      carbs: 100,
      fat: 33
    };

    const result = nutritionUtils.calculateMacroRatios(nutrition);
    expect(result).toEqual({
      protein: 20,
      carbs: 40,
      fat: 30
    });
  });

  test('should handle zero values in macro ratios', () => {
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    const result = nutritionUtils.calculateMacroRatios(nutrition);
    expect(result).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0
    });
  });

  test('should calculate nutrition density', () => {
    const food = {
      name: 'apple',
      serving: 100,
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2
    };

    const result = nutritionUtils.calculateNutritionDensity(food);
    expect(result).toBe(0.52); // calories per gram
  });

  test('should handle food combinations', () => {
    const foods = [
      {
        name: 'apple',
        serving: 100,
        calories: 52,
        protein: 0.3,
        carbs: 13.8,
        fat: 0.2
      },
      {
        name: 'banana',
        serving: 100,
        calories: 89,
        protein: 1.1,
        carbs: 22.8,
        fat: 0.3
      }
    ];

    const result = nutritionUtils.combineNutrition(foods);
    expect(result).toEqual({
      calories: 141,
      protein: 1.4,
      carbs: 36.6,
      fat: 0.5,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  });

  test('should handle nutrition goals', () => {
    const goals = {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65
    };

    const current = {
      calories: 1500,
      protein: 100,
      carbs: 150,
      fat: 50
    };

    const result = nutritionUtils.calculateGoalProgress(current, goals);
    expect(result).toEqual({
      calories: 75,
      protein: 67,
      carbs: 75,
      fat: 77
    });
  });

  test('should handle nutrition recommendations', () => {
    const nutrition = {
      calories: 1500,
      protein: 100,
      carbs: 150,
      fat: 50
    };

    const result = nutritionUtils.getNutritionRecommendations(nutrition);
    expect(result).toHaveProperty('calories');
    expect(result).toHaveProperty('protein');
    expect(result).toHaveProperty('carbs');
    expect(result).toHaveProperty('fat');
  });

  test('should handle nutrition history', () => {
    const history = [
      { date: '2024-01-01', calories: 2000 },
      { date: '2024-01-02', calories: 1800 },
      { date: '2024-01-03', calories: 2200 }
    ];

    const result = nutritionUtils.analyzeNutritionHistory(history);
    expect(result).toHaveProperty('average');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('recommendations');
  });
}); 