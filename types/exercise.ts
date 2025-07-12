export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  type?: string;
  intensity: number; // MET value
  equipment: string[];
  muscleGroups: string[];
  instructions: string[];
  videoUrl?: string;
  imageUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  caloriesPerHour: number;
  tags: string[];
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseId: string;
  type?: string;
  startTime: string;
  endTime: string;
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  caloriesBurned: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseProgress {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseType?: string;
  date: string;
  bodyFatPercentage?: number;
  measurements?: {
    chest: number;
    waist: number;
    hips: number;
  };
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  intensity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseGoal {
  id: string;
  userId: string;
  exerciseId: string;
  type?: string;
  target?: number;
  exerciseType?: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetDuration: number;
  deadline: string;
  description: string;
  status: 'in-progress' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseWorkout {
  id: string;
  userId: string;
  exerciseId: string;
  name: string;
  description: string;
  exercises: {
    id: string;
    sets: number;
    reps: number;
    weight: number;
  }[];
  duration: number;
  difficulty: 'beginner' | 'medium' | 'advanced';
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseStats {
  totalSessions: number;
  totalDuration: number;
  totalCaloriesBurned: number;
  averageIntensity: number;
  progress: {
    date: string;
    sets: number;
    reps: number;
    weight: number;
    duration: number;
  }[];
}

export interface ExerciseFormCheck {
  id: string;
  exerciseId: string;
  userId: string;
  date: Date;
  checklist: {
    item: string;
    description?: string;
    importance?: 'critical' | 'important' | 'optional';
    completed: boolean;
    notes?: string;
  }[];
  score: number;
  feedback: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseFormTemplate {
  id: string;
  exerciseId: string;
  name: string;
  description: string;
  checklist: {
    item: string;
    description: string;
    importance: 'critical' | 'important' | 'optional';
  }[];
  tips: string[];
  commonMistakes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Type for recovery operations that matches the Prisma ExerciseSession model
export interface RecoveryExerciseSession {
  id?: string;
  userId: string;
  startTime: string;
  endTime: string;
  exercises: any; // Should match your JSON structure
  totalDuration: number;
  caloriesBurned: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
} 