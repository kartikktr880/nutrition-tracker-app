import React, { useState, useEffect } from 'react';
import { NutritionalGoals as NutritionalGoalsType } from '../types/nutrition';

interface NutritionalGoalsProps {
  userId: string;
}

export const NutritionalGoals: React.FC<NutritionalGoalsProps> = ({ userId }) => {
  const [goals, setGoals] = useState<NutritionalGoalsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<NutritionalGoalsType>>({});

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/nutritional-goals');
        
        if (!response.ok) {
          throw new Error('Failed to fetch nutritional goals');
        }

        const data = await response.json();
        setGoals(data);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [userId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/nutritional-goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update nutritional goals');
      }

      const updatedGoals = await response.json();
      setGoals(updatedGoals);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update nutritional goals');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!goals) {
    return <div className="text-center">No nutritional goals found</div>;
  }

  const macroNutrients = [
    { name: 'calories', label: 'Calories', unit: 'kcal' },
    { name: 'protein', label: 'Protein', unit: 'g' },
    { name: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
    { name: 'fats', label: 'Fats', unit: 'g' },
  ];

  const microNutrients = [
    { name: 'fiber', label: 'Fiber', unit: 'g' },
    { name: 'sugar', label: 'Sugar', unit: 'g' },
    { name: 'sodium', label: 'Sodium', unit: 'mg' },
    { name: 'vitaminA', label: 'Vitamin A', unit: 'IU' },
    { name: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
    { name: 'calcium', label: 'Calcium', unit: 'mg' },
    { name: 'iron', label: 'Iron', unit: 'mg' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Nutritional Goals</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isEditing ? 'Cancel' : 'Edit Goals'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Macro Nutrients</h3>
              {macroNutrients.map(({ name, label, unit }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name={name}
                      value={formData[name as keyof NutritionalGoalsType] || ''}
                      onChange={handleInputChange}
                      className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Micro Nutrients</h3>
              {microNutrients.map(({ name, label, unit }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name={name}
                      value={formData[name as keyof NutritionalGoalsType] || ''}
                      onChange={handleInputChange}
                      className="block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Macro Nutrients</h3>
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {macroNutrients.map(({ name, label, unit }) => (
                <div key={name} className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">{label}</span>
                    <span className="text-sm text-gray-900">
                      {goals[name as keyof NutritionalGoalsType]} {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Micro Nutrients</h3>
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {microNutrients.map(({ name, label, unit }) => (
                <div key={name} className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">{label}</span>
                    <span className="text-sm text-gray-900">
                      {goals[name as keyof NutritionalGoalsType]} {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 