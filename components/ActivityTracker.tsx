import React, { useState, useEffect } from 'react';
import { analytics } from '../services/analytics';
import { storage } from '../services/storage';
import { monitoring } from '../services/monitoring';

interface Activity {
  id: string;
  type: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  calories: number;
  date: string;
  notes?: string;
}

interface ActivitySummary {
  totalCalories: number;
  totalDuration: number;
  activeDays: number;
  byIntensity: {
    low: number;
    medium: number;
    high: number;
  };
}

interface ActivityTrackerProps {
  userId: string;
}

const ACTIVITY_TYPES = [
  'Walking',
  'Running',
  'Cycling',
  'Swimming',
  'Weight Training',
  'Yoga',
  'HIIT',
  'Other'
];

const CALORIES_PER_MINUTE = {
  Walking: { low: 3, medium: 4, high: 5 },
  Running: { low: 8, medium: 10, high: 12 },
  Cycling: { low: 5, medium: 7, high: 9 },
  Swimming: { low: 6, medium: 8, high: 10 },
  'Weight Training': { low: 4, medium: 6, high: 8 },
  Yoga: { low: 2, medium: 3, high: 4 },
  HIIT: { low: 8, medium: 12, high: 15 },
  Other: { low: 4, medium: 6, high: 8 }
};

export const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: ACTIVITY_TYPES[0],
    intensity: 'medium',
    date: selectedDate
  });
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    loadActivities();

    // Register monitoring metrics
    monitoring.registerMetric({
      name: 'daily_exercise_minutes',
      type: 'gauge',
      unit: 'minutes',
      description: 'Daily exercise duration',
      alertThresholds: {
        warning: 30,
        critical: 15
      }
    });

    monitoring.registerMetric({
      name: 'weekly_active_days',
      type: 'gauge',
      unit: 'days',
      description: 'Number of active days per week',
      alertThresholds: {
        warning: 3,
        critical: 2
      }
    });
  }, [userId, selectedDate, timeFilter]);

  const loadActivities = async () => {
    try {
      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);

      if (timeFilter === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      } else if (timeFilter === 'month') {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      }

      const savedActivities = await storage.getItem<Activity[]>(`activities_${userId}`);
      if (savedActivities) {
        const filteredActivities = savedActivities.filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= startDate && activityDate <= endDate;
        });
        setActivities(filteredActivities);

        analytics.trackEvent({
          category: 'Activity',
          action: 'load_activities',
          label: timeFilter,
          metadata: { startDate, endDate }
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load activities';
      setError(error);
      analytics.trackError({
        errorType: 'activities_load_error',
        errorMessage: error,
        context: { userId, timeFilter }
      });
    }
  };

  const calculateCalories = (type: string, intensity: 'low' | 'medium' | 'high', duration: number) => {
    const caloriesPerMinute = CALORIES_PER_MINUTE[type as keyof typeof CALORIES_PER_MINUTE]?.[intensity] || 
      CALORIES_PER_MINUTE.Other[intensity];
    return Math.round(caloriesPerMinute * duration);
  };

  const handleAddActivity = async () => {
    try {
      if (!newActivity.type || !newActivity.duration) {
        throw new Error('Activity type and duration are required');
      }

      const calories = calculateCalories(
        newActivity.type,
        newActivity.intensity as 'low' | 'medium' | 'high',
        newActivity.duration
      );

      const activity: Activity = {
        id: Date.now().toString(),
        type: newActivity.type,
        duration: newActivity.duration,
        intensity: newActivity.intensity as 'low' | 'medium' | 'high',
        calories,
        date: selectedDate,
        notes: newActivity.notes
      };

      const allActivities = [...activities, activity];
      await storage.setItem(`activities_${userId}`, allActivities);
      setActivities(allActivities);
      setIsAddingActivity(false);
      setNewActivity({
        type: ACTIVITY_TYPES[0],
        intensity: 'medium',
        date: selectedDate
      });

      analytics.trackEvent({
        category: 'Activity',
        action: 'add_activity',
        label: activity.type,
        metadata: activity
      });

      // Track activity metrics
      monitoring.track('daily_exercise_minutes', activity.duration);
      
      const weeklyActiveDays = new Set(
        allActivities
          .filter(a => {
            const activityDate = new Date(a.date);
            const weekStart = new Date(selectedDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return activityDate >= weekStart;
          })
          .map(a => a.date)
      ).size;

      monitoring.track('weekly_active_days', weeklyActiveDays);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add activity';
      setError(error);
      analytics.trackError({
        errorType: 'add_activity_error',
        errorMessage: error,
        context: { userId, activity: newActivity }
      });
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const updatedActivities = activities.filter(activity => activity.id !== id);
      await storage.setItem(`activities_${userId}`, updatedActivities);
      setActivities(updatedActivities);

      analytics.trackEvent({
        category: 'Activity',
        action: 'delete_activity',
        label: id
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete activity';
      setError(error);
      analytics.trackError({
        errorType: 'delete_activity_error',
        errorMessage: error,
        context: { userId, activityId: id }
      });
    }
  };

  const calculateSummary = (): ActivitySummary => {
    const summary: ActivitySummary = {
      totalCalories: 0,
      totalDuration: 0,
      activeDays: new Set(activities.map(a => a.date)).size,
      byIntensity: {
        low: 0,
        medium: 0,
        high: 0
      }
    };

    activities.forEach(activity => {
      summary.totalCalories += activity.calories;
      summary.totalDuration += activity.duration;
      summary.byIntensity[activity.intensity] += activity.duration;
    });

    return summary;
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Activity Tracker</h2>
        <div className="flex space-x-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as 'day' | 'week' | 'month')}
            className="rounded-md border-gray-300"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border-gray-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Activities</h3>
          <button
            onClick={() => setIsAddingActivity(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add Activity
          </button>
        </div>

        {isAddingActivity && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium mb-4">Add Activity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Activity Type
                </label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                >
                  {ACTIVITY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newActivity.duration || ''}
                  onChange={(e) => setNewActivity({ ...newActivity, duration: +e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Intensity
                </label>
                <select
                  value={newActivity.intensity}
                  onChange={(e) => setNewActivity({ ...newActivity, intensity: e.target.value as 'low' | 'medium' | 'high' })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newActivity.notes || ''}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingActivity(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddActivity}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add Activity
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No activities recorded for this period.</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{activity.type}</h4>
                  <p className="text-sm text-gray-500">
                    {activity.duration} minutes • {activity.intensity} intensity • {activity.calories} kcal
                  </p>
                  {activity.notes && (
                    <p className="text-sm text-gray-500 mt-1">{activity.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteActivity(activity.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {activities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-medium mb-4">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Calories</p>
                <p className="text-xl font-semibold">{summary.totalCalories} kcal</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Duration</p>
                <p className="text-xl font-semibold">{summary.totalDuration} min</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Days</p>
                <p className="text-xl font-semibold">{summary.activeDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Intensity Breakdown</p>
                <div className="flex h-4 rounded-full overflow-hidden mt-2">
                  {Object.entries(summary.byIntensity).map(([intensity, duration]) => {
                    const percentage = (duration / summary.totalDuration) * 100;
                    const colors = {
                      low: 'bg-green-300',
                      medium: 'bg-yellow-400',
                      high: 'bg-red-500'
                    };
                    return (
                      <div
                        key={intensity}
                        className={colors[intensity as keyof typeof colors]}
                        style={{ width: `${percentage}%` }}
                        title={`${intensity}: ${Math.round(percentage)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 