export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  completed: boolean;
}

export interface GroceryList {
  id: string;
  userId: string;
  items: GroceryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export const getGroceryList = async (userId: string): Promise<GroceryList> => {
  // Mock implementation - replace with actual API call
  return {
    id: '1',
    userId,
    items: [
      {
        id: '1',
        name: 'Chicken Breast',
        quantity: 2,
        unit: 'lbs',
        category: 'Protein',
        completed: false
      },
      {
        id: '2',
        name: 'Broccoli',
        quantity: 1,
        unit: 'head',
        category: 'Vegetables',
        completed: false
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export const updateGroceryList = async (userId: string, items: GroceryItem[]): Promise<GroceryList> => {
  // Mock implementation - replace with actual API call
  return {
    id: '1',
    userId,
    items,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}; 