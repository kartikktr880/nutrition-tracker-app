export interface MealRecommendation {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  rating: number;
}

export interface RecommendationParams {
  userId: string;
  preferences: string;
  restrictions: string;
}

export const getMealRecommendations = async (params: RecommendationParams): Promise<MealRecommendation[]> => {
  // Mock implementation - replace with actual AI recommendation logic
  return [
    {
      id: '1',
      name: 'Grilled Chicken with Quinoa',
      calories: 450,
      protein: 35,
      carbs: 45,
      fat: 15,
      ingredients: ['chicken breast', 'quinoa', 'vegetables', 'olive oil'],
      instructions: ['Grill chicken', 'Cook quinoa', 'Steam vegetables', 'Combine and serve'],
      tags: ['high-protein', 'gluten-free', 'quick'],
      rating: 4.5
    },
    {
      id: '2',
      name: 'Salmon with Sweet Potato',
      calories: 380,
      protein: 30,
      carbs: 35,
      fat: 18,
      ingredients: ['salmon fillet', 'sweet potato', 'broccoli', 'lemon'],
      instructions: ['Bake salmon', 'Roast sweet potato', 'Steam broccoli', 'Serve with lemon'],
      tags: ['omega-3', 'anti-inflammatory', 'balanced'],
      rating: 4.8
    }
  ];
}; 