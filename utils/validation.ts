import { Exercise, ExerciseSession } from '@/types/exercise';

export function validateExerciseData(exercise: Exercise): string | null {
  if (!exercise) {
    return 'Exercise data is required';
  }

  if (!exercise.id) {
    return 'Exercise ID is required';
  }

  if (!exercise.name) {
    return 'Exercise name is required';
  }

  if (!exercise.type || !['strength', 'cardio', 'flexibility'].includes(exercise.type)) {
    return 'Invalid exercise type';
  }

  if (!exercise.intensity || !['low', 'medium', 'high', 'veryHigh'].includes(exercise.intensity)) {
    return 'Invalid intensity level';
  }

  return null;
}

export function validateSessionData(session: ExerciseSession): string | null {
  if (!session) {
    return 'Session data is required';
  }

  // Required fields validation
  const requiredFields = [
    'id', 'userId', 'exerciseId', 'startTime', 'endTime',
    'sets', 'reps', 'weight', 'duration', 'caloriesBurned'
  ];

  for (const field of requiredFields) {
    if (session[field] === undefined || session[field] === null) {
      return `${field} is required`;
    }
  }

  // Date validation
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);

  if (isNaN(startTime.getTime())) {
    return 'Invalid start time';
  }

  if (isNaN(endTime.getTime())) {
    return 'Invalid end time';
  }

  if (endTime < startTime) {
    return 'End time must be after start time';
  }

  // Numerical value validation
  if (session.sets < 0) {
    return 'Sets cannot be negative';
  }

  if (session.reps < 0) {
    return 'Reps cannot be negative';
  }

  if (session.weight < 0) {
    return 'Weight cannot be negative';
  }

  if (session.duration < 0) {
    return 'Duration cannot be negative';
  }

  if (session.caloriesBurned < 0) {
    return 'Calories burned cannot be negative';
  }

  // Cross-field validation
  if (session.duration > 0 && session.caloriesBurned <= 0) {
    return 'Calories burned must be positive for exercises with duration';
  }

  // Exercise-specific validation
  if (session.sets > 0 && session.reps === 0) {
    return 'Reps must be specified when sets are present';
  }

  if (session.reps > 0 && session.sets === 0) {
    return 'Sets must be specified when reps are present';
  }

  // Notes validation (optional field)
  if (session.notes && typeof session.notes !== 'string') {
    return 'Notes must be a string';
  }

  if (session.notes && session.notes.length > 1000) {
    return 'Notes exceed maximum length of 1000 characters';
  }

  return null;
} 