import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: Date;
}

interface ActivityTrackerProps {
  userId: string;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const _loadActivities = async () => {
      const stored = localStorage.getItem(`activities_${userId}`);
      if (stored) {
        try {
          setActivities(JSON.parse(stored));
        } catch (e) {
          setActivities([]);
        }
      } else {
        setActivities([]);
      }
      setLoading(false);
    };
    _loadActivities();
  }, [userId]);

  const _saveActivity = async (userId: string, activity: Activity) => {
    const stored = localStorage.getItem(`activities_${userId}`);
    let activities: Activity[] = [];
    if (stored) {
      try {
        activities = JSON.parse(stored);
      } catch (e) {
        activities = [];
      }
    }
    activities.push(activity);
    localStorage.setItem(`activities_${userId}`, JSON.stringify(activities));
  };

  // const addActivity = async (activity: Omit<Activity, 'id' | 'date'>) => {
  //   try {
  //     const newActivity: Activity = {
  //       ...activity,
  //       id: Date.now().toString(),
  //       date: new Date(),
  //     };

  //     await _saveActivity(userId, newActivity);
  //     setActivities(prev => [...prev, newActivity]);
  //   } catch (error) {
  //     // console.error('Error saving activity:', error);
  //   }
  // };

  if (loading) {
    return <div>Loading activities...</div>;
  }

  return (
    <div className="activity-tracker">
      <h2>Activity Tracker</h2>
      <div className="activities-list">
        {activities.map(activity => (
          <div key={activity.id} className="activity-item">
            <h3>{activity.type}</h3>
            <p>Duration: {activity.duration} minutes</p>
            <p>Calories: {activity.calories}</p>
            <p>Date: {activity.date.toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}; 

export default ActivityTracker; 