import { useState, useCallback } from 'react';

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  nutrition?: any;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  date: string;
}

interface UseFoodLogReturn {
  foodItems: FoodItem[];
  addFoodItem: (item: Omit<FoodItem, 'id' | 'date'>) => void;
  removeFoodItem: (id: string) => void;
  updateFoodItem: (id: string, updates: Partial<FoodItem>) => void;
  getTotalCalories: () => number;
  getTotalMacros: () => { protein: number; carbs: number; fat: number };
}

export const useFoodLog = (): UseFoodLogReturn => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);

  const addFoodItem = useCallback((item: Omit<FoodItem, 'id' | 'date'>) => {
    const newItem: FoodItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    setFoodItems(prev => [...prev, newItem]);
  }, []);

  const removeFoodItem = useCallback((id: string) => {
    setFoodItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateFoodItem = useCallback((id: string, updates: Partial<FoodItem>) => {
    setFoodItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const getTotalCalories = useCallback(() => {
    return foodItems.reduce((total, item) => total + item.calories, 0);
  }, [foodItems]);

  const getTotalMacros = useCallback(() => {
    return foodItems.reduce((totals, item) => ({
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat
    }), { protein: 0, carbs: 0, fat: 0 });
  }, [foodItems]);

  return {
    foodItems,
    addFoodItem,
    removeFoodItem,
    updateFoodItem,
    getTotalCalories,
    getTotalMacros
  };
}; 