import React, { useState, useEffect } from 'react';

import { GroceryList as GroceryListType } from '../types/nutrition';

interface GroceryListProps {
  userId: string;
}

interface GroceryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  estimatedCost: number;
  storeSection: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  checked?: boolean;
}

export const GroceryList: React.FC<GroceryListProps> = ({ userId }) => {
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroceryList = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/grocery-list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch grocery list');
        }

        const data = await response.json();
        setGroceryList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGroceryList();
  }, [userId]);

  const updateItemStatus = async (itemId: string, checked: boolean) => {
    if (!groceryList) return;

    try {
      const updatedItems = groceryList.items.map(item =>
        item.id === itemId ? { ...item, checked } : item
      );

      const response = await fetch('/api/grocery-list', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groceryList: {
            ...groceryList,
            items: updatedItems,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update grocery list');
      }

      setGroceryList({
        ...groceryList,
        items: updatedItems,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grocery list');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!groceryList) {
    return <div className="text-center">No grocery list found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Grocery List</h2>
        <div className="text-gray-600">
          Total Estimated Cost: ${groceryList.totalEstimatedCost.toFixed(2)}
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groceryList.storeCategories).map(([category, items]) => (
          <div key={category} className="border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-4 capitalize">{category}</h3>
            <div className="space-y-2">
              {(items as GroceryItem[]).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={(e) => updateItemStatus(item.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.amount} {item.unit} - ${item.estimatedCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        item.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.priority}
                    </span>
                    {item.notes && (
                      <span className="text-sm text-gray-500">{item.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 