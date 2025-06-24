import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { ExerciseSession } from '@/types/exercise';

interface ExerciseSessionProps {
  exerciseId: string;
}

export const ExerciseSession: React.FC<ExerciseSessionProps> = ({ exerciseId }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    sets: 0,
    reps: 0,
    weight: 0,
    duration: 0,
    intensity: 'medium',
    notes: '',
  });

  useEffect(() => {
    fetchSessions();
  }, [exerciseId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exercise/sessions?exerciseId=${exerciseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/exercise/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          exerciseId,
          userId: session?.user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSession = await response.json();
      setSessions(prev => [...prev, newSession]);
      setShowForm(false);
      setFormData({
        startTime: '',
        endTime: '',
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 0,
        intensity: 'medium',
        notes: '',
      });
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['sets', 'reps', 'weight', 'duration'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p>Loading sessions...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-lg"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Exercise Sessions</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Session'}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sets
              </label>
              <input
                type="number"
                name="sets"
                value={formData.sets}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reps
              </label>
              <input
                type="number"
                name="reps"
                value={formData.reps}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intensity
              </label>
              <select
                name="intensity"
                value={formData.intensity}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log Session
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {sessions.map(session => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {new Date(session.startTime).toLocaleString()}
                </h3>
                <p className="text-sm text-gray-600">
                  Duration: {session.duration} minutes
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  session.intensity === 'high'
                    ? 'bg-red-100 text-red-800'
                    : session.intensity === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {session.intensity}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Sets</p>
                <p className="font-medium">{session.sets}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reps</p>
                <p className="font-medium">{session.reps}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weight</p>
                <p className="font-medium">{session.weight} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Calories Burned</p>
                <p className="font-medium">{session.caloriesBurned}</p>
              </div>
            </div>
            {session.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Notes</p>
                <p className="font-medium">{session.notes}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 