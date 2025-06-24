import '../scripts/utils/validation-utils.js';
const { validationUtils } = window;

describe('ValidationUtils', () => {
  beforeEach(() => {
    validationUtils.state.cache.clear();
  });

  test('should validate food entries', () => {
    const validEntry = {
      name: 'apple',
      serving: 100,
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2
    };

    const invalidEntry = {
      name: '',
      serving: -100,
      calories: 'invalid',
      protein: null,
      carbs: undefined,
      fat: 'not a number'
    };

    expect(validationUtils.validateFoodEntry(validEntry)).toBe(true);
    expect(validationUtils.validateFoodEntry(invalidEntry)).toBe(false);
  });

  test('should validate meal entries', () => {
    const validMeal = {
      name: 'Breakfast',
      foods: [
        {
          name: 'apple',
          serving: 100,
          calories: 52
        }
      ],
      date: '2024-01-01'
    };

    const invalidMeal = {
      name: '',
      foods: [],
      date: 'invalid-date'
    };

    expect(validationUtils.validateMealEntry(validMeal)).toBe(true);
    expect(validationUtils.validateMealEntry(invalidMeal)).toBe(false);
  });

  test('should validate user profile', () => {
    const validProfile = {
      name: 'John Doe',
      age: 30,
      weight: 70,
      height: 175,
      activityLevel: 'moderate',
      goals: ['weight-loss']
    };

    const invalidProfile = {
      name: '',
      age: -1,
      weight: 0,
      height: -175,
      activityLevel: 'invalid',
      goals: []
    };

    expect(validationUtils.validateUserProfile(validProfile)).toBe(true);
    expect(validationUtils.validateUserProfile(invalidProfile)).toBe(false);
  });

  test('should validate nutrition goals', () => {
    const validGoals = {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65
    };

    const invalidGoals = {
      calories: -2000,
      protein: 'invalid',
      carbs: null,
      fat: undefined
    };

    expect(validationUtils.validateNutritionGoals(validGoals)).toBe(true);
    expect(validationUtils.validateNutritionGoals(invalidGoals)).toBe(false);
  });

  test('should validate date ranges', () => {
    const validRange = {
      start: '2024-01-01',
      end: '2024-01-31'
    };

    const invalidRange = {
      start: '2024-01-31',
      end: '2024-01-01'
    };

    expect(validationUtils.validateDateRange(validRange)).toBe(true);
    expect(validationUtils.validateDateRange(invalidRange)).toBe(false);
  });

  test('should validate serving sizes', () => {
    expect(validationUtils.validateServingSize(100)).toBe(true);
    expect(validationUtils.validateServingSize(0)).toBe(false);
    expect(validationUtils.validateServingSize(-100)).toBe(false);
    expect(validationUtils.validateServingSize('invalid')).toBe(false);
  });

  test('should validate food names', () => {
    expect(validationUtils.validateFoodName('apple')).toBe(true);
    expect(validationUtils.validateFoodName('')).toBe(false);
    expect(validationUtils.validateFoodName('   ')).toBe(false);
    expect(validationUtils.validateFoodName('a')).toBe(false); // Too short
  });

  test('should validate meal names', () => {
    expect(validationUtils.validateMealName('Breakfast')).toBe(true);
    expect(validationUtils.validateMealName('')).toBe(false);
    expect(validationUtils.validateMealName('   ')).toBe(false);
  });

  test('should validate user names', () => {
    expect(validationUtils.validateUserName('John Doe')).toBe(true);
    expect(validationUtils.validateUserName('')).toBe(false);
    expect(validationUtils.validateUserName('   ')).toBe(false);
    expect(validationUtils.validateUserName('J')).toBe(false); // Too short
  });

  test('should validate numeric values', () => {
    expect(validationUtils.validateNumeric(100)).toBe(true);
    expect(validationUtils.validateNumeric(0)).toBe(true);
    expect(validationUtils.validateNumeric(-100)).toBe(false);
    expect(validationUtils.validateNumeric('invalid')).toBe(false);
    expect(validationUtils.validateNumeric(null)).toBe(false);
    expect(validationUtils.validateNumeric(undefined)).toBe(false);
  });

  test('should validate required fields', () => {
    const data = {
      name: 'apple',
      calories: 52,
      protein: 0.3
    };

    const requiredFields = ['name', 'calories', 'protein', 'carbs'];
    expect(validationUtils.validateRequiredFields(data, requiredFields)).toBe(false);
  });

  test('should validate field types', () => {
    const data = {
      name: 'apple',
      calories: 52,
      protein: 0.3,
      isFavorite: true
    };

    const fieldTypes = {
      name: 'string',
      calories: 'number',
      protein: 'number',
      isFavorite: 'boolean'
    };

    expect(validationUtils.validateFieldTypes(data, fieldTypes)).toBe(true);
  });

  test('should validate field ranges', () => {
    const data = {
      age: 30,
      weight: 70,
      height: 175
    };

    const fieldRanges = {
      age: { min: 0, max: 120 },
      weight: { min: 20, max: 300 },
      height: { min: 100, max: 250 }
    };

    expect(validationUtils.validateFieldRanges(data, fieldRanges)).toBe(true);
  });

  test('should validate field patterns', () => {
    const data = {
      email: 'john@example.com',
      phone: '123-456-7890',
      date: '2024-01-01'
    };

    const fieldPatterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\d{3}-\d{3}-\d{4}$/,
      date: /^\d{4}-\d{2}-\d{2}$/
    };

    expect(validationUtils.validateFieldPatterns(data, fieldPatterns)).toBe(true);
  });
}); 