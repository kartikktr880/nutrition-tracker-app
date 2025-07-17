import { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { logError } from '../utils/logger';

interface Activity {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
  notes?: string;
}

interface ActivityTrackerProps {
  userId: string;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: 'running',
    duration: 30,
    calories: 300,
    date: new Date().toISOString().split('T')[0]
  });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Load activities for the selected date
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const storedActivities = await storage.getItem<Activity[]>(`activities_${userId}_${selectedDate}`, 'activities');
        setActivities(storedActivities || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load activities';
        setError(errorMessage);
        logError('Error loading activities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [userId, selectedDate]);

  // Calculate calories based on activity type and duration
  const calculateCalories = (type: string, duration: number): number => {
    const caloriesPerMinute: Record<string, number> = {
      running: 10,
      walking: 5,
      cycling: 8,
      swimming: 9,
      yoga: 4,
      weightlifting: 6,
      hiit: 12,
      other: 7
    };

    return Math.round((caloriesPerMinute[type] || 7) * duration);
  };

  // Handle activity type change
  const handleActivityTypeChange = (type: string) => {
    const duration = newActivity.duration || 30;
    const calories = calculateCalories(type, duration);
    
    setNewActivity({
      ...newActivity,
      type,
      calories
    });
  };

  // Handle duration change
  const handleDurationChange = (duration: number) => {
    const type = newActivity.type || 'running';
    const calories = calculateCalories(type, duration);
    
    setNewActivity({
      ...newActivity,
      duration,
      calories
    });
  };

  // Add a new activity
  const addActivity = async () => {
    try {
      if (!newActivity.type || !newActivity.duration) {
        setError('Activity type and duration are required');
        return;
      }

      const activity: Activity = {
        id: Date.now().toString(),
        type: newActivity.type,
        duration: newActivity.duration,
        calories: newActivity.calories || calculateCalories(newActivity.type, newActivity.duration),
        date: selectedDate,
        notes: newActivity.notes
      };

      const updatedActivities = [...activities, activity];
      await storage.setItem(`activities_${userId}_${selectedDate}`, updatedActivities, 'activities');
      
      setActivities(updatedActivities);
      setIsAddingActivity(false);
      setNewActivity({
        type: 'running',
        duration: 30,
        calories: 300,
        date: selectedDate
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activity';
      setError(errorMessage);
      logError('Error adding activity:', err);
    }
  };

  // Delete an activity
  const deleteActivity = async (id: string) => {
    try {
      const updatedActivities = activities.filter(activity => activity.id !== id);
      await storage.setItem(`activities_${userId}_${selectedDate}`, updatedActivities, 'activities');
      setActivities(updatedActivities);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete activity';
      setError(errorMessage);
      logError('Error deleting activity:', err);
    }
  };

  // Calculate total calories burned
  const totalCaloriesBurned = activities.reduce((total, activity) => total + activity.calories, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Activity Tracker</h2>
        <div className="flex space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
          <button
            onClick={() => setIsAddingActivity(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Add Activity
          </button>
        </div>
      </div>

      {isAddingActivity && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Add New Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Activity Type
              </label>
              <select
                value={newActivity.type}
                onChange={(e) => handleActivityTypeChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="running">Running</option>
                <option value="walking">Walking</option>
                <option value="cycling">Cycling</option>
                <option value="swimming">Swimming</option>
                <option value="yoga">Yoga</option>
                <option value="weightlifting">Weightlifting</option>
                <option value="hiit">HIIT</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={newActivity.duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Calories Burned
              </label>
              <input
                type="number"
                min="1"
                value={newActivity.calories}
                onChange={(e) => setNewActivity({ ...newActivity, calories: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <input
                type="text"
                value={newActivity.notes || ''}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => setIsAddingActivity(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={addActivity}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Save Activity
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800">Summary</h3>
          <p className="text-blue-600">Total Activities: {activities.length}</p>
          <p className="text-blue-600">Total Calories Burned: {totalCaloriesBurned}</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No activities recorded for this date.</p>
          <p>Add an activity to get started!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calories
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 capitalize">{activity.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{activity.duration} minutes</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{activity.calories} kcal</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{activity.notes || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteActivity(activity.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}; 

export default ActivityTracker; 