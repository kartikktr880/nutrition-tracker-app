import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';

export const ExerciseWorkout: React.FC = () => {
  const { data: session } = useSession();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadWorkouts();
    }
  }, [session]);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      // Load workouts logic here
      setWorkouts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return <div>Please sign in to view your workouts.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Exercise Workouts</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <div>
          {workouts.length === 0 ? (
            <p className="text-gray-500">No workouts found.</p>
          ) : (
            <div className="space-y-4">
              {/* Workout list would go here */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 