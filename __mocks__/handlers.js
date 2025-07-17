import { http, HttpResponse } from 'msw';

// Mock data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'light',
    language: 'en',
    units: 'metric',
    notifications: true,
    privacySettings: {
      shareData: false,
      publicProfile: false,
    },
  },
};

const mockNutritionData = {
  calories: 1850,
  protein: 120,
  carbs: 200,
  fat: 65,
  fiber: 25,
  sugar: 45,
  sodium: 2300,
};

const mockGoals = [
  {
    id: '1',
    type: 'calories',
    target: 2000,
    current: 1850,
    unit: 'kcal',
    startDate: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    type: 'protein',
    target: 150,
    current: 120,
    unit: 'g',
    startDate: new Date('2024-01-01'),
    isActive: true,
  },
];

const mockWeeklyProgress = [
  { date: '2024-12-13', calories: 1800, protein: 110, carbs: 190, fat: 60 },
  { date: '2024-12-14', calories: 1950, protein: 125, carbs: 210, fat: 70 },
  { date: '2024-12-15', calories: 1700, protein: 100, carbs: 180, fat: 55 },
  { date: '2024-12-16', calories: 2000, protein: 130, carbs: 220, fat: 75 },
  { date: '2024-12-17', calories: 1850, protein: 120, carbs: 200, fat: 65 },
  { date: '2024-12-18', calories: 1900, protein: 125, carbs: 205, fat: 68 },
  { date: '2024-12-19', calories: 1850, protein: 120, carbs: 200, fat: 65 },
];

// API handlers
export const handlers = [
  // Auth endpoints
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }),

  http.post('/api/auth/signin', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/auth/signout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Nutrition endpoints
  http.get('/api/nutrition/today', () => {
    return HttpResponse.json(mockNutritionData);
  }),

  http.post('/api/nutrition/entries', () => {
    return HttpResponse.json({ success: true, id: 'new-entry-id' });
  }),

  // User endpoints
  http.get('/api/user/goals', () => {
    return HttpResponse.json(mockGoals);
  }),

  http.post('/api/user/goals', () => {
    return HttpResponse.json({ success: true, id: 'new-goal-id' });
  }),

  http.put('/api/user/goals/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete('/api/user/goals/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Analytics endpoints
  http.get('/api/analytics/weekly-progress', () => {
    return HttpResponse.json(mockWeeklyProgress);
  }),

  http.get('/api/analytics/data', () => {
    return HttpResponse.json({
      nutritionData: mockNutritionData,
      goals: mockGoals,
      weeklyProgress: mockWeeklyProgress,
    });
  }),

  // Search endpoints
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return HttpResponse.json({ results: [] });
    }

    const mockResults = [
      {
        id: '1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
      {
        id: '2',
        name: 'Brown Rice',
        calories: 216,
        protein: 4.5,
        carbs: 45,
        fat: 1.8,
      },
    ].filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({ results: mockResults });
  }),

  // Water tracking endpoints
  http.get('/api/water/today', () => {
    return HttpResponse.json({ amount: 1500, goal: 2000 });
  }),

  http.post('/api/water/entries', () => {
    return HttpResponse.json({ success: true, id: 'new-water-entry-id' });
  }),

  // Error simulation
  http.get('/api/error', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get('/api/not-found', () => {
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),

  // External API mocks
  http.get('https://api.nutritionix.com/v1_1/search/*', () => {
    return HttpResponse.json({
      foods: [
        {
          food_name: 'apple',
          serving_qty: 1,
          serving_unit: 'medium',
          nix_item_id: '513fceb475b8dbbc21002e85',
          nf_calories: 95,
          nf_total_fat: 0.3,
          nf_saturated_fat: 0.1,
          nf_cholesterol: 0,
          nf_sodium: 2,
          nf_total_carbohydrate: 25,
          nf_dietary_fiber: 4,
          nf_sugars: 19,
          nf_protein: 0.5,
        },
      ],
    });
  }),
]; 