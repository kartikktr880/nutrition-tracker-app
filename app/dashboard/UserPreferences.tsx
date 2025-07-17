import React, { useState, useEffect } from 'react';

import { UserPreferences as UserPreferencesType } from '../types/nutrition';

interface UserPreferencesProps {
  userId: string;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({ userId }) => {
  const [preferences, setPreferences] = useState<UserPreferencesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserPreferencesType>>({});

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user-preferences');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user preferences');
        }

        const data = await response.json();
        setPreferences(data);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData((prev: Partial<UserPreferencesType>) => ({
        ...prev,
        [name]: checkbox.checked,
      }));
    } else {
      setFormData((prev: Partial<UserPreferencesType>) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const updatedPreferences = await response.json();
      setPreferences(updatedPreferences);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (!preferences) {
    return <div className="text-center">No preferences found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Preferences</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isEditing ? 'Cancel' : 'Edit Preferences'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dietary Restrictions
              </label>
              <div className="mt-2 space-y-2">
                {['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'nutFree'].map((restriction: string) => (
                  <div key={restriction} className="flex items-center">
                    <input
                      type="checkbox"
                      name={restriction}
                      checked={Boolean(formData[restriction as keyof UserPreferencesType])}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 capitalize">
                      {restriction.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Preferred Cuisines
              </label>
              <select
                name="preferredCuisines"
                multiple
                value={formData.preferredCuisines || []}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {['Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai', 'Mediterranean'].map(
                  (cuisine: string) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Meal Size Preferences
              </label>
              <select
                name="mealSizePreference"
                value={formData.mealSizePreference || 'medium'}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cooking Skill Level
              </label>
              <select
                name="cookingSkillLevel"
                value={formData.cookingSkillLevel || 'intermediate'}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                name="additionalNotes"
                value={formData.additionalNotes || ''}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Any additional preferences or restrictions..."
              />
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
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Dietary Restrictions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(preferences)
                .filter(([key]) =>
                  ['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'nutFree'].includes(key)
                )
                .filter(([, _value]) => _value)
                .map(([key, _value]: [string, unknown]) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize"
                  >
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Preferred Cuisines</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {preferences.preferredCuisines?.map((cuisine: string) => (
                <span
                  key={cuisine}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {cuisine}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Meal Size Preference</h3>
            <p className="mt-1 text-gray-600 capitalize">{preferences.mealSizePreference}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium">Cooking Skill Level</h3>
            <p className="mt-1 text-gray-600 capitalize">{preferences.cookingSkillLevel}</p>
          </div>

          {preferences.additionalNotes && (
            <div>
              <h3 className="text-lg font-medium">Additional Notes</h3>
              <p className="mt-1 text-gray-600">{preferences.additionalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 