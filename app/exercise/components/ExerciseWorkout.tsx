import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { ExerciseWorkout } from '@/types/exercise';

interface ExerciseWorkoutProps {
  exerciseId: string;
}

export const ExerciseWorkout: React.FC<ExerciseWorkoutProps> = ({ exerciseId }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<ExerciseWorkout[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exercises: [] as { id: string; sets: number; reps: number; weight: number }[],
    duration: 0,
    difficulty: 'medium',
    category: '',
  });

  useEffect(() => {
    fetchWorkouts();
  }, [exerciseId]);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/exercise/workouts?exerciseId=${exerciseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workouts');
      }
      const data = await response.json();
      setWorkouts(data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/exercise/workouts', {
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
        throw new Error('Failed to create workout');
      }

      const newWorkout = await response.json();
      setWorkouts(prev => [...prev, newWorkout]);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        exercises: [],
        duration: 0,
        difficulty: 'medium',
        category: '',
      });
    } catch (error) {
      console.error('Error creating workout:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['duration'].includes(name) ? Number(value) : value,
    }));
  };

  const addExercise = () => {
    setFormData(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { id: '', sets: 0, reps: 0, weight: 0 },
      ],
    }));
  };

  const removeExercise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const updateExercise = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) =>
        i === index ? { ...exercise, [field]: value } : exercise
      ),
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p>Loading workouts...</p>
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
        <h2 className="text-2xl font-bold">Exercise Workouts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Workout'}
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workout Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-lg"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
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
                Difficulty
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Exercises</h3>
              <button
                type="button"
                onClick={addExercise}
                className="text-blue-600 hover:text-blue-700"
              >
                Add Exercise
              </button>
            </div>
            <div className="space-y-4">
              {formData.exercises.map((exercise, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Exercise {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Exercise ID
                      </label>
                      <input
                        type="text"
                        value={exercise.id}
                        onChange={e => updateExercise(index, 'id', e.target.value)}
                        className="w-full p-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Sets
                      </label>
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={e =>
                          updateExercise(index, 'sets', Number(e.target.value))
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Reps
                      </label>
                      <input
                        type="number"
                        value={exercise.reps}
                        onChange={e =>
                          updateExercise(index, 'reps', Number(e.target.value))
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={exercise.weight}
                        onChange={e =>
                          updateExercise(index, 'weight', Number(e.target.value))
                        }
                        className="w-full p-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Workout
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {workouts.map(workout => (
          <motion.div
            key={workout.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{workout.name}</h3>
                <p className="text-sm text-gray-600">{workout.description}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  workout.difficulty === 'advanced'
                    ? 'bg-red-100 text-red-800'
                    : workout.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {workout.difficulty}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{workout.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium">{workout.category}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Exercises</h4>
              <div className="space-y-2">
                {workout.exercises.map((exercise, index) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Sets</p>
                        <p className="font-medium">{exercise.sets}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reps</p>
                        <p className="font-medium">{exercise.reps}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="font-medium">{exercise.weight} kg</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 