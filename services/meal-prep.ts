export interface MealPrepPlan {
  id: string;
  userId: string;
  mealPlan: Record<string, unknown>;
  prepTime: number; // in minutes
  servings: number;
  prepSteps: PrepStep[];
  shoppingList: ShoppingItem[];
  createdAt: Date;
}

export interface PrepStep {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  ingredients: string[];
  instructions: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedCost: number;
}

export const generateMealPrepPlan = async (params: {
  mealPlan: Record<string, unknown>;
  prepTime: number;
  servings: number;
}): Promise<MealPrepPlan> => {
  // Mock implementation - replace with actual meal prep planning logic
  return {
    id: '1',
    userId: 'user1',
    mealPlan: params.mealPlan,
    prepTime: params.prepTime,
    servings: params.servings,
    prepSteps: [
      {
        id: '1',
        title: 'Prepare Protein',
        description: 'Cook chicken and portion for the week',
        duration: 30,
        ingredients: ['chicken breast', 'olive oil', 'seasonings'],
        instructions: ['Season chicken', 'Bake at 400F for 25 minutes', 'Let cool and portion']
      },
      {
        id: '2',
        title: 'Wash and Cut Vegetables',
        description: 'Prepare all vegetables for the week',
        duration: 20,
        ingredients: ['broccoli', 'carrots', 'bell peppers'],
        instructions: ['Wash all vegetables', 'Cut into portions', 'Store in containers']
      }
    ],
    shoppingList: [
      {
        id: '1',
        name: 'Chicken Breast',
        quantity: 4,
        unit: 'lbs',
        category: 'Protein',
        estimatedCost: 12.00
      },
      {
        id: '2',
        name: 'Broccoli',
        quantity: 2,
        unit: 'heads',
        category: 'Vegetables',
        estimatedCost: 4.00
      }
    ],
    createdAt: new Date()
  };
}; 